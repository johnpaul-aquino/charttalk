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
    timeout: {
      chartGeneration: number;
      exchanges: number;
      symbols: number;
      documentation: number;
      download: number;
    };
  };
  openai?: {
    apiKey?: string;
    defaultModel?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    maxRetries?: number;
  };
  anthropic?: {
    apiKey?: string;
    defaultModel?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    maxRetries?: number;
  };
  aws: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region: string;
    s3: {
      bucket: string;
      bucketRegion: string;
      storageClass: string;
      defaultTtlDays: number;
      cloudFrontDomain?: string;
    };
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
      timeout: {
        chartGeneration: parseInt(process.env.CHART_IMG_TIMEOUT || '15000'),
        exchanges: parseInt(process.env.CHART_IMG_EXCHANGES_TIMEOUT || '8000'),
        symbols: parseInt(process.env.CHART_IMG_SYMBOLS_TIMEOUT || '8000'),
        documentation: parseInt(process.env.CHART_IMG_DOC_TIMEOUT || '10000'),
        download: parseInt(process.env.CHART_IMG_DOWNLOAD_TIMEOUT || '20000'),
      },
    },
    openai: process.env.OPENAI_API_KEY
      ? {
          apiKey: process.env.OPENAI_API_KEY,
          defaultModel: process.env.ANALYSIS_DEFAULT_MODEL || 'gpt-4o-mini',
          maxTokens: parseInt(process.env.ANALYSIS_MAX_TOKENS || '2000'),
          temperature: parseFloat(process.env.ANALYSIS_TEMPERATURE || '0.7'),
          timeout: parseInt(process.env.ANALYSIS_TIMEOUT || '60000'),
          maxRetries: parseInt(process.env.ANALYSIS_MAX_RETRIES || '3'),
        }
      : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY
      ? {
          apiKey: process.env.ANTHROPIC_API_KEY,
          defaultModel: process.env.CLAUDE_MODEL || 'claude-opus-4-5-20251101',
          maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
          temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
          timeout: parseInt(process.env.CLAUDE_TIMEOUT || '60000'),
          maxRetries: parseInt(process.env.CLAUDE_MAX_RETRIES || '3'),
        }
      : undefined,
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      s3: {
        bucket: process.env.AWS_S3_BUCKET || '',
        bucketRegion: process.env.AWS_S3_BUCKET_REGION || process.env.AWS_REGION || 'us-east-1',
        storageClass: process.env.AWS_S3_STORAGE_CLASS || 'STANDARD',
        defaultTtlDays: parseInt(process.env.AWS_S3_DEFAULT_TTL_DAYS || '0'),
        cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN,
      },
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
    MAX: { rps: 25, daily: 2000 },
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

/**
 * Alias for getConfig() - for consistency across the codebase
 */
export const getAppConfig = getConfig;
