// ============================================================
// @xivizley/db — Ana Giriş Noktası
// Drizzle ORM + PostgreSQL 16 (postgres.js driver)
// ============================================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Schema'ları re-export et — uygulamalar doğrudan buradan import eder
export * as ssoSchema from "./schemas/sso.js";
export * as gamePanelSchema from "./schemas/game-panel.js";
export * as driveSchema from "./schemas/drive.js";
export * as cinemaSchema from "./schemas/cinema.js";
export * as vaultSchema from "./schemas/vault.js";
export * as pulseSchema from "./schemas/pulse.js";

// ─── Bağlantı Fabrikası ───────────────────────────────────

let _client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

/**
 * Singleton Drizzle istemcisi.
 * İlk çağrıda bağlantı kurulur, sonraki çağrılar aynı instance'ı döner.
 *
 * @param url - PostgreSQL bağlantı URL'si (varsayılan: DATABASE_URL env)
 */
export function getDb(url?: string) {
  if (!_db) {
    const connectionString =
      url ??
      process.env["DATABASE_URL"] ??
      "postgresql://xivizley:xivizley@localhost:5432/xivizley_suite";

    _client = postgres(connectionString, {
      max: 10,           // maksimum bağlantı havuzu büyüklüğü
      idle_timeout: 30,  // 30 sn atıl kalırsa bağlantıyı kapat
    });

    _db = drizzle(_client);
  }

  return _db;
}

/**
 * Test veya graceful shutdown için bağlantıyı kapat.
 */
export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end();
    _client = undefined;
    _db = undefined;
  }
}
