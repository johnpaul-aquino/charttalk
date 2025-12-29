/**
 * Rate Limits Configuration
 *
 * Defines daily chart generation limits per user plan.
 * Limits reset at midnight UTC.
 */

import type { PlanType } from '../../modules/user';

/**
 * Rate limit configuration per plan
 */
export interface PlanRateLimit {
  dailyCharts: number;
}

/**
 * Plan-based rate limits for chart generation
 */
export const PLAN_RATE_LIMITS: Record<NonNullable<PlanType>, PlanRateLimit> = {
  free: { dailyCharts: 10 },
  pro: { dailyCharts: 500 },
  max: { dailyCharts: 2000 },
} as const;

/**
 * Default rate limit for users without a plan (same as free)
 */
export const DEFAULT_RATE_LIMIT: PlanRateLimit = PLAN_RATE_LIMITS.free;

/**
 * Hour of day (UTC) when daily limits reset
 * 0 = midnight UTC
 */
export const RATE_LIMIT_RESET_HOUR_UTC = 0;

/**
 * Get rate limit for a user plan
 */
export function getRateLimitForPlan(plan: PlanType): PlanRateLimit {
  if (!plan || !(plan in PLAN_RATE_LIMITS)) {
    return DEFAULT_RATE_LIMIT;
  }
  return PLAN_RATE_LIMITS[plan];
}

/**
 * Get the next reset time (midnight UTC)
 */
export function getNextResetTime(): Date {
  const now = new Date();
  const resetTime = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1, // Tomorrow
    RATE_LIMIT_RESET_HOUR_UTC,
    0,
    0,
    0
  ));
  return resetTime;
}

/**
 * Check if a reset time has passed (needs reset)
 */
export function needsReset(lastReset: Date): boolean {
  const now = new Date();
  const todayMidnightUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    RATE_LIMIT_RESET_HOUR_UTC,
    0,
    0,
    0
  ));
  return lastReset < todayMidnightUTC;
}
