// ============================================================
// Automated Deep Verification Test for XIVIZLEY Suite Powerhouse Features
// ============================================================

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";

import { sentinelRoutes } from "../apps/sso/src/server/sentinel-routes";
import { gameBackupRoutes } from "../apps/sso/src/server/game-backup-routes";
import { gamePluginRoutes } from "../apps/sso/src/server/game-plugin-routes";
import { passRoutes } from "../apps/sso/src/server/pass-routes";
import {
  getSentinelStatus,
  updateSentinelConfig,
} from "../apps/sso/src/server/services/sentinelService";

async function runTests() {
  console.log("🚀 Starting Powerhouse Automated Verification Suite...\n");

  const fastify = Fastify({ logger: false });
  await fastify.register(cors);
  await fastify.register(cookie);

  await fastify.register(sentinelRoutes);
  await fastify.register(gameBackupRoutes);
  await fastify.register(gamePluginRoutes);
  await fastify.register(passRoutes);

  await fastify.ready();

  // ─── TEST SUITE 1: Sentinel Service & Routes ───────────────────
  console.log("▶ [Test 1] Sentinel Status & Metrics...");
  const statusRes = await fastify.inject({
    method: "GET",
    url: "/api/sentinel/status",
  });
  assert.strictEqual(
    statusRes.statusCode,
    200,
    "GET /api/sentinel/status must return 200",
  );
  const statusJson = JSON.parse(statusRes.body);
  assert.strictEqual(statusJson.ok, true, "Response ok must be true");
  assert.ok(
    statusJson.data.host.cpu.usagePercent >= 0,
    "CPU percent must be >= 0",
  );
  assert.ok(
    statusJson.data.host.ram.totalBytes > 0,
    "RAM total bytes must be > 0",
  );
  assert.ok(
    statusJson.data.host.disk.totalBytes > 0,
    "Disk total bytes must be > 0",
  );
  assert.ok(
    Array.isArray(statusJson.data.containers),
    "Containers must be an array",
  );
  // Privacy verification: telegramChatId must be masked (null or "***") for unauthenticated requests
  assert.ok(
    statusJson.data.telegramChatId === null ||
      statusJson.data.telegramChatId === "***",
    "telegramChatId must be masked for unauthenticated callers",
  );
  console.log(
    `  ✓ Host CPU: %${statusJson.data.host.cpu.usagePercent}, RAM: %${statusJson.data.host.ram.usagePercent}, Disk: %${statusJson.data.host.disk.usagePercent}`,
  );
  console.log(
    `  ✓ Privacy check passed: unauthenticated telegramChatId is '${statusJson.data.telegramChatId}'`,
  );
  console.log(
    `  ✓ Monitored Containers: ${statusJson.data.containers.map((c: any) => c.name).join(", ")}`,
  );

  console.log("\n▶ [Test 2] Sentinel Config Update...");
  const configRes = await fastify.inject({
    method: "POST",
    url: "/api/sentinel/config",
    payload: {
      cpuPercent: 88,
      ramPercent: 92,
      diskPercent: 80,
      debounceMinutes: 20,
      telegramChatId: "987654321",
    },
  });
  assert.strictEqual(configRes.statusCode, 200);
  const configJson = JSON.parse(configRes.body);
  assert.strictEqual(configJson.ok, true);
  assert.strictEqual(configJson.config.cpuPercent, 88);
  assert.strictEqual(configJson.config.ramPercent, 92);
  assert.strictEqual(configJson.config.diskPercent, 80);
  assert.strictEqual(configJson.config.debounceMinutes, 20);
  console.log("  ✓ Config update accepted and reflected in thresholds.");

  console.log("\n▶ [Test 3] Sentinel Test Telegram Alert Handler...");
  const testTgRes = await fastify.inject({
    method: "POST",
    url: "/api/sentinel/test-telegram",
    payload: { chatId: "12345" },
  });
  assert.strictEqual(testTgRes.statusCode, 200);
  const testTgJson = JSON.parse(testTgRes.body);
  assert.ok(
    typeof testTgJson.ok === "boolean",
    "testTg response has ok boolean",
  );
  console.log(
    `  ✓ Telegram test handler executed gracefully (Result ok: ${testTgJson.ok}, message: ${testTgJson.message})`,
  );

  // ─── TEST SUITE 2: Game Backup Engine ──────────────────────────
  console.log("\n▶ [Test 4] Game Backup Creation & Listing...");
  const createBackupRes = await fastify.inject({
    method: "POST",
    url: "/api/server/backups/create",
    payload: {
      gameId: "minecraft",
      note: "Automated Powerhouse Test Backup",
    },
  });
  if (createBackupRes.statusCode !== 200) {
    console.error("createBackup error:", createBackupRes.body);
  }
  assert.strictEqual(createBackupRes.statusCode, 200);
  const createBackupJson = JSON.parse(createBackupRes.body);
  assert.strictEqual(createBackupJson.ok, true);
  assert.ok(createBackupJson.backup.filename.startsWith("backup-minecraft-"));
  const createdFilename = createBackupJson.backup.filename;
  console.log(
    `  ✓ Backup created: ${createdFilename} (${createBackupJson.backup.sizeFormatted})`,
  );

  const listBackupsRes = await fastify.inject({
    method: "GET",
    url: "/api/server/backups?gameId=minecraft",
  });
  assert.strictEqual(listBackupsRes.statusCode, 200);
  const listBackupsJson = JSON.parse(listBackupsRes.body);
  assert.strictEqual(listBackupsJson.ok, true);
  assert.ok(
    listBackupsJson.data.some((b: any) => b.filename === createdFilename),
    "Created backup must exist in list",
  );
  console.log(
    `  ✓ Backup list verified. Total backups for Minecraft: ${listBackupsJson.data.length}`,
  );

  console.log("\n▶ [Test 5] Game Backup Download Stream...");
  const downloadBackupRes = await fastify.inject({
    method: "GET",
    url: `/api/server/backups/download/${encodeURIComponent(createdFilename)}`,
  });
  assert.strictEqual(downloadBackupRes.statusCode, 200);
  assert.strictEqual(
    downloadBackupRes.headers["content-type"],
    "application/gzip",
  );
  assert.ok(
    downloadBackupRes.rawPayload.length > 0,
    "Payload must not be empty",
  );
  console.log(
    `  ✓ Download stream verified (${downloadBackupRes.rawPayload.length} bytes gzip).`,
  );

  console.log("\n▶ [Test 6] Game Backup Safe Restore...");
  const restoreBackupRes = await fastify.inject({
    method: "POST",
    url: "/api/server/backups/restore",
    payload: {
      gameId: "minecraft",
      filename: createdFilename,
    },
  });
  assert.strictEqual(restoreBackupRes.statusCode, 200);
  const restoreJson = JSON.parse(restoreBackupRes.body);
  assert.strictEqual(restoreJson.ok, true);
  console.log(`  ✓ Backup restored successfully: ${restoreJson.message}`);

  console.log("\n▶ [Test 7] Game Backup Cleanup / Delete...");
  const deleteBackupRes = await fastify.inject({
    method: "DELETE",
    url: `/api/server/backups/${encodeURIComponent(createdFilename)}`,
  });
  assert.strictEqual(deleteBackupRes.statusCode, 200);
  const deleteJson = JSON.parse(deleteBackupRes.body);
  assert.strictEqual(deleteJson.ok, true);
  console.log(`  ✓ Backup safely cleaned up.`);

  console.log(
    "\n▶ [Test 7b] Game Backup Security (Invalid Extension Rejection)...",
  );
  const badDownloadRes = await fastify.inject({
    method: "GET",
    url: "/api/server/backups/download/backups_meta.json",
  });
  assert.strictEqual(
    badDownloadRes.statusCode,
    400,
    "Downloading non .tar.gz/.zip must return 400",
  );

  const badDeleteRes = await fastify.inject({
    method: "DELETE",
    url: "/api/server/backups/backups_meta.json",
  });
  assert.strictEqual(
    badDeleteRes.statusCode,
    400,
    "Deleting non .tar.gz/.zip must return 400",
  );
  console.log(
    "  ✓ Extension security verified: unauthorized non-archive files rejected with 400.",
  );

  // ─── TEST SUITE 3: Game Plugin Manager ─────────────────────────
  console.log("\n▶ [Test 8] Game Plugin Catalog & Status...");
  const pluginsRes = await fastify.inject({
    method: "GET",
    url: "/api/server/plugins?gameId=minecraft",
  });
  assert.strictEqual(pluginsRes.statusCode, 200);
  const pluginsJson = JSON.parse(pluginsRes.body);
  assert.strictEqual(pluginsJson.ok, true);
  assert.ok(
    pluginsJson.plugins.length >= 9,
    "Curated Minecraft plugins must contain at least 9 plugins",
  );
  console.log(
    `  ✓ Curated Minecraft plugins catalog: ${pluginsJson.plugins.length} plugins found.`,
  );

  const fivemPluginsRes = await fastify.inject({
    method: "GET",
    url: "/api/server/plugins?gameId=fivem",
  });
  assert.strictEqual(fivemPluginsRes.statusCode, 200);
  const fivemJson = JSON.parse(fivemPluginsRes.body);
  assert.strictEqual(fivemJson.ok, true);
  assert.ok(
    fivemJson.plugins.length >= 6,
    "Curated FiveM plugins must contain at least 6 resources",
  );
  console.log(
    `  ✓ Curated FiveM resources catalog: ${fivemJson.plugins.length} resources found.`,
  );

  console.log("\n▶ [Test 9] 1-Click Plugin Install & Uninstall...");
  const installRes = await fastify.inject({
    method: "POST",
    url: "/api/server/plugins/install",
    payload: { gameId: "minecraft", pluginId: "essentialsx" },
  });
  assert.strictEqual(installRes.statusCode, 200);
  const installJson = JSON.parse(installRes.body);
  assert.strictEqual(installJson.ok, true);
  console.log(`  ✓ Plugin install executed: ${installJson.message}`);

  const uninstallRes = await fastify.inject({
    method: "POST",
    url: "/api/server/plugins/uninstall",
    payload: { gameId: "minecraft", pluginId: "essentialsx" },
  });
  assert.strictEqual(uninstallRes.statusCode, 200);
  const uninstallJson = JSON.parse(uninstallRes.body);
  assert.strictEqual(uninstallJson.ok, true);
  console.log(`  ✓ Plugin uninstall executed: ${uninstallJson.message}`);

  // ─── TEST SUITE 4: Pass Batch Import Engine ────────────────────
  console.log("\n▶ [Test 10] Pass Batch Import Engine...");
  const importRes = await fastify.inject({
    method: "POST",
    url: "/api/vault/import",
    payload: {
      items: [
        {
          type: "login",
          title: "Powerhouse Test Bitwarden Item 1",
          username: "admin@xivizley.com.tr",
          password: "SuperSecretPassword123!",
          url: "https://suite.xivizley.com.tr",
          totpSecret: "JBSWY3DPEHPK3PXP",
          folder: "Bitwarden Kasa",
          isFavorite: true,
        },
        {
          type: "server_ssh",
          title: "VDS SSH Key Backup",
          username: "root",
          password: "vds-ssh-test-pass",
          url: "178.210.168.163:22",
          folder: "Altyapı",
          isFavorite: false,
        },
      ],
    },
  });
  assert.strictEqual(importRes.statusCode, 200);
  const importJson = JSON.parse(importRes.body);
  assert.strictEqual(importJson.ok, true);
  assert.strictEqual(importJson.importedCount, 2, "Must import 2 items");
  console.log(
    `  ✓ Vault batch import verified: ${importJson.importedCount} items stored.`,
  );

  // ─── TEST SUITE 5: PWA Files & Assets Existence ───────────────
  console.log("\n▶ [Test 11] PWA Assets on Disk...");
  const publicDir = fs.existsSync(path.resolve(process.cwd(), "public"))
    ? path.resolve(process.cwd(), "public")
    : path.resolve(process.cwd(), "apps/sso/public");
  assert.ok(
    fs.existsSync(path.join(publicDir, "sw.js")),
    "sw.js must exist in public directory",
  );
  assert.ok(
    fs.existsSync(path.join(publicDir, "icon-192.png")),
    "icon-192.png must exist",
  );
  assert.ok(
    fs.existsSync(path.join(publicDir, "icon-512.png")),
    "icon-512.png must exist",
  );
  assert.ok(
    fs.existsSync(path.join(publicDir, "manifest.json")),
    "manifest.json must exist",
  );

  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "manifest.json"), "utf-8"),
  );
  assert.strictEqual(manifest.name, "XIVIZLEY Cloud");
  assert.strictEqual(manifest.display, "standalone");
  assert.strictEqual(manifest.theme_color, "#0082c9");
  assert.ok(manifest.icons.some((i: any) => i.src === "/icon-192.png"));
  assert.ok(manifest.icons.some((i: any) => i.src === "/icon-512.png"));

  const swContent = fs.readFileSync(path.join(publicDir, "sw.js"), "utf-8");
  assert.ok(
    swContent.includes("/login"),
    "sw.js must include /login in STATIC_ASSETS",
  );
  console.log(
    "  ✓ Service Worker, 192/512 PNG icons, /login offline shell, and standalone manifest verified!",
  );

  console.log("\n🎉 ALL POWERHOUSE VERIFICATION TESTS PASSED SUCCESSFULLY!\n");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
