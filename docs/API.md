# API reference

Base URL is your deployment root. All responses are JSON unless noted.

Errors share one shape:

```json
{ "error": "Human-readable message" }
```

Validation failures add `issues`, keyed by field:

```json
{
  "error": "Invalid reading.",
  "issues": {
    "temperature": ["Invalid input: expected number, received NaN"],
    "humidity": ["Too big: expected number to be <=100"]
  }
}
```

---

## `POST /api/readings`

Ingest one reading or a batch. **Requires authentication.**

### Authentication

Send the shared secret as either header:

```
X-API-Key: <DEVICE_API_KEY>
Authorization: Bearer <DEVICE_API_KEY>
```

Comparison is constant-time. If `DEVICE_API_KEY` is unset or shorter than 16 characters the
endpoint returns `503` and accepts nothing — an unset secret must never mean "open".

### Body — single reading

| Field | Type | Required | Range | Notes |
|---|---|:---:|---|---|
| `site` | string | ✅ | `^[a-z0-9-]+$`, ≤64 | Must already exist |
| `recorded_at` | ISO 8601 | — | | Device clock. Server timestamps if omitted |
| `temperature` | number | ✅ | −50 … 90 | °C |
| `humidity` | number | ✅ | 0 … 100 | % |
| `soil_moisture` | number | ✅ | 0 … 100 | % |
| `sound_level` | number | ✅ | 0 … 200 | dB |
| `dust_density` | number | ✅ | 0 … 2000 | µg/m³ |
| `vibration` | number | — | 0 … 100 | mm/s, defaults to `0` |
| `rain_detected` | boolean | — | | Defaults to `false` |
| `motion_detected` | boolean | — | | Defaults to `false` |
| `battery` | number | — | 0 … 100 | % — omitted stores `null`, not `0` |

**Numeric fields accept numeric strings**, since microcontrollers send text. An empty or
whitespace-only string is **rejected**, not read as `0`.

**Boolean fields are parsed by spelling, not truthiness.** Accepted: `true`/`false`,
`1`/`0`, `"true"`/`"false"`, `"1"`/`"0"`, `"yes"`/`"no"`, `"on"`/`"off"`. Anything else is a
validation error — never a silent `true`.

### Body — batch

```json
{ "readings": [ { … }, { … } ] }
```

1–500 readings. An unknown `site` anywhere in the batch rejects the whole batch with `404`,
rather than storing some rows and failing others.

### Responses

| Status | Meaning |
|---|---|
| `201` | Stored. Body: `{ accepted, readings[], alerts[] }` — `alerts` lists incidents newly opened |
| `400` | Body was not valid JSON |
| `401` | Missing or invalid device key |
| `404` | Unknown site slug |
| `422` | Validation failed; see `issues` |
| `503` | Ingest disabled — `DEVICE_API_KEY` unset or too short |

### Example

```bash
curl -X POST http://localhost:3000/api/readings \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"site":"red-fort","temperature":26.4,"humidity":55,
       "soil_moisture":48,"sound_level":62,"dust_density":31.2,
       "vibration":0.8,"rain_detected":false,"motion_detected":true}'
```

---

## `GET /api/readings`

Read the archive. Public.

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `site` | slug | all sites | |
| `from` | ISO 8601 | — | Inclusive lower bound |
| `to` | ISO 8601 | — | Inclusive upper bound |
| `limit` | 1–5000 | `500` | Takes the most recent N |

Returns `{ readings: [...] }`. Rows come back **oldest-first** so charts can render them
directly, while `limit` still selects the most recent window.

```bash
curl "http://localhost:3000/api/readings?site=red-fort&limit=100"
curl "http://localhost:3000/api/readings?site=red-fort&from=2026-08-01T00:00:00.000Z"
```

---

## `GET /api/stream`

Server-Sent Events. One connection carries every site; filter client-side on
`reading.site`.

| Event | Payload |
|---|---|
| `ready` | `{ connectedAt }` — sent immediately on connect |
| `reading` | `{ type: "reading", reading, alerts }` — per ingested sample |

A `: keep-alive` comment every 25 seconds keeps proxies from dropping an idle connection.
`X-Accel-Buffering: no` is set because nginx buffers proxied responses by default, which
would otherwise stall the stream.

```js
const source = new EventSource('/api/stream');
source.addEventListener('reading', (event) => {
  const { reading, alerts } = JSON.parse(event.data);
});
```

`EventSource` reconnects automatically; no retry logic is needed client-side.

---

## `GET /api/alerts`

| Parameter | Type | Default |
|---|---|---|
| `site` | slug | all |
| `status` | `all` \| `open` | `all` |
| `limit` | 1–500 | `50` |

Returns `{ alerts: [...] }`, newest first. An alert has `id`, `site`, `metric`, `severity`
(`warning` \| `critical`), `value`, `message`, `opened_at`, and `resolved_at` (`null` while
open).

**Incidents are stateful.** A metric that stays out of range does not produce a row per
sample: one incident opens, tracks its current worst value in place, and gains a
`resolved_at` when readings return to the safe band. A later recurrence opens a new incident.

---

## `GET /api/export`

Same parameters as `GET /api/readings`; `limit` is raised to at least 5000. Returns
`text/csv` with a `Content-Disposition` attachment header. Fields containing commas, quotes
or newlines are quoted and internal quotes doubled.

```bash
curl -OJ "http://localhost:3000/api/export?site=red-fort"
```

---

## `GET /api/health`

```json
{
  "status": "ok",
  "readings": 582,
  "sites": 3,
  "liveSubscribers": 1,
  "ingestConfigured": true,
  "timestamp": "2026-08-20T12:29:56.046Z"
}
```

`503` with `{"status":"degraded"}` if the database is unreachable. `ingestConfigured` is
`false` when `DEVICE_API_KEY` is missing or too short — worth alerting on, since ingest is
silently refusing devices in that state.

---

## `GET /api/sites`

Returns `{ sites: [...] }` with `slug`, `name`, `location`, `description`, `image_url`,
`latitude`, `longitude`. Sites are created by `npm run db:seed` or by calling `upsertSite`
from a script; there is deliberately no public write endpoint for them.
