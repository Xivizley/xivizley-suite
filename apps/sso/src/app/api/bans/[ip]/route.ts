import { NextRequest, NextResponse } from 'next/server';
import { unbanIp } from '@/server/services/shieldService';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  try {
    const { ip } = await params;
    const success = await unbanIp(ip);
    return NextResponse.json({ ok: success });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
