// ─── SSO Schema ──────────────────────────────────────────
// schema: "sso" — Kullanıcılar, oturumlar, OAuth2 istemcileri
// Adım 3'te (apps/sso) tam olarak doldurulacak.

import { pgSchema } from "drizzle-orm/pg-core";

export const sso = pgSchema("sso");

// Placeholder — Adım 3'te genişletilecek
// export const users = sso.table("users", { ... });
// export const sessions = sso.table("sessions", { ... });
// export const oauthClients = sso.table("oauth_clients", { ... });
