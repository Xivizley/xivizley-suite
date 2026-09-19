// ─── Game Panel Schema ────────────────────────────────────
// schema: "game_panel" — Oyun sunucuları, kaynak kotaları, loglar
// Adım 5'te (apps/game-panel MVP) tam olarak doldurulacak.

import { pgSchema } from "drizzle-orm/pg-core";

export const gamePanel = pgSchema("game_panel");

// Placeholder — Adım 5'te genişletilecek
// export const servers = gamePanel.table("servers", { ... });
// export const serverLogs = gamePanel.table("server_logs", { ... });
