/**
 * User Rate Limit Service
 *
 * Tracks and enforces per-user rate limits for chart generation.
 * Uses database persistence for limits that survive container restarts.
 * Resets daily at midnight UTC.
 */

import type { PrismaClient } from '@prisma/client';
import type { PlanType } from './jwt.service';
import {
  getRateLimitForPlan,
  getNextResetTime,
  needsReset,
  type PlanRateLimit,
} from '../../../shared/config/rate-limits.config';

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  error?: string;
}

/**
 * Rate limit info for API responses
 */
export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetsAt: string; // ISO date string
}

/**
 * User Rate Limit Service
 *
 * Provides per-user rate limiting based on subscription plan.
 */
export class UserRateLimitService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Check if user can generate a chart and increment counter if allowed
   *
   * @param userId - User ID from JWT
   * @param plan - User's subscription plan
   * @returns Rate limit result with allowed status and quota info
   */
  async checkAndIncrement(userId: string, plan: PlanType): Promise<RateLimitResult> {
    const planLimit = getRateLimitForPlan(plan);
    const resetsAt = getNextResetTime();

    // Get or create user rate limit record
    let rateLimit = await this.prisma.userRateLimit.findUnique({
      where: { userId },
    });

    // If no record exists, create one
    if (!rateLimit) {
      rateLimit = await this.prisma.userRateLimit.create({
        data: {
          userId,
          dailyCount: 0,
          lastReset: new Date(),
        },
      });
    }

    // Check if we need to reset (new day)
    if (needsReset(rateLimit.lastReset)) {
      rateLimit = await this.prisma.userRateLimit.update({
        where: { userId },
        data: {
          dailyCount: 0,
          lastReset: new Date(),
        },
      });
    }

    // Check if user has exceeded their limit
    if (rateLimit.dailyCount >= planLimit.dailyCharts) {
      return {
        allowed: false,
        currentCount: rateLimit.dailyCount,
        limit: planLimit.dailyCharts,
        remaining: 0,
        resetsAt,
        error: `Daily chart limit reached (${rateLimit.dailyCount}/${planLimit.dailyCharts}). ${this.getUpgradeMessage(plan, planLimit)}`,
      };
    }

    // Increment the counter
    const updated = await this.prisma.userRateLimit.update({
      where: { userId },
      data: {
        dailyCount: { increment: 1 },
      },
    });

    return {
      allowed: true,
      currentCount: updated.dailyCount,
      limit: planLimit.dailyCharts,
      remaining: planLimit.dailyCharts - updated.dailyCount,
      resetsAt,
    };
  }

  /**
   * Get remaining quota for a user without incrementing
   *
   * @param userId - User ID from JWT
   * @param plan - User's subscription plan
   * @returns Current quota info
   */
  async getQuota(userId: string, plan: PlanType): Promise<RateLimitInfo> {
    const planLimit = getRateLimitForPlan(plan);
    const resetsAt = getNextResetTime();

    const rateLimit = await this.prisma.userRateLimit.findUnique({
      where: { userId },
    });

    let currentCount = 0;
    if (rateLimit) {
      // Check if we need to reset
      currentCount = needsReset(rateLimit.lastReset) ? 0 : rateLimit.dailyCount;
    }

    return {
      remaining: Math.max(0, planLimit.dailyCharts - currentCount),
      limit: planLimit.dailyCharts,
      resetsAt: resetsAt.toISOString(),
    };
  }

  /**
   * Decrement counter (for rollback on failed chart generation)
   *
   * @param userId - User ID
   */
  async decrementCount(userId: string): Promise<void> {
    try {
      await this.prisma.userRateLimit.update({
        where: { userId },
        data: {
          dailyCount: { decrement: 1 },
        },
      });
    } catch {
      // Ignore errors - this is a best-effort rollback
    }
  }

  /**
   * Reset all daily limits (for cron job or manual reset)
   */
  async resetAllDailyLimits(): Promise<number> {
    const result = await this.prisma.userRateLimit.updateMany({
      data: {
        dailyCount: 0,
        lastReset: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Get upgrade message based on current plan
   */
  private getUpgradeMessage(plan: PlanType, currentLimit: PlanRateLimit): string {
    if (plan === 'free') {
      return 'Upgrade to Pro for 500 charts/day.';
    }
    if (plan === 'pro') {
      return 'Upgrade to Max for 1000 charts/day.';
    }
    return `Limit resets at midnight UTC.`;
  }

  /**
   * Convert RateLimitResult to RateLimitInfo for API responses
   */
  static toRateLimitInfo(result: RateLimitResult): RateLimitInfo {
    return {
      remaining: result.remaining,
      limit: result.limit,
      resetsAt: result.resetsAt.toISOString(),
    };
  }
}
