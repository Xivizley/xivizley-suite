import { NextRequest, NextResponse } from 'next/server';
import { inspectRequest } from '@/server/services/shieldService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = body.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    const path = body.path || '/';
    const payload = body.payload || '';
    const service = body.service || 'Caddy Edge Proxy';

    const result = await inspectRequest(ip, path, payload, service);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
