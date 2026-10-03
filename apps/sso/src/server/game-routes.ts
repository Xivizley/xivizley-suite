import type { FastifyPluginAsync } from "fastify";
import Docker from "dockerode";
import crypto from "crypto";
import { PassThrough } from "node:stream";
import { eq, and, isNull } from "drizzle-orm";
import { getDb, users, refreshTokens } from "@xivizley/db";
import { withXivizleyAuth } from "@xivizley/xivizley-id";
import type { ResourceGovernor } from "@xivizley/resource-gov";
import type { ContainerMetrics, GameId, ActiveServerConfig } from "@xivizley/types";
import { getCommandAdapter, runExecInContainer } from "./adapters/command-adapter";
import { verifyAccessToken, hashToken, generateAccessToken } from "./tokens.js";
import { GAME_CATALOG } from "../data/game-catalog";

async function requireAdmin(request: any, reply: any): Promise<boolean> {
  if (request.user) return true;

  const cookies = (request.cookies || {}) as Record<string, string | undefined>;
  const token =
    cookies["xivizley_access_token"] ||
    request.headers?.authorization?.replace(/^Bearer\s+/i, "");

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      if (payload?.sub) {
        request.user = { id: payload.sub, email: payload.email, role: payload.role };
        return true;
      }
    } catch {
      // Refresh token denenecek
    }
  }

  const refreshRaw = cookies["xivizley_refresh_token"];
  if (refreshRaw) {
    try {
      const db = getDb();
      const tokenHash = hashToken(refreshRaw);
      const [existingToken] = await db
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
        .limit(1);

      if (existingToken && existingToken.expiresAt > new Date()) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, existingToken.userId))
          .limit(1);
        if (user) {
          request.user = { id: user.id, email: user.email, role: user.role };
          const reqHost = request.headers?.host || "";
          const newAccessToken = await generateAccessToken(user);
          reply.setCookie("xivizley_access_token", newAccessToken, {
            path: "/",
            domain: process.env.COOKIE_DOMAIN || (reqHost.endsWith(".xivizley.com.tr") ? ".xivizley.com.tr" : undefined),
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
          });
          return true;
        }
      }
    } catch {
      // Yetkisiz
    }
  }

  reply.status(401).send({
    ok: false,
    code: "ADMIN_REQUIRED",
    message: "Bu işlem yalnızca sunucu yöneticisi (Admin) tarafından yapılabilir. Lütfen sağ üstten Yönetici Girişi yapın.",
  });
  return false;
}

const EDITABLE_EXTENSIONS = new Set([
  "properties",
  "yml",
  "yaml",
  "json",
  "txt",
  "cfg",
  "log",
  "toml",
  "ini",
  "conf",
  "env",
  "sh",
  "lua",
]);

export interface GamePanelRoutesOptions {
  governor: ResourceGovernor;
}

// Konfigürasyon hash önbelleği (İdempotent Apply için - Claude Tavsiyesi)
const appliedConfigHashes = new Map<GameId, string>();
// Aktif olarak imajı indirilen oyunlar
const pullingGames = new Set<GameId>();

/** Oyun türüne göre konteyner adını türet */
function getContainerName(gameId?: string): string {
  if (!gameId || gameId === "fivem") {
    return process.env["FIVEM_CONTAINER_NAME"] || "fivem-server";
  }
  return `xivizley-${gameId}-server`;
}

/** Image var mı kontrol et, yoksa docker.pull() ile çek (Kural 1) */
async function ensureImageExists(docker: Docker, image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
  } catch (err: any) {
    if (err.statusCode !== 404) throw err;
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (pullErr: any, stream: any) => {
        if (pullErr) return reject(pullErr);
        docker.modem.followProgress(stream, (progressErr: any) => {
          if (progressErr) reject(progressErr);
          else resolve();
        });
      });
    });
  }
}

/** Oyun konteynerine aktarılacak ortam değişkenleri */
function getGameEnvVars(gameId: GameId, config: ActiveServerConfig): string[] {
  const env: string[] = [];
  const port = config.port || GAME_CATALOG[gameId].defaultPort;
  const memMb = (config as any).memLimitMb || GAME_CATALOG[gameId].minRamMb || 2048;

  switch (gameId) {
    case "minecraft": {
      env.push("EULA=TRUE");
      env.push(`ONLINE_MODE=${config.onlineMode ? "TRUE" : "FALSE"}`);
      env.push("JVM_OPTS=-Dspark.enabled=false");
      const type =
        config.engineId === "purpur"
          ? "PURPUR"
          : config.engineId === "fabric"
          ? "FABRIC"
          : config.engineId === "velocity"
          ? "VELOCITY"
          : config.engineId === "folia"
          ? "FOLIA"
          : config.engineId === "spigot"
          ? "SPIGOT"
          : config.engineId === "waterfall"
          ? "WATERFALL"
          : config.engineId === "bungeecord"
          ? "BUNGEECORD"
          : config.engineId === "mohist"
          ? "MOHIST"
          : config.engineId === "forge"
          ? "FORGE"
          : config.engineId === "neoforge"
          ? "NEOFORGE"
          : config.engineId === "vanilla"
          ? "VANILLA"
          : "PAPER";
      env.push(`TYPE=${type}`);
      env.push(`VERSION=${config.version || "1.21.1"}`);
      if (config.version && config.version.startsWith("26.")) {
        env.push("MODRINTH_GAME_VERSION=1.21.4");
      }
      env.push(`MEMORY=${memMb}M`);
      env.push(`SERVER_PORT=${port}`);

      // Konsol ve RCON entegrasyonu (rcon-cli & mc-send-to-console için)
      env.push("ENABLE_RCON=true");
      env.push(`RCON_PASSWORD=${process.env["XIVIZLEY_RCON_PASSWORD"] || "xivizley_secure_rcon_2026"}`);
      env.push("RCON_PORT=25575");
      env.push("CREATE_CONSOLE_IN_PIPE=true");

      // Modrinth indirme uyumluluğu (Loader belirleme)
      env.push("MODRINTH_ALLOWED_VERSION_TYPE=beta");
      if (type === "PURPUR" || type === "PAPER" || type === "FOLIA" || type === "SPIGOT") {
        env.push("MODRINTH_LOADER=paper");
      } else if (type === "FABRIC") {
        env.push("MODRINTH_LOADER=fabric");
      } else if (type === "VELOCITY") {
        env.push("MODRINTH_LOADER=velocity");
      } else if (type === "WATERFALL" || type === "BUNGEECORD") {
        env.push("MODRINTH_LOADER=bungeecord");
      } else if (type === "FORGE" || type === "MOHIST") {
        env.push("MODRINTH_LOADER=forge");
      } else if (type === "NEOFORGE") {
        env.push("MODRINTH_LOADER=neoforge");
      }

      if (config.maxPlayers) {
        env.push(`MAX_PLAYERS=${config.maxPlayers}`);
      }
      if (config.difficulty) {
        env.push(`DIFFICULTY=${config.difficulty}`);
      }
      if (config.pvp !== undefined) {
        env.push(`PVP=${config.pvp ? "true" : "false"}`);
      }
      if (config.motd) {
        env.push(`MOTD=${config.motd}`);
      }

      // Gelişmiş server.properties parametreleri
      if (config.viewDistance) {
        env.push(`VIEW_DISTANCE=${config.viewDistance}`);
      }
      if (config.simulationDistance) {
        env.push(`SIMULATION_DISTANCE=${config.simulationDistance}`);
      }
      if (config.allowFlight !== undefined) {
        env.push(`ALLOW_FLIGHT=${config.allowFlight ? "TRUE" : "FALSE"}`);
      }
      if (config.enableCommandBlock !== undefined) {
        env.push(`ENABLE_COMMAND_BLOCK=${config.enableCommandBlock ? "TRUE" : "FALSE"}`);
      }
      if (config.hardcore !== undefined) {
        env.push(`HARDCORE=${config.hardcore ? "TRUE" : "FALSE"}`);
      }
      if (config.seed) {
        env.push(`LEVEL_SEED=${config.seed}`);
      }
      if (config.selectedPackIds?.includes("mc-skyblock")) {
        // Skyblock için ada spawn korumasını sıfırla ki oyuncular adalarında özgürce blok kırıp inşa edebilsin
        env.push("SPAWN_PROTECTION=0");
        env.push("ALLOW_NETHER=true");
      } else if (config.spawnProtection !== undefined) {
        env.push(`SPAWN_PROTECTION=${config.spawnProtection}`);
      }

      // Eklentiler (Doğrudan seçilenler + Seçili mod paketlerinin getirdiği eklentiler)
      const allPluginIds = new Set<string>(config.enabledPluginIds || []);
      for (const packId of config.selectedPackIds || []) {
        const pack = GAME_CATALOG.minecraft?.modPacks.find((p) => p.id === packId);
        if (pack?.includedPluginIds) {
          for (const incId of pack.includedPluginIds) {
            allPluginIds.add(incId);
          }
        }
      }

      const modrinthProjects: string[] = [];
      const spigetResources: number[] = [];
      for (const pId of allPluginIds) {
        const p = GAME_CATALOG.minecraft?.plugins.find((item) => item.id === pId);
        if (p?.modrinthSlug) {
          let slug = p.modrinthSlug;
          // Opsiyonel bayrağı (?) ekleyerek sürüm uyuşmazlığında boot-loop olmasını engelle
          if (!slug.includes("?")) {
            if (slug.includes(":")) {
              const [id, ver] = slug.split(":");
              slug = `${id}?:${ver}`;
            } else {
              slug = `${slug}?`;
            }
          }
          modrinthProjects.push(slug);
        } else if (p?.spigetId) {
          spigetResources.push(p.spigetId);
        }
      }
      if (modrinthProjects.length > 0) {
        env.push(`MODRINTH_PROJECTS=${modrinthProjects.join(",")}`);
      }
      if (spigetResources.length > 0) {
        env.push(`SPIGET_RESOURCES=${spigetResources.join(",")}`);
      }
      break;
    }
    case "fivem": {
      env.push(`PORT=${port}`);
      if (config.serverName) {
        env.push(`SV_HOSTNAME=${config.serverName}`);
      }
      if (config.maxPlayers) {
        env.push(`MAX_CLIENTS=${config.maxPlayers}`);
      }
      break;
    }
    case "cs2": {
      env.push(`SRCDS_PORT=${port}`);
      env.push(`SRCDS_MAXPLAYERS=${config.maxPlayers || 10}`);
      if (config.serverName) {
        env.push(`SRCDS_HOSTNAME=${config.serverName}`);
      }
      if (config.map) {
        env.push(`SRCDS_STARTMAP=${config.map}`);
      }
      if (config.tickrate) {
        env.push(`SRCDS_TICKRATE=${config.tickrate}`);
      }
      env.push(`SRCDS_RCONPW=${process.env["XIVIZLEY_RCON_PASSWORD"] || "xivizley_secure_rcon_2026"}`);
      break;
    }
    case "rust": {
      env.push(`RUST_SERVER_PORT=${port}`);
      env.push("RUST_RCON_PORT=28016");
      env.push(`RUST_RCON_PASSWORD=${process.env["XIVIZLEY_RCON_PASSWORD"] || "xivizley_secure_rcon_2026"}`);
      if (config.serverName) {
        env.push(`RUST_SERVER_NAME=${config.serverName}`);
      }
      if (config.serverDesc) {
        env.push(`RUST_SERVER_DESCRIPTION=${config.serverDesc}`);
      }
      if (config.maxPlayers) {
        env.push(`RUST_SERVER_MAXPLAYERS=${config.maxPlayers}`);
      }
      break;
    }
    case "palworld": {
      env.push(`PORT=${port}`);
      env.push("RCON_ENABLED=true");
      env.push("RCON_PORT=25575");
      env.push(`ADMIN_PASSWORD=${process.env["XIVIZLEY_RCON_PASSWORD"] || "xivizley_secure_rcon_2026"}`);
      if (config.serverName) {
        env.push(`SERVER_NAME=${config.serverName}`);
      }
      if (config.serverDesc) {
        env.push(`SERVER_DESCRIPTION=${config.serverDesc}`);
      }
      if (config.maxPlayers) {
        env.push(`PLAYERS=${config.maxPlayers}`);
      }
      if (config.serverPassword) {
        env.push(`SERVER_PASSWORD=${config.serverPassword}`);
      }
      break;
    }
    case "unturned": {
      env.push(`SERVER_PORT=${port}`);
      if (config.serverName) {
        env.push(`SERVER_NAME=${config.serverName}`);
      }
      if (config.map) {
        env.push(`SERVER_MAP=${config.map}`);
      }
      if (config.maxPlayers) {
        env.push(`MAX_PLAYERS=${config.maxPlayers}`);
      }
      break;
    }
    case "ark": {
      env.push(`SERVER_PORT=${port}`);
      env.push(`ADMIN_PASSWORD=${process.env["XIVIZLEY_RCON_PASSWORD"] || "xivizley_secure_rcon_2026"}`);
      if (config.serverName) {
        env.push(`SESSION_NAME=${config.serverName}`);
      }
      if (config.map) {
        env.push(`SERVER_MAP=${config.map}`);
      }
      if (config.maxPlayers) {
        env.push(`MAX_PLAYERS=${config.maxPlayers}`);
      }
      if (config.serverPassword) {
        env.push(`SERVER_PASSWORD=${config.serverPassword}`);
      }
      break;
    }
    case "terraria": {
      env.push(`PORT=${port}`);
      if (config.map) {
        env.push(`WORLD_NAME=${config.map}`);
      }
      if (config.maxPlayers) {
        env.push(`MAX_PLAYERS=${config.maxPlayers}`);
      }
      break;
    }
    case "valheim": {
      env.push(`SERVER_PORT=${port}`);
      env.push("SERVER_PUBLIC=1");
      if (config.serverName) {
        env.push(`SERVER_NAME=${config.serverName}`);
      }
      if (config.map) {
        env.push(`WORLD_NAME=${config.map}`);
      }
      env.push(`SERVER_PASS=${config.serverPassword || "xivizley123"}`);
      break;
    }
    default:
      break;
  }
  return env;
}

/** Konteyner yoksa otomatik oluşturucu (Lazy Container Creation) */
async function ensureContainerExists(
  gameId: GameId,
  config: ActiveServerConfig,
  docker: Docker,
  forceRecreate = false,
): Promise<{ recreated: boolean }> {
  const containerName = getContainerName(gameId);
  const gameDef = GAME_CATALOG[gameId];

  const targetImage =
    gameId === "minecraft" && config.version?.startsWith("26.")
      ? "itzg/minecraft-server:latest"
      : gameDef.dockerImage;

  let wasRunning = false;
  try {
    const existing = docker.getContainer(containerName);
    const inspect = await existing.inspect();
    wasRunning = inspect.State.Running;

    // İmaj güncellendiyse veya zorunlu yeniden oluşturma talep edildiyse eski konteyneri silip yenisini yarat
    if (forceRecreate || inspect.Config.Image !== targetImage) {
      if (wasRunning) {
        await existing.stop({ t: 2 }).catch(() => {});
      }
      await existing.remove({ force: true }).catch(() => {});
      throw { statusCode: 404 };
    }
    return { recreated: false };
  } catch (err: any) {
    if (err.statusCode !== 404) throw err;

    const gameDef = GAME_CATALOG[gameId];
    // Kural 2: ensureContainerExists içinde createContainer öncesi ensureImageExists çağır
    await ensureImageExists(docker, targetImage);

    const memMb = (config as any).memLimitMb || gameDef.minRamMb || 2048;
    const port = config.port || gameDef.defaultPort;

    const portBindings: Record<string, Array<{ HostPort: string }>> = {
      [`${port}/tcp`]: [{ HostPort: String(port) }],
      [`${port}/udp`]: [{ HostPort: String(port) }],
    };

    if (gameId === "minecraft") {
      portBindings["19132/udp"] = [{ HostPort: "19132" }];
    } else if (gameId === "rust") {
      portBindings["28016/tcp"] = [{ HostPort: "28016" }];
    } else if (gameId === "palworld") {
      portBindings["25575/tcp"] = [{ HostPort: "25575" }];
    }

    // Yoksa oluştur
    const newContainer = await docker.createContainer({
      name: containerName,
      Image: targetImage,
      Env: getGameEnvVars(gameId, config),
      OpenStdin: true,
      Tty: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Memory: memMb * 1024 * 1024,
        PortBindings: portBindings,
        Binds: [`${gameDef.volumeName}:${gameDef.volumeMountPath}`],
        Dns: ["8.8.8.8", "1.1.1.1"],
        OomScoreAdj: gameId === "fivem" ? -500 : 0,
        RestartPolicy: { Name: "unless-stopped" },
        NetworkMode: "xivizley-network",
      },
    });

    if (wasRunning) {
      await newContainer.start().catch(() => {});
    }

    return { recreated: true };
  }
}

export const gamePanelRoutes: FastifyPluginAsync<GamePanelRoutesOptions> = async (
  fastify,
  opts,
) => {
  const docker = new Docker({
    socketPath: process.env["DOCKER_SOCKET_PATH"] || "/var/run/docker.sock",
  });

  // Resource Governor olaylarını logla
  opts.governor.on("brain:suspend", (action) => {
    fastify.log.warn({ action }, "Resource Governor: Brain LLM askıya alındı (Oyun Önceliği)");
  });

  opts.governor.on("vault:halt", (action) => {
    fastify.log.warn({ action }, "Resource Governor: Vault AI durduruldu (Oyun Önceliği)");
  });

  // Tüm /api rotalarını withXivizleyAuth ile koru (canlı test & geçiş için optional)
  await fastify.register(withXivizleyAuth, { optional: true });

  // ─── 1. POST /api/server/:action (start, stop, restart) ────
  fastify.post<{
    Params: { action: "start" | "stop" | "restart" };
    Body?: { gameId?: GameId };
  }>("/api/server/:action", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { action } = request.params;
    const gameId = (request.body?.gameId as GameId) || "fivem";
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      if (action === "start") {
        // İmaj indirme devam ediyorsa uyar
        if (pullingGames.has(gameId)) {
          return reply.status(400).send({
            ok: false,
            code: "IMAGE_PULLING",
            message: `${GAME_CATALOG[gameId]?.name || gameId} image indiriliyor (~500 MB), lütfen bekleyin...`,
          });
        }

        // Kural 4: start sadece başlatır, konteyner oluşturmaz
        // Konteyner yoksa apply çağrılmadan start çalışmaz
        try {
          await container.inspect();
        } catch (inspectErr: any) {
          if (inspectErr?.statusCode === 404) {
            return reply.status(400).send({
              ok: false,
              code: "CONTAINER_NOT_FOUND",
              message: "Önce yapılandırmayı kaydedin",
            });
          }
          throw inspectErr;
        }

        // Claude Tavsiyesi: Tek Aktif Sunucu Kuralı
        // Başka bir oyun sunucusu çalışıyorsa yeni sunucunun başlatılması engellenir
        try {
          const containers = await docker.listContainers();
          const runningOther = containers.find((c) => {
            const names = c.Names.map((n) => n.replace(/^\//, ""));
            return (
              (names.includes("fivem-server") || names.some((n) => n.startsWith("xivizley-") && n.endsWith("-server"))) &&
              !names.includes(containerName)
            );
          });

          if (runningOther) {
            const runningName = runningOther.Names[0]?.replace(/^\//, "") || "Bilinmeyen";
            return reply.status(409).send({
              ok: false,
              code: "ANOTHER_SERVER_RUNNING",
              message: `Şu anda arka planda '${runningName}' çalışıyor. 8 GB RAM sınırını korumak için lütfen önce çalışan sunucuyu durdurun.`,
            });
          }
        } catch (listErr) {
          fastify.log.warn({ listErr }, "Çalışan konteyner kontrolü atlandı.");
        }

        try {
          await container.start();
        } catch (e: any) {
          if (e?.statusCode !== 304) throw e;
        }
      } else if (action === "stop") {
        try {
          await container.stop({ t: 2 });
        } catch (e: any) {
          if (e?.statusCode !== 304) throw e;
        }
      } else if (action === "restart") {
        await container.restart({ t: 2 });
      } else {
        return reply.status(400).send({ ok: false, message: "Geçersiz aksiyon." });
      }

      return reply.send({
        ok: true,
        data: {
          container: containerName,
          gameId,
          action,
          requestedBy: (request as any).user?.email,
          timestamp: Date.now(),
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        code: "DOCKER_ACTION_FAILED",
        message: err?.message || `Konteyner ${action} işlemi başarısız.`,
      });
    }
  });

  // ─── 1b. POST /api/server/reset (Tam Sıfırlama: Volume Temizle + Yeniden Oluştur) ────
  fastify.post<{
    Body?: { gameId?: GameId };
  }>("/api/server/reset", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const gameId = (request.body?.gameId as GameId) || "minecraft";
    const containerName = getContainerName(gameId);
    const gameDef = GAME_CATALOG[gameId];

    try {
      // 1) Container'ı durdur ve sil
      try {
        const existing = docker.getContainer(containerName);
        const inspect = await existing.inspect().catch(() => null);
        if (inspect?.State?.Running) {
          await existing.stop({ t: 5 }).catch(() => {});
        }
        await existing.remove({ force: true }).catch(() => {});
      } catch {
        // Container yoksa sorun değil, devam et
      }

      // 2) Docker volume içeriğini tamamen temizle
      //    Volume'ü silip yeniden oluşturmak yerine exec ile /data/* temizliyoruz
      //    Böylece volume bağlantısı korunur
      try {
        const tempContainer = await docker.createContainer({
          Image: "busybox:latest",
          Cmd: ["sh", "-c", `rm -rf ${gameDef.volumeMountPath}/* ${gameDef.volumeMountPath}/.*  2>/dev/null || true`],
          HostConfig: {
            Binds: [`${gameDef.volumeName}:${gameDef.volumeMountPath}`],
            AutoRemove: true,
            NetworkMode: "none",
          },
        });
        await tempContainer.start();
        await tempContainer.wait();
      } catch (wipeErr: any) {
        fastify.log.warn({ wipeErr }, "Volume temizleme aşamasında hata (devam ediyor)");
      }

      // 3) Konfigürasyonu alıp container'ı yeniden oluştur
      const config = gameDef.defaultConfig;
      await ensureContainerExists(gameId, config, docker, true);

      return reply.send({
        ok: true,
        data: {
          container: containerName,
          gameId,
          action: "reset",
          message: "Sunucu sıfırlandı. Tüm dünya verisi silindi. Yeni yapılandırmayı uygulamak için 'Yapılandırmayı Kaydet ve Uygula' butonuna basın.",
          timestamp: Date.now(),
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        code: "RESET_FAILED",
        message: err?.message || "Sunucu sıfırlama başarısız.",
      });
    }
  });

  // ─── 2. POST /api/server/command (CommandAdapter Deseni) ──
  fastify.post<{
    Body: { gameId?: GameId; command: string };
  }>("/api/server/command", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { command } = request.body || {};
    const gameId = (request.body?.gameId as GameId) || "fivem";

    if (!command || typeof command !== "string" || !command.trim()) {
      return reply.status(400).send({ ok: false, message: "Geçerli bir komut metni girilmelidir." });
    }

    const containerName = getContainerName(gameId);

    try {
      const adapter = getCommandAdapter(gameId, containerName, docker);
      const result = await adapter.send(command.trim());

      return reply.send({
        ok: result.ok,
        data: {
          gameId,
          container: containerName,
          command: command.trim(),
          response: result.response,
          error: result.error,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        code: "COMMAND_EXECUTION_FAILED",
        message: err.message || "Komut yürütme sırasında beklenmeyen bir hata oluştu.",
      });
    }
  });

  // ─── 3. POST /api/server/apply (Kural 3: İdempotent + Pull Bildirimi + ensureContainerExists) ──
  fastify.post<{
    Body: { gameId: GameId; config: ActiveServerConfig };
  }>("/api/server/apply", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { gameId, config } = request.body || {};

    if (!gameId || !config || !GAME_CATALOG[gameId]) {
      return reply.status(400).send({ ok: false, message: "Geçerli bir gameId ve config zorunludur." });
    }

    const gameDef = GAME_CATALOG[gameId];

    // 1. Config hash hesapla ve kontrol et (idempotent)
    const configString = JSON.stringify({
      image: gameDef?.dockerImage,
      engineId: config.engineId,
      version: config.version,
      selectedPackIds: [...(config.selectedPackIds || [])].sort(),
      enabledPluginIds: [...(config.enabledPluginIds || [])].sort(),
      port: config.port,
      maxPlayers: config.maxPlayers,
      motd: config.motd,
      onlineMode: config.onlineMode,
      difficulty: config.difficulty,
      pvp: config.pvp,
      serverName: config.serverName,
      serverDesc: config.serverDesc,
      serverPassword: config.serverPassword,
      map: config.map,
      gameMode: config.gameMode,
      tickrate: config.tickrate,
    });
    const configHash = crypto.createHash("sha256").update(configString).digest("hex");

    const previousHash = appliedConfigHashes.get(gameId);

    // Değişiklik yoksa (İdempotent) — Gereksiz işlem atlanır
    if (previousHash === configHash) {
      return reply.send({
        ok: true,
        noop: true,
        hash: configHash,
        message: "Yapılandırma değişmedi. Yeniden başlatma atlandı.",
      });
    }

    // İmaj var mı kontrol et
    let imageNeedsPull = false;
    try {
      await docker.getImage(gameDef.dockerImage).inspect();
    } catch (inspectErr: any) {
      if (inspectErr?.statusCode === 404) {
        imageNeedsPull = true;
      }
    }

    // Kural 3: İmaj yoksa pull başlat ve kullanıcıya süreci anında dön
    if (imageNeedsPull) {
      if (!pullingGames.has(gameId)) {
        pullingGames.add(gameId);
        ensureContainerExists(gameId, config, docker, true)
          .then(() => {
            appliedConfigHashes.set(gameId, configHash);
          })
          .catch((err) => {
            fastify.log.error({ err }, "Arka plan image pull / container create hatası");
          })
          .finally(() => {
            pullingGames.delete(gameId);
          });
      }

      return reply.send({
        ok: true,
        pulling: true,
        message: `${gameDef?.name || gameId} image indiriliyor (~500 MB), lütfen bekleyin...`,
      });
    }

    // 2. İmaj zaten mevcutsa hemen ensureContainerExists çağır (yapılandırma değiştiği için güncelle)
    try {
      await ensureContainerExists(gameId, config, docker, true);
    } catch (createErr: any) {
      fastify.log.error({ createErr }, "ensureContainerExists başarısız oldu");
      return reply.status(500).send({
        ok: false,
        code: "CONTAINER_CREATION_FAILED",
        message: `Konteyner oluşturulamadı: ${createErr.message || String(createErr)}`,
      });
    }

    // 3. Config'i kaydet
    appliedConfigHashes.set(gameId, configHash);

    // Palworld RCON kontrolü (Claude Tavsiyesi: Palworld RCON default kapalı gelir, açılmalı)
    if (gameId === "palworld") {
      fastify.log.info("Palworld için RCONEnabled=True ve Port=25575 ayarlandı.");
    }

    // 4. ok: true dön
    return reply.send({
      ok: true,
      noop: false,
      hash: configHash,
      message: `${gameDef?.name || gameId} yapılandırması kaydedildi ve konteyner hazırlandı.`,
    });
  });

  // ─── 3.5. GET /api/server/summary (Canlı Hub Widget & Hızlı Durum — Fail-Safe <= 1500ms) ───
  fastify.get<{
    Querystring: { gameId?: GameId };
  }>("/api/server/summary", async (request, reply) => {
    const gameId = (request.query?.gameId as GameId) || "fivem";
    const containerName = getContainerName(gameId);
    const gameDef = GAME_CATALOG[gameId];

    const fallback = {
      ok: true,
      data: {
        gameId,
        gameName: gameDef?.name || gameId,
        containerName,
        status: "offline",
        isOnline: false,
        port: gameDef?.defaultConfig?.port || 30120,
        players: 0,
        maxPlayers: gameDef?.defaultConfig?.maxPlayers || 32,
        memoryUsedMb: 0,
        memoryLimitMb: 2048,
        uptime: "Çevrimdışı",
        message: "Sunucu çevrimdışı veya yanıt vermiyor.",
      },
    };

    try {
      const inspectPromise = (async () => {
        const container = docker.getContainer(containerName);
        const data = await container.inspect();
        const isRunning = Boolean(data?.State?.Running);
        return {
          ok: true,
          data: {
            gameId,
            gameName: gameDef?.name || gameId,
            containerName,
            status: isRunning ? "running" : "offline",
            isOnline: isRunning,
            port: gameDef?.defaultConfig?.port || 30120,
            players: 0,
            maxPlayers: gameDef?.defaultConfig?.maxPlayers || 32,
            memoryUsedMb: isRunning ? 512 : 0,
            memoryLimitMb: 2048,
            uptime: isRunning ? (data.State.Status || "running") : "Durduruldu",
            message: isRunning ? "Sunucu aktif ve erişilebilir" : "Sunucu durduruldu",
          },
        };
      })();

      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<typeof fallback>((resolve) => {
        timer = setTimeout(() => resolve(fallback), 1200);
      });

      const res = await Promise.race([inspectPromise, timeoutPromise]).finally(() => {
        clearTimeout(timer!);
      });
      return reply.send(res);
    } catch {
      return reply.send(fallback);
    }
  });

  // ─── 4. GET /api/metrics/stream (SSE — 2000ms Push) ─────────
  fastify.get<{
    Querystring: { gameId?: GameId };
  }>("/api/metrics/stream", async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    const gameId = (request.query?.gameId as GameId) || "fivem";
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    const sendMetrics = async () => {
      try {
        let status: "running" | "stopped" = "stopped";
        let memUsageMb = 0;
        let memLimitMb = 4096;
        let cpuPercent = 0;

        try {
          const inspect = await container.inspect();
          status = inspect.State.Running ? "running" : "stopped";

          if (status === "running") {
            const stats = await container.stats({ stream: false });
            const usedBytes = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
            memUsageMb = Math.round(usedBytes / (1024 * 1024));
            memLimitMb = Math.round(stats.memory_stats.limit / (1024 * 1024));

            const cpuDelta =
              stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta =
              stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
            const numCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;

            if (systemDelta > 0 && cpuDelta > 0) {
              cpuPercent = Math.round((cpuDelta / systemDelta) * numCpus * 1000) / 10;
            }
          }
        } catch {
          // Konteyner durmuşsa veya bulunamadıysa varsayılanlar geçerlidir
        }

        const hostMetrics = opts.governor.getMetrics();
        if (!hostMetrics.serverIp) {
          const hostHeader = (request.headers.host || "").split(":")[0];
          if (hostHeader && hostHeader !== "localhost" && hostHeader !== "127.0.0.1") {
            hostMetrics.serverIp = hostHeader;
          }
        }

        const payload = {
          container: {
            containerId: containerName,
            containerName: GAME_CATALOG[gameId]?.name || containerName,
            status,
            memUsageMb,
            memLimitMb,
            cpuPercent,
            timestamp: Date.now(),
          } satisfies ContainerMetrics & { status: string },
          host: hostMetrics,
        };

        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (err: any) {
        fastify.log.error(err, "SSE metrics push hatası");
      }
    };

    await sendMetrics();
    const interval = setInterval(sendMetrics, 2000);

    request.raw.on("close", () => {
      clearInterval(interval);
    });
  });

  // ─── 5. GET /api/logs/stream (Canlı Log Akışı) ──────────────
  fastify.get<{
    Querystring: { gameId?: GameId };
  }>("/api/logs/stream", async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders();

    const gameId = (request.query?.gameId as GameId) || "minecraft";
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    // Proxy ve tarayıcı bağlantısını canlı tutan keepalive kalp atışı (15 sn)
    const keepAliveTimer = setInterval(() => {
      try {
        if (!reply.raw.writableEnded) {
          reply.raw.write(": keepalive\n\n");
        }
      } catch {
        clearInterval(keepAliveTimer);
      }
    }, 15000);

    let isCleanedUp = false;
    let activeLogStream: any = null;
    let stdoutPass: PassThrough | null = null;
    let stderrPass: PassThrough | null = null;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      clearInterval(keepAliveTimer);
      try { activeLogStream?.destroy?.(); } catch {}
      try { stdoutPass?.destroy?.(); } catch {}
      try { stderrPass?.destroy?.(); } catch {}
    };

    request.raw.on("close", () => {
      cleanup();
    });

    try {
      const inspect = await container.inspect();
      if (!inspect.State?.Running) {
        reply.raw.write(`data: ${JSON.stringify({ log: `\x1b[33m[XIVIZLEY]\x1b[0m ${containerName} sunucusu şu anda çalışmıyor (Durum: ${inspect.State?.Status || "kapalı"}). Başlatıldığında konsol akışı otomatik bağlanacaktır.\r\n` })}\n\n`);
        reply.raw.write("retry: 3000\n\n");
        cleanup();
        reply.raw.end();
        return;
      }

      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 120,
        timestamps: false,
      });
      activeLogStream = logStream;

      const sendLogText = (rawText: string) => {
        if (reply.raw.writableEnded) return;
        reply.raw.write(`data: ${JSON.stringify({ log: rawText })}\n\n`);
      };

      if (inspect.Config?.Tty) {
        // Tty konteynerlerinde 8 byte'lık demux başlığı bulunmaz
        logStream.on("data", (chunk: Buffer) => {
          sendLogText(chunk.toString("utf-8"));
        });
      } else {
        // Tty kapalıysa Docker stdout ve stderr'i 8 byte header ile multiplex eder.
        // Dockerode'un demuxStream API'si karakter kaybını önleyerek temiz stream üretir.
        stdoutPass = new PassThrough();
        stderrPass = new PassThrough();

        stdoutPass.on("data", (chunk: Buffer) => sendLogText(chunk.toString("utf-8")));
        stderrPass.on("data", (chunk: Buffer) => sendLogText(chunk.toString("utf-8")));

        docker.modem.demuxStream(logStream, stdoutPass, stderrPass);
      }

      logStream.on("end", () => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(`data: ${JSON.stringify({ log: `\r\n\x1b[33m[XIVIZLEY]\x1b[0m Sunucu kapandı veya bağlantı sonlandı. Yeniden deneniyor...\r\n` })}\n\n`);
          reply.raw.write("retry: 2500\n\n");
          reply.raw.end();
        }
        cleanup();
      });

      logStream.on("error", (err: any) => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(`data: ${JSON.stringify({ log: `\r\n\x1b[31m[XIVIZLEY Hata]\x1b[0m Log akışında hata: ${err.message}\r\n` })}\n\n`);
          reply.raw.write("retry: 3000\n\n");
          reply.raw.end();
        }
        cleanup();
      });
    } catch (err: any) {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`data: ${JSON.stringify({ log: `\x1b[33m[XIVIZLEY]\x1b[0m ${containerName} konteyneri bulunamadı veya henüz başlatılmadı. Bekleniyor...\r\n` })}\n\n`);
        reply.raw.write("retry: 3000\n\n");
        reply.raw.end();
      }
      cleanup();
    }
  });

  // ─── 6. GET /api/server/files (Konteyner Dosyalarını Listele) ───
  fastify.get<{
    Querystring: { gameId?: GameId; path?: string };
  }>("/api/server/files", async (request, reply) => {
    const gameId = (request.query?.gameId as GameId) || "minecraft";
    const subPath = request.query?.path || "";
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      const inspect = await container.inspect();
      if (!inspect.State.Running) {
        return reply.status(400).send({
          ok: false,
          code: "SERVER_NOT_RUNNING",
          message: "Dosyaları görüntülemek için sunucunun çalışıyor olması gerekir.",
        });
      }

      const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
      const sanitized = subPath.replace(/\.\./g, "").replace(/^\/+/, "");
      const targetDir = sanitized ? `${rootMount}/${sanitized}` : rootMount;

      const script = `for f in "${targetDir}"/* "${targetDir}"/.*; do [ -e "$f" ] || continue; name=$(basename "$f"); [ "$name" = "." ] && continue; if [ -d "$f" ]; then type="dir"; else type="file"; fi; size=$(wc -c < "$f" 2>/dev/null || echo 0); echo "$type|$size|$name"; done`;

      const result = await runExecInContainer(container, ["sh", "-c", script], 5000);
      if (!result.ok && result.exitCode !== 0) {
        return reply.status(500).send({
          ok: false,
          message: `Klasör okunamadı: ${result.output}`,
        });
      }

      const lines = result.output.split("\n").filter((l) => l.trim().length > 0);
      const items: Array<{
        name: string;
        path: string;
        type: "file" | "dir";
        size: number;
        extension: string;
        isEditable: boolean;
      }> = [];

      for (const line of lines) {
        const parts = line.split("|");
        if (parts.length < 3) continue;
        const type = parts[0] === "dir" ? "dir" : "file";
        const size = parseInt(parts[1] || "0", 10) || 0;
        const name = parts.slice(2).join("|").trim();
        if (name === "." || (name === ".." && !sanitized)) continue;

        const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() || "" : "";
        const itemRelPath = sanitized ? `${sanitized}/${name}` : name;

        items.push({
          name,
          path: itemRelPath,
          type,
          size,
          extension: ext,
          isEditable: type === "file" && EDITABLE_EXTENSIONS.has(ext),
        });
      }

      items.sort((a, b) => {
        if (a.name === "..") return -1;
        if (b.name === "..") return 1;
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return reply.send({
        ok: true,
        currentPath: sanitized,
        files: items,
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err.message || "Dosya listesi alınamadı.",
      });
    }
  });

  // ─── 7. GET /api/server/files/content (Dosya İçeriğini Oku) ──────
  fastify.get<{
    Querystring: { gameId?: GameId; path?: string };
  }>("/api/server/files/content", async (request, reply) => {
    const gameId = (request.query?.gameId as GameId) || "minecraft";
    const filePath = request.query?.path;
    if (!filePath) {
      return reply.status(400).send({ ok: false, message: "path parametresi zorunludur." });
    }

    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      const inspect = await container.inspect();
      if (!inspect.State.Running) {
        return reply.status(400).send({ ok: false, message: "Sunucu çalışmıyor." });
      }

      const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
      const sanitized = filePath.replace(/\.\./g, "").replace(/^\/+/, "");
      const targetFile = `${rootMount}/${sanitized}`;

      const result = await runExecInContainer(container, ["head", "-c", "2097152", targetFile], 5000);
      if (!result.ok) {
        return reply.status(500).send({ ok: false, message: `Dosya okunamadı: ${result.output}` });
      }

      return reply.send({
        ok: true,
        path: sanitized,
        content: result.output,
      });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, message: err.message || "Dosya okunamadı." });
    }
  });

  // ─── 8. POST /api/server/files/content (Dosyayı Kaydet & Opsiyonel Yeniden Başlat) ──
  fastify.post<{
    Body: { gameId: GameId; path: string; content: string; restart?: boolean };
  }>("/api/server/files/content", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { gameId, path: filePath, content, restart } = request.body || {};
    if (!gameId || !filePath || content === undefined) {
      return reply.status(400).send({ ok: false, message: "gameId, path ve content zorunludur." });
    }

    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      const inspect = await container.inspect();
      if (!inspect.State.Running) {
        return reply.status(400).send({ ok: false, message: "Sunucu çalışmıyor." });
      }

      const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
      const sanitized = filePath.replace(/\.\./g, "").replace(/^\/+/, "");
      const targetFile = `${rootMount}/${sanitized}`;

      const b64 = Buffer.from(content, "utf-8").toString("base64");
      const writeCmd = `echo "${b64}" | base64 -d > "${targetFile}"`;

      const result = await runExecInContainer(container, ["sh", "-c", writeCmd], 8000);
      if (!result.ok && result.exitCode !== 0) {
        return reply.status(500).send({ ok: false, message: `Dosya yazılamadı: ${result.output}` });
      }

      let restarted = false;
      if (restart) {
        await container.restart({ t: 3 }).catch(() => {});
        restarted = true;
      }

      return reply.send({
        ok: true,
        restarted,
        message: restarted ? "Dosya kaydedildi ve sunucu yeniden başlatıldı!" : "Dosya başarıyla kaydedildi.",
      });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, message: err.message || "Dosya kaydedilemedi." });
    }
  });

  // ─── 9. DELETE /api/server/files (Dosya veya Klasör Sil) ────────
  fastify.delete<{
    Body: { gameId: GameId; path: string };
  }>("/api/server/files", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { gameId, path: filePath } = request.body || {};
    if (!gameId || !filePath) {
      return reply.status(400).send({ ok: false, message: "gameId ve path zorunludur." });
    }

    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      const rootMount = GAME_CATALOG[gameId]?.volumeMountPath || "/data";
      const sanitized = filePath.replace(/\.\./g, "").replace(/^\/+/, "");
      if (!sanitized) {
        return reply.status(400).send({ ok: false, message: "Kök dizin silinemez." });
      }
      const targetFile = `${rootMount}/${sanitized}`;

      const result = await runExecInContainer(container, ["rm", "-rf", targetFile], 5000);
      return reply.send({
        ok: result.ok,
        message: result.ok ? "Dosya başarıyla silindi." : result.output,
      });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, message: err.message || "Silme işlemi başarısız." });
    }
  });

  // ─── 10. GET /api/server/players (Canlı Oyuncu Listesi) ─────────
  fastify.get<{
    Querystring: { gameId?: GameId };
  }>("/api/server/players", async (request, reply) => {
    const gameId = (request.query?.gameId as GameId) || "minecraft";
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      const inspect = await container.inspect();
      if (!inspect.State.Running) {
        return reply.send({ ok: true, onlineCount: 0, maxPlayers: 0, players: [] });
      }

      if (gameId === "minecraft") {
        const adapter = getCommandAdapter(gameId, containerName, docker);
        const res = await adapter.send("list");
        const output = res.response || "";

        let onlineCount = 0;
        let maxPlayers = 30;
        let playerNames: string[] = [];

        const countMatch = output.match(/(\d+)\s*(?:out of|of a max of|\/)\s*(\d+)/i);
        if (countMatch) {
          onlineCount = parseInt(countMatch[1] || "0", 10);
          maxPlayers = parseInt(countMatch[2] || "30", 10);
        }

        const namesIndex = output.indexOf(":");
        if (namesIndex !== -1) {
          const namesPart = output.substring(namesIndex + 1).trim();
          if (namesPart) {
            playerNames = namesPart.split(",").map((n) => n.trim()).filter(Boolean);
          }
        }

        let opList = new Set<string>();
        try {
          const opsRes = await runExecInContainer(container, ["cat", "/data/ops.json"], 2000);
          if (opsRes.ok && opsRes.output.trim().startsWith("[")) {
            const opsData = JSON.parse(opsRes.output);
            if (Array.isArray(opsData)) {
              opsData.forEach((op: any) => {
                if (op.name) opList.add(op.name.toLowerCase());
              });
            }
          }
        } catch {}

        const players = playerNames.map((name) => ({
          name,
          isOp: opList.has(name.toLowerCase()),
          avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(name)}/64`,
        }));

        return reply.send({
          ok: true,
          onlineCount: players.length || onlineCount,
          maxPlayers,
          players,
        });
      }

      if (gameId === "fivem") {
        return reply.send({
          ok: true,
          onlineCount: 0,
          maxPlayers: 32,
          players: [],
        });
      }

      return reply.send({
        ok: true,
        onlineCount: 0,
        maxPlayers: 0,
        players: [],
      });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, message: err.message || "Oyuncular listelenemedi." });
    }
  });

  // ─── 11. POST /api/server/players/action (Oyuncuya İşlem Uygula) ─
  fastify.post<{
    Body: {
      gameId: GameId;
      action: "kick" | "ban" | "op" | "deop" | "msg";
      player: string;
      reason?: string;
      message?: string;
    };
  }>("/api/server/players/action", async (request, reply) => {
    const { gameId, action, player, reason, message } = request.body || {};
    if (!gameId || !action || !player) {
      return reply.status(400).send({ ok: false, message: "gameId, action ve player zorunludur." });
    }

    const containerName = getContainerName(gameId);
    const adapter = getCommandAdapter(gameId, containerName, docker);

    let cmd = "";
    switch (action) {
      case "kick":
        cmd = `kick ${player} "${reason || "Sunucu yöneticisi tarafından atıldınız."}"`;
        break;
      case "ban":
        cmd = `ban ${player} "${reason || "Sunucudan yasaklandınız."}"`;
        break;
      case "op":
        cmd = `op ${player}`;
        break;
      case "deop":
        cmd = `deop ${player}`;
        break;
      case "msg":
        cmd = `tell ${player} ${message || "Merhaba!"}`;
        break;
      default:
        return reply.status(400).send({ ok: false, message: "Geçersiz eylem türü." });
    }

    const result = await adapter.send(cmd);
    return reply.send({
      ok: result.ok,
      command: cmd,
      response: result.response,
      message: result.ok ? `İşlem başarıyla uygulandı: ${action.toUpperCase()}` : result.error,
    });
  });
};
