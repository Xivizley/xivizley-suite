import crypto from "node:crypto";
import { importPKCS8, SignJWT } from "jose";
import type { User } from "@xivizley/db";

let cachedPrivateKey: CryptoKey | null = null;

let devKeyPair: { privateKey: string; publicKey: string } | null = null;
function getDevKeyPair() {
  if (!devKeyPair) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    devKeyPair = { privateKey, publicKey };
  }
  return devKeyPair;
}

/**
 * RS256 Private Key nesnesini getirir (cache destekli).
 */
export async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey;

  let rawKey = process.env["JWT_PRIVATE_KEY"] || getDevKeyPair().privateKey;

  if (!rawKey.includes("-----BEGIN PRIVATE KEY-----")) {
    try {
      rawKey = Buffer.from(rawKey, "base64").toString("utf-8");
    } catch {
      // düz pem veya raw formatı
    }
  }

  cachedPrivateKey = (await importPKCS8(rawKey, "RS256")) as CryptoKey;
  return cachedPrivateKey;
}

/**
 * 15 dakikalık stateless RS256 Access Token üretir.
 */
export async function generateAccessToken(user: User): Promise<string> {
  const privateKey = await getPrivateKey();

  return new SignJWT({
    email: user.email,
    username: user.email.split("@")[0],
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? undefined,
    role: user.role,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(user.id)
    .setIssuer("xivizley:sso")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(privateKey);
}

/**
 * Güvenli rastgele Refresh Token üretir ve SHA-256 hash'ini hesaplar.
 */
export function generateRefreshToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/**
 * Verilen refresh token'ın SHA-256 hash'ini hesaplar.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

let cachedPublicKey: CryptoKey | null = null;

/**
 * RS256 Public Key nesnesini getirir (cache destekli).
 */
export async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) return cachedPublicKey;

  let rawKey = process.env["JWT_PUBLIC_KEY"] || getDevKeyPair().publicKey;

  if (!rawKey.includes("-----BEGIN PUBLIC KEY-----")) {
    try {
      rawKey = Buffer.from(rawKey, "base64").toString("utf-8");
    } catch {
      // düz pem veya raw formatı
    }
  }

  const { importSPKI } = await import("jose");
  cachedPublicKey = (await importSPKI(rawKey, "RS256")) as CryptoKey;
  return cachedPublicKey;
}

/**
 * 15 dakikalık stateless RS256 Access Token doğrular.
 */
export async function verifyAccessToken(token: string) {
  const { jwtVerify } = await import("jose");
  const publicKey = await getPublicKey();
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: "xivizley:sso",
  });
  return payload;
}
