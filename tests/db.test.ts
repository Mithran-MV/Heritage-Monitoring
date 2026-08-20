import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let db: typeof import('@/lib/db');
let scratch: string;

beforeAll(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'heritage-test-'));
  process.env.DATABASE_PATH = join(scratch, 'test.db');
  db = await import('@/lib/db');
});

afterAll(() => {
  db.resetConnectionForTesting();
  rmSync(scratch, { recursive: true, force: true });
});

beforeEach(() => {
  db.db().exec('DELETE FROM alerts; DELETE FROM readings; DELETE FROM sites;');
  db.upsertSite({
    slug: 'red-fort',
    name: 'Red Fort',
    location: 'Delhi',
    description: '',
    image_url: null,
    latitude: null,
    longitude: null,
  });
});

const sample = {
  site: 'red-fort',
  temperature: 25,
  humidity: 50,
  soil_moisture: 50,
  sound_level: 60,
  dust_density: 20,
  vibration: 0.5,
  rain_detected: false,
  motion_detected: false,
};

describe('sites', () => {
  it('upserts rather than duplicating', () => {
    db.upsertSite({
      slug: 'red-fort',
      name: 'Red Fort (renamed)',
      location: 'Old Delhi',
      description: 'updated',
      image_url: null,
      latitude: 28.6,
      longitude: 77.2,
    });

    const sites = db.listSites();
    expect(sites).toHaveLength(1);
    expect(sites[0]?.name).toBe('Red Fort (renamed)');
    expect(sites[0]?.latitude).toBe(28.6);
  });

  it('reports whether a slug is known', () => {
    expect(db.siteExists('red-fort')).toBe(true);
    expect(db.siteExists('nowhere')).toBe(false);
  });
});

describe('readings', () => {
  it('round-trips booleans through SQLite integer columns', () => {
    const stored = db.insertReading({
      ...sample,
      rain_detected: true,
      motion_detected: false,
    });
    expect(stored.rain_detected).toBe(true);

    const [fetched] = db.listReadings({ site: 'red-fort', limit: 10 });
    expect(fetched?.rain_detected).toBe(true);
    expect(fetched?.motion_detected).toBe(false);
  });

  it('stores a missing battery as null, not zero', () => {
    db.insertReading(sample);
    expect(db.listReadings({ limit: 1 })[0]?.battery).toBeNull();
  });

  it('returns the most recent rows, ordered oldest-first for charting', () => {
    for (let index = 0; index < 5; index += 1) {
      db.insertReading({
        ...sample,
        temperature: 20 + index,
        recorded_at: `2026-01-0${index + 1}T00:00:00.000Z`,
      });
    }

    const recent = db.listReadings({ site: 'red-fort', limit: 3 });
    expect(recent.map((reading) => reading.temperature)).toEqual([22, 23, 24]);
  });

  it('filters by time range', () => {
    for (let index = 0; index < 5; index += 1) {
      db.insertReading({
        ...sample,
        temperature: 20 + index,
        recorded_at: `2026-01-0${index + 1}T00:00:00.000Z`,
      });
    }

    const window = db.listReadings({
      site: 'red-fort',
      from: '2026-01-02T00:00:00.000Z',
      to: '2026-01-04T00:00:00.000Z',
      limit: 100,
    });
    expect(window.map((reading) => reading.temperature)).toEqual([21, 22, 23]);
  });

  it('keeps sites isolated', () => {
    db.upsertSite({
      slug: 'ellora',
      name: 'Ellora',
      location: '',
      description: '',
      image_url: null,
      latitude: null,
      longitude: null,
    });
    db.insertReading(sample);
    db.insertReading({ ...sample, site: 'ellora', temperature: 99 });

    expect(db.listReadings({ site: 'red-fort', limit: 10 })).toHaveLength(1);
    expect(db.latestReading('ellora')?.temperature).toBe(99);
  });
});

describe('evaluateThresholds', () => {
  it('opens an alert on a breach and describes it', () => {
    const reading = db.insertReading({ ...sample, humidity: 85 });
    const opened = db.evaluateThresholds(reading);

    expect(opened).toHaveLength(1);
    expect(opened[0]?.metric).toBe('humidity');
    expect(opened[0]?.message).toContain('above');
  });

  it('does not duplicate an incident that is still ongoing', () => {
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 85 }));
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 87 }));
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 90 }));

    // One incident with a duration, not three rows.
    expect(db.listAlerts({ site: 'red-fort', status: 'all', limit: 50 })).toHaveLength(1);
  });

  it('tracks the current worst state while an incident stays open', () => {
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 75 }));
    const [warning] = db.listAlerts({ status: 'open', limit: 10 });
    expect(warning?.severity).toBe('warning');

    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 95 }));
    const [escalated] = db.listAlerts({ status: 'open', limit: 10 });
    expect(escalated?.id).toBe(warning?.id);
    expect(escalated?.severity).toBe('critical');
  });

  it('resolves the incident once readings return to the safe band', () => {
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 85 }));
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 55 }));

    expect(db.listAlerts({ status: 'open', limit: 10 })).toHaveLength(0);
    expect(db.listAlerts({ status: 'all', limit: 10 })[0]?.resolved_at).not.toBeNull();
  });

  it('reopens after a resolved incident recurs', () => {
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 85 }));
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 55 }));
    db.evaluateThresholds(db.insertReading({ ...sample, humidity: 88 }));

    expect(db.listAlerts({ status: 'open', limit: 10 })).toHaveLength(1);
    expect(db.listAlerts({ status: 'all', limit: 10 })).toHaveLength(2);
  });

  it('raises one incident per breaching metric', () => {
    const reading = db.insertReading({ ...sample, humidity: 85, sound_level: 110 });
    const opened = db.evaluateThresholds(reading);
    expect(opened.map((alert) => alert.metric).sort()).toEqual([
      'humidity',
      'sound_level',
    ]);
  });

  it('raises nothing when every metric is in range', () => {
    expect(db.evaluateThresholds(db.insertReading(sample))).toHaveLength(0);
  });
});
