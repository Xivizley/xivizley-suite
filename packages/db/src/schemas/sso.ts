import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── SSO Şeması ──────────────────────────────────────────────
export const sso = pgSchema("sso");

// ─── sso.users ───────────────────────────────────────────────
export const users = sso.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 20 }).notNull().default("member"), // 'owner' | 'admin' | 'member' | 'guest'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── sso.sessions ────────────────────────────────────────────
export const sessions = sso.table("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ─── sso.oauth_clients ───────────────────────────────────────
export const oauthClients = sso.table("oauth_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: varchar("client_id", { length: 64 }).notNull().unique(),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  redirectUris: text("redirect_uris").notNull(), // JSON array string formatında kayıtlı URI listesi
  clientSecretHash: text("client_secret_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── sso.refresh_tokens ──────────────────────────────────────
export const refreshTokens = sso.table("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // SHA-256 hash
  clientId: varchar("client_id", { length: 64 }).notNull(),
  familyId: uuid("family_id").notNull(), // Token rotation tespiti için
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Tip Tanımlamaları ───────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type OAuthClient = typeof oauthClients.$inferSelect;
export type NewOAuthClient = typeof oauthClients.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
