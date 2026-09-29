import { NextResponse } from 'next/server';
import { getAllMonitors } from '@/server/services/pulseService';

export async function GET() {
  try {
    const list = await getAllMonitors();
    const upCount = list.filter((m) => m.status === 'up').length;
    const totalCount = list.length;
    const avgLatency = list.length > 0
      ? Math.round(list.reduce((acc, m) => acc + (m.lastLatencyMs || 0), 0) / list.length)
      : 0;

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      summary: {
        upCount,
        downCount: totalCount - upCount,
        totalCount,
        uptimePercentage: totalCount > 0 ? Math.round((upCount / totalCount) * 10000) / 100 : 100,
        avgLatencyMs: avgLatency,
      },
      monitors: list.map((m) => ({
        id: m.id,
        name: m.name,
        target: m.target,
        type: m.type,
        status: m.status,
        latencyMs: m.lastLatencyMs,
        uptime: m.uptimePercentage,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
