import type { FastifyPluginAsync } from "fastify";
import {
  getNotificationConfig,
  updateNotificationConfig,
  sendTestDiscordAlert,
} from "./services/notificationService.js";

interface NotificationConfigBody {
  discordWebhookUrl?: string | null;
  discordEnabled?: boolean;
  debounceMinutes?: number;
}

interface TestDiscordBody {
  webhookUrl?: string;
}

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── 1. GET /api/notifications/config ─────────────────────────
  fastify.get("/api/notifications/config", async (_request, reply) => {
    try {
      const config = getNotificationConfig();
      return reply.send({
        ok: true,
        data: {
          webhookUrl: config.maskedDiscordWebhookUrl,
          hasWebhook: Boolean(config.discordWebhookUrl),
          discordEnabled: config.discordEnabled,
          debounceMinutes: config.debounceMinutes,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        message: err?.message || "Bildirim yapılandırması alınamadı.",
      });
    }
  });

  // ─── 2. POST /api/notifications/config ────────────────────────
  fastify.post<{ Body: NotificationConfigBody }>(
    "/api/notifications/config",
    async (request, reply) => {
      try {
        const body = request.body || {};
        const updated = updateNotificationConfig({
          discordWebhookUrl: body.discordWebhookUrl,
          discordEnabled: body.discordEnabled,
          debounceMinutes: body.debounceMinutes,
        });

        return reply.send({
          ok: true,
          message: "Discord webhook ve bildirim ayarları kaydedildi.",
          data: {
            webhookUrl: updated.maskedDiscordWebhookUrl,
            hasWebhook: Boolean(updated.discordWebhookUrl),
            discordEnabled: updated.discordEnabled,
            debounceMinutes: updated.debounceMinutes,
          },
        });
      } catch (err: any) {
        return reply.status(500).send({
          ok: false,
          message: err?.message || "Bildirim ayarları güncellenemedi.",
        });
      }
    }
  );

  // ─── 3. POST /api/notifications/test-discord ──────────────────
  fastify.post<{ Body: TestDiscordBody }>(
    "/api/notifications/test-discord",
    async (request, reply) => {
      try {
        const customUrl = request.body?.webhookUrl;
        const result = await sendTestDiscordAlert(customUrl);
        return reply.status(result.ok ? 200 : 400).send(result);
      } catch (err: any) {
        return reply.status(500).send({
          ok: false,
          message: err?.message || "Discord test uyarısı gönderilemedi.",
        });
      }
    }
  );
};
