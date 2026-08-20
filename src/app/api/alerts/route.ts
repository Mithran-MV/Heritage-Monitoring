import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listAlerts } from '@/lib/db';
import { alertQuerySchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** GET /api/alerts?site=&status=open&limit=50 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = alertQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query.', issues: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ alerts: listAlerts(parsed.data) });
  } catch (error) {
    console.error('[api/alerts] failed', error);
    return NextResponse.json({ error: 'Could not list alerts.' }, { status: 500 });
  }
}
