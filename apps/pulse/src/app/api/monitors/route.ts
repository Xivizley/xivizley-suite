import { NextResponse } from 'next/server';
import { getAllMonitors, createMonitor } from '@/server/services/pulseService';

export async function GET() {
  try {
    const data = await getAllMonitors();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.target) {
      return NextResponse.json(
        { ok: false, error: 'İsim (name) ve Hedef (target) zorunludur.' },
        { status: 400 }
      );
    }

    const created = await createMonitor({
      name: body.name,
      type: body.type || 'http',
      target: body.target,
      intervalSeconds: body.intervalSeconds ? Number(body.intervalSeconds) : 30,
    });

    return NextResponse.json({ ok: true, data: created });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
