import { describe, expect, it } from 'vitest';

import {
  isBatchPayload,
  readingBatchSchema,
  readingInputSchema,
  readingQuerySchema,
} from '@/lib/schemas';

const valid = {
  site: 'red-fort',
  temperature: 26.4,
  humidity: 55,
  soil_moisture: 48,
  sound_level: 62,
  dust_density: 31.2,
};

describe('readingInputSchema', () => {
  it('accepts a minimal reading and applies defaults', () => {
    const parsed = readingInputSchema.parse(valid);
    expect(parsed.vibration).toBe(0);
    expect(parsed.rain_detected).toBe(false);
    expect(parsed.motion_detected).toBe(false);
  });

  it('coerces the numeric strings a microcontroller sends', () => {
    const parsed = readingInputSchema.parse({
      ...valid,
      temperature: '26.4',
      humidity: '55',
    });
    expect(parsed.temperature).toBe(26.4);
    expect(parsed.humidity).toBe(55);
  });

  it('rejects non-numeric values instead of storing NaN', () => {
    // The previous handler ran parseInt on raw query values, so "hot" became NaN
    // and poisoned every chart that touched the row.
    expect(readingInputSchema.safeParse({ ...valid, temperature: 'hot' }).success).toBe(
      false,
    );
    expect(readingInputSchema.safeParse({ ...valid, temperature: true }).success).toBe(
      false,
    );
    expect(readingInputSchema.safeParse({ ...valid, temperature: null }).success).toBe(
      false,
    );
  });

  it('rejects an empty field rather than reading it as zero', () => {
    // Number('') is 0, so plain coercion would store a plausible-looking
    // reading for a sensor that actually reported nothing.
    expect(readingInputSchema.safeParse({ ...valid, humidity: '' }).success).toBe(false);
    expect(readingInputSchema.safeParse({ ...valid, humidity: '   ' }).success).toBe(
      false,
    );
  });

  it('parses booleans by spelling, not by truthiness', () => {
    // JavaScript truthiness makes Boolean('false') true, which is exactly what
    // a device sending literal "false" would hit.
    expect(
      readingInputSchema.parse({ ...valid, rain_detected: 'false' }).rain_detected,
    ).toBe(false);
    expect(readingInputSchema.parse({ ...valid, rain_detected: '0' }).rain_detected).toBe(
      false,
    );
    expect(readingInputSchema.parse({ ...valid, rain_detected: 0 }).rain_detected).toBe(
      false,
    );
    expect(
      readingInputSchema.parse({ ...valid, rain_detected: 'true' }).rain_detected,
    ).toBe(true);
    expect(readingInputSchema.parse({ ...valid, rain_detected: 1 }).rain_detected).toBe(
      true,
    );
    expect(
      readingInputSchema.safeParse({ ...valid, rain_detected: 'maybe' }).success,
    ).toBe(false);
  });

  it('rejects physically impossible values', () => {
    expect(readingInputSchema.safeParse({ ...valid, humidity: 140 }).success).toBe(false);
    expect(readingInputSchema.safeParse({ ...valid, temperature: -273 }).success).toBe(
      false,
    );
    expect(readingInputSchema.safeParse({ ...valid, soil_moisture: -5 }).success).toBe(
      false,
    );
  });

  it('requires dust_density rather than inventing it', () => {
    const { dust_density: _dropped, ...withoutDust } = valid;
    expect(readingInputSchema.safeParse(withoutDust).success).toBe(false);
  });

  it('constrains the site slug', () => {
    expect(readingInputSchema.safeParse({ ...valid, site: 'Red Fort' }).success).toBe(
      false,
    );
    expect(readingInputSchema.safeParse({ ...valid, site: '../../etc' }).success).toBe(
      false,
    );
    expect(readingInputSchema.safeParse({ ...valid, site: 'red-fort-2' }).success).toBe(
      true,
    );
  });

  it('validates an optional device timestamp', () => {
    expect(
      readingInputSchema.safeParse({ ...valid, recorded_at: '2026-01-01T00:00:00.000Z' })
        .success,
    ).toBe(true);
    expect(
      readingInputSchema.safeParse({ ...valid, recorded_at: 'yesterday' }).success,
    ).toBe(false);
  });
});

describe('readingBatchSchema and isBatchPayload', () => {
  it('recognises a batch envelope but not a bare reading', () => {
    expect(isBatchPayload({ readings: [valid] })).toBe(true);
    expect(isBatchPayload(valid)).toBe(false);
    expect(isBatchPayload(null)).toBe(false);
    expect(isBatchPayload({ readings: 'nope' })).toBe(false);
  });

  it('accepts a well-formed batch', () => {
    expect(readingBatchSchema.safeParse({ readings: [valid, valid] }).success).toBe(true);
  });

  it('rejects an empty or oversized batch', () => {
    expect(readingBatchSchema.safeParse({ readings: [] }).success).toBe(false);
    expect(
      readingBatchSchema.safeParse({ readings: Array.from({ length: 501 }, () => valid) })
        .success,
    ).toBe(false);
  });

  it('names the offending field rather than the failing union branch', () => {
    const result = readingInputSchema.safeParse({ ...valid, humidity: 150 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['humidity']);
    }
  });
});

describe('readingQuerySchema', () => {
  it('defaults the limit and caps it', () => {
    expect(readingQuerySchema.parse({}).limit).toBe(500);
    expect(readingQuerySchema.safeParse({ limit: '99999' }).success).toBe(false);
  });

  it('requires ISO timestamps for the range', () => {
    expect(readingQuerySchema.safeParse({ from: '2026-01-01' }).success).toBe(false);
    expect(
      readingQuerySchema.safeParse({ from: '2026-01-01T00:00:00.000Z' }).success,
    ).toBe(true);
  });
});
