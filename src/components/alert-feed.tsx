'use client';

import {
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';

import { METRIC_BY_KEY, type MetricKey } from '@/lib/metrics';
import type { Alert } from '@/lib/schemas';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function duration(alert: Alert): string {
  const end = alert.resolved_at ? new Date(alert.resolved_at) : new Date();
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - new Date(alert.opened_at).getTime()) / 60_000),
  );
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function AlertFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="overline" color="text.secondary">
            Incidents
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            color={alerts.some((alert) => !alert.resolved_at) ? 'warning' : 'success'}
            label={`${alerts.filter((alert) => !alert.resolved_at).length} open`}
          />
        </Stack>

        {alerts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No threshold breaches recorded for this site.
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 320, overflow: 'auto', mt: 0.5 }}>
            {alerts.map((alert) => {
              const metric = METRIC_BY_KEY[alert.metric as MetricKey];
              return (
                <ListItem key={alert.id} disableGutters divider>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={alert.severity}
                          color={alert.severity === 'critical' ? 'error' : 'warning'}
                          variant={alert.resolved_at ? 'outlined' : 'filled'}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {metric?.label ?? alert.metric}
                        </Typography>
                        {alert.resolved_at && (
                          <Chip
                            size="small"
                            variant="outlined"
                            color="success"
                            label="resolved"
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <>
                        {alert.message}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {formatWhen(alert.opened_at)} · lasted {duration(alert)}
                        </Typography>
                      </>
                    }
                    slotProps={{ secondary: { component: 'div' } }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
