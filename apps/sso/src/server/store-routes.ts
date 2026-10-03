// ============================================================
// XIVIZLEY Suite — Docker Native App Store Routes (R3 & R6)
// 115+ Homelab Docker Applications Catalog, 1-Click Runner,
// YAML Generator & Strict Port / Volume Storage Isolation
// ============================================================

import type { FastifyPluginAsync } from "fastify";
import fs from "node:fs";
import path from "node:path";
import Docker from "dockerode";
import yaml from "js-yaml";
import { STORE_CATALOG, STORE_CATEGORIES, type StoreApp } from "./store-catalog.js";
import { withXivizleyAuth } from "@xivizley/xivizley-id";

// Initialize Dockerode
let dockerInstance: Docker | null = null;
function getDocker(): Docker {
  if (!dockerInstance) {
    const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
    dockerInstance = new Docker({ socketPath });
  }
  return dockerInstance;
}

// Host reserved system ports that must NEVER collide
const RESERVED_PORTS = new Set([
  22,    // SSH
  80,    // HTTP (Caddy / CasaOS)
  443,   // HTTPS (Caddy)
  3000,  // XIVIZLEY Hub
  5432,  // PostgreSQL
  8080,  // qBittorrent
  8088,  // Filebrowser
  8096,  // Jellyfin
  30120, // FiveM
  22666, // Custom SSH / Management
]);

/**
 * Executes an async task with strict timeout protection (R6: <= 1500ms)
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 1500, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Inspect active Docker containers to find used host ports and app statuses
 */
async function getDockerState(): Promise<{
  activePorts: Set<number>;
  installedApps: Map<string, { containerId: string; status: string; isRunning: boolean; port?: number | undefined }>;
}> {
  const activePorts = new Set<number>(RESERVED_PORTS);
  const installedApps = new Map<string, { containerId: string; status: string; isRunning: boolean; port?: number | undefined }>();

  try {
    const docker = getDocker();
    const containers = await withTimeout(docker.listContainers({ all: true }), 1200, []);

    for (const c of containers) {
      const isRunning = c.State === "running";

      // Track all published host ports
      for (const p of c.Ports || []) {
        if (p.PublicPort) {
          activePorts.add(p.PublicPort);
        }
      }

      // Check for xivizley-app-<id> naming convention or labels
      for (const name of c.Names || []) {
        const cleanName = name.replace(/^\//, "");
        if (cleanName.startsWith("xivizley-app-")) {
          const appId = cleanName.replace("xivizley-app-", "");
          const publicPort = c.Ports?.[0]?.PublicPort;
          installedApps.set(appId, {
            containerId: c.Id,
            status: c.Status,
            isRunning,
            port: publicPort,
          });
        }
      }
    }
  } catch (err) {
    // Fail-safe: degrade gracefully without blocking
  }

  return { activePorts, installedApps };
}

/**
 * Finds the first available non-colliding host port starting from desired port
 */
function findAvailablePort(desiredPort: number, usedPorts: Set<number>): number {
  let candidate = desiredPort;
  while (usedPorts.has(candidate)) {
    candidate++;
  }
  return candidate;
}

/**
 * Generates clean Docker Compose YAML for a specific app
 * Strictly adhering to /opt/xivizley-apps/<app-id>/ volume standard
 */
export function generateAppComposeYaml(app: StoreApp, hostPortOverride?: number): string {
  const primaryPort = app.ports[0];
  const hostPort = hostPortOverride || primaryPort?.default || 8080;
  const internalPort = primaryPort?.internal || 80;
  const protocol = primaryPort?.protocol === "udp" ? "/udp" : "";

  const ports = primaryPort ? [`${hostPort}:${internalPort}${protocol}`] : [];

  // Strictly enforce /opt/xivizley-apps/<app-id>/
  const volumes = app.volumes.map((v) => {
    let hostDir = v.hostPath;
    if (!hostDir.startsWith("/opt/xivizley-apps/")) {
      const sub = path.basename(v.hostPath) || "data";
      hostDir = `/opt/xivizley-apps/${app.id}/${sub}`;
    }
    return `${hostDir}:${v.containerPath}`;
  });

  const environment: Record<string, string> = {};
  for (const env of app.environment) {
    if (env.defaultValue) {
      environment[env.key] = env.defaultValue;
    }
  }

  const composeObj = {
    version: "3.8",
    services: {
      [app.id]: {
        image: `${app.dockerImage}:${app.defaultTag || "latest"}`,
        container_name: `xivizley-app-${app.id}`,
        restart: "unless-stopped",
        ...(ports.length > 0 ? { ports } : {}),
        ...(volumes.length > 0 ? { volumes } : {}),
        ...(Object.keys(environment).length > 0 ? { environment } : {}),
      },
    },
  };

  return yaml.dump(composeObj, { indent: 2, lineWidth: -1 });
}

export const storeRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth desteği
  await fastify.register(withXivizleyAuth, { optional: true });

  // ─── 1. GET /api/store/apps (Tüm Mağaza Kataloğu & Canlı Durum) ────
  fastify.get<{
    Querystring: { search?: string; category?: string };
  }>("/api/store/apps", async (request, reply) => {
    try {
      const { search, category } = request.query || {};

      // Docker durumunu 1500ms timeout ile güvenli çek
      const { installedApps } = await getDockerState();

      let apps = STORE_CATALOG.map((app) => {
        const installedInfo = installedApps.get(app.id);
        return {
          ...app,
          isInstalled: Boolean(installedInfo),
          isRunning: Boolean(installedInfo?.isRunning),
          assignedPort: installedInfo?.port || app.ports[0]?.default,
          containerId: installedInfo?.containerId,
        };
      });

      // Kategori filtrelemesi
      if (category && category !== "all") {
        apps = apps.filter((a) => a.category === category);
      }

      // Canlı arama filtresi
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        apps = apps.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q) ||
            a.dockerImage.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
        );
      }

      return reply.send({
        ok: true,
        count: apps.length,
        total: STORE_CATALOG.length,
        categories: STORE_CATEGORIES,
        data: apps,
      });
    } catch (err: any) {
      // Fail-safe degrade
      return reply.send({
        ok: true,
        count: STORE_CATALOG.length,
        total: STORE_CATALOG.length,
        categories: STORE_CATEGORIES,
        data: STORE_CATALOG,
      });
    }
  });

  // ─── 2. GET /api/store/apps/:id (Tek Uygulama Detayı & YAML) ────
  fastify.get<{ Params: { id: string } }>("/api/store/apps/:id", async (request, reply) => {
    const { id } = request.params;
    const app = STORE_CATALOG.find((a) => a.id === id);

    if (!app) {
      return reply.status(404).send({ ok: false, message: "Uygulama bulunamadı." });
    }

    const { installedApps, activePorts } = await getDockerState();
    const installedInfo = installedApps.get(app.id);
    const defaultPort = app.ports[0]?.default || 8080;
    const isPortTaken = activePorts.has(defaultPort) && !installedInfo;
    const suggestedPort = isPortTaken ? findAvailablePort(defaultPort, activePorts) : defaultPort;

    const composeYaml = generateAppComposeYaml(app, suggestedPort);
    const cliCommand = `xivizley install ${app.id}`;

    return reply.send({
      ok: true,
      data: {
        ...app,
        isInstalled: Boolean(installedInfo),
        isRunning: Boolean(installedInfo?.isRunning),
        assignedPort: installedInfo?.port || suggestedPort,
        containerId: installedInfo?.containerId,
        isPortTaken,
        suggestedPort,
        composeYaml,
        cliCommand,
      },
    });
  });

  // ─── 3. GET /api/store/yaml/:id (Doğrudan YAML İndirme/Görüntüleme) ─
  fastify.get<{ Params: { id: string } }>("/api/store/yaml/:id", async (request, reply) => {
    const { id } = request.params;
    const app = STORE_CATALOG.find((a) => a.id === id);

    if (!app) {
      return reply.status(404).send({ ok: false, message: "Uygulama bulunamadı." });
    }

    const composeYaml = generateAppComposeYaml(app);
    reply.header("Content-Type", "text/yaml; charset=utf-8");
    return reply.send(composeYaml);
  });

  // ─── 4. POST /api/store/install (1-Tıkla Docker Engine Kurulumu) ──
  fastify.post<{
    Body: { appId: string; customPort?: number };
  }>("/api/store/install", async (request, reply) => {
    try {
      const { appId, customPort } = request.body || {};
      const app = STORE_CATALOG.find((a) => a.id === appId);

      if (!app) {
        return reply.status(404).send({ ok: false, message: "Katalogda bu uygulama bulunamadı." });
      }

      const docker = getDocker();
      const { activePorts, installedApps } = await getDockerState();

      // Zaten kurulu mu kontrol et
      if (installedApps.has(app.id)) {
        const info = installedApps.get(app.id);
        if (info?.isRunning) {
          return reply.send({
            ok: true,
            message: "Uygulama zaten kurulu ve çalışıyor.",
            port: info.port,
            containerId: info.containerId,
          });
        }
      }

      // Port çakışma denetimi ve otomatik boş port tayini
      const defaultPort = app.ports[0]?.default || 8080;
      let finalPort = customPort || defaultPort;

      if (activePorts.has(finalPort)) {
        finalPort = findAvailablePort(finalPort, activePorts);
      }

      const primaryPort = app.ports[0];
      const internalPort = primaryPort?.internal || 80;

      // ─── App Storage Standard (R6): Strictly /opt/xivizley-apps/<app-id>/ ───
      const hostAppDir = `/opt/xivizley-apps/${app.id}`;
      try {
        if (!fs.existsSync(hostAppDir)) {
          fs.mkdirSync(hostAppDir, { recursive: true });
        }
      } catch {
        // Container içinden host dosya sistemine doğrudan erişilemeyebilir, Docker bind handle eder
      }

      const binds = app.volumes.map((v) => {
        let hostDir = v.hostPath;
        if (!hostDir.startsWith("/opt/xivizley-apps/")) {
          const sub = path.basename(v.hostPath) || "data";
          hostDir = `/opt/xivizley-apps/${app.id}/${sub}`;
        }
        return `${hostDir}:${v.containerPath}`;
      });

      const exposedPorts: Record<string, {}> = {};
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};

      if (primaryPort) {
        const key = `${internalPort}/tcp`;
        exposedPorts[key] = {};
        portBindings[key] = [{ HostPort: String(finalPort) }];
      }

      const envList = app.environment
        .filter((e) => e.defaultValue !== undefined)
        .map((e) => `${e.key}=${e.defaultValue}`);

      const containerName = `xivizley-app-${app.id}`;
      const fullImage = `${app.dockerImage}:${app.defaultTag || "latest"}`;

      // İmajın varlığını kontrol et, yoksa Docker Hub'dan çek
      try {
        await docker.getImage(fullImage).inspect();
      } catch (err: any) {
        if (err.statusCode === 404) {
          await new Promise<void>((resolve, reject) => {
            docker.pull(fullImage, (pullErr: any, stream: any) => {
              if (pullErr) return reject(pullErr);
              docker.modem.followProgress(stream, (progressErr: any) => {
                if (progressErr) reject(progressErr);
                else resolve();
              });
            });
          });
        }
      }

      // Eski durmuş konteyner varsa temizle
      try {
        const existing = docker.getContainer(containerName);
        await existing.remove({ force: true });
      } catch {
        // Yoksa devam et
      }

      // Konteyneri oluştur
      const container = await docker.createContainer({
        Image: fullImage,
        name: containerName,
        ExposedPorts: exposedPorts,
        HostConfig: {
          PortBindings: portBindings,
          Binds: binds,
          RestartPolicy: { Name: "unless-stopped" },
        },
        Env: envList,
      });

      // Konteyneri başlat
      await container.start();

      return reply.send({
        ok: true,
        message: `${app.name} başarıyla kuruldu ve başlatıldı.`,
        appId: app.id,
        containerName,
        containerId: container.id,
        port: finalPort,
        storagePath: hostAppDir,
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Uygulama başlatılırken bir hata oluştu.",
      });
    }
  });

  // ─── 5. POST /api/store/uninstall (Konteyneri Durdur ve Kaldır) ──
  fastify.post<{ Body: { appId: string } }>("/api/store/uninstall", async (request, reply) => {
    try {
      const { appId } = request.body || {};
      if (!appId) {
        return reply.status(400).send({ ok: false, message: "appId zorunludur." });
      }

      const docker = getDocker();
      const containerName = `xivizley-app-${appId}`;

      try {
        const container = docker.getContainer(containerName);
        await container.stop({ t: 3 }).catch(() => {});
        await container.remove({ force: true });
        return reply.send({
          ok: true,
          message: `${appId} konteyneri durduruldu ve kaldırıldı.`,
        });
      } catch (err: any) {
        if (err?.statusCode === 404) {
          return reply.send({ ok: true, message: "Konteyner zaten bulunamadı." });
        }
        throw err;
      }
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Kaldırma işlemi başarısız oldu.",
      });
    }
  });

  // ─── 6. GET /api/store/ports/check (Canlı Port Doluluk Durumu) ────
  fastify.get("/api/store/ports/check", async (_request, reply) => {
    const { activePorts } = await getDockerState();
    return reply.send({
      ok: true,
      activePorts: Array.from(activePorts).sort((a, b) => a - b),
      reservedCount: RESERVED_PORTS.size,
    });
  });

  // ─── 7. GET /api/store/containers/:id/logs (Canlı Konteyner Logları) ─
  fastify.get<{ Params: { id: string } }>("/api/store/containers/:id/logs", async (request, reply) => {
    try {
      const { id } = request.params;
      const docker = getDocker();
      const containerName = `xivizley-app-${id}`;
      const container = docker.getContainer(containerName);

      const logsBuffer = await withTimeout(
        container.logs({
          stdout: true,
          stderr: true,
          tail: 150,
          timestamps: true,
        }),
        1500,
        Buffer.from("Log verisi alınamadı veya zaman aşımı.\n")
      );

      // Clean Docker multiplexing headers (8-byte header per frame)
      let logText = "";
      if (Buffer.isBuffer(logsBuffer)) {
        let offset = 0;
        while (offset < logsBuffer.length) {
          if (offset + 8 <= logsBuffer.length) {
            const frameSize = logsBuffer.readUInt32BE(offset + 4);
            const frameContent = logsBuffer.subarray(offset + 8, offset + 8 + frameSize);
            logText += frameContent.toString("utf-8");
            offset += 8 + frameSize;
          } else {
            logText += logsBuffer.subarray(offset).toString("utf-8");
            break;
          }
        }
      } else {
        logText = String(logsBuffer);
      }

      return reply.send({
        ok: true,
        appId: id,
        logs: logText || "Henüz log kaydı oluşmadı.",
      });
    } catch (err: any) {
      return reply.status(200).send({
        ok: false,
        logs: `Log okunamadı: ${err?.message || "Konteyner durmuş veya bulunamadı."}`,
      });
    }
  });

  // ─── 8. GET /api/store/containers/:id/stats (Canlı CPU/RAM Kullanımı) ─
  fastify.get<{ Params: { id: string } }>("/api/store/containers/:id/stats", async (request, reply) => {
    try {
      const { id } = request.params;
      const docker = getDocker();
      const containerName = `xivizley-app-${id}`;
      const container = docker.getContainer(containerName);

      const stats: any = await withTimeout(
        container.stats({ stream: false }),
        1500,
        null
      );

      if (!stats) {
        return reply.send({
          ok: false,
          data: { status: "stopped", cpuPercent: 0, memoryUsedMb: 0, memoryLimitMb: 0 },
        });
      }

      // Calculate CPU percent
      let cpuPercent = 0;
      const cpuDelta = stats.cpu_stats?.cpu_usage?.total_usage - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
      const systemDelta = stats.cpu_stats?.system_cpu_usage - (stats.precpu_stats?.system_cpu_usage || 0);
      const onlineCpus = stats.cpu_stats?.online_cpus || 1;

      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent = Math.round((cpuDelta / systemDelta) * onlineCpus * 1000) / 10;
      }

      // Memory stats
      const memoryUsed = stats.memory_stats?.usage || 0;
      const memoryLimit = stats.memory_stats?.limit || 1;
      const memoryUsedMb = Math.round((memoryUsed / (1024 * 1024)) * 10) / 10;
      const memoryLimitMb = Math.round((memoryLimit / (1024 * 1024)) * 10) / 10;

      return reply.send({
        ok: true,
        data: {
          status: "running",
          cpuPercent,
          memoryUsedMb,
          memoryLimitMb,
          memoryPercent: Math.round((memoryUsed / memoryLimit) * 1000) / 10,
        },
      });
    } catch {
      return reply.send({
        ok: true,
        data: { status: "stopped", cpuPercent: 0, memoryUsedMb: 0, memoryLimitMb: 0 },
      });
    }
  });

  // ─── 9. POST /api/store/containers/:id/action (Start / Stop / Restart) ─
  fastify.post<{ Params: { id: string }; Body: { action: "start" | "stop" | "restart" } }>(
    "/api/store/containers/:id/action",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { action } = request.body || {};
        const docker = getDocker();
        const containerName = `xivizley-app-${id}`;
        const container = docker.getContainer(containerName);

        if (action === "restart") {
          await container.restart({ t: 5 });
        } else if (action === "stop") {
          await container.stop({ t: 5 });
        } else if (action === "start") {
          await container.start();
        } else {
          return reply.status(400).send({ ok: false, message: "Geçersiz eylem." });
        }

        return reply.send({
          ok: true,
          message: `${id} konteyneri ${action} işlemi tamamlandı.`,
        });
      } catch (err: any) {
        return reply.status(500).send({
          ok: false,
          message: err?.message || "Konteyner işlemi başarısız oldu.",
        });
      }
    }
  );
};
