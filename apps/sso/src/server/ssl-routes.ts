import type { FastifyPluginAsync } from "fastify";
import { getSslRadarReport } from "./services/sslRadarService.js";

export const sslRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /api/ssl/radar ─────────────────────────────────────────
  fastify.get("/api/ssl/radar", async (request, reply) => {
    try {
      const forceRefresh = (request.query as any)?.refresh === "true";
      const report = await getSslRadarReport(forceRefresh);
      return reply.send({
        ok: true,
        checkedAt: report.checkedAt,
        summary: report.summary,
        domains: report.domains,
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "SSL Radar taraması gerçekleştirilemedi.",
      });
    }
  });
};
