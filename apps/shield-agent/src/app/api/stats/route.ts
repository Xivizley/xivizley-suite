import { NextResponse } from 'next/server';
import { getShieldStats } from '@/server/services/shieldService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getShieldStats();
    return NextResponse.json({ ok: true, data: stats });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
