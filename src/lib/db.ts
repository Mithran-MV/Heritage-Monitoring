import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import Database from 'better-sqlite3';

import { grade, METRICS, describeBreach, type MetricKey } from './metrics';
import type { Alert, ReadingInput, Site, StoredReading } from './schemas';

/**
 * SQLite persistence.
 *
 * Deliberately not marked `server-only`: this module is also imported by the
 * `db:seed` CLI script. It cannot reach a client bundle regardless — it pulls
 * in `node:fs` and a native addon, either of which fails the build loudly.
 *
 * The previous implementation read and rewrote a JSON array on every request.
 * That loses writes under concurrency, grows without bound, and fails outright
 * on a read-only serverless filesystem. SQLite in WAL mode handles concurrent
 * readers alongside a writer, indexes time-range queries, and is a single file
 * you can copy off a Raspberry Pi — which is where this realistically runs.
 */

let instance: Database.Database | null = null;

const DEFAULT_DATABASE_PATH = process.env.DATABASE_PATH ?? './data/heritage.db';

function databasePath(): string {
  // turbopackIgnore keeps the bundler from statically tracing this path and
  // pulling every project file into the server output; the database is opened
  // at runtime, not read at build time.
  return resolve(/* turbopackIgnore: true */ process.cwd(), DEFAULT_DATABASE_PATH);
}

export function db(): Database.Database {
  if (instance) return instance;

  const path = databasePath();
  const directory = dirname(path);
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });

  instance = new Database(path);
  // WAL lets the dashboard read while a device is mid-write.
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  migrate(instance);
  return instance;
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      slug        TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      location    TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      image_url   TEXT,
      latitude    REAL,
      longitude   REAL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS readings (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      site            TEXT NOT NULL REFERENCES sites(slug) ON DELETE CASCADE,
      recorded_at     TEXT NOT NULL,
      temperature     REAL NOT NULL,
      humidity        REAL NOT NULL,
      soil_moisture   REAL NOT NULL,
      sound_level     REAL NOT NULL,
      dust_density    REAL NOT NULL,
      vibration       REAL NOT NULL DEFAULT 0,
      rain_detected   INTEGER NOT NULL DEFAULT 0,
      motion_detected INTEGER NOT NULL DEFAULT 0,
      battery         REAL
    );

    -- Every dashboard query is "latest N for one site", so index that directly.
    CREATE INDEX IF NOT EXISTS idx_readings_site_time
      ON readings (site, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      site        TEXT NOT NULL REFERENCES sites(slug) ON DELETE CASCADE,
      metric      TEXT NOT NULL,
      severity    TEXT NOT NULL,
      value       REAL NOT NULL,
      message     TEXT NOT NULL,
      opened_at   TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_site_open
      ON alerts (site, resolved_at, opened_at DESC);
  `);
}

/* -------------------------------------------------------------------------- */
/* Sites                                                                      */
/* -------------------------------------------------------------------------- */

export function listSites(): Site[] {
  return db()
    .prepare(
      `SELECT slug, name, location, description, image_url, latitude, longitude
       FROM sites ORDER BY name`,
    )
    .all() as Site[];
}

export function siteExists(slug: string): boolean {
  const row = db().prepare('SELECT 1 FROM sites WHERE slug = ?').get(slug);
  return row !== undefined;
}

export function upsertSite(site: Site): void {
  db()
    .prepare(
      `INSERT INTO sites (slug, name, location, description, image_url, latitude, longitude)
       VALUES (@slug, @name, @location, @description, @image_url, @latitude, @longitude)
       ON CONFLICT(slug) DO UPDATE SET
         name        = excluded.name,
         location    = excluded.location,
         description = excluded.description,
         image_url   = excluded.image_url,
         latitude    = excluded.latitude,
         longitude   = excluded.longitude`,
    )
    .run(site);
}

/* -------------------------------------------------------------------------- */
/* Readings                                                                   */
/* -------------------------------------------------------------------------- */

interface ReadingRow {
  id: number;
  site: string;
  recorded_at: string;
  temperature: number;
  humidity: number;
  soil_moisture: number;
  sound_level: number;
  dust_density: number;
  vibration: number;
  rain_detected: number;
  motion_detected: number;
  battery: number | null;
}

/** SQLite has no boolean type; normalise the 0/1 columns at the edge. */
function toReading(row: ReadingRow): StoredReading {
  return {
    ...row,
    rain_detected: row.rain_detected === 1,
    motion_detected: row.motion_detected === 1,
  };
}

export function insertReading(input: ReadingInput): StoredReading {
  const recordedAt = input.recorded_at ?? new Date().toISOString();

  const result = db()
    .prepare(
      `INSERT INTO readings
         (site, recorded_at, temperature, humidity, soil_moisture, sound_level,
          dust_density, vibration, rain_detected, motion_detected, battery)
       VALUES (@site, @recorded_at, @temperature, @humidity, @soil_moisture, @sound_level,
               @dust_density, @vibration, @rain_detected, @motion_detected, @battery)`,
    )
    .run({
      site: input.site,
      recorded_at: recordedAt,
      temperature: input.temperature,
      humidity: input.humidity,
      soil_moisture: input.soil_moisture,
      sound_level: input.sound_level,
      dust_density: input.dust_density,
      vibration: input.vibration,
      rain_detected: input.rain_detected ? 1 : 0,
      motion_detected: input.motion_detected ? 1 : 0,
      battery: input.battery ?? null,
    });

  return {
    id: Number(result.lastInsertRowid),
    site: input.site,
    recorded_at: recordedAt,
    temperature: input.temperature,
    humidity: input.humidity,
    soil_moisture: input.soil_moisture,
    sound_level: input.sound_level,
    dust_density: input.dust_density,
    vibration: input.vibration,
    rain_detected: input.rain_detected,
    motion_detected: input.motion_detected,
    battery: input.battery ?? null,
  };
}

export interface ReadingFilter {
  site?: string;
  from?: string;
  to?: string;
  limit: number;
}

/** Newest-first from SQL (so LIMIT takes the recent tail), returned oldest-first for charts. */
export function listReadings(filter: ReadingFilter): StoredReading[] {
  const clauses: string[] = [];
  const params: Record<string, string | number> = { limit: filter.limit };

  if (filter.site) {
    clauses.push('site = @site');
    params.site = filter.site;
  }
  if (filter.from) {
    clauses.push('recorded_at >= @from');
    params.from = filter.from;
  }
  if (filter.to) {
    clauses.push('recorded_at <= @to');
    params.to = filter.to;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db()
    .prepare(
      `SELECT * FROM readings ${where} ORDER BY recorded_at DESC, id DESC LIMIT @limit`,
    )
    .all(params) as ReadingRow[];

  return rows.map(toReading).reverse();
}

export function latestReading(site: string): StoredReading | null {
  const row = db()
    .prepare(
      'SELECT * FROM readings WHERE site = ? ORDER BY recorded_at DESC, id DESC LIMIT 1',
    )
    .get(site) as ReadingRow | undefined;
  return row ? toReading(row) : null;
}

/* -------------------------------------------------------------------------- */
/* Alerts                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Compare a reading against every threshold, opening and closing alerts.
 *
 * Alerts are stateful rather than one-row-per-breach: a humidity excursion
 * lasting an hour is one incident with a duration, not 120 duplicate rows.
 */
export function evaluateThresholds(reading: StoredReading): Alert[] {
  const database = db();
  const opened: Alert[] = [];

  const findOpen = database.prepare(
    'SELECT * FROM alerts WHERE site = ? AND metric = ? AND resolved_at IS NULL LIMIT 1',
  );
  const openAlert = database.prepare(
    `INSERT INTO alerts (site, metric, severity, value, message, opened_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const escalate = database.prepare(
    'UPDATE alerts SET severity = ?, value = ?, message = ? WHERE id = ?',
  );
  const resolve_ = database.prepare('UPDATE alerts SET resolved_at = ? WHERE id = ?');

  for (const metric of METRICS) {
    const value = reading[metric.key as MetricKey];
    if (typeof value !== 'number') continue;

    const severity = grade(metric.key, value);
    const existing = findOpen.get(reading.site, metric.key) as Alert | undefined;

    if (severity === 'normal') {
      if (existing) resolve_.run(reading.recorded_at, existing.id);
      continue;
    }

    const message = describeBreach(metric.key, value);

    if (!existing) {
      const result = openAlert.run(
        reading.site,
        metric.key,
        severity,
        value,
        message,
        reading.recorded_at,
      );
      opened.push({
        id: Number(result.lastInsertRowid),
        site: reading.site,
        metric: metric.key,
        severity,
        value,
        message,
        opened_at: reading.recorded_at,
        resolved_at: null,
      });
    } else if (existing.severity !== severity || existing.value !== value) {
      // Keep the incident open but track its current worst state.
      escalate.run(severity, value, message, existing.id);
    }
  }

  return opened;
}

export function listAlerts(options: {
  site?: string;
  status: 'all' | 'open';
  limit: number;
}): Alert[] {
  const clauses: string[] = [];
  const params: Record<string, string | number> = { limit: options.limit };

  if (options.site) {
    clauses.push('site = @site');
    params.site = options.site;
  }
  if (options.status === 'open') clauses.push('resolved_at IS NULL');

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return db()
    .prepare(
      `SELECT * FROM alerts ${where} ORDER BY opened_at DESC, id DESC LIMIT @limit`,
    )
    .all(params) as Alert[];
}

/** Used by tests to point the module at a throwaway file. */
export function resetConnectionForTesting(): void {
  instance?.close();
  instance = null;
}
