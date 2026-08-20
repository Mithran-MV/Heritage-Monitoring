'use client';

import {
  Alert as MuiAlert,
  Box,
  Container,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';

import { AlertFeed } from '@/components/alert-feed';
import { ConnectionBadge } from '@/components/connection-badge';
import { MetricChart } from '@/components/metric-chart';
import { MetricTile } from '@/components/metric-tile';
import { ReadingsTable } from '@/components/readings-table';
import { SitePicker } from '@/components/site-picker';
import { ThemeToggle } from '@/components/theme-toggle';
import { useLiveReadings } from '@/hooks/use-live-readings';
import { METRICS } from '@/lib/metrics';
import type { Site } from '@/lib/schemas';
import { isOutlier, summarise } from '@/lib/statistics';

export function Dashboard({ sites }: { sites: Site[] }) {
  const [site, setSite] = useState(sites[0]?.slug ?? '');
  const { readings, alerts, loading, error, connection } = useLiveReadings(site || null);

  const summaries = useMemo(
    () =>
      METRICS.map((metric) => {
        const summary = summarise(readings, metric.key);
        return {
          metric,
          summary,
          outlier: isOutlier(summary),
          history: readings.map((reading) => reading[metric.key]),
        };
      }),
    [readings],
  );

  const lastSeen = readings.at(-1)?.recorded_at;

  if (sites.length === 0) {
    return (
      <Container sx={{ py: 8 }}>
        <MuiAlert severity="info">
          <Typography sx={{ fontWeight: 600 }}>No sites configured yet.</Typography>
          Run <code>npm run db:seed</code> to create the three reference monuments and 48
          hours of sample readings.
        </MuiAlert>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100dvh', pb: 8 }}>
      <Box
        component="header"
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Container sx={{ py: 3 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography variant="h1">Heritage Monitoring</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Environmental and structural telemetry for protected monuments.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <ConnectionBadge state={connection} />
              <ThemeToggle />
            </Stack>
          </Stack>

          <Box sx={{ mt: 2.5 }}>
            <SitePicker sites={sites} value={site} onChange={setSite} />
          </Box>
        </Container>
      </Box>

      {loading && <LinearProgress />}

      <Container component="main" id="main" sx={{ pt: 3 }}>
        {error && (
          <MuiAlert severity="error" sx={{ mb: 3 }}>
            {error}
          </MuiAlert>
        )}

        {!loading && readings.length === 0 && !error && (
          <MuiAlert severity="info" sx={{ mb: 3 }}>
            No readings for this site yet. Start the simulator with{' '}
            <code>npm run simulate -- --site={site}</code>, or POST to{' '}
            <code>/api/readings</code> from a device.
          </MuiAlert>
        )}

        {readings.length > 0 && (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              {summaries.map(({ metric, summary, history, outlier }) => (
                <Grid key={metric.key} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                  <MetricTile
                    metric={metric}
                    summary={summary}
                    history={history}
                    outlier={outlier}
                  />
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Grid container spacing={2}>
                  {METRICS.map((metric) => (
                    <Grid key={metric.key} size={{ xs: 12, md: 6 }}>
                      <MetricChart metric={metric} readings={readings} />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <AlertFeed alerts={alerts} />
              </Grid>
            </Grid>

            <ReadingsTable readings={readings} site={site} />

            <Typography variant="caption" color="text.secondary" align="center">
              {readings.length} readings in view
              {lastSeen &&
                ` · last sample ${new Date(lastSeen).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                })} IST`}
            </Typography>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
