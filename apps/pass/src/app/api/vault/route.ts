import { NextResponse } from 'next/server';
import { getAllVaultItems, createVaultItem } from '@/server/services/passService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || undefined;
    const items = await getAllVaultItems(folder);
    return NextResponse.json({ ok: true, data: items });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Kasa verileri alınamadı' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json(
        { ok: false, error: 'Başlık zorunludur' },
        { status: 400 }
      );
    }

    const newItem = await createVaultItem({
      type: body.type || 'login',
      title: body.title,
      username: body.username,
      password: body.password || '',
      url: body.url,
      totpSecret: body.totpSecret,
      notes: body.notes,
      folder: body.folder || 'Genel',
      isFavorite: Boolean(body.isFavorite),
    });

    return NextResponse.json({ ok: true, data: newItem }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Öğe kaydedilemedi' },
      { status: 500 }
    );
  }
}
