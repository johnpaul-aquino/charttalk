/**
 * Fetch with Timeout Utility
 *
 * Provides AbortController-based timeout protection for fetch calls.
 * Prevents requests from hanging indefinitely when external APIs are slow or unresponsive.
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Timeout in milliseconds (default: 15000) */
  timeout?: number;
}

/**
 * Timeout error thrown when a fetch request exceeds the specified timeout
 */
export class FetchTimeoutError extends Error {
  readonly timeout: number;
  readonly url: string;

  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`);
    this.name = 'FetchTimeoutError';
    this.timeout = timeout;
    this.url = url;
  }
}

/**
 * Fetch with timeout protection using AbortController
 *
 * @param url - The URL to fetch
 * @param options - Fetch options including optional timeout (default: 15000ms)
 * @returns Promise resolving to the Response
 * @throws FetchTimeoutError if the request times out
 *
 * @example
 * ```typescript
 * // Basic usage with default 15s timeout
 * const response = await fetchWithTimeout('https://api.example.com/data');
 *
 * // Custom timeout
 * const response = await fetchWithTimeout('https://api.example.com/data', {
 *   timeout: 5000, // 5 seconds
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' })
 * });
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 15000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    // Convert AbortError to our custom FetchTimeoutError
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeout);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Default timeout values for different API operations (in milliseconds)
 */
export const DEFAULT_TIMEOUTS = {
  /** Chart generation API calls - typically 3.5s, allow up to 30s */
  CHART_GENERATION: 30000,
  /** Exchange list API calls - typically 0.5s, allow up to 8s */
  EXCHANGES: 8000,
  /** Symbol list API calls - typically 0.8s, allow up to 8s */
  SYMBOLS: 8000,
  /** Documentation fetch - typically 1.5s, allow up to 10s */
  DOCUMENTATION: 10000,
  /** File/chart downloads - variable, allow up to 20s */
  DOWNLOAD: 20000,
} as const;
