/**
 * Next.js Instrumentation
 *
 * This file is auto-loaded by Next.js to set up instrumentation.
 * It's used to initialize Sentry for server-side error tracking.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import the server-side Sentry config
    await import('../sentry.server.config');
  }
}
