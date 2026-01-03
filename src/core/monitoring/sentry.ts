/**
 * Sentry Monitoring Module
 *
 * Provides Sentry initialization and error capture utilities
 * for the MCP server (standalone Node.js process).
 *
 * Initialization conditions:
 * - Production: NODE_ENV=production && SENTRY_DSN is set
 * - Development testing: SENTRY_DEBUG=true && SENTRY_DSN is set
 */

import * as Sentry from '@sentry/node';

// Helper to check if Sentry should be active
function isSentryEnabled(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDebugMode = process.env.SENTRY_DEBUG === 'true';
  const hasDSN = !!process.env.SENTRY_DSN;
  return (isProduction || isDebugMode) && hasDSN;
}

/**
 * Initialize Sentry for the MCP server.
 * Should be called at the very top of the MCP server entry point,
 * before any other imports or code execution.
 */
export function initSentryForMCP(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDebugMode = process.env.SENTRY_DEBUG === 'true';
  const hasDSN = !!process.env.SENTRY_DSN;

  if (!((isProduction || isDebugMode) && hasDSN)) {
    return;
  }

  const environment = isProduction ? 'production' : 'development';

  if (isDebugMode && !isProduction) {
    console.error('[Sentry] Debug mode enabled - initializing MCP server Sentry in development');
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

    // Tag all events from MCP server
    initialScope: {
      tags: {
        runtime: 'mcp-server',
        serverType: 'stdio',
      },
    },
  });
}

/**
 * Capture an MCP tool error with context.
 * Adds tool name and arguments as tags/context for easier debugging.
 *
 * @param error - The error to capture
 * @param toolName - Name of the MCP tool that threw the error
 * @param args - Optional tool arguments (sensitive data should be filtered by caller)
 */
export function captureMCPError(
  error: Error,
  toolName: string,
  args?: Record<string, unknown>
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('mcp.tool', toolName);
    if (args) {
      // Filter potentially sensitive fields
      const safeArgs = { ...args };
      delete safeArgs.apiKey;
      delete safeArgs.token;
      delete safeArgs.password;
      delete safeArgs.secret;
      scope.setContext('tool_args', safeArgs);
    }
    Sentry.captureException(error);
  });
}

/**
 * Flush Sentry events before process exit.
 * Returns a promise that resolves when all events are sent.
 *
 * @param timeout - Maximum time to wait in milliseconds (default: 2000)
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!isSentryEnabled()) {
    return true;
  }
  return Sentry.close(timeout);
}

// Re-export Sentry for direct access when needed
export { Sentry };
