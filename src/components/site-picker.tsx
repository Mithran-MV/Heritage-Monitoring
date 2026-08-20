'use client';

import {
  Avatar,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';

import type { Site } from '@/lib/schemas';

interface SitePickerProps {
  sites: Site[];
  value: string;
  onChange: (slug: string) => void;
}

export function SitePicker({ sites, value, onChange }: SitePickerProps) {
  const active = sites.find((site) => site.slug === value);

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { sm: 'center' } }}
    >
      <FormControl size="small" sx={{ minWidth: 240 }}>
        <InputLabel id="site-picker-label">Monitored site</InputLabel>
        <Select
          labelId="site-picker-label"
          label="Monitored site"
          value={sites.some((site) => site.slug === value) ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        >
          {sites.map((site) => (
            <MenuItem key={site.slug} value={site.slug}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                {site.image_url && (
                  <Avatar src={site.image_url} alt="" sx={{ width: 24, height: 24 }} />
                )}
                <span>{site.name}</span>
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {active && (
        <Stack spacing={0.25}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {active.location}
            </Typography>
            {active.latitude !== null && active.longitude !== null && (
              <Chip
                size="small"
                variant="outlined"
                label={`${active.latitude.toFixed(3)}, ${active.longitude.toFixed(3)}`}
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 560 }}>
            {active.description}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
