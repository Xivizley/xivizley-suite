import { NextResponse } from 'next/server';
import {
  generateSecurePassword,
  calculatePasswordStrength,
} from '@/server/crypto/vaultCrypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = generateSecurePassword({
      length: body.length || 20,
      uppercase: body.uppercase ?? true,
      lowercase: body.lowercase ?? true,
      numbers: body.numbers ?? true,
      symbols: body.symbols ?? true,
    });
    const strength = calculatePasswordStrength(password);

    return NextResponse.json({
      ok: true,
      data: {
        password,
        strength,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
