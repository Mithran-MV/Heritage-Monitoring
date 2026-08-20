'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: LightModeIcon },
  { value: 'system', label: 'System', Icon: SettingsBrightnessIcon },
  { value: 'dark', label: 'Dark', Icon: DarkModeIcon },
] as const;

export function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  // `mode` is undefined until the provider has read storage on the client.
  if (!mode) return null;

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={mode}
      onChange={(_event, next) => next && setMode(next)}
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleButton key={value} value={value} aria-label={label} sx={{ px: 1.25 }}>
          <Icon fontSize="small" />
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
