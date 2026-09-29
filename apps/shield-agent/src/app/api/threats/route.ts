import { NextRequest, NextResponse } from 'next/server';
import { getSecurityEvents } from '@/server/services/shieldService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30', 10);
    const events = await getSecurityEvents(limit);
    return NextResponse.json({ ok: true, data: events });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
