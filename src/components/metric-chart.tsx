'use client';

import { Card, CardContent, Typography, useTheme } from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { MetricDefinition } from '@/lib/metrics';
import type { StoredReading } from '@/lib/schemas';

interface MetricChartProps {
  metric: MetricDefinition;
  readings: StoredReading[];
}

export function MetricChart({ metric, readings }: MetricChartProps) {
  const theme = useTheme();

  const data = readings.map((reading) => ({
    time: new Date(reading.recorded_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }),
    full: new Date(reading.recorded_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
    }),
    value: reading[metric.key],
  }));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {metric.label} ({metric.unit})
        </Typography>

        <div style={{ height: 220, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
              {/* Shading the safe band makes a breach legible without reading
                  the axis — the original charts had no threshold context. */}
              <ReferenceArea
                y1={metric.min}
                y2={metric.max}
                fill={theme.palette.success.main}
                fillOpacity={0.08}
              />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={metric.domain}
                tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.full ?? ''}
                formatter={(value) => [`${value as number} ${metric.unit}`, metric.label]}
              />
              <Line
                dataKey="value"
                stroke={metric.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
