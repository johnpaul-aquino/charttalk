/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for the Next.js server-side runtime.
 * It is auto-loaded by @sentry/nextjs before any server code runs.
 *
 * Initialization conditions:
 * - Production: NODE_ENV=production && SENTRY_DSN is set
 * - Development testing: SENTRY_DEBUG=true && SENTRY_DSN is set
 */

import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';
const isDebugMode = process.env.SENTRY_DEBUG === 'true';
const hasDSN = !!process.env.SENTRY_DSN;

// Initialize if: (production OR debug mode) AND DSN is configured
if ((isProduction || isDebugMode) && hasDSN) {
  const environment = isProduction ? 'production' : 'development';

  if (isDebugMode && !isProduction) {
    console.log('[Sentry] Debug mode enabled - initializing in development');
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment,
    release: process.env.SENTRY_RELEASE || 'mcp-chart-image@0.1.1',

    // Performance monitoring sample rate
    // In debug mode, capture all traces for easier testing
    tracesSampleRate: isDebugMode ? 1.0 : 0.1,

    // Enable debug logging in debug mode
    debug: isDebugMode,

    beforeSend(event, hint) {
      // Filter 4xx errors - only capture 5xx server errors
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        if (statusCode < 500) return null;
      }

      // Filter sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-api-key'];
        delete event.request.headers['cookie'];
      }

      return event;
    },
  });
}
