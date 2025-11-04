/**
 * Configuration Management
 *
 * Centralizes environment variables and application settings.
 */

import { config as dotenvConfig } from 'dotenv';

// Load .env file (optional - env vars can also come from MCP client like Claude Desktop)
try {
  dotenvConfig();
} catch (error) {
  // Silently ignore if .env doesn't exist
  // Environment variables may be provided by MCP client
}

export interface AppConfig {
  chartImg: {
    apiKey: string;
    requestsPerSecond: number;
    dailyLimit: number;
  };
  cache: {
    documentationTtl: number; // milliseconds
    exchangesTtl: number;
    symbolsTtl: number;
  };
  mcp: {
    serverName: string;
    serverVersion: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AppConfig {
  const apiKey = process.env.CHART_IMG_API_KEY;

  if (!apiKey) {
    throw new Error(
      'CHART_IMG_API_KEY environment variable is required. Please set it in your .env file.'
    );
  }

  // Determine plan-based limits from optional env var
  const plan = (process.env.CHART_IMG_PLAN || 'PRO').toUpperCase();
  const planLimits = getPlanLimits(plan);

  return {
    chartImg: {
      apiKey,
      requestsPerSecond: parseInt(process.env.CHART_IMG_RPS || String(planLimits.rps)),
      dailyLimit: parseInt(process.env.CHART_IMG_DAILY_LIMIT || String(planLimits.daily)),
    },
    cache: {
      documentationTtl: 24 * 60 * 60 * 1000, // 24 hours
      exchangesTtl: 60 * 60 * 1000,           // 1 hour
      symbolsTtl: 60 * 60 * 1000,             // 1 hour
    },
    mcp: {
      serverName: 'chart-img-mcp-server',
      serverVersion: '0.1.1',
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
    },
  };
}

/**
 * Get rate limits based on plan
 */
function getPlanLimits(plan: string): { rps: number; daily: number } {
  const limits: Record<string, { rps: number; daily: number }> = {
    BASIC: { rps: 1, daily: 50 },
    PRO: { rps: 10, daily: 500 },
    MEGA: { rps: 15, daily: 1000 },
    ULTRA: { rps: 35, daily: 3000 },
    ENTERPRISE: { rps: 35, daily: 5000 },
  };

  return limits[plan] || limits.PRO;
}

/**
 * Validate configuration
 */
export function validateConfig(config: AppConfig): void {
  if (!config.chartImg.apiKey) {
    throw new Error('Chart-img API key is required');
  }

  if (config.chartImg.requestsPerSecond <= 0) {
    throw new Error('Requests per second must be positive');
  }

  if (config.chartImg.dailyLimit <= 0) {
    throw new Error('Daily limit must be positive');
  }
}

// Singleton instance
let configInstance: AppConfig | null = null;

/**
 * Get configuration instance
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
    validateConfig(configInstance);
  }
  return configInstance;
}
