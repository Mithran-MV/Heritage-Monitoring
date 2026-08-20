'use client';

import { Box, Button, Container, Typography } from '@mui/material';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Container sx={{ py: 10 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="overline" color="primary">
          404
        </Typography>
        <Typography variant="h1" gutterBottom>
          Page not found
        </Typography>
        <Button component={Link} href="/" variant="contained">
          Back to the dashboard
        </Button>
      </Box>
    </Container>
  );
}
