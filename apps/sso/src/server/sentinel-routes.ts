import type { FastifyPluginAsync } from "fastify";
import {
  getSentinelStatus,
  sendTestTelegramAlert,
  updateSentinelConfig,
} from "./services/sentinelService.js";

interface SentinelConfigBody {
  cpuPercent?: number;
  ramPercent?: number;
  diskPercent?: number;
  debounceMinutes?: number;
  telegramChatId?: string;
}

interface TestTelegramBody {
  chatId?: string;
}

export const sentinelRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── 1. GET /api/sentinel/status ──────────────────────────────
  fastify.get("/api/sentinel/status", async (_request, reply) => {
    try {
      const status = await getSentinelStatus();
      return reply.send({ ok: true, data: status });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Sentinel durum verisi alınamadı.",
      });
    }
  });

  // ─── 2. POST /api/sentinel/test-telegram ─────────────────────
  fastify.post<{ Body: TestTelegramBody }>("/api/sentinel/test-telegram", async (request, reply) => {
    try {
      const chatId = request.body?.chatId;
      const res = await sendTestTelegramAlert(chatId);
      return reply.send(res);
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Test bildirimi gönderilemedi.",
      });
    }
  });

  // ─── 3. POST /api/sentinel/config ─────────────────────────────
  fastify.post<{ Body: SentinelConfigBody }>("/api/sentinel/config", async (request, reply) => {
    try {
      const body = request.body || {};
      const updated = updateSentinelConfig(body);
      return reply.send({
        ok: true,
        message: "Sentinel alarm eşikleri ve Telegram ayarları güncellendi.",
        config: updated,
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Ayarlar kaydedilemedi.",
      });
    }
  });
};
