'use client';

import { createTheme } from '@mui/material/styles';

/**
 * One theme object serving both colour schemes.
 *
 * MUI v9's `colorSchemes` renders both palettes as CSS variables, so switching
 * is a class flip with no re-render and no flash — the previous dashboard was
 * hardcoded to a single dark palette with literal hex values scattered through
 * every `sx` prop.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1d4ed8' },
        secondary: { main: '#b45309' },
        success: { main: '#15803d' },
        warning: { main: '#b45309' },
        error: { main: '#b91c1c' },
        background: { default: '#f6f7fb', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#60a5fa' },
        secondary: { main: '#fbbf24' },
        success: { main: '#4ade80' },
        warning: { main: '#fbbf24' },
        error: { main: '#f87171' },
        background: { default: '#0b1020', paper: '#151b30' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'var(--font-sans, system-ui, -apple-system, "Segoe UI", sans-serif)',
    h1: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.25rem', fontWeight: 600 },
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: current }) => ({
          border: `1px solid ${current.palette.divider}`,
          backgroundImage: 'none',
        }),
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});
