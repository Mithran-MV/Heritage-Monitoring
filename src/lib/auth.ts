import 'server-only';

import { timingSafeEqual } from 'node:crypto';

/**
 * Shared-secret authentication for device ingest.
 *
 * The previous ingest endpoint was an unauthenticated GET, so anyone who found
 * the URL could write arbitrary readings into the archive — and a crawler
 * prefetching links could do it by accident.
 */

export type AuthResult = { ok: true } | { ok: false; status: number; message: string };

/** Constant-time compare that tolerates differing lengths. */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) {
    // Still burn a comparison so length is not leaked by timing.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function authenticateDevice(request: Request): AuthResult {
  const expected = process.env.DEVICE_API_KEY;

  if (!expected || expected.length < 16) {
    // Failing closed matters more than convenience: an unset secret must not
    // silently turn into an open write endpoint.
    return {
      ok: false,
      status: 503,
      message:
        'Ingest is disabled: DEVICE_API_KEY is unset or too short. Set a 32-byte secret.',
    };
  }

  const presented =
    request.headers.get('x-api-key') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  if (!presented) {
    return { ok: false, status: 401, message: 'Missing X-API-Key header.' };
  }
  if (!equals(presented, expected)) {
    return { ok: false, status: 401, message: 'Invalid device credentials.' };
  }
  return { ok: true };
}
