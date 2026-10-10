// ============================================================
// XIVIZLEY Calendar Schema — packages/db/src/schemas/calendar.ts
// Drizzle ORM PostgreSQL 16 schema for Calendar Events
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

export const calendar = pgSchema("calendar");

// ─── calendar.events (Takvim Etkinlikleri) ────────────────────
export const calendarEvents = calendar.table("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .default("00000000-0000-0000-0000-000000000001"),
  uid: varchar("uid", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  allDay: boolean("all_day").notNull().default(false),
  color: varchar("color", { length: 32 }).default("#0082c9"),
  reminderMinutes: integer("reminder_minutes"),
  notifyEmail: varchar("notify_email", { length: 255 }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── calendar.settings (Kullanıcı başına abonelik token'ı + SMTP) ───
export const calendarSettings = calendar.table("settings", {
  userId: text("user_id")
    .primaryKey()
    .default("00000000-0000-0000-0000-000000000001"),
  calToken: varchar("cal_token", { length: 64 }).notNull(),
  fromEmail: varchar("from_email", { length: 255 }),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port"),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassEnc: text("smtp_pass_enc"),
  mailEnabled: boolean("mail_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
