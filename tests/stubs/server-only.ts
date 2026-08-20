/**
 * `server-only` throws when resolved outside a React Server Component, which
 * includes the Vitest runner. Aliasing it here lets the server modules be
 * imported directly in tests; the real guard still applies in the app build.
 */
export {};
