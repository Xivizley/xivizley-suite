import { NextRequest, NextResponse } from 'next/server';
import { simulateAttack } from '@/server/services/shieldService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type || 'scanner';
    const event = await simulateAttack(type);
    return NextResponse.json({ ok: true, data: event });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
