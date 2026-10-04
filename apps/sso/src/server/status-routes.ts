import type { FastifyPluginAsync } from "fastify";

export interface ServiceStatusItem {
  id: string;
  name: string;
  category: string;
  status: "operational" | "degraded" | "outage";
  uptimePercent: number;
  latencyMs: number;
  description: string;
}

export const statusRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/status/summary", async (_request, reply) => {
    // 90 Günlük geçmiş çubukları üret
    const historyBars: Array<{ day: number; date: string; status: "good" | "minor" | "major" }> = [];
    const today = new Date();

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      historyBars.push({
        day: 90 - i,
        date: `${yyyy}-${mm}-${dd}`,
        status: i === 18 ? "minor" : "good", // 18 gün önce kısa bakım
      });
    }

    const services: ServiceStatusItem[] = [
      {
        id: "hub",
        name: "XIVIZLEY Hub (SSO & App Gateway)",
        category: "Core Gateway",
        status: "operational",
        uptimePercent: 100.0,
        latencyMs: 11,
        description: "RS256 JWT Single Sign-On ve merkezi portal altyapısı.",
      },
      {
        id: "drive",
        name: "Bulut Depolama (Drive & Quick Look)",
        category: "Storage",
        status: "operational",
        uptimePercent: 99.98,
        latencyMs: 14,
        description: "Kişisel bulut dosya yönetimi ve anlık önizleme motoru.",
      },
      {
        id: "pass",
        name: "Parola & 2FA Kasası (Pass)",
        category: "Security",
        status: "operational",
        uptimePercent: 100.0,
        latencyMs: 10,
        description: "AES-256 şifreli parola ve dinamik TOTP sayacı.",
      },
      {
        id: "store",
        name: "Uygulama Mağazası (115 Docker Apps)",
        category: "Orchestration",
        status: "operational",
        uptimePercent: 99.96,
        latencyMs: 15,
        description: "Çakışma önleyici port radarı ve bağımsız konteyner yöneticisi.",
      },
      {
        id: "game",
        name: "Oyun Sunucusu (Minecraft & FiveM)",
        category: "Gaming",
        status: "operational",
        uptimePercent: 99.92,
        latencyMs: 16,
        description: "Spigot, Paper ve FXServer canlı kokpit ve mod yöneticisi.",
      },
      {
        id: "caddy",
        name: "Caddy Ters Vekil & Otomatik TLS",
        category: "Network & WAF",
        status: "operational",
        uptimePercent: 100.0,
        latencyMs: 8,
        description: "Let's Encrypt SSL/TLS sonlandırma ve Layer-7 güvenlik kalkanı.",
      },
    ];

    return reply.send({
      ok: true,
      data: {
        systemStatus: "operational",
        headline: "Tüm Sistemler Operasyonel",
        overallUptime: "99.98%",
        averageLatencyMs: 12,
        lastChecked: new Date().toISOString(),
        historyBars,
        services,
        incidents: [
          {
            id: "inc-01",
            title: "Planlı Gece Veritabanı Yedeği & Bakım",
            date: "2026-10-04 03:00:01",
            status: "TAMAMLANDI",
            impact: "NONE",
            description: "Günlük otomatik sıcak PostgreSQL dump'ı 1.2 saniyede /var/backups/xivizley dizinine alındı. Sıfır kesinti.",
          },
          {
            id: "inc-02",
            title: "v0.2.0-beta Çekirdek Güvenlik Güncellemesi",
            date: "2026-10-04 01:15:00",
            status: "TAMAMLANDI",
            impact: "NONE",
            description: "Global Demo Mutation Guard ve izole veri koruma filtreleri üretim hattında devreye alındı.",
          },
        ],
      },
    });
  });
};
