'use client';

import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] render failed', error);
  }, [error]);

  return (
    <Container sx={{ py: 10 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h1" gutterBottom>
          Something went wrong
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          The dashboard could not load. If this is a fresh clone, run{' '}
          <code>npm run db:seed</code> to create the database first.
        </Typography>
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      </Box>
    </Container>
  );
}
