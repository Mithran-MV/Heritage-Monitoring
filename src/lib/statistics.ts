import type { MetricKey } from './metrics';
import type { StoredReading } from './schemas';

/**
 * Lightweight trend and outlier maths for the dashboard.
 *
 * Deliberately plain statistics rather than a model: a conservator needs to
 * know *that* a series has drifted and by how much, and be able to check the
 * arithmetic themselves.
 */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

export interface Summary {
  latest: number | null;
  min: number;
  max: number;
  mean: number;
  /** Change from the first to the last sample in the window. */
  delta: number;
  /**
   * Standard deviations between the latest sample and the window mean.
   * |z| >= 3 marks a statistical outlier even when the value is inside its
   * configured band — the early warning a fixed threshold cannot give.
   */
  zScore: number;
}

export function summarise(readings: StoredReading[], key: MetricKey): Summary {
  const values = readings
    .map((reading) => reading[key])
    .filter((value): value is number => typeof value === 'number');

  if (values.length === 0) {
    return { latest: null, min: 0, max: 0, mean: 0, delta: 0, zScore: 0 };
  }

  const latest = values[values.length - 1] ?? 0;
  const first = values[0] ?? latest;
  const average = mean(values);
  const deviation = standardDeviation(values);

  return {
    latest,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: average,
    delta: latest - first,
    zScore: deviation === 0 ? 0 : (latest - average) / deviation,
  };
}

/** True when the newest sample sits far enough from the window to be worth a look. */
export function isOutlier(summary: Summary, threshold = 3): boolean {
  return Math.abs(summary.zScore) >= threshold;
}

/** Escape a CSV field: quote it and double any embedded quotes. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(readings: StoredReading[]): string {
  const columns = [
    'id',
    'site',
    'recorded_at',
    'temperature',
    'humidity',
    'soil_moisture',
    'sound_level',
    'dust_density',
    'vibration',
    'rain_detected',
    'motion_detected',
    'battery',
  ] as const;

  const header = columns.join(',');
  const rows = readings.map((reading) =>
    columns.map((column) => csvCell(reading[column])).join(','),
  );
  return [header, ...rows].join('\n');
}
