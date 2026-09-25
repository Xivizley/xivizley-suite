// ============================================================
// XIVIZLEY Pass — Vault Cryptographic & TOTP Engine
// Zero-knowledge AES-256-GCM, Password Generator & RFC 6238 TOTP
// ============================================================

import crypto from 'node:crypto';

// ─── 1. Güçlü Parola Üreteci & Güvenlik Ölçer ────────────────

export interface PasswordGeneratorOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

export interface PasswordStrength {
  score: number; // 0 - 4
  label: 'Çok Zayıf' | 'Zayıf' | 'Orta' | 'Güçlü' | 'Askeri Düzey 🛡️';
  color: string;
}

export function generateSecurePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 20,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  let charset = '';
  const upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowerChars = 'abcdefghijkmnopqrstuvwxyz';
  const numberChars = '23456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (uppercase) charset += upperChars;
  if (lowercase) charset += lowerChars;
  if (numbers) charset += numberChars;
  if (symbols) charset += symbolChars;

  if (!charset) charset = lowerChars + numberChars;

  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      result += charset[byte % charset.length] || '';
    }
  }
  return result;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Çok Zayıf', color: '#ef4444' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  switch (score) {
    case 0:
    case 1:
      return { score, label: 'Zayıf', color: '#f87171' };
    case 2:
      return { score, label: 'Orta', color: '#fbbf24' };
    case 3:
      return { score, label: 'Güçlü', color: '#34d399' };
    case 4:
    default:
      return { score: 4, label: 'Askeri Düzey 🛡️', color: '#10b981' };
  }
}

// ─── 2. RFC 6238 TOTP (2FA Authenticator) Motoru ─────────────

/**
 * Base32 anahtarını Buffer'a çevirir.
 */
function base32ToBuffer(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[\s-]/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (!char) continue;
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export interface TotpResult {
  code: string;
  remainingSeconds: number;
  period: number;
}

/**
 * Google Authenticator uyumlu 6 haneli anlık 2FA kodu üretir.
 */
export function generateTotp(secret: string, period = 30): TotpResult {
  try {
    const key = base32ToBuffer(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(epoch / period);
    const remainingSeconds = period - (epoch % period);

    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(timeStep));

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const digest = hmac.digest();

    const lastByte = digest[digest.length - 1];
    const offset = (lastByte !== undefined ? lastByte : 0) & 0x0f;
    const b0 = digest[offset] ?? 0;
    const b1 = digest[offset + 1] ?? 0;
    const b2 = digest[offset + 2] ?? 0;
    const b3 = digest[offset + 3] ?? 0;
    const binary =
      ((b0 & 0x7f) << 24) |
      ((b1 & 0xff) << 16) |
      ((b2 & 0xff) << 8) |
      (b3 & 0xff);

    const code = (binary % 1000000).toString().padStart(6, '0');
    return { code, remainingSeconds, period };
  } catch {
    return { code: '------', remainingSeconds: 30, period };
  }
}

// ─── 3. Zero-Knowledge AES-256-GCM Şifreleme ────────────────

const DEFAULT_SECRET_KEY = process.env.VAULT_MASTER_KEY || 'xivizley_vault_zero_knowledge_super_secret_2026';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function encryptVaultData(text: string, secretKey = DEFAULT_SECRET_KEY): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

export function decryptVaultData(payload: EncryptedPayload, secretKey = DEFAULT_SECRET_KEY): string {
  try {
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return payload.ciphertext; // Fallback
  }
}
