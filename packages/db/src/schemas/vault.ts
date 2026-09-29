// ─── Vault Schema ─────────────────────────────────────────
// schema: "vault" — Fotoğraf meta verileri, AI yüz vektörleri, konum etiketleri

import { pgSchema } from "drizzle-orm/pg-core";

export const vault = pgSchema("vault");

// Placeholder
// export const photos = vault.table("photos", { ... });
// export const faceVectors = vault.table("face_vectors", { ... });
