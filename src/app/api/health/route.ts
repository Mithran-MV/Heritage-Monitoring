import { NextResponse } from 'next/server';

import { db, listSites } from '@/lib/db';
import { subscriberCount } from '@/lib/events';

export const dynamic = 'force-dynamic';

/** GET /api/health — liveness probe for Docker, systemd or an uptime monitor. */
export async function GET() {
  try {
    const { count } = db().prepare('SELECT COUNT(*) AS count FROM readings').get() as {
      count: number;
    };

    return NextResponse.json({
      status: 'ok',
      readings: count,
      sites: listSites().length,
      liveSubscribers: subscriberCount(),
      ingestConfigured: Boolean(
        process.env.DEVICE_API_KEY && process.env.DEVICE_API_KEY.length >= 16,
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[api/health] failed', error);
    return NextResponse.json({ status: 'degraded' }, { status: 503 });
  }
}
