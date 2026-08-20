'use client';

import { Chip, Tooltip } from '@mui/material';

import type { ConnectionState } from '@/hooks/use-live-readings';

const PRESENTATION = {
  connecting: {
    label: 'Connecting',
    color: 'default',
    hint: 'Opening the live event stream…',
  },
  live: {
    label: 'Live',
    color: 'success',
    hint: 'Connected. New readings appear the moment a device reports them.',
  },
  offline: {
    label: 'Reconnecting',
    color: 'warning',
    hint: 'The stream dropped. The browser retries automatically; history is still accurate.',
  },
} as const;

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const { label, color, hint } = PRESENTATION[state];

  return (
    <Tooltip title={hint} arrow>
      <Chip
        size="small"
        color={color}
        variant={state === 'live' ? 'filled' : 'outlined'}
        label={label}
        sx={
          state === 'live'
            ? {
                // A slow pulse reads as "streaming" without being distracting.
                '@keyframes pulse': { '50%': { opacity: 0.55 } },
                animation: 'pulse 2.4s ease-in-out infinite',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }
            : undefined
        }
      />
    </Tooltip>
  );
}
