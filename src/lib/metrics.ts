/**
 * The sensor set every node reports, and what "normal" means for each.
 *
 * Thresholds are the conservation defaults used by the reference deployment.
 * They live in one place so the dashboard, the alert engine and the docs can
 * never disagree about what counts as an anomaly.
 */

export type MetricKey =
  | 'temperature'
  | 'humidity'
  | 'soil_moisture'
  | 'sound_level'
  | 'dust_density'
  | 'vibration';

export type BooleanKey = 'rain_detected' | 'motion_detected';

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  unit: string;
  /** Inclusive band outside which a reading raises an alert. */
  min: number;
  max: number;
  /** Axis bounds for charts, wider than the safe band so breaches are visible. */
  domain: [number, number];
  precision: number;
  /** Why a conservator cares — surfaced in the UI as a tooltip. */
  rationale: string;
  color: string;
}

export const METRICS: readonly MetricDefinition[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    min: 15,
    max: 35,
    domain: [0, 50],
    precision: 1,
    rationale:
      'Repeated thermal cycling drives salt crystallisation and micro-cracking in stone.',
    color: '#ef4444',
  },
  {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    min: 30,
    max: 70,
    domain: [0, 100],
    precision: 1,
    rationale:
      'Sustained damp accelerates biological growth; very dry air shrinks timber and plaster.',
    color: '#0ea5e9',
  },
  {
    key: 'soil_moisture',
    label: 'Soil moisture',
    unit: '%',
    min: 20,
    max: 80,
    domain: [0, 100],
    precision: 0,
    rationale:
      'Saturated ground undermines foundations; parched ground causes subsidence.',
    color: '#22c55e',
  },
  {
    key: 'sound_level',
    label: 'Sound level',
    unit: 'dB',
    min: 0,
    max: 85,
    domain: [0, 120],
    precision: 0,
    rationale:
      'Sustained noise indicates crowding, machinery or unauthorised works nearby.',
    color: '#a855f7',
  },
  {
    key: 'dust_density',
    label: 'Dust density',
    unit: 'µg/m³',
    min: 0,
    max: 50,
    domain: [0, 120],
    precision: 2,
    rationale: 'Airborne particulates abrade and soil exposed carved surfaces.',
    color: '#f59e0b',
  },
  {
    key: 'vibration',
    label: 'Vibration',
    unit: 'mm/s',
    min: 0,
    max: 2.5,
    domain: [0, 10],
    precision: 2,
    rationale:
      'Peak particle velocity from traffic or works; the classic structural risk signal.',
    color: '#ec4899',
  },
] as const;

export const METRIC_BY_KEY: Record<MetricKey, MetricDefinition> = Object.fromEntries(
  METRICS.map((metric) => [metric.key, metric]),
) as Record<MetricKey, MetricDefinition>;

export type Severity = 'normal' | 'warning' | 'critical';

/**
 * Grade a reading against its band.
 *
 * A reading just outside the band is a `warning`; more than 20% of the band's
 * width beyond it is `critical`. Grading in one function keeps the badge, the
 * alert row and the chart annotation consistent.
 */
export function grade(key: MetricKey, value: number): Severity {
  const metric = METRIC_BY_KEY[key];
  if (value >= metric.min && value <= metric.max) return 'normal';

  const margin = (metric.max - metric.min) * 0.2;
  const excess = value > metric.max ? value - metric.max : metric.min - value;
  return excess > margin ? 'critical' : 'warning';
}

/** Human sentence for an alert row, e.g. "Humidity 82.0% is above the 70% ceiling". */
export function describeBreach(key: MetricKey, value: number): string {
  const metric = METRIC_BY_KEY[key];
  const shown = value.toFixed(metric.precision);
  if (value > metric.max) {
    return `${metric.label} ${shown}${metric.unit} is above the ${metric.max}${metric.unit} ceiling.`;
  }
  if (value < metric.min) {
    return `${metric.label} ${shown}${metric.unit} is below the ${metric.min}${metric.unit} floor.`;
  }
  return `${metric.label} ${shown}${metric.unit} is within range.`;
}
