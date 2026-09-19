// ─── Cinema Schema ────────────────────────────────────────
// schema: "cinema" — Medya kütüphanesi, izleme geçmişi, altyazılar

import { pgSchema } from "drizzle-orm/pg-core";

export const cinema = pgSchema("cinema");

// Placeholder
// export const media = cinema.table("media", { ... });
// export const watchHistory = cinema.table("watch_history", { ... });
