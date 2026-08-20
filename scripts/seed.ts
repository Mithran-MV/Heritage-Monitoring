/**
 * Seeds the three reference sites and, unless told otherwise, 48 hours of
 * plausible readings so a fresh clone shows a populated dashboard.
 *
 * Run with:  npm run db:seed  [-- --hours=48] [--empty]
 */
import { evaluateThresholds, insertReading, upsertSite } from '../src/lib/db';
import type { Site } from '../src/lib/schemas';

const SITES: Site[] = [
  {
    slug: 'red-fort',
    name: 'Red Fort',
    location: 'Old Delhi, Delhi',
    description:
      'Mughal fortress completed in 1648. Sandstone facades are sensitive to particulates and thermal cycling.',
    image_url:
      'https://cdn.britannica.com/20/189820-050-D650A54D/Red-Fort-Old-Delhi-India.jpg',
    latitude: 28.6562,
    longitude: 77.241,
  },
  {
    slug: 'ellora-caves',
    name: 'Ellora Caves',
    location: 'Aurangabad, Maharashtra',
    description:
      'Rock-cut monuments from the 6th–10th centuries. Humidity control is the primary conservation concern.',
    image_url: null,
    latitude: 20.0268,
    longitude: 75.1791,
  },
  {
    slug: 'gateway-of-india',
    name: 'Gateway of India',
    location: 'Mumbai, Maharashtra',
    description:
      'Basalt arch completed in 1924. Coastal salt spray and heavy footfall drive surface erosion.',
    image_url: null,
    latitude: 18.922,
    longitude: 72.8347,
  },
];

/** Deterministic PRNG so a reseed produces the same demo data. */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function parseHours(): number {
  const flag = process.argv.find((argument) => argument.startsWith('--hours='));
  const parsed = Number(flag?.split('=')[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 720) : 48;
}

function main(): void {
  for (const site of SITES) upsertSite(site);
  console.info(`Seeded ${SITES.length} sites.`);

  if (process.argv.includes('--empty')) {
    console.info('--empty passed; skipping sample readings.');
    return;
  }

  const hours = parseHours();
  const samplesPerHour = 4;
  const random = makeRandom(20_241_208);
  const now = Date.now();
  let inserted = 0;

  for (const [siteIndex, site] of SITES.entries()) {
    for (let step = hours * samplesPerHour; step >= 0; step -= 1) {
      const timestamp = new Date(now - step * (3_600_000 / samplesPerHour));
      const hourOfDay = timestamp.getHours() + timestamp.getMinutes() / 60;
      // Diurnal curve peaking mid-afternoon, offset per site.
      const daylight = Math.sin(((hourOfDay - 6) / 24) * Math.PI * 2);

      const temperature = 24 + siteIndex * 1.5 + daylight * 7 + (random() - 0.5) * 1.5;
      const humidity = 58 - daylight * 14 + (random() - 0.5) * 6;
      const soilMoisture = 48 + Math.sin(step / 90) * 18 + (random() - 0.5) * 5;
      const rain = random() < 0.06;

      insertReading({
        site: site.slug,
        recorded_at: timestamp.toISOString(),
        temperature: Number(temperature.toFixed(1)),
        humidity: Number(Math.min(Math.max(humidity, 0), 100).toFixed(1)),
        soil_moisture: Number(Math.min(Math.max(soilMoisture, 0), 100).toFixed(0)),
        // Visitor noise tracks daylight hours.
        sound_level: Number((45 + Math.max(daylight, 0) * 28 + random() * 12).toFixed(0)),
        dust_density: Number((22 + Math.max(daylight, 0) * 14 + random() * 9).toFixed(2)),
        vibration: Number(
          (0.4 + Math.max(daylight, 0) * 0.9 + random() * 0.5).toFixed(2),
        ),
        rain_detected: rain,
        motion_detected: random() < 0.35 + Math.max(daylight, 0) * 0.4,
        battery: Number((100 - (step / (hours * samplesPerHour)) * 12).toFixed(0)),
      });
      inserted += 1;
    }

    // Grade only the newest sample per site so the alert table reflects "now"
    // rather than replaying two days of history into the incident log.
    const latest = insertReading({
      site: site.slug,
      recorded_at: new Date(now).toISOString(),
      temperature: siteIndex === 1 ? 38.4 : 27.2,
      humidity: siteIndex === 1 ? 81.5 : 55,
      soil_moisture: 52,
      sound_level: siteIndex === 2 ? 92 : 61,
      dust_density: 31.4,
      vibration: 1.1,
      rain_detected: false,
      motion_detected: true,
      battery: 88,
    });
    evaluateThresholds(latest);
    inserted += 1;
  }

  console.info(`Inserted ${inserted} readings across ${hours}h.`);
  console.info(
    'Two sites were seeded with deliberate threshold breaches to exercise alerts.',
  );
}

main();
