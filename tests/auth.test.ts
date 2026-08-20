import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { authenticateDevice } from '@/lib/auth';

const VALID_KEY = 'a'.repeat(64);

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/readings', { method: 'POST', headers });
}

describe('authenticateDevice', () => {
  const original = process.env.DEVICE_API_KEY;

  beforeEach(() => {
    process.env.DEVICE_API_KEY = VALID_KEY;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.DEVICE_API_KEY;
    else process.env.DEVICE_API_KEY = original;
  });

  it('accepts the configured key via X-API-Key', () => {
    expect(authenticateDevice(request({ 'x-api-key': VALID_KEY })).ok).toBe(true);
  });

  it('accepts the same key as a bearer token', () => {
    expect(authenticateDevice(request({ authorization: `Bearer ${VALID_KEY}` })).ok).toBe(
      true,
    );
  });

  it('rejects a missing key with 401', () => {
    const result = authenticateDevice(request());
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects a wrong key of the same length', () => {
    expect(authenticateDevice(request({ 'x-api-key': 'b'.repeat(64) })).ok).toBe(false);
  });

  it('rejects a wrong key of a different length without throwing', () => {
    // timingSafeEqual throws on mismatched buffer lengths; the comparison has
    // to handle that itself rather than crashing the ingest route.
    expect(() => authenticateDevice(request({ 'x-api-key': 'short' }))).not.toThrow();
    expect(authenticateDevice(request({ 'x-api-key': 'short' })).ok).toBe(false);
  });

  it('fails closed when the secret is unset', () => {
    delete process.env.DEVICE_API_KEY;
    const result = authenticateDevice(request({ 'x-api-key': VALID_KEY }));
    // An unset secret must disable ingest, never open it.
    expect(result).toMatchObject({ ok: false, status: 503 });
  });

  it('fails closed when the secret is too short to be meaningful', () => {
    process.env.DEVICE_API_KEY = 'hunter2';
    expect(authenticateDevice(request({ 'x-api-key': 'hunter2' })).ok).toBe(false);
  });
});
