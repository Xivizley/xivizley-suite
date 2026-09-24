import { NextResponse } from 'next/server';
import { checkMonitorById } from '@/server/services/pulseService';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await checkMonitorById(id);
    if (!result) {
      return NextResponse.json({ ok: false, error: 'Monitör bulunamadı' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
