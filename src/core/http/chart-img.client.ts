/**
 * chart-img.com API Client
 *
 * HTTP client wrapper for interacting with chart-img.com REST API.
 * Handles authentication, rate limiting, retries, timeout protection, and error handling.
 */

import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { fetchWithTimeout, FetchTimeoutError, DEFAULT_TIMEOUTS } from '../../shared/utils';

// Type Definitions

export interface ChartConfig {
  symbol: string;
  interval?: string;
  range?: string;
  from?: string;
  to?: string;
  theme?: 'light' | 'dark';
  style?: 'bar' | 'candle' | 'line' | 'area' | 'heikinAshi' | 'hollowCandle' | 'baseline' | 'hiLo' | 'column';
  width?: number;
  height?: number;
  studies?: Array<{
    name: string;
    input?: Record<string, any>;
    override?: Record<string, any>;
  }>;
  drawings?: Array<{
    name: string;
    input: Record<string, any>;
    override?: Record<string, any>;
    zOrder?: number;
  }>;
  override?: Record<string, any>;
}

export interface ChartResponse {
  success: boolean;
  imageUrl?: string;
  imageData?: string;
  localPath?: string;
  metadata: {
    format: string;
    resolution: string;
    generatedAt: string;
    expiresAt?: string;
  };
  apiResponse: {
    statusCode: number;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
  };
  error?: string;
}

export interface Exchange {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface Symbol {
  symbol: string;
  fullSymbol: string;
  description: string;
  type: string;
}

export interface ExchangeResponse {
  success: boolean;
  exchanges: Exchange[];
  count: number;
  error?: string;
}

export interface SymbolResponse {
  success: boolean;
  exchange: string;
  symbols: Symbol[];
  count: number;
  error?: string;
}

export class ChartImgError extends Error {
  constructor(
    public statusCode: number,
    public details: any,
    message?: string
  ) {
    super(message || `Chart-img API error: ${statusCode}`);
    this.name = 'ChartImgError';
  }
}

// Rate Limiter Class
class RateLimiter {
  private requestCount = 0;
  private lastReset = Date.now();
  private dailyCount = 0;
  private dailyReset = Date.now();

  constructor(
    private requestsPerSecond: number,
    private dailyLimit: number
  ) {}

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Check daily limit
    if (now - this.dailyReset >= 86400000) { // 24 hours
      this.dailyCount = 0;
      this.dailyReset = now;
    }

    if (this.dailyCount >= this.dailyLimit) {
      const resetTime = new Date(this.dailyReset + 86400000);
      throw new Error(`Daily rate limit (${this.dailyLimit}) exceeded. Resets at ${resetTime.toISOString()}`);
    }

    // Check per-second limit
    const elapsed = now - this.lastReset;

    if (elapsed >= 1000) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    if (this.requestCount >= this.requestsPerSecond) {
      const waitTime = 1000 - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastReset = Date.now();
    }

    this.requestCount++;
    this.dailyCount++;
  }

  getStatus() {
    return {
      requestsThisSecond: this.requestCount,
      requestsToday: this.dailyCount,
      dailyLimit: this.dailyLimit,
    };
  }
}

// Simple Cache
class SimpleCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  set(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Main Client Class
export class ChartImgClient {
  private apiKey: string;
  private baseUrl = 'https://api.chart-img.com';
  private rateLimiter: RateLimiter;
  private exchangeCache = new SimpleCache<Exchange[]>();
  private symbolCache = new SimpleCache<Symbol[]>();

  constructor(
    apiKey: string,
    options: {
      requestsPerSecond?: number;
      dailyLimit?: number;
    } = {}
  ) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter(
      options.requestsPerSecond || 10,
      options.dailyLimit || 500
    );
  }

  /**
   * Generate a chart image
   */
  async generateChart(
    config: ChartConfig,
    storage = false,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<ChartResponse> {
    await this.rateLimiter.waitIfNeeded();

    const endpoint = storage
      ? '/v2/tradingview/advanced-chart/storage'
      : '/v2/tradingview/advanced-chart';

    try {
      const response = await this.retryWithBackoff(async () => {
        return await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify(config),
          timeout: DEFAULT_TIMEOUTS.CHART_GENERATION,
        });
      });

      const statusCode = response.status;
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');

      if (!response.ok) {
        const errorData = await response.json();
        throw new ChartImgError(statusCode, errorData);
      }

      if (storage) {
        const data: any = await response.json();
        return {
          success: true,
          imageUrl: data.url,
          metadata: {
            format: data.metadata?.format || format.toUpperCase(),
            resolution: `${config.width || 1200}x${config.height || 675}`,
            generatedAt: new Date().toISOString(),
            expiresAt: data.expiresAt,
          },
          apiResponse: {
            statusCode,
            rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
            rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
          },
        };
      } else {
        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';

        return {
          success: true,
          imageData: Buffer.from(imageBuffer).toString('base64'),
          metadata: {
            format: contentType.split('/')[1].toUpperCase(),
            resolution: `${config.width || 1200}x${config.height || 675}`,
            generatedAt: new Date().toISOString(),
          },
          apiResponse: {
            statusCode,
            rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
            rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
          },
        };
      }
    } catch (error) {
      if (error instanceof ChartImgError) {
        return {
          success: false,
          error: error.details?.error || error.message,
          metadata: {
            format: '',
            resolution: '',
            generatedAt: new Date().toISOString(),
          },
          apiResponse: {
            statusCode: error.statusCode,
          },
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          format: '',
          resolution: '',
          generatedAt: new Date().toISOString(),
        },
        apiResponse: {
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Generate a chart and save directly to file (avoids loading base64 in memory)
   */
  async generateChartToFile(
    config: ChartConfig,
    filePath: string,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<Omit<ChartResponse, 'imageData' | 'imageUrl'>> {
    await this.rateLimiter.waitIfNeeded();

    const endpoint = '/v2/tradingview/advanced-chart';

    try {
      const response = await this.retryWithBackoff(async () => {
        return await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify(config),
          timeout: DEFAULT_TIMEOUTS.CHART_GENERATION,
        });
      });

      const statusCode = response.status;
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');

      if (!response.ok) {
        const errorData = await response.json();
        throw new ChartImgError(statusCode, errorData);
      }

      // Extract metadata first
      const contentType = response.headers.get('content-type') || 'image/png';
      const format = contentType.split('/')[1].toUpperCase();
      const resolution = `${config.width || 1200}x${config.height || 675}`;

      // Stream response body directly to file (never loads into memory)
      if (!response.body) {
        throw new Error('Response body is null');
      }

      await pipeline(
        response.body as any,
        createWriteStream(filePath)
      );

      // Return minimal response with file path as message
      return {
        success: true,
        imageUrl: `Chart saved to: ${filePath}`,
        metadata: {
          format,
          resolution,
          generatedAt: new Date().toISOString(),
        },
        apiResponse: {
          statusCode,
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
          rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
        },
      } as ChartResponse;
    } catch (error) {
      if (error instanceof ChartImgError) {
        return {
          success: false,
          error: error.details?.error || error.message,
          metadata: {
            format: '',
            resolution: '',
            generatedAt: new Date().toISOString(),
          },
          apiResponse: {
            statusCode: error.statusCode,
          },
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          format: '',
          resolution: '',
          generatedAt: new Date().toISOString(),
        },
        apiResponse: {
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get list of available exchanges
   */
  async getExchanges(forceRefresh = false): Promise<ExchangeResponse> {
    const cacheKey = 'exchanges';

    if (!forceRefresh) {
      const cached = this.exchangeCache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          exchanges: cached,
          count: cached.length,
        };
      }
    }

    await this.rateLimiter.waitIfNeeded();

    try {
      const response = await this.retryWithBackoff(async () => {
        return await fetchWithTimeout(`${this.baseUrl}/v3/tradingview/exchanges`, {
          headers: { 'x-api-key': this.apiKey },
          timeout: DEFAULT_TIMEOUTS.EXCHANGES,
        });
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ChartImgError(response.status, errorData);
      }

      const data: any = await response.json();

      // Cache for 1 hour
      this.exchangeCache.set(cacheKey, data.exchanges, 3600000);

      return {
        success: true,
        exchanges: data.exchanges || [],
        count: data.exchanges?.length || 0,
      };
    } catch (error) {
      if (error instanceof ChartImgError) {
        return {
          success: false,
          exchanges: [],
          count: 0,
          error: error.details?.error || error.message,
        };
      }

      return {
        success: false,
        exchanges: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get symbols for a specific exchange
   */
  async getSymbols(
    exchange: string,
    search?: string,
    limit = 50,
    forceRefresh = false
  ): Promise<SymbolResponse> {
    const cacheKey = `symbols-${exchange}`;

    if (!forceRefresh) {
      const cached = this.symbolCache.get(cacheKey);
      if (cached) {
        let filtered = cached;

        if (search) {
          const searchLower = search.toLowerCase();
          filtered = cached.filter(
            s =>
              s.symbol.toLowerCase().includes(searchLower) ||
              s.description.toLowerCase().includes(searchLower)
          );
        }

        return {
          success: true,
          exchange,
          symbols: filtered.slice(0, limit),
          count: filtered.length,
        };
      }
    }

    await this.rateLimiter.waitIfNeeded();

    try {
      const response = await this.retryWithBackoff(async () => {
        return await fetchWithTimeout(
          `${this.baseUrl}/v3/tradingview/exchange/${exchange}/symbols`,
          {
            headers: { 'x-api-key': this.apiKey },
            timeout: DEFAULT_TIMEOUTS.SYMBOLS,
          }
        );
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ChartImgError(response.status, errorData);
      }

      const data: any = await response.json();
      const symbols = data.symbols || [];

      // Cache for 1 hour
      this.symbolCache.set(cacheKey, symbols, 3600000);

      let filtered = symbols;
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = symbols.filter(
          (s: Symbol) =>
            s.symbol.toLowerCase().includes(searchLower) ||
            s.description.toLowerCase().includes(searchLower)
        );
      }

      return {
        success: true,
        exchange,
        symbols: filtered.slice(0, limit),
        count: filtered.length,
      };
    } catch (error) {
      if (error instanceof ChartImgError) {
        return {
          success: false,
          exchange,
          symbols: [],
          count: 0,
          error: error.details?.error || error.message,
        };
      }

      return {
        success: false,
        exchange,
        symbols: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get rate limiter status
   */
  getRateLimiterStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.exchangeCache.clear();
    this.symbolCache.clear();
  }

  /**
   * Retry logic with exponential backoff
   *
   * Retries on:
   * - Timeout errors (FetchTimeoutError)
   * - 429 rate limit errors
   * - 5xx server errors
   * - Network errors
   *
   * Does NOT retry on:
   * - 4xx client errors (except 429)
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Timeout errors should be retried
        if (error instanceof FetchTimeoutError) {
          console.warn(`[ChartImgClient] Request timed out (attempt ${i + 1}/${maxRetries}): ${error.message}`);
          if (i < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        // Don't retry on 4xx errors (except 429)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// Factory function
export function createChartImgClient(
  apiKey?: string,
  options?: { requestsPerSecond?: number; dailyLimit?: number }
): ChartImgClient {
  const key = apiKey || process.env.CHART_IMG_API_KEY;

  if (!key) {
    throw new Error(
      'CHART_IMG_API_KEY environment variable is not set. Please provide an API key.'
    );
  }

  return new ChartImgClient(key, options);
}
