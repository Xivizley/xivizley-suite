// ============================================================
// Automated Verification Suite for Demo Mutation Guard & Data Isolation
// ============================================================

import assert from "node:assert";
import crypto from "node:crypto";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";

if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.JWT_PUBLIC_KEY = Buffer.from(publicKey).toString("base64");
  process.env.JWT_PRIVATE_KEY = Buffer.from(privateKey).toString("base64");
}

import { authRoutes } from "../apps/sso/src/server/auth-routes";
import { passRoutes } from "../apps/sso/src/server/pass-routes";
import { notesRoutes } from "../apps/sso/src/server/notes-routes";
import { driveRoutes } from "../apps/sso/src/server/drive-routes";
import { storeRoutes } from "../apps/sso/src/server/store-routes";
import { verifyAccessToken } from "../apps/sso/src/server/tokens";

async function runDemoSecurityTests() {
  console.log("🔒 [Security P0] Starting Global Demo Mutation Guard & Isolation Tests...\n");

  const fastify = Fastify({ logger: false });
  await fastify.register(cors);
  await fastify.register(cookie, { secret: "test_cookie_secret_key_32_chars_min" });

  // ─── Attach user resolver and preHandler matching index.ts ───
  fastify.addHook("onRequest", async (request, reply) => {
    const cookies = (request.cookies || {}) as Record<string, string | undefined>;
    const token =
      cookies["xivizley_access_token"] ||
      request.headers?.authorization?.replace(/^Bearer\s+/i, "");

    if (token) {
      try {
        const payload = await verifyAccessToken(token);
        if (payload?.sub) {
          (request as any).user = {
            id: payload.sub as string,
            email: (payload["email"] as string) || "",
            role: (payload["role"] as string) || "guest",
            displayName: (payload["displayName"] as string) || "Misafir Kullanıcı (Demo)",
            avatarUrl: (payload["avatarUrl"] as string) || undefined,
            ...payload,
          };
        }
      } catch {}
    }
  });

  // Global Demo Mutation Guard (Exact logic from apps/sso/src/server/index.ts)
  fastify.addHook("preHandler", async (request, reply) => {
    const user = (request as any).user;
    if (user?.role === "guest") {
      const method = request.method.toUpperCase();
      const pathname = (request.url || "/").split("?")[0] || "/";

      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        if (pathname === "/api/auth/demo" || pathname === "/api/auth/logout") {
          return;
        }
        return reply.status(403).send({
          ok: false,
          code: "DEMO_READ_ONLY",
          message: "Canlı demo modunda değişiklik yapılamaz. Tüm özellikler salt-okunur (read-only) durumdadır.",
        });
      }
    }
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(passRoutes);
  await fastify.register(notesRoutes);
  await fastify.register(driveRoutes);
  await fastify.register(storeRoutes);

  await fastify.ready();

  // ─── 1. POST /api/auth/demo ───
  console.log("▶ [Test 1] Testing POST /api/auth/demo...");
  const demoRes = await fastify.inject({
    method: "POST",
    url: "/api/auth/demo",
    payload: {
      redirect_uri: "/store",
    },
  });

  assert.strictEqual(demoRes.statusCode, 200, "POST /api/auth/demo must return 200");
  const demoBody = JSON.parse(demoRes.body);
  assert.strictEqual(demoBody.ok, true, "Response ok must be true");
  assert.strictEqual(demoBody.data.user.role, "guest", "User role must be guest");
  assert.strictEqual(demoBody.data.user.id, "d0000000-0000-0000-0000-000000000001", "User ID must match DEMO_USER_ID");
  assert.strictEqual(demoBody.data.user.email, "demo@xivizley.com.tr", "User email must be demo@xivizley.com.tr");
  assert.ok(demoRes.headers["set-cookie"], "Must set auth cookies");

  const cookiesHeader = demoRes.headers["set-cookie"] as string[];
  const accessTokenCookie = cookiesHeader.find((c) => c.startsWith("xivizley_access_token="));
  assert.ok(accessTokenCookie, "xivizley_access_token cookie must be present");
  const accessToken = demoBody.data.accessToken;
  console.log("  ✓ Demo user token successfully generated with role 'guest'");

  // ─── 2. Global Demo Mutation Guard (403 DEMO_READ_ONLY) ───
  console.log("\n▶ [Test 2] Testing Global Demo Mutation Guard for blocked methods...");

  // 2a. POST to store container action
  const blockedPost = await fastify.inject({
    method: "POST",
    url: "/api/store/containers/test-container/action",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    payload: { action: "restart" },
  });
  assert.strictEqual(blockedPost.statusCode, 403, "Guest POST must be blocked with 403");
  const blockedPostJson = JSON.parse(blockedPost.body);
  assert.strictEqual(blockedPostJson.code, "DEMO_READ_ONLY", "Code must be DEMO_READ_ONLY");
  assert.strictEqual(
    blockedPostJson.message,
    "Canlı demo modunda değişiklik yapılamaz. Tüm özellikler salt-okunur (read-only) durumdadır."
  );
  console.log("  ✓ POST /api/store/containers/.../action blocked with 403 DEMO_READ_ONLY");

  // 2b. PUT to notes
  const blockedPut = await fastify.inject({
    method: "PUT",
    url: "/api/notes/sample-id",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    payload: { title: "Hacked" },
  });
  assert.strictEqual(blockedPut.statusCode, 403, "Guest PUT must be blocked with 403");
  const blockedPutJson = JSON.parse(blockedPut.body);
  assert.strictEqual(blockedPutJson.code, "DEMO_READ_ONLY");
  console.log("  ✓ PUT /api/notes/... blocked with 403 DEMO_READ_ONLY");

  // 2c. DELETE to vault
  const blockedDelete = await fastify.inject({
    method: "DELETE",
    url: "/api/vault/sample-id",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  assert.strictEqual(blockedDelete.statusCode, 403, "Guest DELETE must be blocked with 403");
  const blockedDeleteJson = JSON.parse(blockedDelete.body);
  assert.strictEqual(blockedDeleteJson.code, "DEMO_READ_ONLY");
  console.log("  ✓ DELETE /api/vault/... blocked with 403 DEMO_READ_ONLY");

  // ─── 3. Exemptions (/api/auth/logout & /api/auth/demo) ───
  console.log("\n▶ [Test 3] Testing Exempt Routes for Guest User...");
  const logoutRes = await fastify.inject({
    method: "POST",
    url: "/api/auth/logout",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  assert.strictEqual(logoutRes.statusCode, 200, "POST /api/auth/logout must NOT be blocked");
  console.log("  ✓ POST /api/auth/logout succeeded (exempted from guard)");

  const reDemoRes = await fastify.inject({
    method: "POST",
    url: "/api/auth/demo",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  assert.strictEqual(reDemoRes.statusCode, 200, "POST /api/auth/demo must NOT be blocked");
  console.log("  ✓ POST /api/auth/demo succeeded (exempted from guard)");

  // ─── 4. Data Isolation (Vault / Pass) ───
  console.log("\n▶ [Test 4] Testing Data Isolation for Pass (Vault)...");
  const vaultRes = await fastify.inject({
    method: "GET",
    url: "/api/vault",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  assert.strictEqual(vaultRes.statusCode, 200, "GET /api/vault must return 200");
  const vaultJson = JSON.parse(vaultRes.body);
  assert.strictEqual(vaultJson.ok, true);
  assert.ok(Array.isArray(vaultJson.data), "Vault data must be an array");

  // Ensure NO admin records exist
  const stringifiedVault = JSON.stringify(vaultJson.data);
  assert.ok(!stringifiedVault.includes("alperen@xivizley.com.tr"), "Vault must NEVER contain admin email");
  assert.ok(!stringifiedVault.includes("109.104.120.126"), "Vault must NEVER contain real VDS IPs");

  // Ensure sample demo items are present
  const hasDemoSsh = vaultJson.data.some((i: any) => i.id === "vault-demo-ssh");
  const hasDemo2Fa = vaultJson.data.some((i: any) => i.id === "vault-demo-2fa");
  assert.ok(hasDemoSsh, "Demo SSH item must be present");
  assert.ok(hasDemo2Fa, "Demo 2FA item must be present");
  console.log(`  ✓ Vault returned ${vaultJson.data.length} clean isolated demo items`);
  console.log("  ✓ Absolute data isolation verified: zero admin records found in vault");

  // Test TOTP generation for demo item
  const totpRes = await fastify.inject({
    method: "GET",
    url: "/api/vault/vault-demo-2fa/totp",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  assert.strictEqual(totpRes.statusCode, 200, "GET /api/vault/:id/totp must return 200");
  const totpJson = JSON.parse(totpRes.body);
  assert.strictEqual(totpJson.ok, true);
  assert.ok(/^[0-9]{6}$/.test(totpJson.data.code), "TOTP code must be 6 digits");
  console.log(`  ✓ Demo TOTP generated successfully: ${totpJson.data.code}`);

  // ─── 5. Data Isolation (Notes) ───
  console.log("\n▶ [Test 5] Testing Data Isolation for Notes...");
  const notesRes = await fastify.inject({
    method: "GET",
    url: "/api/notes",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  assert.strictEqual(notesRes.statusCode, 200, "GET /api/notes must return 200");
  const notesJson = JSON.parse(notesRes.body);
  assert.strictEqual(notesJson.ok, true);
  assert.ok(Array.isArray(notesJson.data), "Notes data must be an array");
  const stringifiedNotes = JSON.stringify(notesJson.data);
  assert.ok(!stringifiedNotes.includes("alperen@xivizley.com.tr"), "Notes must NEVER contain admin email");
  assert.ok(
    notesJson.data.every((n: any) => n.userId === "d0000000-0000-0000-0000-000000000001"),
    "All returned notes must belong strictly to demo user ID"
  );
  console.log(`  ✓ Notes returned ${notesJson.data.length} isolated notes for DEMO_USER_ID`);

  // ─── 6. Data Isolation (Drive / Files) ───
  console.log("\n▶ [Test 6] Testing Data Isolation for Drive...");
  const filesRes = await fastify.inject({
    method: "GET",
    url: "/api/files",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  assert.strictEqual(filesRes.statusCode, 200, "GET /api/files must return 200");
  const filesJson = JSON.parse(filesRes.body);
  assert.strictEqual(filesJson.ok, true);
  const stringifiedFiles = JSON.stringify(filesJson.data);
  assert.ok(!stringifiedFiles.includes("alperen@xivizley.com.tr"), "Drive must NEVER contain admin email");
  console.log("  ✓ Drive returned isolated files for DEMO_USER_ID");

  // ─── 7. Edge Cases & Role Verification ───
  console.log("\n▶ [Test 7] Testing Edge Cases & Non-guest Roles...");

  // 7a. POST /api/auth/demo without body
  const emptyBodyDemo = await fastify.inject({
    method: "POST",
    url: "/api/auth/demo",
  });
  assert.strictEqual(emptyBodyDemo.statusCode, 200, "Empty body demo POST must succeed");
  const emptyBodyJson = JSON.parse(emptyBodyDemo.body);
  assert.strictEqual(emptyBodyJson.redirectUrl, "/", "Default redirectUrl must be '/'");
  console.log("  ✓ Empty body demo login defaulted safely to redirectUrl: '/'");

  // 7b. GET /api/auth/me with demo token
  const meRes = await fastify.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  assert.strictEqual(meRes.statusCode, 200, "GET /api/auth/me must return 200 for guest");
  const meJson = JSON.parse(meRes.body);
  assert.strictEqual(meJson.data.role, "guest", "User role in /me must be 'guest'");
  assert.strictEqual(meJson.data.id, "d0000000-0000-0000-0000-000000000001", "User id in /me must match DEMO_USER_ID");
  console.log("  ✓ GET /api/auth/me returned guest profile correctly");

  // 7c. PATCH request blocked for guest
  const blockedPatch = await fastify.inject({
    method: "PATCH",
    url: "/api/notes/sample-id",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    payload: { title: "Patch" },
  });
  assert.strictEqual(blockedPatch.statusCode, 403, "PATCH must be blocked with 403");
  console.log("  ✓ PATCH method successfully blocked with 403 DEMO_READ_ONLY");

  console.log("\n🎉 ALL DEMO SECURITY & DATA ISOLATION TESTS PASSED 100%!\n");
}

runDemoSecurityTests().catch((err) => {
  console.error("❌ Critical test failure:", err);
  process.exit(1);
});
