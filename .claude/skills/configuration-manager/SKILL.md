---
name: configuration-manager
description: Use when dealing with environment variables, API keys, plan limits, or configuration management. Teaches environment configuration pattern, plan-based rate limits, and dotenv loading strategy.
keywords: ["config", "configuration", "environment", "env", "API key", "plan", "limits", "rate limit", "settings"]
---

# Configuration & Environment Manager

You are an expert on **environment configuration management** for the mcp-chart-image project. This skill teaches configuration patterns, plan-based rate limits, API key management, and environment variable strategies.

## Configuration Architecture

### Configuration Layers

```
.env                         # Local development (git-ignored)
.env.example                 # Template with placeholders
src/shared/config/           # Configuration code
  └── environment.config.ts  # Main configuration module
```

### Configuration Flow

```
Environment Variables (process.env)
        ↓
Load with dotenv (optional)
        ↓
Parse & validate (environment.config.ts)
        ↓
Export typed configuration object
        ↓
Used by services, tools, and API
```

## Environment Variables

### Required Variables

```bash
# .env

# Chart-img.com API key (REQUIRED)
CHART_IMG_API_KEY=your_api_key_here
```

### Optional Variables (with defaults)

```bash
# Plan level (default: PRO)
CHART_IMG_PLAN=PRO

# Rate limiting overrides
CHART_IMG_RPS=10
CHART_IMG_DAILY_LIMIT=500

# Cache TTLs (seconds)
CACHE_DOCUMENTATION_TTL=86400
CACHE_EXCHANGES_TTL=3600
CACHE_SYMBOLS_TTL=3600

# Logging
LOG_LEVEL=info

# MCP Server metadata
MCP_SERVER_NAME=chart-img-mcp-server
MCP_SERVER_VERSION=0.1.1
```

## Configuration Module

### Main Configuration

**Location**: `src/shared/config/environment.config.ts`

```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file (optional - MCP clients provide env vars)
dotenv.config();

/**
 * Plan-based rate limits
 */
export enum PlanLevel {
  BASIC = 'BASIC',
  PRO = 'PRO',
  MEGA = 'MEGA',
  ULTRA = 'ULTRA',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Plan configuration
 */
export interface PlanConfig {
  requestsPerSecond: number;
  dailyLimit: number;
  maxResolution: string;
  maxIndicators: number;
  maxDrawings: number;
}

/**
 * Plan limits mapping
 */
export const PLAN_LIMITS: Record<PlanLevel, PlanConfig> = {
  [PlanLevel.BASIC]: {
    requestsPerSecond: 1,
    dailyLimit: 50,
    maxResolution: '800x600',
    maxIndicators: 3,
    maxDrawings: 2,
  },
  [PlanLevel.PRO]: {
    requestsPerSecond: 10,
    dailyLimit: 500,
    maxResolution: '1920x1080',
    maxIndicators: 5,
    maxDrawings: 5,
  },
  [PlanLevel.MEGA]: {
    requestsPerSecond: 15,
    dailyLimit: 1000,
    maxResolution: '1920x1600',
    maxIndicators: 10,
    maxDrawings: 10,
  },
  [PlanLevel.ULTRA]: {
    requestsPerSecond: 35,
    dailyLimit: 3000,
    maxResolution: '2048x1920',
    maxIndicators: 25,
    maxDrawings: 20,
  },
  [PlanLevel.ENTERPRISE]: {
    requestsPerSecond: 35,
    dailyLimit: 5000,
    maxResolution: '2048x1920',
    maxIndicators: 50,
    maxDrawings: 50,
  },
};

/**
 * Application configuration interface
 */
export interface AppConfig {
  chartImg: {
    apiKey: string;
    plan: PlanLevel;
    requestsPerSecond: number;
    dailyLimit: number;
    baseUrl: string;
  };
  cache: {
    documentationTtl: number;
    exchangesTtl: number;
    symbolsTtl: number;
  };
  mcp: {
    serverName: string;
    serverVersion: string;
  };
  logging: {
    level: string;
  };
}

/**
 * Get application configuration
 * Validates required variables and returns typed config object
 */
export function getConfig(): AppConfig {
  // Required: API key
  const apiKey = process.env.CHART_IMG_API_KEY;
  if (!apiKey) {
    throw new Error(
      'CHART_IMG_API_KEY environment variable is required. ' +
      'Get your API key from https://chart-img.com'
    );
  }

  // Plan level (with validation)
  const planEnv = process.env.CHART_IMG_PLAN || 'PRO';
  const plan = PlanLevel[planEnv as keyof typeof PlanLevel];
  if (!plan) {
    throw new Error(
      `Invalid CHART_IMG_PLAN: ${planEnv}. ` +
      `Valid values: ${Object.keys(PlanLevel).join(', ')}`
    );
  }

  // Get plan limits
  const planLimits = PLAN_LIMITS[plan];

  // Rate limiting (can override plan defaults)
  const requestsPerSecond = process.env.CHART_IMG_RPS
    ? parseInt(process.env.CHART_IMG_RPS, 10)
    : planLimits.requestsPerSecond;

  const dailyLimit = process.env.CHART_IMG_DAILY_LIMIT
    ? parseInt(process.env.CHART_IMG_DAILY_LIMIT, 10)
    : planLimits.dailyLimit;

  return {
    chartImg: {
      apiKey,
      plan,
      requestsPerSecond,
      dailyLimit,
      baseUrl: 'https://api.chart-img.com',
    },
    cache: {
      documentationTtl: parseInt(process.env.CACHE_DOCUMENTATION_TTL || '86400', 10),
      exchangesTtl: parseInt(process.env.CACHE_EXCHANGES_TTL || '3600', 10),
      symbolsTtl: parseInt(process.env.CACHE_SYMBOLS_TTL || '3600', 10),
    },
    mcp: {
      serverName: process.env.MCP_SERVER_NAME || 'chart-img-mcp-server',
      serverVersion: process.env.MCP_SERVER_VERSION || '0.1.1',
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };
}

/**
 * Singleton configuration instance
 */
let configInstance: AppConfig | null = null;

/**
 * Get cached configuration
 */
export function getCachedConfig(): AppConfig {
  if (!configInstance) {
    configInstance = getConfig();
  }
  return configInstance;
}

/**
 * Clear cached configuration (useful for testing)
 */
export function clearConfigCache(): void {
  configInstance = null;
}
```

## Plan-Based Rate Limits

### Plan Comparison Table

| Plan       | RPS | Daily Max | Resolution   | Indicators | Drawings |
|------------|-----|-----------|--------------|------------|----------|
| BASIC      | 1   | 50        | 800×600      | 3          | 2        |
| PRO        | 10  | 500       | 1920×1080    | 5          | 5        |
| MEGA       | 15  | 1,000     | 1920×1600    | 10         | 10       |
| ULTRA      | 35  | 3,000     | 2048×1920    | 25         | 20       |
| ENTERPRISE | 35+ | 5,000+    | 2048×1920    | 50         | 50       |

### Using Plan Limits

```typescript
import { getConfig, PLAN_LIMITS, PlanLevel } from '@/shared/config/environment.config';

// Get current plan config
const config = getConfig();
const planLimits = PLAN_LIMITS[config.chartImg.plan];

// Validate chart config against plan
function validateChartConfig(chartConfig: ChartConfig): ValidationResult {
  const indicatorCount = chartConfig.indicators?.length || 0;
  const drawingCount = chartConfig.drawings?.length || 0;

  if (indicatorCount > planLimits.maxIndicators) {
    return {
      valid: false,
      error: `Too many indicators (${indicatorCount}). ${config.chartImg.plan} plan limit: ${planLimits.maxIndicators}`,
    };
  }

  if (drawingCount > planLimits.maxDrawings) {
    return {
      valid: false,
      error: `Too many drawings (${drawingCount}). ${config.chartImg.plan} plan limit: ${planLimits.maxDrawings}`,
    };
  }

  return { valid: true };
}
```

## Configuration in Different Contexts

### 1. MCP Server Usage

**Location**: `src/mcp/server.ts`

```typescript
import { getConfig } from '../shared/config/environment.config';

class ChartImgMCPServer {
  private config: AppConfig;

  constructor() {
    try {
      this.config = getConfig();
    } catch (error) {
      console.error('Configuration error:', error);
      process.exit(1);
    }
  }

  async start() {
    console.error(`[MCP Server] ${this.config.mcp.serverName} v${this.config.mcp.serverVersion} started`);
    console.error(`[MCP Server] Plan: ${this.config.chartImg.plan}`);
    console.error(`[MCP Server] Rate limit: ${this.config.chartImg.requestsPerSecond} req/s`);
  }
}
```

### 2. Service Usage

**Location**: `src/modules/chart/services/chart-generation.service.ts`

```typescript
import { getConfig } from '@/shared/config/environment.config';

export class ChartGenerationService {
  private config: AppConfig;

  constructor() {
    this.config = getConfig();
  }

  async generateChart(config: ChartConfig): Promise<ChartGenerationResult> {
    // Use API key from config
    const response = await fetch('https://api.chart-img.com/v2/charts', {
      headers: {
        'Authorization': `Bearer ${this.config.chartImg.apiKey}`,
      },
      body: JSON.stringify(config),
    });

    return response.json();
  }
}
```

### 3. Testing with Config

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig, clearConfigCache } from '@/shared/config/environment.config';

describe('Config-dependent Service', () => {
  beforeEach(() => {
    // Set test environment variables
    process.env.CHART_IMG_API_KEY = 'test_key';
    process.env.CHART_IMG_PLAN = 'PRO';
    clearConfigCache();
  });

  afterEach(() => {
    clearConfigCache();
  });

  it('should use config correctly', () => {
    const config = getConfig();
    expect(config.chartImg.apiKey).toBe('test_key');
    expect(config.chartImg.plan).toBe('PRO');
  });
});
```

## .env File Management

### Development Setup

**Step 1**: Copy example

```bash
cp .env.example .env
```

**Step 2**: Edit `.env`

```bash
# .env

CHART_IMG_API_KEY=your_actual_api_key_here
CHART_IMG_PLAN=PRO
LOG_LEVEL=debug
```

**Step 3**: Verify config

```typescript
import { getConfig } from './src/shared/config/environment.config';

const config = getConfig();
console.log('Config loaded:', {
  plan: config.chartImg.plan,
  rps: config.chartImg.requestsPerSecond,
  hasApiKey: !!config.chartImg.apiKey,
});
```

### .env.example Template

**Location**: `.env.example`

```bash
# Chart-img.com Configuration
# Get your API key from: https://chart-img.com/dashboard

# REQUIRED: Your chart-img.com API key
CHART_IMG_API_KEY=your_api_key_here

# OPTIONAL: Plan level (default: PRO)
# Options: BASIC, PRO, MEGA, ULTRA, ENTERPRISE
CHART_IMG_PLAN=PRO

# OPTIONAL: Rate limiting overrides
# CHART_IMG_RPS=10
# CHART_IMG_DAILY_LIMIT=500

# OPTIONAL: Cache TTLs (seconds)
# CACHE_DOCUMENTATION_TTL=86400
# CACHE_EXCHANGES_TTL=3600
# CACHE_SYMBOLS_TTL=3600

# OPTIONAL: Logging level
# Options: debug, info, warn, error
LOG_LEVEL=info

# OPTIONAL: MCP Server metadata
# MCP_SERVER_NAME=chart-img-mcp-server
# MCP_SERVER_VERSION=0.1.1
```

## Claude Configuration

### Claude Code (.mcp.json)

**Location**: `.mcp.json` (project root)

```json
{
  "mcpServers": {
    "chart-img": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "description": "Generate professional trading charts with technical indicators",
      "env": {
        "CHART_IMG_API_KEY": "${CHART_IMG_API_KEY}",
        "CHART_IMG_PLAN": "${CHART_IMG_PLAN:-PRO}",
        "LOG_LEVEL": "${LOG_LEVEL:-info}"
      }
    }
  }
}
```

**Environment Variable Expansion**:
- `${VAR}` - Required variable (error if missing)
- `${VAR:-default}` - Optional with default value

### Claude Desktop (claude_desktop_config.json)

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "chart-img": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/src/mcp/server.ts"],
      "env": {
        "CHART_IMG_API_KEY": "your_api_key_here",
        "CHART_IMG_PLAN": "PRO",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Configuration Validation

### Validation Functions

```typescript
/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  // Chart-img API keys are typically alphanumeric
  return /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

/**
 * Validate plan level
 */
export function validatePlanLevel(plan: string): plan is PlanLevel {
  return Object.values(PlanLevel).includes(plan as PlanLevel);
}

/**
 * Validate resolution string
 */
export function validateResolution(resolution: string): boolean {
  return /^\d+x\d+$/.test(resolution);
}

/**
 * Check if resolution exceeds plan limit
 */
export function checkResolutionLimit(
  resolution: string,
  plan: PlanLevel
): boolean {
  const [width, height] = resolution.split('x').map(Number);
  const [maxWidth, maxHeight] = PLAN_LIMITS[plan].maxResolution.split('x').map(Number);

  return width <= maxWidth && height <= maxHeight;
}
```

## Common Configuration Patterns

### Pattern 1: Service Constructor Injection

```typescript
export class MyService {
  private config: AppConfig;

  constructor() {
    this.config = getConfig();
  }

  async doSomething() {
    // Use config
    const apiKey = this.config.chartImg.apiKey;
  }
}
```

### Pattern 2: Factory Function with Config

```typescript
export function createHttpClient(): HttpClient {
  const config = getConfig();

  return new HttpClient({
    baseURL: config.chartImg.baseUrl,
    headers: {
      'Authorization': `Bearer ${config.chartImg.apiKey}`,
    },
    timeout: 30000,
  });
}
```

### Pattern 3: Middleware with Config

```typescript
export function withRateLimitMiddleware(handler: Handler): Handler {
  const config = getConfig();

  return async (req: NextRequest) => {
    const allowed = rateLimiter.tryConsume(
      req.ip,
      config.chartImg.requestsPerSecond
    );

    if (!allowed) {
      throw new Error('Rate limit exceeded');
    }

    return handler(req);
  };
}
```

## Troubleshooting

### Error: "CHART_IMG_API_KEY is required"

**Solution**:
1. Create `.env` file in project root
2. Add `CHART_IMG_API_KEY=your_key`
3. Restart MCP server

### Error: "Invalid CHART_IMG_PLAN"

**Solution**:
```bash
# Valid plan levels
CHART_IMG_PLAN=BASIC
CHART_IMG_PLAN=PRO
CHART_IMG_PLAN=MEGA
CHART_IMG_PLAN=ULTRA
CHART_IMG_PLAN=ENTERPRISE
```

### Config Not Loading

**Checklist**:
- ✅ `.env` file in project root (same directory as package.json)
- ✅ No syntax errors in `.env` (KEY=value, no spaces around `=`)
- ✅ `dotenv` package installed (`npm install dotenv`)
- ✅ Server restarted after `.env` changes

## Best Practices

### ✅ Do

1. **Use environment variables** - Never hardcode API keys
2. **Validate required variables** - Fail fast on startup
3. **Provide defaults** - Sensible defaults for optional variables
4. **Document in .env.example** - Template for new developers
5. **Use typed config object** - TypeScript interfaces for config
6. **Cache config** - Load once, reuse throughout application
7. **Validate plan limits** - Enforce plan restrictions
8. **Clear cache in tests** - Ensure test isolation
9. **Use dotenv for development** - Local .env files
10. **Separate config layers** - Environment → Parse → Validate → Use

### ❌ Don't

1. **Don't commit .env** - Add to .gitignore
2. **Don't hardcode secrets** - Always use environment variables
3. **Don't skip validation** - Validate on startup, not runtime
4. **Don't expose secrets in logs** - Redact API keys
5. **Don't use global variables** - Use `getConfig()` function
6. **Don't modify config at runtime** - Treat as immutable
7. **Don't skip .env.example** - Help new developers
8. **Don't forget MCP client config** - Claude needs env vars too

## Related Skills

- **service-repository-builder**: Learn how services use config
- **mcp-tool-developer**: Learn how tools access config
- **api-endpoint-creator**: Learn how API uses config

## Questions This Skill Answers

- "How do I add a new environment variable?"
- "What are the plan limits?"
- "How is configuration loaded?"
- "Show me how to add a new plan tier"
- "Where are API keys stored?"
- "How do I override rate limits?"
- "What's the configuration pattern?"
- "How do I test with different config?"
- "Where is the .env file?"
- "How do I validate config?"
