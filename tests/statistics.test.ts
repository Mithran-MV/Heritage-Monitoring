import { describe, expect, it } from 'vitest';

import type { StoredReading } from '@/lib/schemas';
import { isOutlier, mean, standardDeviation, summarise, toCsv } from '@/lib/statistics';

function reading(temperature: number, id = 1): StoredReading {
  return {
    id,
    site: 'red-fort',
    recorded_at: `2026-01-01T00:0${id % 10}:00.000Z`,
    temperature,
    humidity: 50,
    soil_moisture: 50,
    sound_level: 50,
    dust_density: 20,
    vibration: 0.5,
    rain_detected: false,
    motion_detected: false,
    battery: 90,
  };
}

describe('mean and standardDeviation', () => {
  it('handles the empty and single-value cases without dividing by zero', () => {
    expect(mean([])).toBe(0);
    expect(standardDeviation([])).toBe(0);
    expect(standardDeviation([5])).toBe(0);
  });

  it('computes the sample standard deviation', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(standardDeviation([2, 4, 6])).toBeCloseTo(2, 6);
  });
});

describe('summarise', () => {
  it('returns a null latest for an empty window', () => {
    expect(summarise([], 'temperature').latest).toBeNull();
  });

  it('reports min, max, mean and the first-to-last delta', () => {
    const result = summarise(
      [reading(20, 1), reading(30, 2), reading(26, 3)],
      'temperature',
    );
    expect(result.min).toBe(20);
    expect(result.max).toBe(30);
    expect(result.mean).toBeCloseTo(25.333, 3);
    expect(result.latest).toBe(26);
    expect(result.delta).toBe(6);
  });

  it('gives a zero z-score when every sample is identical', () => {
    const result = summarise([reading(25, 1), reading(25, 2)], 'temperature');
    expect(result.zScore).toBe(0);
    expect(isOutlier(result)).toBe(false);
  });

  it('flags a sample far from the window mean', () => {
    const flat = Array.from({ length: 20 }, (_, index) =>
      reading(25 + (index % 2) * 0.1, index),
    );
    const spiked = [...flat, reading(40, 99)];
    expect(isOutlier(summarise(flat, 'temperature'))).toBe(false);
    expect(isOutlier(summarise(spiked, 'temperature'))).toBe(true);
  });
});

describe('toCsv', () => {
  it('emits a header even with no rows', () => {
    expect(toCsv([])).toBe(
      'id,site,recorded_at,temperature,humidity,soil_moisture,sound_level,dust_density,vibration,rain_detected,motion_detected,battery',
    );
  });

  it('writes one line per reading', () => {
    const lines = toCsv([reading(21.5, 1)]).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('21.5');
    expect(lines[1]).toContain('red-fort');
  });

  it('quotes and escapes fields that would break the format', () => {
    const risky = { ...reading(20, 1), site: 'a,b "c"' };
    expect(toCsv([risky]).split('\n')[1]).toContain('"a,b ""c"""');
  });
});
