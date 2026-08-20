import { subscribe } from '@/lib/events';

export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 25_000;

/**
 * GET /api/stream — Server-Sent Events feed of new readings and alerts.
 *
 * SSE rather than WebSockets: the traffic is one-directional, it survives
 * proxies that mangle upgrades, and `EventSource` reconnects on its own.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send('ready', { connectedAt: new Date().toISOString() });

      const unsubscribe = subscribe((event) => send('reading', event));

      // Idle connections are dropped by proxies at around 30–60s; a comment
      // frame keeps the socket alive without polluting the event log.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed by the client */
        }
      };

      request.signal.addEventListener('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx buffers proxied responses by default, which stalls SSE.
      'X-Accel-Buffering': 'no',
    },
  });
}
