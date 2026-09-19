// ─── Pulse Schema ─────────────────────────────────────────
// schema: "pulse" — Metrik geçmişi, uptime logları, alarm kayıtları

import { pgSchema } from "drizzle-orm/pg-core";

export const pulse = pgSchema("pulse");

// Placeholder
// export const monitors = pulse.table("monitors", { ... });
// export const uptimeLogs = pulse.table("uptime_logs", { ... });
// export const alerts = pulse.table("alerts", { ... });
