import type { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { getDb } from "@xivizley/db";
import { users, refreshTokens, oauthClients } from "@xivizley/db/src/schemas/sso.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "./tokens.js";

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

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

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

    // 2. Argon2 ile şifreyi doğrula
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
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

    // 5. Güvenli HttpOnly Cookie olarak set et
    reply.setCookie("xivizley_access_token", accessToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 dakika
    });

    reply.setCookie("xivizley_refresh_token", rawToken, {
      path: "/api/auth",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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

    // Cookie güncelle
    reply.setCookie("xivizley_access_token", newAccessToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
    });

    reply.setCookie("xivizley_refresh_token", newRawToken, {
      path: "/api/auth",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    return reply.status(200).send({
      ok: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRawToken,
        expiresIn: 900,
      },
    });
  });
};
