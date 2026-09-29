// ============================================================
// XIVIZLEY Pulse Schema — packages/db/src/schemas/pulse.ts
// Drizzle ORM PostgreSQL 16 schema for Monitors & Heartbeats
// ============================================================

import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { users } from "./sso";

export const pulse = pgSchema("pulse");

// ─── pulse.monitors (İzlenen Hedef Servisler) ─────────────────
export const monitors = pulse.table("monitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 32 }).notNull().default("http"), // 'http' | 'tcp' | 'ping'
  target: text("target").notNull(), // 'https://xivizley.com.tr' veya '178.210.168.163:25565'
  intervalSeconds: integer("interval_seconds").notNull().default(30),
  timeoutMs: integer("timeout_ms").notNull().default(5000),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // 'up' | 'down' | 'pending'
  lastCheckAt: timestamp("last_check_at", { withTimezone: true }),
  lastLatencyMs: integer("last_latency_ms"),
  uptimePercentage: doublePrecision("uptime_percentage").notNull().default(100.0),
  isPaused: boolean("is_paused").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── pulse.heartbeats (Anlık Kontrol ve Gecikme Kayıtları) ────
export const heartbeats = pulse.table("heartbeats", {
  id: uuid("id").primaryKey().defaultRandom(),
  monitorId: uuid("monitor_id")
    .notNull()
    .references(() => monitors.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull(), // 'up' | 'down'
  latencyMs: integer("latency_ms").notNull().default(0),
  statusCode: integer("status_code"), // HTTP 200, 502 veya TCP null
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── pulse.incidents (Çökme & Olay Kayıtları) ─────────────────
export const incidents = pulse.table("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  monitorId: uuid("monitor_id")
    .notNull()
    .references(() => monitors.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("ongoing"), // 'ongoing' | 'resolved'
  cause: text("cause"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
});

export type Monitor = typeof monitors.$inferSelect;
export type NewMonitor = typeof monitors.$inferInsert;
export type Heartbeat = typeof heartbeats.$inferSelect;
export type NewHeartbeat = typeof heartbeats.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
