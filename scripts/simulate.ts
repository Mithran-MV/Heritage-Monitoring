/**
 * Fake sensor node: POSTs a reading every few seconds so you can watch the
 * dashboard update live without wiring up hardware.
 *
 * Run with:  npm run simulate  [-- --site=red-fort --interval=3000]
 */
const BASE_URL = process.env.SIMULATE_URL ?? 'http://localhost:3000';
const API_KEY = process.env.DEVICE_API_KEY ?? '';

function flag(name: string, fallback: string): string {
  const match = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return match?.split('=')[1] ?? fallback;
}

const site = flag('site', 'red-fort');
const interval = Math.max(Number(flag('interval', '3000')), 500);
const drift = { temperature: 26, humidity: 55, soil: 50 };

function wander(value: number, step: number, min: number, max: number): number {
  return Math.min(Math.max(value + (Math.random() - 0.5) * step, min), max);
}

async function tick(): Promise<void> {
  drift.temperature = wander(drift.temperature, 1.2, 10, 45);
  drift.humidity = wander(drift.humidity, 3, 10, 95);
  drift.soil = wander(drift.soil, 4, 5, 95);

  const payload = {
    site,
    temperature: Number(drift.temperature.toFixed(1)),
    humidity: Number(drift.humidity.toFixed(1)),
    soil_moisture: Number(drift.soil.toFixed(0)),
    sound_level: Number((50 + Math.random() * 45).toFixed(0)),
    dust_density: Number((20 + Math.random() * 25).toFixed(2)),
    vibration: Number((Math.random() * 3).toFixed(2)),
    rain_detected: Math.random() < 0.1,
    motion_detected: Math.random() < 0.5,
    battery: 92,
  };

  try {
    const response = await fetch(`${BASE_URL}/api/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { error?: string; alerts?: unknown[] };

    if (!response.ok) {
      console.error(`✗ ${response.status} ${body.error ?? 'rejected'}`);
      return;
    }
    const raised = body.alerts?.length ?? 0;
    console.info(
      `✓ ${payload.temperature}°C ${payload.humidity}% ${payload.sound_level}dB` +
        (raised > 0 ? `  ⚠ ${raised} alert(s) raised` : ''),
    );
  } catch (error) {
    console.error('✗ could not reach the server:', (error as Error).message);
  }
}

if (!API_KEY) {
  console.error(
    'DEVICE_API_KEY is not set. Export it, or put it in .env.local and use dotenv.',
  );
  process.exit(1);
}

console.info(`Simulating "${site}" -> ${BASE_URL} every ${interval}ms. Ctrl-C to stop.`);
void tick();
setInterval(() => void tick(), interval);
