import type { FastifyPluginAsync } from "fastify";
import Docker from "dockerode";
import crypto from "crypto";
import { withXivizleyAuth } from "@xivizley/xivizley-id";
import type { ResourceGovernor } from "@xivizley/resource-gov";
import type { ContainerMetrics, GameId, ActiveServerConfig } from "@xivizley/types";
import { getCommandAdapter } from "./adapters/command-adapter";
import { GAME_CATALOG } from "../data/game-catalog";

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
      const type =
        config.engineId === "purpur"
          ? "PURPUR"
          : config.engineId === "fabric"
          ? "FABRIC"
          : config.engineId === "forge"
          ? "FORGE"
          : "PAPER";
      env.push(`TYPE=${type}`);
      env.push(`VERSION=${config.version || "LATEST"}`);
      env.push(`MEMORY=${memMb}M`);
      env.push(`SERVER_PORT=${port}`);
      break;
    }
    case "fivem": {
      env.push(`PORT=${port}`);
      break;
    }
    case "cs2": {
      env.push(`SRCDS_PORT=${port}`);
      env.push(`SRCDS_MAXPLAYERS=${config.maxPlayers || 10}`);
      break;
    }
    case "rust": {
      env.push(`RUST_SERVER_PORT=${port}`);
      env.push("RUST_RCON_PORT=28016");
      env.push(`RUST_RCON_PASSWORD=${process.env["XIVIZLEY_RCON_PASSWORD"] || "xivizley_secure_rcon_2026"}`);
      break;
    }
    case "palworld": {
      env.push(`PORT=${port}`);
      env.push("RCON_ENABLED=true");
      env.push("RCON_PORT=25575");
      env.push(`ADMIN_PASSWORD=${process.env["XIVIZLEY_RCON_PASSWORD"] || "xivizley_secure_rcon_2026"}`);
      break;
    }
    default:
      break;
  }
  return env;
}

/** Konteyner yoksa otomatik oluşturucu (Lazy Container Creation) */
async function ensureContainerExists(gameId: GameId, config: ActiveServerConfig, docker: Docker): Promise<void> {
  const containerName = getContainerName(gameId);
  try {
    await docker.getContainer(containerName).inspect();
    // Varsa dokunma
  } catch (err: any) {
    if (err.statusCode !== 404) throw err;

    const gameDef = GAME_CATALOG[gameId];
    // Kural 2: ensureContainerExists içinde createContainer öncesi ensureImageExists çağır
    await ensureImageExists(docker, gameDef.dockerImage);

    const memMb = (config as any).memLimitMb || gameDef.minRamMb || 2048;
    const port = config.port || gameDef.defaultPort;

    const portBindings: Record<string, Array<{ HostPort: string }>> = {
      [`${port}/tcp`]: [{ HostPort: String(port) }],
      [`${port}/udp`]: [{ HostPort: String(port) }],
    };

    if (gameId === "rust") {
      portBindings["28016/tcp"] = [{ HostPort: "28016" }];
    } else if (gameId === "palworld") {
      portBindings["25575/tcp"] = [{ HostPort: "25575" }];
    }

    // Yoksa oluştur
    await docker.createContainer({
      name: containerName,
      Image: gameDef.dockerImage,
      Env: getGameEnvVars(gameId, config),
      HostConfig: {
        Memory: memMb * 1024 * 1024,
        PortBindings: portBindings,
        Binds: [`${gameDef.volumeName}:${gameDef.volumeMountPath}`],
        OomScoreAdj: gameId === "fivem" ? -500 : 0,
        RestartPolicy: { Name: "unless-stopped" },
        NetworkMode: "xivizley-network",
      },
    });
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

  // ─── 2. POST /api/server/command (CommandAdapter Deseni) ──
  fastify.post<{
    Body: { gameId?: GameId; command: string };
  }>("/api/server/command", async (request, reply) => {
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
    const { gameId, config } = request.body || {};

    if (!gameId || !config) {
      return reply.status(400).send({ ok: false, message: "gameId ve config zorunludur." });
    }

    // 1. Config hash hesapla ve kontrol et (idempotent)
    const configString = JSON.stringify({
      engineId: config.engineId,
      version: config.version,
      selectedPackIds: [...config.selectedPackIds].sort(),
      enabledPluginIds: [...config.enabledPluginIds].sort(),
      port: config.port,
      maxPlayers: config.maxPlayers,
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

    const gameDef = GAME_CATALOG[gameId];

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
        ensureContainerExists(gameId, config, docker)
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

    // 2. İmaj zaten mevcutsa hemen ensureContainerExists çağır
    try {
      await ensureContainerExists(gameId, config, docker);
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
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    const gameId = (request.query?.gameId as GameId) || "fivem";
    const containerName = getContainerName(gameId);
    const container = docker.getContainer(containerName);

    try {
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: false,
      });

      logStream.on("data", (chunk: Buffer) => {
        const cleanText = chunk.length > 8 ? chunk.subarray(8).toString("utf-8") : chunk.toString("utf-8");
        reply.raw.write(`data: ${JSON.stringify({ log: cleanText })}\n\n`);
      });

      request.raw.on("close", () => {
        (logStream as any).destroy?.();
      });
    } catch {
      reply.raw.write(`data: ${JSON.stringify({ log: `[${containerName}] Log akışına bağlanılamadı. Konteyner kapalı olabilir.\n` })}\n\n`);
    }
  });
};
