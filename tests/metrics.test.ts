import { describe, expect, it } from 'vitest';

import { describeBreach, grade, METRIC_BY_KEY, METRICS } from '@/lib/metrics';

describe('METRICS', () => {
  it('defines a coherent safe band and a wider chart domain for every metric', () => {
    for (const metric of METRICS) {
      expect(metric.min).toBeLessThan(metric.max);
      expect(metric.domain[0]).toBeLessThanOrEqual(metric.min);
      expect(metric.domain[1]).toBeGreaterThanOrEqual(metric.max);
    }
  });

  it('indexes every metric by key', () => {
    for (const metric of METRICS) {
      expect(METRIC_BY_KEY[metric.key]).toBe(metric);
    }
  });
});

describe('grade', () => {
  it('treats the band boundaries as normal', () => {
    expect(grade('temperature', 15)).toBe('normal');
    expect(grade('temperature', 35)).toBe('normal');
    expect(grade('temperature', 25)).toBe('normal');
  });

  it('warns just outside the band', () => {
    // Band is 15-35, so the 20% margin is 4 degrees.
    expect(grade('temperature', 36)).toBe('warning');
    expect(grade('temperature', 39)).toBe('warning');
    expect(grade('temperature', 14)).toBe('warning');
  });

  it('escalates past the margin', () => {
    expect(grade('temperature', 39.1)).toBe('critical');
    expect(grade('temperature', 10.9)).toBe('critical');
  });

  it('grades each metric against its own band', () => {
    expect(grade('humidity', 75)).toBe('warning');
    expect(grade('humidity', 60)).toBe('normal');
    expect(grade('sound_level', 90)).toBe('warning');
    expect(grade('vibration', 3)).toBe('warning');
    expect(grade('vibration', 2.5)).toBe('normal');
  });
});

describe('describeBreach', () => {
  it('names the direction of the breach', () => {
    expect(describeBreach('humidity', 82)).toContain('above');
    expect(describeBreach('humidity', 12)).toContain('below');
    expect(describeBreach('humidity', 50)).toContain('within range');
  });

  it('formats to the metric precision', () => {
    expect(describeBreach('humidity', 82.44)).toContain('82.4%');
    expect(describeBreach('soil_moisture', 91.6)).toContain('92%');
  });
});
