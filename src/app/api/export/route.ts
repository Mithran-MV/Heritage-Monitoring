import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listReadings } from '@/lib/db';
import { readingQuerySchema } from '@/lib/schemas';
import { toCsv } from '@/lib/statistics';

export const dynamic = 'force-dynamic';

/** GET /api/export?site=&from=&to=&limit= — CSV download for analysis elsewhere. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = readingQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query.', issues: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  try {
    const readings = listReadings({
      ...parsed.data,
      limit: Math.max(parsed.data.limit, 5000),
    });
    const filename = `heritage-${parsed.data.site ?? 'all'}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new NextResponse(toCsv(readings), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[api/export] failed', error);
    return NextResponse.json({ error: 'Could not build the export.' }, { status: 500 });
  }
}
