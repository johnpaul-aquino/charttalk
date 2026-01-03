/**
 * Monitoring Module
 *
 * Exports Sentry utilities for error tracking and monitoring.
 */

export {
  initSentryForMCP,
  captureMCPError,
  flushSentry,
  Sentry,
} from './sentry.js';
