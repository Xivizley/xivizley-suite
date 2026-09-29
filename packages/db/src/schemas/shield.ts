// ============================================================
// XIVIZLEY Shield Schema — packages/db/src/schemas/shield.ts
// Drizzle ORM PostgreSQL 16 schema for Cyber Defense & Threat Intelligence
// ============================================================

import {
  pgSchema,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const shield = pgSchema("shield");

// ─── shield.banned_ips (Karantinaya Alınan Saldırgan IP'ler) ───
export const bannedIps = shield.table("banned_ips", {
  id: uuid("id").primaryKey().defaultRandom(),
  ip: varchar("ip", { length: 45 }).notNull().unique(),
  reason: varchar("reason", { length: 255 }).notNull(),
  countryCode: varchar("country_code", { length: 8 }).default("XX"),
  countryName: varchar("country_name", { length: 64 }).default("Bilinmeyen"),
  threatLevel: varchar("threat_level", { length: 32 }).notNull().default("medium"), // 'low' | 'medium' | 'high' | 'critical'
  bannedAt: timestamp("banned_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isPermanent: boolean("is_permanent").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

// ─── shield.security_events (Gerçek Zamanlı Saldırı Günlüğü) ─
export const securityEvents = shield.table("security_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceIp: varchar("source_ip", { length: 45 }).notNull(),
  countryCode: varchar("country_code", { length: 8 }).default("XX"),
  countryName: varchar("country_name", { length: 64 }).default("Bilinmeyen"),
  targetService: varchar("target_service", { length: 64 }).notNull().default("Caddy WAF"),
  targetPort: integer("target_port").notNull().default(443),
  requestMethod: varchar("request_method", { length: 16 }).default("GET"),
  requestPath: text("request_path"),
  threatType: varchar("threat_type", { length: 64 }).notNull(), // 'SQL_INJECTION' | 'PATH_TRAVERSAL' | 'MALICIOUS_SCANNER' | 'BRUTE_FORCE'
  severity: varchar("severity", { length: 32 }).notNull().default("medium"), // 'low' | 'medium' | 'high' | 'critical'
  actionTaken: varchar("action_taken", { length: 32 }).notNull().default("blocked"), // 'blocked' | 'flagged' | 'challenged'
  payloadPreview: text("payload_preview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── shield.whitelisted_ips (Güvenli Beyaz Liste) ───────────
export const whitelistedIps = shield.table("whitelisted_ips", {
  id: uuid("id").primaryKey().defaultRandom(),
  ip: varchar("ip", { length: 45 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
