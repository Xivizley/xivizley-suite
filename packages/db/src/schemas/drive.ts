// ─── Drive Schema ─────────────────────────────────────────
// schema: "drive" — Dosya meta verileri, klasör ağacı, paylaşım izinleri

import { pgSchema } from "drizzle-orm/pg-core";

export const drive = pgSchema("drive");

// Placeholder — ilerleyen aşamada doldurulacak
// export const files = drive.table("files", { ... });
// export const folders = drive.table("folders", { ... });
