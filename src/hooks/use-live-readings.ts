'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Alert, StoredReading } from '@/lib/schemas';

const MAX_POINTS = 720;

export type ConnectionState = 'connecting' | 'live' | 'offline';

interface State {
  readings: StoredReading[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

/**
 * Loads the recent archive once, then keeps it current over Server-Sent Events.
 *
 * The previous dashboard re-fetched the entire dataset every five seconds, so
 * traffic grew with the archive and updates were up to five seconds stale.
 * Here the history is fetched once and each new sample is appended as it lands.
 */
export function useLiveReadings(site: string | null) {
  const [state, setState] = useState<State>({
    readings: [],
    alerts: [],
    loading: true,
    error: null,
  });
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const sourceRef = useRef<EventSource | null>(null);

  const load = useCallback(async () => {
    if (!site) return;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const [readingsResponse, alertsResponse] = await Promise.all([
        fetch(`/api/readings?site=${encodeURIComponent(site)}&limit=${MAX_POINTS}`),
        fetch(`/api/alerts?site=${encodeURIComponent(site)}&limit=50`),
      ]);

      if (!readingsResponse.ok) throw new Error('Could not load readings.');

      const { readings } = (await readingsResponse.json()) as {
        readings: StoredReading[];
      };
      const { alerts } = alertsResponse.ok
        ? ((await alertsResponse.json()) as { alerts: Alert[] })
        : { alerts: [] };

      setState({ readings, alerts, loading: false, error: null });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : 'Something went wrong.',
      }));
    }
  }, [site]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!site) return;

    const source = new EventSource('/api/stream');
    sourceRef.current = source;

    source.addEventListener('ready', () => setConnection('live'));

    source.addEventListener('reading', (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as {
        reading: StoredReading;
        alerts: Alert[];
      };
      // One stream carries every site; filter client-side rather than opening
      // a connection per site.
      if (payload.reading.site !== site) return;

      setState((previous) => ({
        ...previous,
        readings: [...previous.readings, payload.reading].slice(-MAX_POINTS),
        alerts: [...payload.alerts, ...previous.alerts].slice(0, 50),
      }));
    });

    // EventSource reconnects on its own; reflect the gap in the UI meanwhile.
    source.onerror = () => setConnection('offline');
    source.onopen = () => setConnection('live');

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [site]);

  return { ...state, connection, refresh: load } as const;
}
