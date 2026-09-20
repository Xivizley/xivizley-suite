import type { FastifyPluginAsync } from "fastify";
import Docker from "dockerode";
import { withXivizleyAuth } from "@xivizley/xivizley-id";
import type { ResourceGovernor } from "@xivizley/resource-gov";
import type { ContainerMetrics } from "@xivizley/types";

const CONTAINER_NAME = process.env["FIVEM_CONTAINER_NAME"] || "fivem-server";

export interface GamePanelRoutesOptions {
  governor: ResourceGovernor;
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
  }>("/api/server/:action", async (request, reply) => {
    const { action } = request.params;
    const container = docker.getContainer(CONTAINER_NAME);

    try {
      if (action === "start") {
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
          container: CONTAINER_NAME,
          action,
          requestedBy: request.user?.email,
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

  // ─── 2. GET /api/metrics/stream (SSE — 2000ms Push) ─────────
  fastify.get("/api/metrics/stream", async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    const container = docker.getContainer(CONTAINER_NAME);

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
            // RAM hesabı
            const usedBytes = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
            memUsageMb = Math.round(usedBytes / (1024 * 1024));
            memLimitMb = Math.round(stats.memory_stats.limit / (1024 * 1024));

            // CPU hesabı
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
          // Container bulunamadıysa veya kapalıysa varsayılanlar gider
        }

        const hostMetrics = opts.governor.getMetrics();

        const payload = {
          container: {
            containerId: CONTAINER_NAME,
            containerName: "FiveM Roleplay",
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

    // İlk push'u hemen yap
    await sendMetrics();

    // 2 saniyede bir periyodik push
    const interval = setInterval(sendMetrics, 2000);

    request.raw.on("close", () => {
      clearInterval(interval);
    });
  });

  // ─── 3. GET /api/logs/stream (Canlı Log Akışı) ──────────────
  fastify.get("/api/logs/stream", async (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    const container = docker.getContainer(CONTAINER_NAME);

    try {
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: false,
      });

      logStream.on("data", (chunk: Buffer) => {
        // Docker multiplex header (ilk 8 byte'ı temizle)
        const cleanText = chunk.length > 8 ? chunk.subarray(8).toString("utf-8") : chunk.toString("utf-8");
        reply.raw.write(`data: ${JSON.stringify({ log: cleanText })}\n\n`);
      });

      request.raw.on("close", () => {
        logStream.destroy();
      });
    } catch {
      reply.raw.write(`data: ${JSON.stringify({ log: "Log akışına bağlanılamadı. Konteyner kapalı olabilir.\n" })}\n\n`);
    }
  });
};
