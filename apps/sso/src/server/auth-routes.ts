import type { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { getDb } from "@xivizley/db";
import { users, refreshTokens, oauthClients } from "@xivizley/db";
import { generateAccessToken, generateRefreshToken, hashToken, verifyAccessToken } from "./tokens.js";

function getCookieDomain(reqHost?: string): string | undefined {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN;
  if (reqHost && reqHost.endsWith(".xivizley.com.tr")) return ".xivizley.com.tr";
  return undefined;
}

interface LoginBody {
  email?: string;
  password?: string;
  client_id?: string;
  redirect_uri?: string;
}

interface RefreshBody {
  refresh_token?: string;
  client_id?: string;
}

const DEMO_USER_ID = "d0000000-0000-0000-0000-000000000001";
const DEMO_EMAIL = "demo@xivizley.com.tr";
const DEMO_NAME = "Misafir Kullanıcı (Demo)";
const DEMO_ROLE = "guest";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

  // ─── 0. POST /api/auth/demo (Canlı Demo Misafir Girişi) ───────
  fastify.post<{
    Body: { redirect_uri?: string; client_id?: string };
    Querystring: { redirect_uri?: string };
  }>("/api/auth/demo", async (request, reply) => {
    const redirect_uri = (request.body as any)?.redirect_uri || (request.query as any)?.redirect_uri;
    const client_id = (request.body as any)?.client_id || "suite";

    // 1. Demo kullanıcısını kontrol et veya oluştur
    let demoUser: any = null;
    try {
      const [existingById] = await db
        .select()
        .from(users)
        .where(eq(users.id, DEMO_USER_ID))
        .limit(1);

      if (existingById) {
        demoUser = existingById;
      } else {
        const [existingByEmail] = await db
          .select()
          .from(users)
          .where(eq(users.email, DEMO_EMAIL))
          .limit(1);

        if (existingByEmail) {
          demoUser = existingByEmail;
        } else {
          const [inserted] = await db
            .insert(users)
            .values({
              id: DEMO_USER_ID,
              email: DEMO_EMAIL,
              displayName: DEMO_NAME,
              role: DEMO_ROLE,
              passwordHash: "argon2_demo_guest_disabled",
            })
            .returning();
          demoUser = inserted;
        }
      }
    } catch (dbErr) {
      console.warn("[Auth Demo] Veritabanı sorgusu fallback moduna geçti:", dbErr);
    }

    if (!demoUser) {
      demoUser = {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        displayName: DEMO_NAME,
        role: DEMO_ROLE,
        passwordHash: "argon2_demo_guest_disabled",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 2. RS256 JWT Access Token üret
    const accessToken = await generateAccessToken(demoUser);

    // 3. Refresh Token üret ve kaydet
    const { rawToken, tokenHash } = generateRefreshToken();
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      await db.insert(refreshTokens).values({
        userId: demoUser.id,
        tokenHash,
        clientId: client_id,
        familyId,
        expiresAt,
      });
    } catch {
      // In-memory / mock fallback
    }

    // 4. Çerezleri set et
    const cookieDomain = getCookieDomain(request.headers.host);
    const isProd = process.env.NODE_ENV === "production";
    const isSecure =
      process.env.COOKIE_SECURE === "true" ||
      (isProd && (request.protocol === "https" || request.headers["x-forwarded-proto"] === "https"));

    reply.setCookie("xivizley_access_token", accessToken, {
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    reply.setCookie("xivizley_refresh_token", rawToken, {
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    // 5. Yönlendirme URL'si oluştur
    let finalRedirectUrl = "/";
    if (redirect_uri && redirect_uri !== "/") {
      try {
        const parsedUrl = new URL(redirect_uri, `http://${request.headers.host || "localhost"}`);
        parsedUrl.searchParams.set("access_token", accessToken);
        finalRedirectUrl = parsedUrl.toString();
      } catch {
        finalRedirectUrl = redirect_uri;
      }
    }

    return reply.status(200).send({
      ok: true,
      redirectUrl: finalRedirectUrl,
      data: {
        accessToken,
        refreshToken: rawToken,
        expiresIn: 604800,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          displayName: demoUser.displayName,
          role: demoUser.role,
        },
      },
    });
  });

  // ─── 1. POST /api/auth/login ───────────────────────────────
  fastify.post<{ Body: LoginBody }>("/api/auth/login", async (request, reply) => {
    const { email, password, client_id = "suite", redirect_uri } = request.body || {};

    if (!email || !password) {
      return reply.status(400).send({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "E-posta ve şifre zorunludur.",
      });
    }

    // 1. Kullanıcıyı PostgreSQL'den bul
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      return reply.status(401).send({
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "Geçersiz e-posta veya şifre.",
      });
    }

    // 2. Argon2 ile şifreyi doğrula (İlk kurulumda dummy hash varsa girilen şifreyi kaydet)
    let isPasswordValid = false;
    if (user.passwordHash === "argon2_dummy_hash") {
      const newHash = await argon2.hash(password);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
      isPasswordValid = true;
    } else {
      isPasswordValid = await argon2.verify(user.passwordHash, password);
    }

    if (!isPasswordValid) {
      return reply.status(401).send({
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "Geçersiz e-posta veya şifre.",
      });
    }

    // 3. RS256 JWT Access Token (15 dk) üret
    const accessToken = await generateAccessToken(user);

    // 4. Refresh Token üret ve PostgreSQL sso.refresh_tokens tablosuna kaydet (30 gün)
    const { rawToken, tokenHash } = generateRefreshToken();
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 gün

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      clientId: client_id,
      familyId,
      expiresAt,
    });

    // 5. Güvenli HttpOnly Cookie olarak set et (Wildcard domain destekli)
    const cookieDomain = getCookieDomain(request.headers.host);

    reply.setCookie("xivizley_access_token", accessToken, {
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && (request.protocol === "https" || request.headers["x-forwarded-proto"] === "https")),
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 gün
    });

    reply.setCookie("xivizley_refresh_token", rawToken, {
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && (request.protocol === "https" || request.headers["x-forwarded-proto"] === "https")),
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 gün
    });

    // 6. Yönlendirme URL'si oluştur
    let finalRedirectUrl: string | null = null;
    if (redirect_uri) {
      try {
        const parsedUrl = new URL(redirect_uri);
        parsedUrl.searchParams.set("access_token", accessToken);
        finalRedirectUrl = parsedUrl.toString();
      } catch {
        finalRedirectUrl = redirect_uri;
      }
    }

    return reply.status(200).send({
      ok: true,
      data: {
        accessToken,
        refreshToken: rawToken,
        expiresIn: 900,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
      },
      redirectUrl: finalRedirectUrl,
    });
  });

  // ─── 2. POST /api/auth/refresh ─────────────────────────────
  fastify.post<{ Body: RefreshBody }>("/api/auth/refresh", async (request, reply) => {
    // Refresh token hem body'den hem cookie'den okunabilir
    const token =
      request.body?.refresh_token || (request.cookies as Record<string, string | undefined>)?.["xivizley_refresh_token"];
    const clientId = request.body?.client_id || "suite";

    if (!token) {
      return reply.status(400).send({
        ok: false,
        code: "BAD_REQUEST",
        message: "Refresh token bulunamadı.",
      });
    }

    const tokenHash = hashToken(token);

    // 1. Veritabanından token'ı bul
    const [existingToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!existingToken) {
      return reply.status(401).send({
        ok: false,
        code: "INVALID_TOKEN",
        message: "Geçersiz refresh token.",
      });
    }

    // 2. Token daha önce iptal edildiyse: Token Çalınma Tespiti! (Tüm aileyi iptal et)
    if (existingToken.revokedAt) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.familyId, existingToken.familyId));

      return reply.status(401).send({
        ok: false,
        code: "TOKEN_REVOKED",
        message: "Güvenlik uyarısı: Oturum iptal edildi. Lütfen tekrar giriş yapın.",
      });
    }

    // 3. Süresi dolmuş mu kontrolü
    if (existingToken.expiresAt < new Date()) {
      return reply.status(401).send({
        ok: false,
        code: "TOKEN_EXPIRED",
        message: "Refresh token süresi dolmuş. Lütfen tekrar giriş yapın.",
      });
    }

    // 4. Kullanıcıyı getir
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingToken.userId))
      .limit(1);

    if (!user) {
      return reply.status(404).send({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı.",
      });
    }

    // 5. Token Rotation (RTR): Eski token'ı iptal et
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, existingToken.id));

    // 6. Yeni Token Çifti üret (aynı family_id devam eder)
    const { rawToken: newRawToken, tokenHash: newTokenHash } = generateRefreshToken();
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      clientId: clientId,
      familyId: existingToken.familyId,
      expiresAt: newExpiresAt,
    });

    const newAccessToken = await generateAccessToken(user);

    // Cookie güncelle (Wildcard domain destekli)
    const cookieDomain = getCookieDomain(request.headers.host);

    reply.setCookie("xivizley_access_token", newAccessToken, {
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && (request.protocol === "https" || request.headers["x-forwarded-proto"] === "https")),
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    reply.setCookie("xivizley_refresh_token", newRawToken, {
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && (request.protocol === "https" || request.headers["x-forwarded-proto"] === "https")),
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    return reply.status(200).send({
      ok: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRawToken,
        expiresIn: 604800,
      },
    });
  });

  // ─── 3. POST /api/auth/logout ──────────────────────────────
  fastify.post("/api/auth/logout", async (request, reply) => {
    const domain = getCookieDomain(request.headers.host);
    const cookieOpts = { path: "/", ...(domain ? { domain } : {}) };
    reply.clearCookie("xivizley_access_token", cookieOpts);
    reply.clearCookie("xivizley_refresh_token", cookieOpts);
    reply.clearCookie("xivizley_refresh_token", { path: "/api/auth", ...(domain ? { domain } : {}) });

    return reply.status(200).send({
      ok: true,
      message: "Oturum başarıyla kapatıldı.",
    });
  });

  // ─── 4. GET /api/auth/me ───────────────────────────────────
  fastify.get("/api/auth/me", async (request, reply) => {
    const cookies = request.cookies as Record<string, string | undefined>;
    const token =
      cookies?.["xivizley_access_token"] ||
      request.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (token) {
      try {
        const payload = await verifyAccessToken(token);
        const userId = payload.sub as string;
        let user: any = null;
        try {
          const [found] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          user = found;
        } catch {
          // DB down fallback
        }

        if (user) {
          return reply.status(200).send({
            ok: true,
            data: {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              role: user.role,
              avatarUrl: user.avatarUrl,
            },
          });
        }

        if (userId === DEMO_USER_ID || (payload["role"] as string) === "guest") {
          return reply.status(200).send({
            ok: true,
            data: {
              id: DEMO_USER_ID,
              email: (payload["email"] as string) || DEMO_EMAIL,
              displayName: (payload["displayName"] as string) || DEMO_NAME,
              role: "guest",
              avatarUrl: null,
            },
          });
        }
      } catch {
        // Access token geçersiz veya süresi dolmuş — refresh token denenecek
      }
    }

    // Refresh token ile otomatik oturum yenileme
    const refreshRaw = cookies?.["xivizley_refresh_token"];
    if (refreshRaw) {
      try {
        const tokenHash = hashToken(refreshRaw);
        const [existingToken] = await db
          .select()
          .from(refreshTokens)
          .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
          .limit(1);

        if (existingToken && existingToken.expiresAt > new Date()) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, existingToken.userId))
            .limit(1);

          if (user) {
            const newAccessToken = await generateAccessToken(user);
            const cookieDomain = getCookieDomain(request.headers.host);
            reply.setCookie("xivizley_access_token", newAccessToken, {
              path: "/",
              ...(cookieDomain ? { domain: cookieDomain } : {}),
              httpOnly: true,
              secure: process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && (request.protocol === "https" || request.headers["x-forwarded-proto"] === "https")),
              sameSite: "lax",
              maxAge: 7 * 24 * 60 * 60,
            });

            return reply.status(200).send({
              ok: true,
              data: {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                avatarUrl: user.avatarUrl,
              },
            });
          }
        }
      } catch {
        // Refresh başarısız
      }
    }

    return reply.status(401).send({
      ok: false,
      code: "UNAUTHORIZED",
      message: "Oturum çerezi veya token bulunamadı.",
    });
  });

  // ─── 5. POST /api/auth/change-password ─────────────────────
  fastify.post<{ Body: { oldPassword?: string; newPassword?: string } }>(
    "/api/auth/change-password",
    async (request, reply) => {
      const cookies = request.cookies as Record<string, string | undefined>;
      const token =
        cookies?.["xivizley_access_token"] ||
        request.headers.authorization?.replace(/^Bearer\s+/i, "");

      if (!token) {
        return reply.status(401).send({
          ok: false,
          code: "UNAUTHORIZED",
          message: "Oturum açmanız gerekiyor.",
        });
      }

      const { oldPassword, newPassword } = request.body || {};
      if (!newPassword || newPassword.length < 6) {
        return reply.status(400).send({
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Yeni şifre en az 6 karakter olmalıdır.",
        });
      }

      try {
        const payload = await verifyAccessToken(token);
        const userId = payload.sub as string;
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!user) {
          return reply.status(401).send({ ok: false, code: "USER_NOT_FOUND", message: "Kullanıcı bulunamadı." });
        }

        // Eğer mevcut şifre dummy hash değilse eski şifreyi kontrol et
        if (user.passwordHash !== "argon2_dummy_hash") {
          if (!oldPassword) {
            return reply.status(400).send({ ok: false, code: "VALIDATION_ERROR", message: "Mevcut şifrenizi girmelisiniz." });
          }
          const valid = await argon2.verify(user.passwordHash, oldPassword);
          if (!valid) {
            return reply.status(401).send({ ok: false, code: "INVALID_CREDENTIALS", message: "Mevcut şifre hatalı." });
          }
        }

        const newHash = await argon2.hash(newPassword);
        await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

        return reply.status(200).send({
          ok: true,
          message: "Şifreniz başarıyla güncellendi.",
        });
      } catch {
        return reply.status(401).send({ ok: false, code: "INVALID_TOKEN", message: "Geçersiz oturum." });
      }
    }
  );
};


