import { NextResponse } from 'next/server';
import {
  getVaultItemById,
  updateVaultItem,
  deleteVaultItemById,
  toggleVaultFavorite,
} from '@/server/services/passService';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getVaultItemById(id);
    if (!item) {
      return NextResponse.json({ ok: false, error: 'Öğe bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: item });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.toggleFavorite) {
      const isFav = await toggleVaultFavorite(id);
      return NextResponse.json({ ok: true, isFavorite: isFav });
    }

    const updated = await updateVaultItem(id, body);
    if (!updated) {
      return NextResponse.json({ ok: false, error: 'Öğe bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteVaultItemById(id);
    return NextResponse.json({ ok: success });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
