import { NextResponse } from 'next/server';

import { listSites } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/sites — monuments this deployment monitors. */
export async function GET() {
  try {
    return NextResponse.json({ sites: listSites() });
  } catch (error) {
    console.error('[api/sites] failed', error);
    return NextResponse.json({ error: 'Could not list sites.' }, { status: 500 });
  }
}
