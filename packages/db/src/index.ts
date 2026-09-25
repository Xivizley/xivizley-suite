// ============================================================
// @xivizley/db — Ana Giriş Noktası
// Drizzle ORM + PostgreSQL 16 (postgres.js driver)
// ============================================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Schema'ları re-export et — uygulamalar doğrudan buradan import eder
export * from "./schemas/sso";
export * from "./schemas/game-panel";
export * from "./schemas/drive";
export * from "./schemas/cinema";
export * from "./schemas/vault";
export * from "./schemas/pulse";
export * from "./schemas/pass";
export * from "./schemas/shield";

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
