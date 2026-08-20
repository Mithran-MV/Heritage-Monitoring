import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateDevice } from '@/lib/auth';
import { evaluateThresholds, insertReading, listReadings, siteExists } from '@/lib/db';
import { publish } from '@/lib/events';
import {
  isBatchPayload,
  readingBatchSchema,
  readingInputSchema,
  readingQuerySchema,
  type ReadingInput,
} from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** 422 with the offending field names, so a device operator can act on it. */
function invalidReading(error: z.ZodError): Response {
  return NextResponse.json(
    { error: 'Invalid reading.', issues: z.flattenError(error).fieldErrors },
    { status: 422 },
  );
}

/**
 * GET  /api/readings  — read the archive (public)
 * POST /api/readings  — ingest a sample or batch (device key required)
 *
 * The previous handler had these backwards: GET wrote rows and POST read them.
 * Beyond being surprising, a write behind GET is reachable by any crawler,
 * prefetcher or browser address bar.
 */

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
    return NextResponse.json({ readings: listReadings(parsed.data) });
  } catch (error) {
    console.error('[api/readings] read failed', error);
    return NextResponse.json({ error: 'Could not read the archive.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = authenticateDevice(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  // Branch on shape so each schema narrows on its own; a union would report
  // which branch failed rather than which field.
  let inputs: ReadingInput[];
  if (isBatchPayload(body)) {
    const parsed = readingBatchSchema.safeParse(body);
    if (!parsed.success) return invalidReading(parsed.error);
    inputs = parsed.data.readings;
  } else {
    const parsed = readingInputSchema.safeParse(body);
    if (!parsed.success) return invalidReading(parsed.error);
    inputs = [parsed.data];
  }

  // Reject the whole batch on an unknown site rather than storing orphans that
  // the foreign key would refuse one row at a time.
  const unknown = [...new Set(inputs.map((input) => input.site))].filter(
    (slug) => !siteExists(slug),
  );
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: `Unknown site${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}` },
      { status: 404 },
    );
  }

  try {
    const stored = inputs.map((input) => {
      const reading = insertReading(input);
      const alerts = evaluateThresholds(reading);
      publish({ type: 'reading', reading, alerts });
      return { reading, alerts };
    });

    return NextResponse.json(
      {
        accepted: stored.length,
        readings: stored.map((entry) => entry.reading),
        alerts: stored.flatMap((entry) => entry.alerts),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[api/readings] ingest failed', error);
    return NextResponse.json({ error: 'Could not store the reading.' }, { status: 500 });
  }
}
