# Claude Integration Guide

This guide shows you how to integrate the MCP Chart-Image Server with **Claude Desktop**, **Claude Code**, and as a **REST API** for web/mobile applications.

## Choose Your Integration Mode

- **[Claude Code](#claude-code-setup)** (CLI/VSCode) - Fastest setup with project-scoped config
- **[Claude Desktop](#claude-desktop-setup)** - Traditional desktop app
- **[REST API](#rest-api)** - Production-ready API for web/mobile apps (NEW! ✨)

## Prerequisites

- **chart-img.com API Key** (get from [chart-img.com](https://chart-img.com))
- **Node.js 18+** installed
- Project dependencies installed (`npm install`)

---

## Project Architecture

This project uses a **modular monolith** architecture, designed for easy maintenance and future microservice extraction.

### Directory Structure

```
src/
├── modules/              # Domain modules (modular monolith)
│   ├── chart/           # Chart generation module
│   │   ├── services/    # Business logic
│   │   ├── repositories/# Data access
│   │   ├── domain/      # Domain models (indicators, drawings)
│   │   └── interfaces/  # Service contracts
│   ├── analysis/        # AI analysis module
│   ├── storage/         # File storage module
│   └── user/            # User management (future)
│
├── core/                # Core infrastructure
│   ├── database/        # JSON databases & loaders
│   ├── http/            # HTTP clients
│   └── di/              # Dependency injection
│
├── shared/              # Shared utilities
│   ├── config/          # Environment configuration
│   ├── types/           # Common types
│   └── utils/           # Helper functions
│
├── mcp/                 # MCP server & tools
│   ├── server.ts        # MCP entry point
│   └── tools/           # 8 MCP tools
│
├── api/                 # REST API (SaaS ready!)
│   ├── controllers/     # HTTP request handlers
│   ├── middleware/      # Auth, rate limiting, CORS, error handling
│   ├── dto/             # Request/response types & validation
│   └── utils/           # Response formatting, error utilities
│
└── app/                 # Next.js App Router
    └── api/v1/          # API route handlers (8 endpoints)
```

### Module Boundaries

Each module is designed with clear boundaries:

- **Chart Module**: Chart generation, configuration, validation, indicators, drawings
- **Analysis Module**: AI-powered chart analysis and signal generation (planned)
- **Storage Module**: File operations, downloads, permanent storage (planned)
- **User Module**: Authentication, quotas, billing (planned for SaaS)

### Migration Status

🟢 **Completed:**
- Module structure created (Chart, Analysis, Storage, User)
- Chart module repositories (Indicators, Drawings)
- Chart module services (ChartConfig, ChartValidation, ChartGeneration)
- Storage module services (ChartStorage, Download)
- Core infrastructure (database loaders, HTTP client, config)
- Dependency injection container (all services registered)
- All 8 MCP tools refactored to use DI and services
- Comprehensive unit tests (36 tests, 100% passing)
- Test infrastructure (Vitest + coverage)
- **REST API layer** (8 endpoints, middleware stack, controllers)
- **API documentation** (comprehensive usage guide)

⚪ **Planned:**
- Analysis module services (AI-powered chart analysis)
- User module services (authentication, quotas)
- Additional test coverage (API integration tests)
- OpenAPI/Swagger specification
- GitHub Actions CI/CD pipeline
- Production deployment (Vercel/Railway/AWS)

For detailed architecture documentation, see [`.docs/saas-architecture.md`](.docs/saas-architecture.md) and [`.docs/modular-architecture.md`](.docs/modular-architecture.md) (coming soon).

---

## Claude Code Setup

### Quick Setup (Recommended)

The MCP server is already configured in this project! Just add it to Claude Code:

```bash
# From the project directory (macOS/Linux)
claude mcp add --transport stdio chart-img -- npx tsx src/mcp/server.ts

# Windows users (PowerShell or CMD)
claude mcp add --transport stdio chart-img -- cmd /c npx tsx src/mcp/server.ts
```

**Note about the `--` separator**: The double dash (`--`) separates Claude Code options from the server command. Everything after `--` is passed directly to your server process.

That's it! The server will start automatically when Claude Code needs it.

### Verify Connection

```bash
claude mcp list
```

You should see:
```
chart-img: npx tsx /path/to/src/mcp/server.ts - ✓ Connected
```

### MCP Management Commands

Useful commands for managing your MCP servers:

```bash
# List all configured servers
claude mcp list

# Get details about a specific server
claude mcp get chart-img

# Remove a server
claude mcp remove chart-img

# Reset project-scoped server approvals
claude mcp reset-project-choices
```

**Configuration Scopes:**
- **Local scope** (default): Project-specific, user-private
- **Project scope** (`.mcp.json`): Team-shared, requires approval
- **User scope** (`--scope user`): Available across all projects

**Precedence**: Local > Project > User

### Test It

In Claude Code, you can now use prompts like:
> "Show me a Bitcoin chart with RSI for the last 7 days"

Claude will automatically use the MCP tools to generate the chart!

### Project-Scoped Configuration

This project includes a `.mcp.json` file that makes the server available to anyone working on the project:

```json
{
  "mcpServers": {
    "chart-img": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "description": "Generate professional trading charts with technical indicators",
      "env": {
        "CHART_IMG_API_KEY": "${CHART_IMG_API_KEY}",
        "CHART_IMG_PLAN": "${CHART_IMG_PLAN:-PRO}"
      }
    }
  }
}
```

**Environment Variable Expansion:**
- `${VAR}` - Expands to environment variable value
- `${VAR:-default}` - Uses default value if VAR is not set
- Supported in: `command`, `args`, `env`, `url`, and `headers`

**Note**: Project-scoped servers (`.mcp.json`) require user approval before first use. Use `claude mcp reset-project-choices` to reset approvals if needed.

---

## Claude Desktop Setup

### 1. Get Your API Key

1. Visit [chart-img.com](https://chart-img.com)
2. Sign up and choose a plan (BASIC, PRO, MEGA, ULTRA, ENTERPRISE)
3. Generate an API key from your dashboard
4. Copy the API key

### 2. Configure Claude Desktop

#### Step 1: Locate Claude Config File

**macOS**:
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux**:
```bash
~/.config/Claude/claude_desktop_config.json
```

#### Step 2: Edit Configuration

Open the file and add this configuration (replace `YOUR_API_KEY_HERE` with your actual API key):

```json
{
  "mcpServers": {
    "chart-img": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/paul/Desktop/projects/mcp-chart-image/src/mcp/server.ts"
      ],
      "env": {
        "CHART_IMG_API_KEY": "YOUR_API_KEY_HERE",
        "CHART_IMG_PLAN": "PRO",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important**: Replace `YOUR_API_KEY_HERE` with your actual chart-img.com API key from step 1.

**If you already have other MCP servers**, merge it like this:

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": ["..."]
    },
    "chart-img": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/paul/Desktop/projects/mcp-chart-image/src/mcp/server.ts"
      ],
      "env": {
        "CHART_IMG_API_KEY": "YOUR_API_KEY_HERE",
        "CHART_IMG_PLAN": "PRO",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Step 3: Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q on Mac)
2. Reopen Claude Desktop
3. Look for the MCP connection indicator

**Note on .env file**: The `.env` file in the project is optional for Claude Desktop users (environment variables are passed from the config). It's still useful if you want to run the Next.js dev server (`npm run dev`) for testing the REST API endpoints.

### Alternative: Desktop Extensions (Easier Setup)

Claude Desktop now supports **Extensions** (`.mcpb` format) for easier installation:

1. Open Claude Desktop → **Settings** → **Extensions**
2. Browse Anthropic-reviewed extensions
3. Sensitive fields (API keys) are automatically encrypted in Keychain/Credential Manager
4. No manual JSON editing required

**Manual JSON configuration** (as shown above) gives you more control and is recommended for development.

### Important Notes

**Transport Types:**
- **stdio** (recommended for local servers): Runs the server as a subprocess
- **http** (for remote servers): Connects to a running HTTP server
- **sse** (deprecated): ⚠️ SSE transport is deprecated. Use HTTP servers instead.

**Security:**
- Use third-party MCP servers at your own risk
- Be cautious with servers that fetch untrusted content (prompt injection risk)
- Review server code before adding to production environments
- API keys in environment variables are more secure than hardcoding

---

## Available MCP Tools

Once connected, Claude has access to these 8 tools:

### 1. `health_check`
**Purpose**: Test server connection and get status information

**Example**:
> "Check if the chart server is healthy"

**Returns**: Server status, tool availability, API connection status, cache info

### 2. `fetch_chart_documentation`
**Purpose**: Fetch latest chart-img.com documentation

**Example**:
> "What technical indicators are available?"

### 3. `get_exchanges`
**Purpose**: List available trading exchanges

**Example**:
> "What cryptocurrency exchanges can I use?"

### 4. `get_symbols`
**Purpose**: Get tradable symbols for an exchange

**Example**:
> "Show me Bitcoin trading pairs on Binance"

### 5. `construct_chart_config`
**Purpose**: Convert natural language to chart configuration

**Example**:
> "I want a Bitcoin chart with RSI and MACD"

### 6. `validate_chart_config`
**Purpose**: Validate chart configuration before generation

**Example**:
> "Check if my chart config is valid for BASIC plan"

### 7. `generate_chart_image`
**Purpose**: Generate the actual chart image

**Example**:
> "Generate the chart and show it to me"

---

## Example Prompts

### Basic Chart Generation

**Simple Chart**:
> "Show me a Bitcoin chart for the last 24 hours"

**With Indicators**:
> "Generate an Ethereum chart with Bollinger Bands and RSI for the past week"

**Custom Timeframe**:
> "Create a Bitcoin chart with moving averages (20-day and 50-day) for the last 3 months"

### Advanced Prompts

**Multiple Indicators**:
> "I want to analyze Bitcoin with these indicators: Bollinger Bands, RSI, and MACD. Show me the last month on a 4-hour timeframe."

**Stock Market**:
> "Show me Apple stock (AAPL) with moving averages for the last quarter"

**Forex Analysis**:
> "Display EUR/USD forex pair with Ichimoku Cloud for the past year"

**Trading Strategy**:
> "I'm analyzing Bitcoin for a potential entry. Show me a chart with:
> - Bollinger Bands (period: 20, std dev: 2)
> - RSI (period: 14)
> - MACD
> - Last 7 days, hourly candles"

### Chart Drawings (New!)

**Horizontal Support/Resistance Lines**:
> "Bitcoin chart with horizontal support at 45000 and resistance at 50000 for the past month"

**Trend Line Analysis**:
> "Show me Ethereum with trend line analysis and RSI indicator for the last 3 months"

**Trading Setup with Order Markers**:
> "Bitcoin with entry order at 48000, stop loss at 46000, and take profit at 52000"

**Combined Drawings and Indicators**:
> "Show Bitcoin with horizontal support line, trend line, and MACD for the last week"

**Event Marking**:
> "Ethereum chart with vertical event marker and Bollinger Bands for the past 5 days"

### Discovery Prompts

**Exchange Discovery**:
> "What exchanges are available for cryptocurrency trading?"

**Symbol Search**:
> "What Bitcoin trading pairs are available on Binance?"

**Indicator Information**:
> "What volatility indicators are available? Explain what they do."

---

## How It Works

### Typical Workflow

1. **User asks for a chart**
   ```
   You: "Show me Bitcoin with RSI for last week"
   ```

2. **Claude uses `construct_chart_config`**
   - Parses: "Bitcoin" → BINANCE:BTCUSDT
   - Parses: "last week" → range: "7D"
   - Parses: "RSI" → adds RSI indicator
   - Generates complete JSON config

3. **Claude uses `validate_chart_config`** (optional)
   - Checks resolution limits
   - Validates indicator count
   - Ensures API compatibility

4. **Claude uses `generate_chart_image`**
   - Sends config to chart-img.com API
   - Returns image URL
   - Displays chart to you

5. **You see the chart!** 📈

### Behind the Scenes

```
User Request
    ↓
Claude AI (understands intent)
    ↓
MCP Tools (6 specialized tools)
    ↓
chart-img.com API
    ↓
Generated Chart Image
    ↓
Displayed in Claude
```

---

## REST API

The MCP Chart-Image server now includes a **production-ready REST API** for building web applications, mobile apps, and third-party integrations.

### Quick Start

```bash
# Start the Next.js server
npm run dev

# Server runs on http://localhost:3010
# API endpoints at http://localhost:3010/api/v1/
```

### API Endpoints

All endpoints return standardized JSON responses with CORS, rate limiting, and error handling.

#### **1. Health Check**
```bash
GET /api/v1/health
```

Check server status and uptime.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.1",
    "timestamp": "2025-11-13T15:37:02.834Z",
    "uptime": 125,
    "services": {
      "api": "up",
      "chartImgApi": "up"
    }
  },
  "meta": {
    "timestamp": "2025-11-13T15:37:02.835Z"
  }
}
```

#### **2. Construct Chart Config**
```bash
POST /api/v1/charts/construct
Content-Type: application/json

{
  "naturalLanguage": "Show me Bitcoin with RSI for the last 7 days",
  "preferences": {
    "theme": "dark",
    "resolution": "1920x1080"
  }
}
```

Convert natural language to chart configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "1M",
      "theme": "dark",
      "style": "candle",
      "width": 1920,
      "height": 1080
    },
    "reasoning": "Symbol: BINANCE:BTCUSDT | Time range: 1M | Interval: 4h",
    "warnings": []
  }
}
```

#### **3. Validate Chart Config**
```bash
POST /api/v1/charts/validate
Content-Type: application/json

{
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "1M"
  },
  "planLevel": "PRO"
}
```

Validate configuration against plan limits.

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "suggestions": [],
    "rateLimitCheck": {
      "withinLimits": true,
      "checks": {
        "resolution": {
          "pass": true,
          "message": "Resolution within PRO limits"
        },
        "studyCount": {
          "pass": true,
          "message": "Study count (0) within PRO limits"
        }
      }
    }
  }
}
```

#### **4. Generate Chart Image**
```bash
POST /api/v1/charts/generate
Content-Type: application/json

{
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "1M"
  },
  "format": "png",
  "storage": true
}
```

Generate chart image (requires valid chart-img.com API key in `.env`).

**Response:**
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://r2.chart-img.com/...",
    "metadata": {
      "format": "png",
      "width": 1200,
      "height": 675,
      "generatedAt": "2025-11-13T15:37:30.000Z"
    },
    "apiResponse": {
      "statusCode": 200,
      "rateLimitRemaining": 498
    }
  }
}
```

#### **5. Get Exchanges**
```bash
GET /api/v1/exchanges?forceRefresh=false
```

List all available trading exchanges.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "BINANCE",
      "name": "Binance",
      "type": "crypto",
      "description": "Cryptocurrency exchange"
    }
  ],
  "meta": {
    "total": 150
  }
}
```

#### **6. Get Symbols**
```bash
GET /api/v1/exchanges/BINANCE/symbols?search=BTC&limit=10
```

Get tradable symbols for an exchange.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "fullSymbol": "BINANCE:BTCUSDT",
      "description": "Bitcoin / TetherUS",
      "type": "crypto"
    }
  ],
  "meta": {
    "total": 10,
    "exchange": "BINANCE"
  }
}
```

#### **7. Save Chart Image**
```bash
POST /api/v1/storage/save
Content-Type: application/json

{
  "imageData": "base64-encoded-image-data",
  "filename": "my-chart.png",
  "directory": "/tmp"
}
```

Save base64-encoded chart image to disk.

#### **8. Get Documentation**
```bash
GET /api/v1/documentation?section=all&forceRefresh=false
```

Fetch chart-img.com API documentation.

### API Features

#### **Middleware Stack**

All endpoints include:

**✅ CORS Headers** - Cross-origin requests enabled for development
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

**✅ Rate Limiting** - Token bucket algorithm (in-memory)
```
X-RateLimit-Remaining: 19
X-RateLimit-Reset: 2025-11-13T15:38:07.657Z
```

Default limits:
- **Construct/Validate/Query**: 20 requests burst, 10/sec refill
- **Generate**: 10 requests burst, 2/sec refill (stricter)
- **Storage**: 10 requests burst, 5/sec refill

**✅ Error Handling** - Standardized error responses
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CONFIG",
    "message": "Symbol not found",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-11-13T15:37:34.764Z",
    "path": "/api/v1/charts/construct",
    "method": "POST"
  }
}
```

**✅ Request Validation** - Zod schema validation for all inputs

**✅ Optional Authentication** - API key support (development mode accepts any key)
```bash
# Via header
curl -H "X-API-Key: your-key-here" ...

# Via Bearer token
curl -H "Authorization: Bearer your-key-here" ...
```

#### **Error Codes**

Standard error codes across all endpoints:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing/invalid API key |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `EXTERNAL_API_ERROR` | 503 | chart-img.com API error |
| `INVALID_CONFIG` | 422 | Invalid chart configuration |
| `CHART_GENERATION_FAILED` | 500 | Chart generation error |

### Example Usage

#### **JavaScript/TypeScript**

```typescript
// Construct chart config from natural language
const response = await fetch('http://localhost:3010/api/v1/charts/construct', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    naturalLanguage: 'Show me Bitcoin with RSI for the last 7 days',
  }),
});

const { data } = await response.json();
console.log(data.config);
// { symbol: "BINANCE:BTCUSDT", interval: "4h", ... }

// Generate chart
const chartResponse = await fetch('http://localhost:3010/api/v1/charts/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    config: data.config,
    format: 'png',
    storage: true,
  }),
});

const { data: chartData } = await chartResponse.json();
console.log(chartData.imageUrl);
// https://r2.chart-img.com/...
```

#### **Python**

```python
import requests

# Construct config
response = requests.post(
    'http://localhost:3010/api/v1/charts/construct',
    json={
        'naturalLanguage': 'Show me Bitcoin with RSI for the last 7 days'
    }
)

config = response.json()['data']['config']
print(config)

# Generate chart
chart_response = requests.post(
    'http://localhost:3010/api/v1/charts/generate',
    json={
        'config': config,
        'format': 'png',
        'storage': True
    }
)

image_url = chart_response.json()['data']['imageUrl']
print(image_url)
```

#### **cURL**

```bash
# Construct config
curl -X POST http://localhost:3010/api/v1/charts/construct \
  -H "Content-Type: application/json" \
  -d '{
    "naturalLanguage": "Show me Bitcoin with RSI for the last 7 days"
  }'

# Get exchanges
curl http://localhost:3010/api/v1/exchanges

# Get symbols for Binance
curl "http://localhost:3010/api/v1/exchanges/BINANCE/symbols?search=BTC&limit=10"

# Health check
curl http://localhost:3010/api/v1/health
```

### Architecture

The REST API is built with:

**Framework**: Next.js 14 App Router
**Validation**: Zod schemas
**Middleware**: Composable pipeline (CORS → Rate Limit → Auth → Error Handler)
**Services**: Dependency injection container
**Type Safety**: Full TypeScript coverage

**Middleware Composition:**
```typescript
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 20, refillRate: 10 }),
  withOptionalAuth,
  withErrorHandler
)(handler);
```

### Production Deployment

The API is ready for production deployment on:

- **Vercel** (recommended for Next.js)
- **Railway** (easy Docker deployment)
- **AWS** (ECS, Lambda, or EC2)
- **Any Node.js hosting** (DigitalOcean, Heroku, etc.)

**Environment Variables:**
```bash
# Required
CHART_IMG_API_KEY=your-chart-img-api-key
CHART_IMG_PLAN=PRO

# Optional
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
VALID_API_KEYS=key1,key2,key3  # For production auth
LOG_LEVEL=info
NODE_ENV=production
```

**Build & Start:**
```bash
npm run build
npm start
```

---

## Troubleshooting

### "MCP server not connecting"

**Check**:
1. Claude Desktop config has correct absolute path
2. Project dependencies installed: `npm install`
3. `.env` file has valid API key
4. Node.js 18+ is installed

**Test server manually**:
```bash
cd /Users/paul/Desktop/projects/mcp-chart-image
npm run mcp
```

You should see:
```
[MCP Server] chart-img-mcp-server v0.1.1 started
[MCP Server] Registered 8 tools
```

**Debug**:
```bash
# Test MCP server
npm run mcp

# Build project (includes all modules)
npm run build

# Check module structure
ls -la src/modules/
```

**Note**: The project is undergoing modular restructuring. If you encounter import errors, ensure you've run `npm run build` after pulling latest changes.

### "Invalid API key error"

**Fix**:
1. Check `.env` file has correct key
2. Verify key at [chart-img.com/dashboard](https://chart-img.com/dashboard)
3. Ensure `.env` is in project root

### "Rate limit exceeded"

**Cause**: Too many requests for your plan

**Solution**:
- Wait for limit to reset (check error message)
- Reduce request frequency
- Upgrade chart-img.com plan

### "Chart generation fails"

**Common causes**:
1. Invalid symbol format (should be "EXCHANGE:SYMBOL")
2. Too many indicators for plan (BASIC=3, PRO=5)
3. Resolution too high (check plan limits)
4. Network issues

**Debug**:
```bash
# View MCP logs
tail -f /tmp/mcp-server.log
```

---

## Testing

This project uses **Vitest** for unit testing with comprehensive test coverage for all services.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

Tests are located alongside the code they test in `__tests__` directories:

```
src/
├── modules/
│   ├── chart/
│   │   └── services/
│   │       ├── __tests__/
│   │       │   ├── chart-config.service.test.ts      (24 tests)
│   │       │   ├── chart-validation.service.test.ts  (12 tests)
│   │       │   └── chart-generation.service.test.ts  (future)
│   │       ├── chart-config.service.ts
│   │       ├── chart-validation.service.ts
│   │       └── chart-generation.service.ts
│   └── storage/
│       └── services/
│           └── __tests__/                            (future)
```

### Current Test Coverage

**36 tests | 100% passing**

#### ChartConfigService (24 tests)
- ✅ Symbol detection (crypto, stocks, forex)
- ✅ Time range detection (1D, 1M, 1Y, etc.)
- ✅ Interval detection (explicit + inferred)
- ✅ Theme detection (light/dark)
- ✅ Chart style detection (candle, line, bar, area)
- ✅ Resolution parsing
- ✅ Natural language → config conversion
- ✅ User preferences override

#### ChartValidationService (12 tests)
- ✅ Required fields validation
- ✅ Symbol format validation (EXCHANGE:SYMBOL)
- ✅ Interval/range validation
- ✅ Resolution limits per plan (BASIC: 800×600, PRO: 1920×1080)
- ✅ Study count limits per plan (BASIC: 3, PRO: 5)
- ✅ Complete configuration validation

### Writing New Tests

Example test structure:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourService } from '../your-service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService();
  });

  describe('methodName', () => {
    it('should do something', () => {
      const result = service.methodName('input');
      expect(result).toBe('expected output');
    });

    it('should handle edge cases', () => {
      const result = service.methodName('edge case');
      expect(result).toBeDefined();
    });
  });
});
```

### Test Configuration

Tests are configured in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Continuous Integration

Tests run automatically on:
- Every commit (recommended with git hooks)
- Pull requests (recommended with GitHub Actions)
- Before deployment

**Best Practice**: Run `npm test` before committing code to ensure all tests pass.

---

## Tips for Best Results

### Be Specific

❌ **Vague**: "Show me a chart"
✅ **Clear**: "Show me Bitcoin chart with RSI for the last 7 days"

### Name Your Assets Clearly

❌ **Ambiguous**: "Show me BTC"
✅ **Clear**: "Show me Bitcoin from Binance"

### Specify Timeframes

❌ **Vague**: "Recent"
✅ **Clear**: "Last 24 hours" or "Past week" or "Last month"

### Request Multiple Indicators

✅ **Works well**: "Show me Ethereum with Bollinger Bands, RSI, and MACD"

### Ask for Explanations

✅ **Good practice**: "Show me a Bitcoin chart with RSI and explain what the RSI indicator means"

---

## Plan Limits

Different chart-img.com plans have different limits:

| Plan | Requests/sec | Daily Max | Max Resolution | Indicators |
|------|-------------|-----------|----------------|------------|
| **BASIC** | 1 | 50 | 800×600 | 3 |
| **PRO** | 10 | 500 | 1920×1080 | 5 |
| **MEGA** | 15 | 1,000 | 1920×1600 | 10 |
| **ULTRA** | 35 | 3,000 | 2048×1920 | 25 |
| **ENTERPRISE** | 35+ | 5,000+ | 2048×1920 | 50 |

Your current plan: **PRO**

---

## Advanced Usage

### Custom Indicator Parameters

> "Create a Bitcoin chart with 50-period RSI (instead of default 14) and Bollinger Bands with 3 standard deviations"

### Multiple Timeframe Analysis

> "Show me Bitcoin on daily timeframe for the last 3 months, and then show me the same on 4-hour timeframe for the last week"

### Comparative Analysis

> "Compare Bitcoin, Ethereum, and Solana charts side by side for the last month"

### Trading Setup Analysis

> "I'm looking at Bitcoin. Show me a chart that helps identify:
> - Support and resistance levels (Donchian Channels)
> - Trend direction (EMA 20 and 50)
> - Momentum (RSI)
> - Volatility (Bollinger Bands)
> Use 4-hour candles for the last 2 weeks"

---

## Configuration Reference

### Full Configuration Example

```json
{
  "mcpServers": {
    "chart-img": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/paul/Desktop/projects/mcp-chart-image/src/mcp/server.ts"
      ],
      "env": {
        "LOG_LEVEL": "info",
        "CHART_IMG_PLAN": "PRO"
      }
    }
  }
}
```

### Environment Variables

Override in Claude config if needed:

- `LOG_LEVEL`: debug, info, warn, error (default: info)
- `CHART_IMG_PLAN`: BASIC, PRO, MEGA, ULTRA, ENTERPRISE
- `CHART_IMG_RPS`: Custom requests per second
- `CHART_IMG_DAILY_LIMIT`: Custom daily limit

---

## Support

### Documentation
- **Modular Architecture**: See `.docs/saas-architecture.md` (modular monolith design)
- **MCP Architecture**: See `.docs/architecture.md` (MCP server internals)
- **Tools Reference**: See `.docs/mcp-tools.md`
- **Chart Drawings**: See `.docs/chart-drawings.md`
- **API Integration**: See `.docs/api-integration.md`
- **Examples**: See `.docs/examples.md`
- **Deployment**: See `.docs/deployment.md`

### Help
- **chart-img.com API**: support@chart-img.com
- **MCP Protocol**: https://modelcontextprotocol.io
- **Project Issues**: Open issue in repository

---

## Best Practices & Advanced Features

### MCP Best Practices

#### Token Usage
- Tool descriptions should be **concise but complete**
- Aim for under 25,000 characters per tool description
- Amount of tokens should match task complexity

#### Tool Design
- **Read-only tools** (data fetching): Set `readOnlyHint: true`
- **Modifying tools** (file writes, API calls): Set `readOnlyHint: false`
- **Idempotent tools** (same input = same output): Set `idempotentHint: true`
- **Destructive tools** (irreversible changes): Set `destructiveHint: true`

#### Security Guidelines
- **Input validation**: Always validate and sanitize user inputs
- **API key handling**: Never hardcode API keys in tool definitions
- **Rate limiting**: Respect external API rate limits
- **Error messages**: Don't expose sensitive information in errors
- **Prompt injection**: Be cautious with tools that fetch untrusted content

### Advanced MCP Features

#### MCP Resources

Access data from your MCP server using the `@` syntax:

```
@chart-img:config://bitcoin-daily
@chart-img:template://trading-setup
```

**In code:**
```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'config://bitcoin-daily',
        name: 'Bitcoin Daily Chart Config',
        mimeType: 'application/json',
      },
    ],
  };
});
```

#### MCP Prompts (Slash Commands)

Expose reusable prompts as slash commands:

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'analyze_chart',
        description: 'Analyze a trading chart with technical indicators',
        arguments: [
          { name: 'symbol', description: 'Trading symbol (e.g., BTCUSDT)', required: true },
        ],
      },
    ],
  };
});
```

**Usage in Claude:**
```
/chart-img_analyze_chart BTCUSDT
```

#### OAuth 2.0 Authentication (HTTP Servers)

For remote HTTP-based MCP servers:

```bash
# In Claude Code
> /mcp
# Follow OAuth flow in browser
```

**Server configuration:**
```json
{
  "mcpServers": {
    "remote-server": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${ACCESS_TOKEN}"
      }
    }
  }
}
```

#### Enterprise Configuration

**Managed MCP Servers** (`managed-mcp.json`):
- Enterprise-approved servers
- Deployed via MDM (Mobile Device Management)
- Users cannot remove or modify

**Managed Settings** (`managed-settings.json`):
- Allowlists: Only these servers can be added
- Denylists: These servers are blocked
- Policy enforcement at org level

**Example `managed-mcp.json`:**
```json
{
  "mcpServers": {
    "approved-chart-server": {
      "command": "npx",
      "args": ["tsx", "/path/to/server.ts"],
      "env": {
        "API_KEY": "${COMPANY_CHART_API_KEY}"
      }
    }
  }
}
```

### Claude as MCP Server

Expose Claude's tools to other MCP clients:

```bash
# Start Claude as an MCP server
claude mcp serve

# Connect from another client
# Server runs on stdio or HTTP
```

**Use cases:**
- Chain multiple Claude instances
- Build complex AI workflows
- Integrate Claude tools into your own MCP client

### Production Checklist

Before deploying your MCP server:

- [ ] **Input validation**: All tool inputs validated with Zod schemas
- [ ] **Error handling**: Graceful error messages, no sensitive data leaks
- [ ] **Rate limiting**: Respect external API limits, implement internal limits
- [ ] **Logging**: Structured logging for debugging (but not sensitive data)
- [ ] **Testing**: Unit tests for all tools (36+ tests in this project)
- [ ] **Documentation**: Tool descriptions match actual behavior
- [ ] **Security audit**: Review for injection vulnerabilities
- [ ] **API key rotation**: Support for updating keys without restart
- [ ] **Monitoring**: Health check endpoint, uptime tracking
- [ ] **Version control**: Semantic versioning for breaking changes

---

## What's Next?

### For Contributors

The project has been restructured into a modular monolith with comprehensive testing:

**✅ Completed:**
1. **Modular architecture**: 4 domain modules (Chart, Analysis, Storage, User)
2. **Service layer**: 5 services with clean business logic
3. **Repository pattern**: 2 repositories for data access
4. **Dependency injection**: DI container with all services registered
5. **MCP tools refactored**: All 8 tools now use DI and services
6. **Unit tests**: 36 tests with 100% passing rate
7. **Test infrastructure**: Vitest setup with coverage reporting

**How to contribute:**
1. **Review the architecture**: Check `.docs/saas-architecture.md` for the full design
2. **Understand modules**: Each module (`chart/`, `analysis/`, `storage/`, `user/`) has clear responsibilities
3. **Follow patterns**: Use repository pattern for data access, service layer for business logic
4. **Write tests**: Add tests for new features in `__tests__/` directories
5. **Run tests**: Always run `npm test` before committing

**Next priorities:**
- Expand test coverage (Storage services, Repositories)
- REST API layer for SaaS (use existing services)
- Analysis module (AI-powered chart analysis)
- GitHub Actions for CI/CD

### For Users

Now that you're connected:

1. **Try the MCP tools** - Ask Claude to generate charts via natural language
2. **Try the REST API** - Build web/mobile apps with `npm run dev`
3. **Explore different indicators** and combinations
4. **Analyze your favorite assets** (crypto, stocks, forex)
5. **Share your charts** - URLs are valid for 7 days
6. **Read the full docs** in `.docs/` folder

**MCP Mode** - Talk to Claude naturally:
> "Show me Bitcoin with RSI for the last 7 days"

**REST API Mode** - Integrate with your applications:
```bash
curl -X POST http://localhost:3010/api/v1/charts/construct \
  -H "Content-Type: application/json" \
  -d '{"naturalLanguage":"Show me Bitcoin with RSI"}'
```

Happy charting! 📈🚀

---

## Changelog

### v0.1.1 (Current)
- ✅ **Modular monolith architecture** - Restructured for scalability and SaaS readiness
- ✅ **Dependency injection container** - All services managed via DI
- ✅ **Service layer** - 5 services (ChartConfig, ChartValidation, ChartGeneration, ChartStorage, Download)
- ✅ **Repository pattern** - 2 repositories (Indicators, Drawings)
- ✅ **8 MCP tools refactored** - All tools now use DI and services
- ✅ **Comprehensive testing** - 36 unit tests with Vitest (100% passing)
- ✅ **Chart module complete** - Repositories, domain models, service interfaces, implementations
- ✅ **Storage module complete** - File operations and chart storage services
- ✅ **Core infrastructure** - Centralized database loaders, HTTP clients, config
- ✅ **REST API Layer** - Production-ready API with 8 endpoints
  - **Middleware stack**: CORS, rate limiting (token bucket), authentication, error handling
  - **8 REST endpoints**: health, construct, validate, generate, exchanges, symbols, storage, docs
  - **Controllers**: HTTP handlers using DI container services
  - **DTOs**: Zod validation schemas for all requests/responses
  - **Type safety**: Full TypeScript coverage, zero build errors
  - **Error handling**: Standardized error codes and responses
  - **Rate limiting**: In-memory token bucket (10-20 req/sec)
  - **Framework**: Next.js 14 App Router with composable middleware
- ✅ **Claude Code support** with project-scoped configuration
- ✅ **Chart drawings support** - Horizontal lines, trend lines, positions, orders
- ✅ **Fixed tsx integration** (replaced ts-node)
- 100+ technical indicators
- Multiple asset classes supported
- Comprehensive API documentation with examples (JavaScript, Python, cURL)
- Dynamic documentation fetching

### v0.1.0
- Initial release with 6 MCP tools
- Claude Desktop integration
- Comprehensive documentation

### Upcoming Features
- **OpenAPI/Swagger specification** for API documentation
- **API integration tests** - Comprehensive test suite for REST endpoints
- **User module** - Authentication, user quotas, billing integration
- **Redis for rate limiting** - Production-ready distributed rate limiting
- **Batch chart generation** - Generate multiple charts in parallel
- **Custom chart templates** - Save and reuse chart configurations
- **Historical data export** - Download chart data as CSV/JSON
- **Advanced drawing tools** - Fibonacci retracements, channels, patterns
- **Real-time chart updates** - WebSocket support for live data
- **Production deployment guides** - Vercel, Railway, AWS deployment
- **GitHub Actions CI/CD** - Automated testing and deployment pipeline
