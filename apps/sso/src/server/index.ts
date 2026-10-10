import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import next from "next";
import { eq, and, isNull } from "drizzle-orm";
import { getDb, users, refreshTokens } from "@xivizley/db";
import { ResourceGovernor } from "@xivizley/resource-gov";
import { authRoutes } from "./auth-routes.js";
import { driveRoutes } from "./drive-routes.js";
import { notesRoutes } from "./notes-routes.js";
import { calendarRoutes } from "./calendar-routes.js";
import { photosRoutes } from "./photos-routes.js";
import { gamePanelRoutes } from "./game-routes.js";
import { passRoutes } from "./pass-routes.js";
import { sentinelRoutes } from "./sentinel-routes.js";
import { gameBackupRoutes } from "./game-backup-routes.js";
import { gamePluginRoutes } from "./game-plugin-routes.js";
import { userPreferencesRoutes } from "./user-preferences-routes.js";
import { storeRoutes } from "./store-routes.js";
import { terminalRoutes } from "./terminal-routes.js";
import { doctorRoutes } from "./doctor-routes.js";
import { clusterRoutes } from "./cluster-routes.js";
import { statusRoutes } from "./status-routes.js";
import { sslRoutes } from "./ssl-routes.js";
import { notificationRoutes } from "./notification-routes.js";
import { startSentinelDaemon } from "./services/sentinelService.js";
import { verifyAccessToken, hashToken, generateAccessToken } from "./tokens.js";
import { startLogTailer } from "./engine/logTailer.js";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

function isPublicRoute(method: string, urlPath: string): boolean {
  // 1. Statik varlıklar ve giriş rotaları
  if (
    urlPath.startsWith("/_next") ||
    urlPath.startsWith("/login") ||
    urlPath.startsWith("/api/auth") ||
    urlPath === "/favicon.ico" ||
    urlPath === "/icon.svg" ||
    urlPath === "/manifest.json" ||
    urlPath === "/sw.js" ||
    urlPath === "/icon-192.png" ||
    urlPath === "/icon-512.png" ||
    urlPath === "/robots.txt"
  ) {
    return true;
  }

  // 2. Halka açık dosya paylaşım linkleri (/s/:token)
  if (
    urlPath.startsWith("/s/") ||
    urlPath.startsWith("/api/shares/public/") ||
    urlPath.startsWith("/api/download/public/")
  ) {
    return true;
  }

  // 3. Oyun Kokpiti (Misafir İzleyici Modu — Sadece Salt Okunur Rotalar)
  if (
    urlPath === "/game" ||
    urlPath.startsWith("/game?") ||
    urlPath.startsWith("/api/metrics/stream") ||
    urlPath.startsWith("/api/logs/stream") ||
    (method === "GET" && urlPath.startsWith("/api/server/players")) ||
    (method === "GET" && urlPath.startsWith("/api/server/summary")) ||
    (method === "GET" && urlPath === "/api/server/files") ||
    (method === "GET" && urlPath.startsWith("/api/server/backups")) ||
    (method === "GET" && urlPath.startsWith("/api/server/plugins"))
  ) {
    return true;
  }

  // 4. Pulse Uptime Durum İzleme (Salt Okunur)
  if (
    urlPath === "/pulse" ||
    urlPath.startsWith("/pulse?") ||
    (method === "GET" && urlPath.startsWith("/api/monitors")) ||
    (method === "GET" && urlPath.startsWith("/api/telemetry")) ||
    (method === "GET" && urlPath.startsWith("/api/sentinel/status"))
  ) {
    return true;
  }

  // 5. Uygulama Mağazası (Salt Okunur Gezinme)
  if (
    urlPath === "/store" ||
    urlPath.startsWith("/store?") ||
    (method === "GET" && urlPath.startsWith("/api/store/"))
  ) {
    return true;
  }

  // 6. Halka Açık Uptime Durum Sayfası (/status)
  if (
    urlPath === "/status" ||
    urlPath.startsWith("/status?") ||
    (method === "GET" && urlPath.startsWith("/api/status/"))
  ) {
    return true;
  }

  // 7. Web Terminal (Sandbox & WebSocket)
  if (
    urlPath === "/terminal" ||
    urlPath.startsWith("/terminal?") ||
    urlPath.startsWith("/api/terminal")
  ) {
    return true;
  }

  // 8. Küme & Doktor Genel Bilgileri (Salt Okunur)
  if (
    (method === "GET" && urlPath.startsWith("/api/cluster/nodes")) ||
    (method === "GET" && urlPath.startsWith("/api/doctor/diagnostics"))
  ) {
    return true;
  }

  // 9. OpsCenter SSL Radar ve Bildirim Rotaları
  if (
    (method === "GET" && urlPath.startsWith("/api/ssl/radar")) ||
    (method === "GET" && urlPath.startsWith("/api/notifications/config")) ||
    (method === "POST" && urlPath === "/api/notifications/config") ||
    (method === "POST" && urlPath === "/api/notifications/test-discord")
  ) {
    return true;
  }

  return false;
}

async function isAuthenticatedRequest(
  request: any,
  reply: any,
): Promise<boolean> {
  const cookies = (request.cookies || {}) as Record<string, string | undefined>;
  const token =
    cookies["xivizley_access_token"] ||
    request.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
    (request.query as any)?.access_token ||
    (request.query as any)?.token;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      if (payload?.sub) {
        request.user = {
          id: payload.sub as string,
          email: (payload["email"] as string) || "",
          role: (payload["role"] as string) || "guest",
          displayName:
            (payload["displayName"] as string) || "Misafir Kullanıcı (Demo)",
          avatarUrl: (payload["avatarUrl"] as string) || undefined,
          ...payload,
        };
        return true;
      }
    } catch {
      // Refresh token kontrolüne geç
    }
  }

  const refreshRaw = cookies["xivizley_refresh_token"];
  if (refreshRaw) {
    try {
      const db = getDb();
      const tokenHash = hashToken(refreshRaw);
      const [existingToken] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            isNull(refreshTokens.revokedAt),
          ),
        )
        .limit(1);

      if (existingToken && existingToken.expiresAt > new Date()) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, existingToken.userId))
          .limit(1);

        if (user) {
          const newAccessToken = await generateAccessToken(user);
          const reqHost = request.headers?.host || "";
          reply.setCookie("xivizley_access_token", newAccessToken, {
            path: "/",
            domain:
              process.env.COOKIE_DOMAIN ||
              (reqHost.endsWith(".xivizley.com.tr")
                ? ".xivizley.com.tr"
                : undefined),
            httpOnly: true,
            secure:
              process.env.COOKIE_SECURE === "true" ||
              (process.env.NODE_ENV === "production" &&
                (request.protocol === "https" ||
                  request.headers["x-forwarded-proto"] === "https")),
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
          });
          request.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl ?? undefined,
          };
          return true;
        }
      }
    } catch {
      // Geçersiz
    }
  }

  return false;
}

async function bootstrap() {
  // 1. Resource Governor başlat
  const governor = new ResourceGovernor();
  governor.start();

  // 2. Next.js hazırlığı
  let nextReady = false;
  const nextApp = next({ dev, dir: process.cwd() });
  const handle = nextApp.getRequestHandler();

  try {
    await nextApp.prepare();
    nextReady = true;
  } catch (err) {
    console.warn(
      "⚠️ Next.js frontend hazır değil, API modunda çalışılıyor:",
      err,
    );
  }

  // 3. Fastify başlat
  const fastify = Fastify({
    logger: {
      level: dev ? "info" : "warn",
    },
  });

  // Middleware eklentileri
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(cookie, {
    secret:
      process.env.COOKIE_SECRET || "xivizley_cookie_secret_key_32_chars_min",
  });

  await fastify.register(websocket);

  // ─── MERKEZİ GÜVENLİK DUVARI (Kişisel Bulut, Kasa, Dosyalar, Notlar, Fotoğraflar Koruması) ───
  fastify.addHook("onRequest", async (request, reply) => {
    const rawUrl = request.url || "/";
    const pathname = rawUrl.split("?")[0] || "/";

    const authed = await isAuthenticatedRequest(request, reply);

    if (isPublicRoute(request.method, pathname)) {
      return;
    }

    if (!authed) {
      if (pathname.startsWith("/api/")) {
        return reply.status(401).send({
          ok: false,
          code: "UNAUTHORIZED",
          message: "Bu veriye erişmek için Yönetici girişi yapmalısınız.",
        });
      }
      return reply.redirect(
        `/login?redirect_uri=${encodeURIComponent(rawUrl)}`,
      );
    }
  });

  // ─── GLOBAL DEMO MUTATION GUARD (Security P0) ───
  fastify.addHook("preHandler", async (request, reply) => {
    let user = (request as any).user;
    if (!user) {
      await isAuthenticatedRequest(request, reply);
      user = (request as any).user;
    }

    if (user?.role === "guest") {
      const method = request.method.toUpperCase();
      const rawPath = (request.url || "/").split("?")[0] || "/";
      const normalizedPath =
        rawPath.length > 1 && rawPath.endsWith("/")
          ? rawPath.slice(0, -1)
          : rawPath;

      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        if (
          normalizedPath === "/api/auth/demo" ||
          normalizedPath === "/api/auth/logout" ||
          normalizedPath === "/api/auth/login" ||
          normalizedPath === "/api/auth/refresh" ||
          normalizedPath === "/api/notifications/test-discord" ||
          normalizedPath === "/api/notifications/config" ||
          normalizedPath === "/api/sentinel/test-telegram"
        ) {
          return;
        }
        return reply.status(403).send({
          ok: false,
          code: "DEMO_READ_ONLY",
          message:
            "Canlı demo modunda değişiklik yapılamaz. Tüm özellikler salt-okunur (read-only) durumdadır.",
        });
      }
    }
  });

  // Arama motorlarının (Google vb.) ekosistemi indekslemesini kesin olarak engelle
  fastify.addHook("onSend", async (_request, reply) => {
    reply.header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  });

  // Standalone robots.txt rotası
  fastify.get("/robots.txt", async (_req, reply) => {
    reply.header("Content-Type", "text/plain; charset=utf-8");
    reply.header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    return "User-agent: *\nAllow: /\n";
  });

  // Fastify API Rotaları (Tüm Suite Modülleri)
  await fastify.register(authRoutes);
  await fastify.register(driveRoutes);
  await fastify.register(notesRoutes);
  await fastify.register(calendarRoutes);
  await fastify.register(photosRoutes);
  await fastify.register(gamePanelRoutes, { governor });
  await fastify.register(gameBackupRoutes);
  await fastify.register(gamePluginRoutes);
  await fastify.register(passRoutes);
  await fastify.register(sentinelRoutes);
  await fastify.register(userPreferencesRoutes);
  await fastify.register(storeRoutes);
  await fastify.register(terminalRoutes);
  await fastify.register(doctorRoutes);
  await fastify.register(clusterRoutes);
  await fastify.register(statusRoutes);
  await fastify.register(sslRoutes);
  await fastify.register(notificationRoutes);

  // Shield Log Tailer ve VDS Sentinel Bekçisini başlat (arka planda)
  try {
    startLogTailer();
  } catch (err) {
    console.warn("Log tailer başlatılamadı:", err);
  }

  try {
    startSentinelDaemon(60);
  } catch (err) {
    console.warn("Sentinel daemon başlatılamadı:", err);
  }

  // Next.js SSR ve App Router sayfaları için catch-all yönlendirme
  fastify.setNotFoundHandler(async (req, reply) => {
    if (nextReady) {
      reply.hijack();
      await handle(req.raw, reply.raw);
    } else {
      reply.status(200).send({
        ok: true,
        service: "XIVIZLEY Unified Hub",
        status: "API operational",
      });
    }
  });

  // Sunucuyu başlat
  try {
    await fastify.listen({ port, host });
    console.log(`🚀 XIVIZLEY Unified Hub çalışıyor: http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("Hub başlatılamadı:", err);
  process.exit(1);
});
