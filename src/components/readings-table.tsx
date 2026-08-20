'use client';

import DownloadIcon from '@mui/icons-material/Download';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';

import { METRICS } from '@/lib/metrics';
import type { StoredReading } from '@/lib/schemas';

interface ReadingsTableProps {
  readings: StoredReading[];
  site: string;
}

export function ReadingsTable({ readings, site }: ReadingsTableProps) {
  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'recorded_at',
        headerName: 'Recorded',
        flex: 1.4,
        minWidth: 170,
        valueFormatter: (value: string) =>
          new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      },
      ...METRICS.map<GridColDef>((metric) => ({
        field: metric.key,
        headerName: `${metric.label} (${metric.unit})`,
        flex: 1,
        minWidth: 130,
        type: 'number',
        valueFormatter: (value: number | null) =>
          typeof value === 'number' ? value.toFixed(metric.precision) : '—',
      })),
      {
        field: 'rain_detected',
        headerName: 'Rain',
        width: 90,
        type: 'boolean',
      },
      {
        field: 'motion_detected',
        headerName: 'Motion',
        width: 100,
        type: 'boolean',
      },
    ],
    [],
  );

  // Newest first reads better in a table, even though charts want oldest first.
  const rows = useMemo(() => [...readings].reverse(), [readings]);

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Typography variant="overline" color="text.secondary">
            Historical readings
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            href={`/api/export?site=${encodeURIComponent(site)}`}
          >
            Export CSV
          </Button>
        </Stack>

        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
            sorting: { sortModel: [{ field: 'recorded_at', sort: 'desc' }] },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          sx={{ border: 0, height: 460 }}
        />
      </CardContent>
    </Card>
  );
}
