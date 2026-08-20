# Contributing

Thanks for taking the time to contribute.

## Getting set up

```bash
npm install
cp .env.example .env.local
openssl rand -hex 32          # paste into DEVICE_API_KEY
npm run db:seed
npm run dev
```

To watch the dashboard update live without hardware:

```bash
DEVICE_API_KEY=<your-key> npm run simulate -- --site=red-fort
```

## Before opening a pull request

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Conventions

- **TypeScript strict.** `any` needs a comment explaining why nothing better fits.
- **Validate at the boundary.** Anything arriving over the network is parsed through a Zod
  schema in `src/lib/schemas.ts`. Be careful with coercion: `Number('')` is `0` and
  `Boolean('false')` is `true`, and devices send both.
- **Never fabricate a measurement.** If a device did not report a field, store `null` or
  reject the reading. A plausible-looking invented number is worse than a gap.
- **Thresholds live in one place.** `src/lib/metrics.ts` is the single source of truth for
  bands, units, colours and rationale. Do not duplicate a threshold into a component.
- **Writes go behind `POST`.** A `GET` must never mutate state.
- **Comments explain *why*.** The what is already in the code.
- **Tests for logic.** Anything in `lib/` should come with Vitest coverage. The database
  tests run against a real temporary SQLite file, not a mock.

## Adding a metric

1. Add a `MetricDefinition` to `METRICS` in `src/lib/metrics.ts`.
2. Add the column to the `readings` table in the `migrate()` call in `src/lib/db.ts`, and to
   the insert statement.
3. Add the field to `readingInputSchema` in `src/lib/schemas.ts`.
4. Add it to the `columns` list in `src/lib/statistics.ts` so it reaches the CSV export.

The tiles, charts, alert engine and data grid all iterate `METRICS`, so they pick it up
without further changes.

## Commit messages

Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).

## Reporting security issues

Open an issue describing the problem, but **never paste a working device key** into it.
