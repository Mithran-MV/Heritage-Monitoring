import 'server-only';

import type { Alert, StoredReading } from './schemas';

/**
 * In-process pub/sub backing the `/api/stream` SSE endpoint.
 *
 * The old dashboard polled every 5 seconds whether or not anything had changed.
 * Pushing instead means the UI updates the instant a device reports, and an
 * idle site costs nothing.
 *
 * Subscribers live in the same Node process as the ingest route, which holds
 * for a single-instance deployment (Docker, a Pi, `next start`). Behind a
 * multi-instance load balancer this needs a Redis pub/sub fan-out.
 */

export interface ReadingEvent {
  type: 'reading';
  reading: StoredReading;
  alerts: Alert[];
}

type Subscriber = (event: ReadingEvent) => void;

const subscribers = new Set<Subscriber>();

export function subscribe(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function publish(event: ReadingEvent): void {
  for (const subscriber of subscribers) {
    try {
      subscriber(event);
    } catch {
      // A dead client must not take down the ingest request that triggered it.
    }
  }
}

export function subscriberCount(): number {
  return subscribers.size;
}
