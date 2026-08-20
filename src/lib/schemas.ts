import { z } from 'zod';

/**
 * Every value that crosses the network boundary is validated here.
 *
 * The previous version trusted raw query-string values and ran `parseInt` on
 * them, so `?temperature=hot` silently stored `NaN` and a malformed request
 * could poison a chart forever.
 */

/**
 * A numeric sensor field.
 *
 * Microcontrollers send everything as text, so coercion is required — but
 * `z.coerce.number()` alone is unsafe here: `Number('')` is `0`, so a sensor
 * that reported an empty field would silently store a real-looking zero.
 * Empty and whitespace-only input becomes NaN and is rejected instead.
 */
const finite = (min: number, max: number) =>
  z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? Number.NaN : Number(trimmed);
    }
    return value;
  }, z.number().finite().min(min).max(max));

/**
 * A boolean sensor field.
 *
 * `z.coerce.boolean()` is worse than useless for wire data: it applies
 * JavaScript truthiness, so the string `"false"` — exactly what a naive device
 * sends — becomes `true`. Only the explicit spellings are accepted.
 */
const flag = () =>
  z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (value === 0) return false;
      if (value === 1) return true;
      return value;
    }
    if (typeof value === 'string') {
      const normalised = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalised)) return true;
      if (['false', '0', 'no', 'off'].includes(normalised)) return false;
    }
    return value;
  }, z.boolean());

/** One sensor sample as posted by a device. */
export const readingInputSchema = z.object({
  /** Slug of the site this node is installed at. */
  site: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(
      /^[a-z0-9-]+$/,
      'Site slug may contain lowercase letters, digits and hyphens only',
    ),
  /** Device clock, if the node keeps one. The server timestamps otherwise. */
  recorded_at: z.iso.datetime().optional(),
  temperature: finite(-50, 90),
  humidity: finite(0, 100),
  soil_moisture: finite(0, 100),
  sound_level: finite(0, 200),
  // Required, not fabricated. The old handler generated this with Math.random()
  // whenever a device omitted it, which put invented numbers in the archive.
  dust_density: finite(0, 2000),
  vibration: finite(0, 100).default(0),
  rain_detected: flag().default(false),
  motion_detected: flag().default(false),
  /** Optional battery percentage, useful for field maintenance. */
  battery: finite(0, 100).optional(),
});

export type ReadingInput = z.infer<typeof readingInputSchema>;

/**
 * A batch upload, for nodes that buffer while offline.
 *
 * Kept separate from `readingInputSchema` rather than unioned with it: a union
 * error reports which *branch* failed, not which field, so a device would get
 * a 422 with nothing actionable in it. The route picks the schema by shape and
 * passes through the precise field errors.
 */
export const readingBatchSchema = z.object({
  readings: z.array(readingInputSchema).min(1).max(500),
});

/** True when a payload is a batch envelope rather than a bare reading. */
export function isBatchPayload(body: unknown): body is { readings: unknown[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'readings' in body &&
    Array.isArray((body as { readings: unknown }).readings)
  );
}

export const readingQuerySchema = z.object({
  site: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
});

export const alertQuerySchema = z.object({
  site: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  /** `open` hides alerts that have since returned to normal. */
  status: z.enum(['all', 'open']).default('all'),
});

/**
 * A reading as it comes back out of the database.
 *
 * `battery` widens from `number | undefined` on the way in to `number | null`
 * on the way out: SQLite stores the absent case as NULL, and collapsing the
 * two would make "device did not report" indistinguishable from "0%".
 */
export interface StoredReading extends Omit<
  ReadingInput,
  'site' | 'recorded_at' | 'battery'
> {
  id: number;
  site: string;
  recorded_at: string;
  vibration: number;
  rain_detected: boolean;
  motion_detected: boolean;
  battery: number | null;
}

export interface Site {
  slug: string;
  name: string;
  location: string;
  description: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Alert {
  id: number;
  site: string;
  metric: string;
  severity: 'warning' | 'critical';
  value: number;
  message: string;
  opened_at: string;
  resolved_at: string | null;
}
