import {
  pgSchema,
  uuid,
  varchar,
  text,
  bigint,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./sso.js";

// ─── Drive Şeması ────────────────────────────────────────────
export const drive = pgSchema("drive");

// ─── drive.folders (Klasör Ağacı) ───────────────────────────
export const folders = drive.table("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // null ise kök (root) dizindir
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }), // Klasör renk etiketi (aurora-cyan, aurora-purple vb.)
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── drive.files (Dosya Kayıtları) ───────────────────────────
export const files = drive.table("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "cascade" }), // null ise kökte
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull().default("application/octet-stream"),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  storagePath: text("storage_path").notNull(), // Disk üzerindeki fiziksel yol
  sha256Hash: varchar("sha256_hash", { length: 64 }),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isTrashed: boolean("is_trashed").notNull().default(false),
  trashedAt: timestamp("trashed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── drive.shares (Paylaşım Linkleri) ────────────────────────
export const shares = drive.table("shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  shareToken: varchar("share_token", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash"), // Opsiyonel şifreli koruma
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  allowDownload: boolean("allow_download").notNull().default(true),
  downloadCount: bigint("download_count", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Tipler ──────────────────────────────────────────────────
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;

export type DriveFile = typeof files.$inferSelect;
export type NewDriveFile = typeof files.$inferInsert;

export type DriveShare = typeof shares.$inferSelect;
export type NewDriveShare = typeof shares.$inferInsert;
