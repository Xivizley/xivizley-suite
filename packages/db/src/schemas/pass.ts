// ============================================================
// XIVIZLEY Pass Schema — packages/db/src/schemas/pass.ts
// Drizzle ORM PostgreSQL 16 schema for Zero-Knowledge Vault Items
// ============================================================

import {
  pgSchema,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./sso";

export const pass = pgSchema("pass");

// ─── pass.vault_items (Şifreler, Notlar, SSH Anahtarları) ───
export const vaultItems = pass.table("vault_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull().default("login"), // 'login' | 'secure_note' | 'server_ssh' | 'api_key' | 'card'
  title: varchar("title", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }),
  encryptedPassword: text("encrypted_password").notNull(),
  url: text("url"),
  totpSecret: text("totp_secret"), // 2FA Authenticator gizli anahtarı
  notes: text("notes"),
  folder: varchar("folder", { length: 128 }).default("Genel"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── pass.folders (Özel Kasa Klasörleri) ──────────────────────
export const passFolders = pass.table("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  icon: varchar("icon", { length: 64 }).default("Folder"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
