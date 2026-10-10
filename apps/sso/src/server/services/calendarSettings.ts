// ============================================================
// XIVIZLEY Hub — Calendar user settings (sync token + SMTP)
// apps/sso/src/server/services/calendarSettings.ts
// ============================================================

import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb, calendarSettings } from "@xivizley/db";
import { encryptVaultData, decryptVaultData } from "../crypto/vaultCrypto.js";

export interface PublicSettings {
  calToken: string;
  fromEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  mailEnabled: boolean;
  hasPassword: boolean;
}

export interface SmtpUserConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface SettingsUpdate {
  fromEmail?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  mailEnabled?: boolean;
}

type Row = typeof calendarSettings.$inferSelect;

function newToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function getOrCreateSettings(userId: string): Promise<Row> {
  const db = getDb();
  const existing = await db
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];

  const created = await db
    .insert(calendarSettings)
    .values({ userId, calToken: newToken() })
    .returning();
  return created[0]!;
}

export async function getUserIdByToken(token: string): Promise<string | null> {
  if (!token) return null;
  const db = getDb();
  const row = await db
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.calToken, token))
    .limit(1);
  return row[0]?.userId ?? null;
}

export async function updateSettings(
  userId: string,
  data: SettingsUpdate,
): Promise<Row> {
  const db = getDb();
  await getOrCreateSettings(userId); // ensure row exists

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.fromEmail !== undefined) patch.fromEmail = data.fromEmail || null;
  if (data.smtpHost !== undefined) patch.smtpHost = data.smtpHost || null;
  if (data.smtpPort !== undefined)
    patch.smtpPort = data.smtpPort != null ? Number(data.smtpPort) : null;
  if (data.smtpUser !== undefined) patch.smtpUser = data.smtpUser || null;
  if (data.smtpPass) {
    patch.smtpPassEnc = JSON.stringify(encryptVaultData(data.smtpPass));
  }
  if (data.mailEnabled !== undefined) patch.mailEnabled = Boolean(data.mailEnabled);

  const updated = await db
    .update(calendarSettings)
    .set(patch)
    .where(eq(calendarSettings.userId, userId))
    .returning();
  return updated[0]!;
}

export async function regenerateToken(userId: string): Promise<string> {
  const db = getDb();
  await getOrCreateSettings(userId);
  const updated = await db
    .update(calendarSettings)
    .set({ calToken: newToken(), updatedAt: new Date() })
    .where(eq(calendarSettings.userId, userId))
    .returning();
  return updated[0]!.calToken;
}

export function toPublic(row: Row): PublicSettings {
  return {
    calToken: row.calToken,
    fromEmail: row.fromEmail,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    mailEnabled: row.mailEnabled,
    hasPassword: Boolean(row.smtpPassEnc),
  };
}

export function getUserSmtpConfig(row: Row | null | undefined): SmtpUserConfig | null {
  if (!row || !row.mailEnabled || !row.smtpHost || !row.smtpUser || !row.smtpPassEnc) {
    return null;
  }
  let pass = "";
  try {
    const payload = JSON.parse(row.smtpPassEnc);
    pass = decryptVaultData(payload);
  } catch {
    return null;
  }
  return {
    host: row.smtpHost,
    port: row.smtpPort || 465,
    user: row.smtpUser,
    pass,
    from: row.fromEmail || row.smtpUser,
  };
}
