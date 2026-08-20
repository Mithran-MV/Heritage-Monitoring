<div align="center">

# 🏛️ Heritage Monitoring

**An IoT platform for protected monuments — authenticated sensor ingest, a live streaming
dashboard, stateful threshold alerting and exportable history.**

[![CI](https://github.com/Mithran-MV/Heritage-Monitoring/actions/workflows/ci.yml/badge.svg)](https://github.com/Mithran-MV/Heritage-Monitoring/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MUI](https://img.shields.io/badge/MUI-9-007FFF?logo=mui&logoColor=white)](https://mui.com)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## What it does

Sensor nodes at a monument report environmental and structural conditions. The platform
stores them, grades every sample against conservation thresholds, opens and closes incidents,
and streams the result to anyone watching the dashboard — in real time, not on a poll.

| | |
|---|---|
| **🔐 Authenticated ingest** | Devices POST JSON with a shared secret. Constant-time comparison, and ingest **fails closed** if the secret is unset. |
| **📡 Live streaming** | Server-Sent Events push each reading the instant it lands. No polling; an idle site costs nothing. |
| **🏛️ Multi-site** | One deployment covers many monuments, each with its own history, incidents and metadata. |
| **🚨 Stateful alerting** | A one-hour humidity excursion is **one incident with a duration**, not 120 duplicate rows. Incidents escalate in place and resolve themselves. |
| **📊 Six metrics** | Temperature, humidity, soil moisture, sound, dust density and vibration — each with a documented conservation rationale. |
| **📈 Threshold-aware charts** | The safe band is shaded behind every series, so a breach is legible without reading the axis. |
| **🔍 Outlier detection** | A rolling z-score flags samples that are statistically unusual *even when still inside* their band — the early warning a fixed threshold can't give. |
| **📥 CSV export** | One click, RFC-correct quoting, ready for Excel or pandas. |
| **🌗 Light / dark / system** | MUI CSS-variable theming, applied before first paint. |
| **🔌 Reference firmware** | A complete, commented ESP32 sketch with wiring and sensor transfer functions. |

---

## Why it was rebuilt

The previous version had defects worth naming, because they shape the current design:

| Defect | Consequence | Now |
|---|---|---|
| `GET /api/monitor` **wrote** rows; `POST` **read** them | Any crawler, prefetcher or pasted URL could write to the archive | `POST` ingests, `GET` reads |
| Ingest had **no authentication** | Anyone who found the URL could forge readings | Shared-secret `X-API-Key`, constant-time compare, fails closed |
| `dust_density` was **generated with `Math.random()`** when a device omitted it | Invented numbers sat in the archive indistinguishable from measurements | Required field, validated, never fabricated |
| Raw `parseInt` on query values | `?temperature=hot` stored `NaN` and poisoned every chart touching the row | Zod-validated, with `''` rejected rather than read as `0` |
| Storage was a JSON array rewritten per request | Lost writes under concurrency, unbounded growth, fails on read-only filesystems | SQLite in WAL mode, indexed on `(site, recorded_at)` |
| Dashboard re-fetched **everything every 5 seconds** | Traffic grew with the archive; updates up to 5s stale | Fetch once, then stream over SSE |
| `next: "latest"` unpinned | Any `npm install` could produce a different app | Pinned ranges, Dependabot, CI |
| Single hardcoded dark palette in `sx` props | No light mode, colours duplicated across every file | One theme object, both colour schemes |

There's one more worth flagging honestly: `z.coerce.boolean()` applies JavaScript truthiness,
so the string `"false"` — exactly what a naive device sends — becomes `true`. The schema parses
booleans **by spelling**, and there's a test for it.

---

## Architecture

```
ESP32 node ──POST /api/readings (X-API-Key)──►  Next.js route handler
                                                  │
                                                  ├─ Zod validation
                                                  ├─ SQLite insert (WAL)
                                                  ├─ threshold evaluation
                                                  │    ├─ open / escalate / resolve incidents
                                                  └─ publish to the event bus
                                                       │
Browser ◄────── SSE  /api/stream ─────────────────────┘
```

```
src/
├── app/
│   ├── api/readings/route.ts   # GET archive (public) · POST ingest (authenticated)
│   ├── api/stream/route.ts     # SSE feed with heartbeat
│   ├── api/alerts/route.ts     # incident history
│   ├── api/export/route.ts     # CSV download
│   ├── api/sites/route.ts      # monitored monuments
│   ├── api/health/route.ts     # liveness probe
│   └── page.tsx                # server shell, reads sites from SQLite
├── components/                 # dashboard, tiles, charts, alert feed, data grid
├── hooks/use-live-readings.ts  # fetch-once-then-stream
└── lib/
    ├── db.ts                   # schema, migrations, incident state machine
    ├── metrics.ts              # thresholds + conservation rationale, single source of truth
    ├── schemas.ts              # Zod contracts for every wire boundary
    ├── auth.ts                 # constant-time device authentication
    ├── events.ts               # in-process pub/sub behind SSE
    └── statistics.ts           # summaries, z-score outliers, CSV
scripts/seed.ts                 # reference sites + 48h of deterministic sample data
scripts/simulate.ts             # fake sensor node, for watching the dashboard update live
hardware/esp32-heritage-node/   # reference firmware
```

---

## Getting started

**Prerequisites:** Node.js 20.9 or newer.

```bash
git clone https://github.com/Mithran-MV/Heritage-Monitoring.git
cd Heritage-Monitoring
npm install
cp .env.example .env.local
```

Generate a device secret and put it in `.env.local`:

```bash
openssl rand -hex 32
```

Seed the reference monuments and 48 hours of sample readings, then start:

```bash
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. To watch it update live, in a second terminal:

```bash
DEVICE_API_KEY=<your-key> npm run simulate -- --site=red-fort
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run db:seed` | Seed sites + sample data (`-- --hours=72`, or `--empty` for sites only) |
| `npm run simulate` | Fake sensor node posting live readings |
| `npm run lint` · `npm run typecheck` | ESLint flat config · `tsc --noEmit` strict |
| `npm test` · `npm run test:coverage` | Vitest suite |

---

## API reference

Full details in [docs/API.md](docs/API.md).

### `POST /api/readings` — ingest *(requires `X-API-Key`)*

```bash
curl -X POST http://localhost:3000/api/readings \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"site":"red-fort","temperature":26.4,"humidity":55,
       "soil_moisture":48,"sound_level":62,"dust_density":31.2}'
```

`201` with the stored reading and any incidents it raised. Batch by sending
`{"readings":[…]}` (up to 500) — useful for nodes that buffer while offline.

Errors: `401` bad or missing key · `404` unknown site · `422` validation failure, with
`issues` naming the offending fields · `503` ingest disabled because the secret is unset.

### `GET /api/readings?site=&from=&to=&limit=`

Returns `{ readings: [...] }`, oldest-first for charting. `limit` defaults to 500, max 5000.

### `GET /api/stream` — Server-Sent Events

```js
const source = new EventSource('/api/stream');
source.addEventListener('reading', (event) => console.log(JSON.parse(event.data)));
```

Emits `ready` on connect, then `reading` per sample carrying `{ reading, alerts }`. A
comment heartbeat every 25s keeps proxies from dropping the connection.

### `GET /api/alerts` · `GET /api/export` · `GET /api/health`

Incident history (`status=open` to filter), CSV download, and a liveness probe reporting
row count, site count, live subscriber count and whether ingest is configured.

---

## Hardware

[`hardware/esp32-heritage-node/`](hardware/esp32-heritage-node/) has a complete Arduino
sketch: pin map, sensor transfer functions (including the Sharp GP2Y1010 LED-pulse timing),
WiFi reconnection, and a NaN guard so a failed DHT read skips the cycle rather than storing
a fake zero.

| Sensor | Pin | Measures |
|---|---|---|
| DHT22 | GPIO 4 | Temperature, humidity |
| Capacitive soil probe | GPIO 34 | Soil moisture |
| Sound module | GPIO 35 | Ambient noise |
| Rain module | GPIO 27 | Precipitation |
| PIR | GPIO 26 | Motion |
| Sharp GP2Y1010 | GPIO 33 + 25 | Dust density |
| SW-420 | GPIO 32 | Vibration |

Copy `secrets.example.h` to `secrets.h` (gitignored) and fill in your WiFi and device key.

---

## Thresholds

Defined once in [`src/lib/metrics.ts`](src/lib/metrics.ts), so the dashboard, the alert
engine and this table cannot disagree.

| Metric | Safe band | Why it matters |
|---|---|---|
| Temperature | 15–35 °C | Thermal cycling drives salt crystallisation and micro-cracking in stone |
| Humidity | 30–70 % | Sustained damp accelerates biological growth; dry air shrinks timber and plaster |
| Soil moisture | 20–80 % | Saturated ground undermines foundations; parched ground causes subsidence |
| Sound level | 0–85 dB | Sustained noise indicates crowding, machinery or unauthorised works |
| Dust density | 0–50 µg/m³ | Airborne particulates abrade and soil carved surfaces |
| Vibration | 0–2.5 mm/s | Peak particle velocity from traffic or works — the classic structural risk signal |

A reading outside its band opens a **warning**; more than 20% of the band's width beyond it
escalates to **critical**.

---

## Deploying

Any Node host works. SQLite means the database is one file — mount a volume and back it up
with `cp`.

```bash
npm ci && npm run build
DATABASE_PATH=/data/heritage.db DEVICE_API_KEY=... npm start
```

| Variable | Required | Purpose |
|---|:---:|---|
| `DEVICE_API_KEY` | ✅ | Shared secret for ingest. Ingest is disabled without it |
| `DATABASE_PATH` | — | SQLite file location (default `./data/heritage.db`) |
| `NEXT_PUBLIC_SITE_URL` | — | Absolute URL for OpenGraph metadata |

**Two constraints worth knowing before you deploy:**

1. **SQLite needs a writable, persistent filesystem.** That rules out stock Vercel/Lambda,
   where the filesystem is ephemeral and read-only. Use a VPS, Docker with a volume, Fly.io,
   or a Raspberry Pi on site — which is the realistic deployment for an IoT gateway anyway.
   For serverless, swap `src/lib/db.ts` for libSQL/Turso; the interface is small on purpose.
2. **SSE subscribers live in one Node process.** Behind a multi-instance load balancer,
   `src/lib/events.ts` needs a Redis pub/sub fan-out so a reading ingested by instance A
   reaches a browser connected to instance B.

Both are documented rather than hidden, and both are single-file changes.

---

## Testing

```bash
npm test
```

53 tests covering threshold grading at every boundary, breach descriptions, statistics
(including the empty and single-sample cases that would otherwise divide by zero), CSV
escaping, schema validation for the coercion traps above, constant-time auth including the
fail-closed paths, and the full incident lifecycle against a real temporary SQLite file:
open → escalate in place → resolve → reopen on recurrence.

---

## Security

- Ingest requires a shared secret, compared in constant time, and **fails closed** when the
  secret is unset or shorter than 16 characters.
- Writes happen only behind `POST` — never a `GET`.
- Every wire boundary is Zod-validated; unknown sites are rejected rather than orphaned.
- `.env` files and `hardware/**/secrets.h` are gitignored.
- Security headers set in `next.config.mjs`.

Found something? Open an issue — please don't include a working device key in the report.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). CI runs lint, typecheck, tests and a production build.

## License

[MIT](LICENSE) © Mithran MV

## Acknowledgements

[Next.js](https://nextjs.org/) · [MUI](https://mui.com/) · [Recharts](https://recharts.org/) ·
[better-sqlite3](https://github.com/WiseLibs/better-sqlite3) · [Zod](https://zod.dev/)
