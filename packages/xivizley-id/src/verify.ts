import { importSPKI, jwtVerify } from "jose";
import type { XivizleyUser, UserRole } from "@xivizley/types";

let cachedPublicKey: CryptoKey | null = null;

/**
 * Public key'i PEM veya Base64 formatından okuyup CryptoKey nesnesine dönüştürür (Cache destekli).
 */
export async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  let rawKey = process.env["JWT_PUBLIC_KEY"] || "";
  if (!rawKey) {
    throw new Error(
      "[@xivizley/xivizley-id] JWT_PUBLIC_KEY ortam değişkeni bulunamadı. Lütfen .env dosyanızı kontrol edin.",
    );
  }

  // Base64 formatında verilmişse çöz
  if (!rawKey.includes("-----BEGIN PUBLIC KEY-----")) {
    try {
      rawKey = Buffer.from(rawKey, "base64").toString("utf-8");
    } catch {
      // düz pem veya raw gelmiş olabilir
    }
  }

  cachedPublicKey = (await importSPKI(rawKey, "RS256")) as CryptoKey;
  return cachedPublicKey;
}

/**
 * Verilen Bearer JWT access token'ı RS256 public key ile stateless doğrular.
 * Veritabanına istek atmaz.
 *
 * @param token Doğrulanacak JWT string
 * @returns Çözümlenmiş XivizleyUser bilgisi
 */
export async function verifyAccessToken(token: string): Promise<XivizleyUser> {
  const key = await getPublicKey();

  const { payload } = await jwtVerify(token, key, {
    algorithms: ["RS256"],
    issuer: "xivizley:sso",
  });

  if (!payload.sub) {
    throw new Error("Geçersiz JWT: 'sub' (kullanıcı ID) alanı bulunamadı.");
  }

  return {
    id: payload.sub,
    email: (payload["email"] as string) || "",
    username: (payload["username"] as string) || "",
    displayName: (payload["displayName"] as string) || (payload["username"] as string) || "",
    avatarUrl: (payload["avatarUrl"] as string) || undefined,
    role: (payload["role"] as UserRole) || "member",
    createdAt: new Date((payload["createdAt"] as string) || Date.now()),
    updatedAt: new Date(),
  };
}
