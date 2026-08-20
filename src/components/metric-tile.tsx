'use client';

import { Box, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

import { grade, type MetricDefinition } from '@/lib/metrics';
import type { Summary } from '@/lib/statistics';

interface MetricTileProps {
  metric: MetricDefinition;
  summary: Summary;
  history: number[];
  outlier: boolean;
}

const SEVERITY_COLOR = {
  normal: 'success',
  warning: 'warning',
  critical: 'error',
} as const;

export function MetricTile({ metric, summary, history, outlier }: MetricTileProps) {
  const value = summary.latest;
  const severity = value === null ? 'normal' : grade(metric.key, value);
  const trend = summary.delta;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Tooltip title={metric.rationale} arrow>
            <Typography variant="overline" color="text.secondary" sx={{ cursor: 'help' }}>
              {metric.label}
            </Typography>
          </Tooltip>
          <Chip
            size="small"
            label={
              severity === 'normal'
                ? 'Normal'
                : severity === 'warning'
                  ? 'Warning'
                  : 'Critical'
            }
            color={SEVERITY_COLOR[severity]}
            variant={severity === 'normal' ? 'outlined' : 'filled'}
          />
        </Stack>

        <Typography
          variant="h4"
          sx={{ mt: 0.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
        >
          {value === null ? '—' : value.toFixed(metric.precision)}
          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{ ml: 0.5 }}
          >
            {metric.unit}
          </Typography>
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(metric.precision)}{' '}
          {metric.unit} over the window · safe {metric.min}–{metric.max}
        </Typography>

        {outlier && (
          <Tooltip
            title={`This sample is ${Math.abs(summary.zScore).toFixed(1)} standard deviations from the window mean — unusual even though it may still be inside the safe band.`}
            arrow
          >
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label="Statistical outlier"
              sx={{ mt: 0.75, cursor: 'help' }}
            />
          </Tooltip>
        )}
      </CardContent>

      <Box sx={{ height: 44, mt: -1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={history.map((point, index) => ({ index, value: point }))}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <YAxis domain={metric.domain} hide />
            <Area
              dataKey="value"
              stroke={metric.color}
              fill={metric.color}
              fillOpacity={0.16}
              strokeWidth={1.6}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  );
}
