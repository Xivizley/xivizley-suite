import type { FastifyPluginAsync } from "fastify";
import {
  runSystemDiagnostics,
  remediateDiagnosticIssue,
} from "./services/doctorService.js";

export const doctorRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Sistem Sağlık Teşhis Raporu
  fastify.get("/api/doctor/diagnostics", async (_request, reply) => {
    try {
      const report = await runSystemDiagnostics();
      return reply.send({ ok: true, data: report });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, message: err.message });
    }
  });

  // 2. 1-Tıkla Otomatik Onarım Eylemi
  fastify.post("/api/doctor/remediate", async (request, reply) => {
    const body = (request.body || {}) as {
      containerId?: string;
      action?: string;
    };
    const { containerId, action = "restart" } = body;

    if (!containerId) {
      return reply
        .status(400)
        .send({ ok: false, message: "containerId parametresi zorunludur." });
    }

    const user = (request as any).user;
    if (user?.role === "guest") {
      return reply.status(403).send({
        ok: false,
        code: "DEMO_READ_ONLY",
        message:
          "Canlı demo modunda sunucu konteynerleri üzerinde değişiklik yapılamaz.",
      });
    }

    const result = await remediateDiagnosticIssue(containerId, action);
    return reply.send(result);
  });
};
