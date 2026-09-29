import { NextRequest, NextResponse } from 'next/server';
import { getAllBans, banIp } from '@/server/services/shieldService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const activeOnly = req.nextUrl.searchParams.get('all') !== 'true';
    const bans = await getAllBans(activeOnly);
    return NextResponse.json({ ok: true, data: bans });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.ip || !body.reason) {
      return NextResponse.json({ ok: false, error: 'ip ve reason zorunludur' }, { status: 400 });
    }

    const item = await banIp(
      body.ip,
      body.reason,
      body.threatLevel || 'high',
      body.isPermanent ?? false
    );
    return NextResponse.json({ ok: true, data: item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
