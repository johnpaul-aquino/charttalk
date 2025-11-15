/**
 * Rate Limiter Middleware
 *
 * Implements token bucket algorithm for rate limiting.
 * Uses in-memory storage (replace with Redis for production).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Errors } from '../utils/error.util';
import { transformError } from '../utils/error.util';
import { jsonResponse } from '../utils/response.util';

/**
 * Token Bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to consume a token
   * Returns true if successful, false if rate limit exceeded
   */
  consume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens
   */
  getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get time until next token (in seconds)
   */
  getResetTime(): number {
    if (this.tokens >= 1) return 0;
    return Math.ceil((1 - this.tokens) / this.refillRate);
  }
}

/**
 * In-memory rate limiter store
 */
class RateLimiterStore {
  private buckets: Map<string, TokenBucket> = new Map();

  getBucket(key: string, capacity: number, refillRate: number): TokenBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, new TokenBucket(capacity, refillRate));
    }
    return this.buckets.get(key)!;
  }

  cleanup(): void {
    // Clean up old buckets (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, bucket] of this.buckets.entries()) {
      if ((bucket as any).lastRefill < oneHourAgo) {
        this.buckets.delete(key);
      }
    }
  }
}

const store = new RateLimiterStore();

// Cleanup every 10 minutes
setInterval(() => store.cleanup(), 10 * 60 * 1000);

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  capacity: number; // Max tokens (burst)
  refillRate: number; // Tokens per second
  keyGenerator?: (req: NextRequest) => string;
}

/**
 * Default rate limiter config (10 requests per second, burst of 20)
 */
const DEFAULT_CONFIG: RateLimiterConfig = {
  capacity: 20,
  refillRate: 10, // 10 tokens/second
};

/**
 * Get client identifier from request
 */
function getClientKey(req: NextRequest): string {
  // Try API key first
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization');
  if (apiKey) {
    return `api-key:${apiKey}`;
  }

  // Fall back to IP address
  const ip =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limiter middleware
 */
export function withRateLimit(
  config: Partial<RateLimiterConfig> = {}
): (
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) => (req: NextRequest, context?: any) => Promise<NextResponse> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (handler) => async (req, context) => {
    const key = finalConfig.keyGenerator
      ? finalConfig.keyGenerator(req)
      : getClientKey(req);

    const bucket = store.getBucket(
      key,
      finalConfig.capacity,
      finalConfig.refillRate
    );

    const allowed = bucket.consume();

    if (!allowed) {
      const resetTime = bucket.getResetTime();
      const error = Errors.rateLimitExceeded(
        `Rate limit exceeded. Try again in ${resetTime} seconds.`
      );

      const { response, statusCode } = transformError(error);
      const nextResponse = jsonResponse(response, statusCode);

      // Add rate limit headers
      nextResponse.headers.set('X-RateLimit-Remaining', '0');
      nextResponse.headers.set(
        'X-RateLimit-Reset',
        new Date(Date.now() + resetTime * 1000).toISOString()
      );

      return nextResponse;
    }

    // Execute handler
    const response = await handler(req, context);

    // Add rate limit headers
    response.headers.set(
      'X-RateLimit-Remaining',
      bucket.getRemaining().toString()
    );
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(Date.now() + 1000).toISOString()
    );

    return response;
  };
}
