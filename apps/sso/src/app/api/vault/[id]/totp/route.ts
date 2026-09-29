import { NextResponse } from 'next/server';
import { getVaultItemById } from '@/server/services/passService';
import { generateTotp } from '@/server/crypto/vaultCrypto';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getVaultItemById(id);
    if (!item || !item.totpSecret) {
      return NextResponse.json(
        { ok: false, error: 'Bu öğede 2FA anahtarı tanımlı değil' },
        { status: 404 }
      );
    }

    const totp = generateTotp(item.totpSecret);
    return NextResponse.json({ ok: true, data: totp });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
