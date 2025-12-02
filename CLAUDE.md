# Chart Service - Integration Guide

> **Microservice**: Chart Service
> **Repository**: `mcp-chart-image`

This guide shows you how to integrate the **Chart Service** with **Claude Desktop**, **Claude Code**, and as a **REST API** for web/mobile applications.

## Choose Your Integration Mode

- **[Claude Code](#claude-code-setup)** (CLI/VSCode) - Fastest setup with project-scoped config
- **[Claude Desktop](#claude-desktop-setup)** - Traditional desktop app
- **[REST API](#rest-api)** - Production-ready API for web/mobile apps (NEW! ✨)

## Prerequisites

- **chart-img.com API Key** (get from [chart-img.com](https://chart-img.com))
- **OpenAI API Key** (for AI chart analysis - get from [platform.openai.com](https://platform.openai.com/api-keys))
- **Node.js 18+** installed
- Project dependencies installed (`npm install`)

---

## 🤖 AI Chart Analysis (NEW!)

The MCP Chart-Image server now includes **AI-powered chart analysis** using OpenAI's GPT-4 Vision API. Analyze trading charts with natural language and receive comprehensive technical analysis, trading signals, and risk assessments.

### Features

✅ **Technical Analysis** - Trend identification, support/resistance levels, chart patterns
✅ **Trading Signals** - Entry/stop/target levels with risk/reward ratios
✅ **Sentiment Analysis** - Market sentiment (bullish/bearish/neutral) with confidence scores
✅ **Risk Assessment** - Position sizing, risk management recommendations
✅ **Multi-Model Support** - GPT-4o, GPT-4o-mini, GPT-4-turbo (easily extensible to Claude, Gemini)
✅ **Custom Prompts** - Override default prompts for specialized analysis
✅ **Trading Styles** - Day trading, swing trading, scalping contexts

### Quick Start

1. **Add OpenAI API key to `.env`:**
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   ANALYSIS_DEFAULT_MODEL=gpt-4o-mini  # Recommended for cost-effectiveness
   ```

2. **Use via Claude Desktop/Claude Code:**
   ```
   "Analyze this Bitcoin chart and give me trading signals"
   ```

3. **Use via REST API:**
   ```bash
   curl -X POST http://localhost:3010/api/v1/analysis/chart \
     -H "Content-Type: application/json" \
     -d '{
       "imageUrl": "https://r2.chart-img.com/your-chart-url",
       "symbol": "BINANCE:BTCUSDT",
       "interval": "4h",
       "tradingStyle": "swing_trading"
     }'
   ```

### Example Output

```json
{
  "success": true,
  "data": {
    "trend": "bullish",
    "recommendation": "LONG",
    "confidence": 0.78,
    "entryPrice": 94100,
    "stopLoss": 93500,
    "takeProfit": 97500,
    "riskRewardRatio": 5.67,
    "signals": [
      "Bullish RSI divergence detected",
      "Price bouncing off major support",
      "Volume confirmation on recent candles"
    ],
    "keyLevels": {
      "support": [94000, 92000],
      "resistance": [97500, 100000]
    },
    "analysisText": "Detailed technical analysis...",
    "tradingSignal": {
      "type": "LONG",
      "symbol": "BINANCE:BTCUSDT",
      "entryPrice": 94100,
      "stopLoss": 93500,
      "takeProfit": 97500,
      "confidence": 0.78,
      "reasoning": "Strong support confluence at $94K..."
    }
  },
  "metadata": {
    "model": "gpt-4o-mini",
    "tokensUsed": 1847,
    "processingTime": 3241
  }
}
```

### Supported Models

- **gpt-4o-mini** (Recommended) - Fast, cost-effective, excellent for chart analysis
- **gpt-4o** - Most capable, best for complex multi-chart analysis
- **gpt-4-turbo** - Good balance of speed and capability
- **gpt-4-vision-preview** - Legacy support

**Pricing (OpenAI):**
- gpt-4o-mini: ~$0.003 per chart analysis
- gpt-4o: ~$0.01 per chart analysis

### Configuration Options

```bash
# .env file
OPENAI_API_KEY=sk-your-key-here
ANALYSIS_DEFAULT_MODEL=gpt-4o-mini
ANALYSIS_MAX_TOKENS=2000
ANALYSIS_TEMPERATURE=0.7
ANALYSIS_TIMEOUT=60000
ANALYSIS_MAX_RETRIES=3
```

### MCP Tool: `analyze_chart`

**Available in Claude Desktop and Claude Code**

**Parameters:**
- `chartUrl` or `chartPath` - Image to analyze (URL or local file path)
- `symbol` - Trading symbol (e.g., BINANCE:BTCUSDT)
- `interval` - Timeframe (e.g., 4h, 1D)
- `tradingStyle` - "day_trading", "swing_trading", or "scalping" (optional)
- `customPrompt` - Custom analysis instructions (optional)
- `generateSignal` - Generate actionable trading signal (default: true)

**Example Usage:**
```
User: "Analyze this Bitcoin 4H chart: https://r2.chart-img.com/abc123
       and give me swing trading signals"

Claude: [Uses analyze_chart tool]
        Based on the chart analysis, I've identified a high-probability
        LONG setup:

        Entry: $94,100
        Stop Loss: $93,500 (below key support)
        Take Profit: $97,500 (resistance zone)
        Risk/Reward: 5.67:1
        Confidence: 78%

        The chart shows bullish RSI divergence with price bouncing
        off the $94K support level...
```

### REST API Endpoint

**POST /api/v1/analysis/chart**

See [REST API](#rest-api) section below for complete documentation.

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
- **Analysis Module**: AI-powered chart analysis and signal generation with LLM vision
- **Storage Module**: File operations, downloads, permanent storage (S3 integration)
- **User Module**: JWT authentication, plan-based access control, Laravel User Service integration
- **Conversation Module**: Chat history persistence, message storage with PostgreSQL/Prisma

### Migration Status

🟢 **Completed:**
- Module structure created (Chart, Analysis, Storage, User, Conversation)
- Chart module repositories (Indicators, Drawings)
- Chart module services (ChartConfig, ChartValidation, ChartGeneration)
- Storage module services (ChartStorage, Download, S3Storage)
- **Analysis module** - AI-powered chart analysis
  - OpenAI Vision Provider (GPT-4o, GPT-4o-mini support)
  - AI Analysis Service (technical, sentiment, signals, risk)
  - Signal Generation Service (trading signal parsing & validation)
  - LLM provider abstraction (easy to add Claude, Gemini, etc.)
- **User module** - JWT authentication with Laravel User Service
  - JWT validation with RSA public key
  - Plan-based access control (`free`, `pro`, `max`)
  - Subscription status checking (`active`, `trialing`, `past_due`, `canceled`)
  - `withAuth` and `withPlan` middleware for protected endpoints
- **Conversation module** - Chat history persistence
  - PostgreSQL with Prisma ORM
  - Conversation repository (CRUD operations)
  - Message history with metadata
- Core infrastructure (database loaders, HTTP client, config)
- Dependency injection container (all services registered)
- MCP tools: 9 tools (8 existing + analyze_chart)
- Comprehensive unit tests (**109 tests, 100% passing**)
- Test infrastructure (Vitest + coverage)
- **REST API layer** (15 endpoints, middleware stack, controllers)
- **API documentation** (comprehensive usage guide)

⚪ **Planned:**
- Additional LLM providers (Claude, Gemini, local models)
- User quotas and billing integration
- API integration tests
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

Once connected, Claude has access to these 9 tools:

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

### 8. `upload_chart_to_s3`
**Purpose**: Upload chart image to AWS S3 for permanent storage

**Example**:
> "Upload this chart to S3 for permanent storage"

**Returns**: Permanent S3 URL (never expires), bucket, key, size, metadata

**Note**: Requires AWS credentials in `.env` file

### 9. `analyze_chart` 🤖 **NEW!**
**Purpose**: Analyze trading charts using AI vision capabilities (GPT-4o)

**Example**:
> "Analyze this Bitcoin 4H chart and give me trading signals with entry, stop loss, and take profit levels"

**Returns**:
- Technical analysis (trend, support/resistance, patterns)
- Trading signals (LONG/SHORT/NEUTRAL with price levels)
- Market sentiment and confidence score
- Risk/reward ratio and risk assessment
- Detailed analysis text

**Features**:
- Multiple trading styles (day trading, swing trading, scalping)
- Custom prompts for specialized analysis
- Automatic signal generation and validation
- Comprehensive risk management recommendations

**Note**: Requires OpenAI API key in `.env` file

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

### AI Chart Analysis 🤖 **NEW!**

**Basic Analysis**:
> "Analyze this Bitcoin 4H chart and tell me if it's bullish or bearish"

**Trading Signals**:
> "Analyze this chart and give me a complete trading setup with entry, stop loss, and take profit levels"

**Multi-Timeframe Analysis**:
> "Generate a Bitcoin daily chart, analyze it, then give me swing trading signals"

**Complete Workflow** (Generate + Analyze):
> "Create a Bitcoin 4H chart with RSI and MACD for the last 7 days, then analyze it and give me trading signals"

**Risk Assessment**:
> "Analyze this Ethereum chart and tell me the risk level, what position size I should use, and where to place my stop loss"

**Sentiment Analysis**:
> "What's the market sentiment on this chart? Is it bullish, bearish, or neutral? How confident are you?"

**Day Trading Setup**:
> "Analyze this 15-minute chart for day trading. I need precise entry and exit levels with tight stop loss"

**Custom Analysis**:
> "Analyze this chart focusing only on volume patterns and price action. Ignore the indicators."

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

### Best Practice Workflow for Claude Desktop

This is the **recommended workflow** that works perfectly in both **Claude Code** and **Claude Desktop**. It saves charts locally for immediate analysis, then uploads to S3 for permanent storage.

#### Why This Workflow?

- ✅ **Works in Claude Desktop**: Saves locally first (no URL fetching needed)
- ✅ **Memory efficient**: Streams directly to disk (no base64 in memory)
- ✅ **Immediate analysis**: Chart available for AI visual analysis
- ✅ **Permanent storage**: S3 upload creates never-expiring URL
- ✅ **Single API call**: One request to chart-img.com

#### Step-by-Step Workflow

**Step 1: Construct Chart Configuration**
```javascript
// Natural language → Chart config
const config = await construct_chart_config({
  naturalLanguage: "Bitcoin with RSI and MACD for the last 7 days",
  preferences: {
    theme: "dark",
    resolution: "1200x800"
  }
});
// Returns: { symbol: "BINANCE:BTCUSDT", interval: "4h", range: "1M", ... }
```

**Step 2: Generate and Save Locally**
```javascript
// Generate chart and save to /tmp (Claude Desktop can read this)
const chart = await generate_chart_image({
  config: config.config,
  storage: false,        // ← No cloud storage (memory efficient)
  saveToFile: true,      // ← Save to /tmp automatically
  filename: "btc-analysis.png",
  format: "png"
});
// Returns: { localPath: "/tmp/btc-analysis.png", metadata: {...} }
```

**Step 3: Analyze Chart (Claude Desktop)**
```
Claude Desktop reads /tmp/btc-analysis.png and performs visual analysis:
- Identifies price action (downtrend from $118K to $96K)
- Detects support/resistance levels
- Provides trading recommendations
```

**Step 4: Upload to S3 for Permanent Storage**
```javascript
// Upload to S3 (permanent URL, never expires)
const s3Result = await upload_chart_to_s3({
  imageData: fs.readFileSync(chart.localPath, 'base64'),
  metadata: {
    symbol: "BINANCE:BTCUSDT",
    interval: "4h",
    indicators: ["RSI", "MACD"],
    generatedAt: chart.metadata.generatedAt
  }
});
// Returns: { url: "https://s3-bucket.s3.region.amazonaws.com/charts/...", ... }
```

#### Complete Example (Real World)

```
User: "Show me Bitcoin with RSI and MACD for the last 7 days, analyze it, and save permanently"

Claude Response:
1. Constructs config: BINANCE:BTCUSDT, 4h, 1M range
2. Generates chart → /tmp/btc-chart-<timestamp>.png
3. Analyzes chart visually:
   - Current price: $96,042.50
   - Bearish trend from $118K high
   - Key support at $94K-$96K range
   - Resistance at $106K-$107K
4. Uploads to S3 → https://s3-bucket.s3.../BTCUSDT-4h-<timestamp>.png

Result:
- ✅ Chart analyzed
- ✅ Permanent S3 URL (never expires)
- ✅ Local file available for further analysis
```

#### Comparison: Alternative Workflows

| Workflow | Use When | Pros | Cons |
|----------|----------|------|------|
| **Best Practice** (saveToFile:true + S3) | Claude Desktop, comprehensive analysis | Works everywhere, permanent storage, memory efficient | Requires AWS S3 setup |
| **Cloud URL only** (storage:true) | Claude Code, quick charts | Simple, no S3 needed | URL expires in 7 days, Claude Desktop can't fetch URLs |
| **Direct base64** (storage:false, no save) | Small charts, immediate use | Single response | Large token usage, no permanent storage |

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

#### **9. Chat Messages** *(Premium - requires pro/max plan)*
```bash
POST /api/v1/chat/messages
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "message": "Analyze this Bitcoin chart",
  "conversationId": "conv_123",
  "context": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h"
  }
}
```

Send a message and get AI response (non-streaming).

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_456",
    "conversationId": "conv_123",
    "content": "Based on the Bitcoin chart...",
    "role": "assistant",
    "createdAt": "2025-11-28T10:30:00.000Z"
  }
}
```

#### **10. Chat Messages Stream** *(Premium - requires pro/max plan)*
```bash
POST /api/v1/chat/messages/stream
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "message": "Analyze this Bitcoin chart",
  "conversationId": "conv_123"
}
```

Send a message and get AI response via Server-Sent Events (SSE).

**Response:** SSE stream with events:
- `message` - Partial message content
- `done` - Stream complete
- `error` - Error occurred

#### **11. List Conversations** *(Premium - requires pro/max plan)*
```bash
GET /api/v1/conversations?page=1&limit=20&isPinned=false&isArchived=false
Authorization: Bearer <JWT_TOKEN>
```

List user's conversations with pagination.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv_123",
      "title": "Bitcoin Analysis",
      "isPinned": false,
      "isArchived": false,
      "createdAt": "2025-11-28T09:00:00.000Z",
      "updatedAt": "2025-11-28T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### **12. Create Conversation** *(Premium - requires pro/max plan)*
```bash
POST /api/v1/conversations
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "title": "Bitcoin Analysis Session"
}
```

Create a new conversation.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_789",
    "title": "Bitcoin Analysis Session",
    "userId": "user_123",
    "isPinned": false,
    "isArchived": false,
    "createdAt": "2025-11-28T11:00:00.000Z"
  }
}
```

#### **13. Get Conversation** *(Premium - requires pro/max plan)*
```bash
GET /api/v1/conversations/:id
Authorization: Bearer <JWT_TOKEN>
```

Get conversation with messages.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_123",
    "title": "Bitcoin Analysis",
    "messages": [
      {
        "id": "msg_1",
        "role": "user",
        "content": "Analyze Bitcoin 4H chart",
        "createdAt": "2025-11-28T09:00:00.000Z"
      },
      {
        "id": "msg_2",
        "role": "assistant",
        "content": "Based on the analysis...",
        "createdAt": "2025-11-28T09:00:05.000Z"
      }
    ]
  }
}
```

#### **14. Update Conversation** *(Premium - requires pro/max plan)*
```bash
PATCH /api/v1/conversations/:id
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "title": "Updated Title",
  "isPinned": true,
  "isArchived": false
}
```

Update conversation metadata.

#### **15. Delete Conversation** *(Premium - requires pro/max plan)*
```bash
DELETE /api/v1/conversations/:id
Authorization: Bearer <JWT_TOKEN>
```

Delete a conversation and all its messages.

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

**✅ JWT Authentication** - Secure authentication with Laravel User Service integration

ChartTalk uses JWT (JSON Web Tokens) for authentication, designed to integrate with the Laravel User Service microservice.

**Token Format:**
```bash
# Send JWT via Authorization header (preferred)
curl -H "Authorization: Bearer <JWT_TOKEN>" ...

# Or via X-API-Key header (fallback)
curl -H "X-API-Key: <JWT_TOKEN>" ...
```

**JWT Payload (from Laravel User Service):**
```json
{
  "sub": "user_123",              // User ID
  "email": "user@example.com",    // User's email
  "name": "John Doe",             // Display name
  "plan": "pro",                  // Subscription plan (free, pro, max)
  "plan_name": "Pro",             // Human-readable plan name
  "subscription_status": "active", // active, trialing, past_due, canceled
  "iat": 1732789200,              // Issued at
  "exp": 1732792800,              // Expiration
  "iss": "laravel-user-service"   // Issuer (verified)
}
```

**Plan-Based Access Control:**

| Plan | Access Level |
|------|-------------|
| `free` | Basic chart endpoints only |
| `pro` | All endpoints including conversations, AI analysis, S3 storage |
| `max` | All endpoints with higher rate limits |

**Protected Endpoints (require `pro` or `max` plan):**
- `POST /api/v1/chat/messages` - AI chat
- `POST /api/v1/chat/messages/stream` - Streaming AI chat
- `POST /api/v1/analysis/chart` - AI chart analysis
- `POST /api/v1/storage/s3` - Permanent S3 storage
- `GET/POST/PATCH/DELETE /api/v1/conversations/*` - Conversation management

**Development Mode:**

Set `AUTH_DEV_BYPASS=true` in `.env` to skip JWT validation during development:
```bash
# .env
AUTH_DEV_BYPASS=true
```
This provides a test user with `pro` plan and `active` subscription.

**Configuration:**
```bash
# .env
JWT_PUBLIC_KEY_PATH=./keys/jwt-public.pem  # RSA public key for verification
JWT_ISSUER=laravel-user-service             # Expected issuer claim
```

See `.docs/jwt-authentication.md` for complete JWT integration documentation.

#### **Error Codes**

Standard error codes across all endpoints:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing/invalid JWT token |
| `FORBIDDEN` | 403 | Plan upgrade required or subscription inactive |
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

### REST API Best Practice Workflow

This section shows the **recommended workflow** for using the REST API to generate charts with local analysis and permanent S3 storage - matching the best practice workflow available in MCP tools.

#### Why This Workflow?

The multi-call REST approach offers several advantages:

- ✅ **More RESTful** - Single responsibility per endpoint
- ✅ **More flexible** - Skip S3 upload for testing, use local-only mode
- ✅ **Better error handling** - Each operation succeeds/fails independently
- ✅ **Better monitoring** - Track rate limits per operation
- ✅ **Production ready** - Clean separation of concerns

#### Complete Workflow Overview

```
Step 1: Construct Config (Natural Language → Chart Config)
   ↓
Step 2: Generate Chart (Save Locally for Analysis)
   ↓
Step 3: Analyze Chart (Client-Side AI Analysis)
   ↓
Step 4: Upload to S3 (Permanent Storage)
   ↓
Result: Local file + Permanent S3 URL + Analysis
```

#### Step-by-Step Guide

**Step 1: Construct Chart Configuration**

Convert natural language to chart configuration:

```bash
POST /api/v1/charts/construct
Content-Type: application/json

{
  "naturalLanguage": "Bitcoin with RSI and MACD for the last 7 days",
  "preferences": {
    "theme": "dark",
    "resolution": "1200x800"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "1M",
      "theme": "dark",
      "width": 1200,
      "height": 800
    },
    "reasoning": "Symbol: BINANCE:BTCUSDT | Interval: 4h | Range: 1M"
  }
}
```

**Step 2: Generate Chart and Save Locally**

Generate chart WITHOUT cloud storage, save to local disk:

```bash
POST /api/v1/charts/generate
Content-Type: application/json

{
  "config": { /* config from step 1 */ },
  "storage": false,        # No chart-img.com cloud storage
  "saveToFile": true,      # Save to /tmp directory
  "format": "png"
}
```

**Why `storage: false`?**
- Avoids 7-day expiration
- Reduces API quota usage
- Faster response (no upload to chart-img.com cloud)
- Perfect for local analysis

**Response**:
```json
{
  "success": true,
  "data": {
    "localPath": "/tmp/chart-1731705600000.png",
    "metadata": {
      "format": "PNG",
      "resolution": "1200x800",
      "generatedAt": "2025-11-16T02:00:00.000Z"
    }
  }
}
```

**Step 3: Analyze Chart (Client-Side)**

Read the local file and perform AI analysis:

```javascript
// Node.js example
const fs = require('fs');
const chartPath = chartData.data.localPath;
const chartBuffer = fs.readFileSync(chartPath);

// Send to AI for analysis (your AI service)
const analysis = await analyzeChartImage(chartBuffer);
// Returns: trend analysis, support/resistance, trading signals
```

**Step 4: Upload to S3 for Permanent Storage**

Upload the local chart to S3 for never-expiring storage:

```bash
POST /api/v1/storage/s3
Content-Type: application/json

{
  "imageData": "base64-encoded-data",  # From local file
  "metadata": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "indicators": ["RSI", "MACD"],
    "generatedAt": "2025-11-16T02:00:00.000Z"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://s3-bucket.s3.region.amazonaws.com/charts/2025/11/BTCUSDT-4h-timestamp.png",
    "bucket": "s3-bucket",
    "key": "charts/2025/11/BTCUSDT-4h-timestamp.png",
    "size": 31640,
    "uploadedAt": "2025-11-16T02:00:15.000Z"
  }
}
```

#### Complete Examples

**JavaScript/TypeScript - Full Workflow**

```typescript
async function generateAndAnalyzeChart(naturalLanguage: string) {
  const baseURL = 'http://localhost:3010/api/v1';

  // Step 1: Construct configuration
  const configResponse = await fetch(`${baseURL}/charts/construct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ naturalLanguage })
  });
  const { data: configData } = await configResponse.json();

  // Step 2: Generate chart locally
  const chartResponse = await fetch(`${baseURL}/charts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: configData.config,
      storage: false,      // No cloud storage
      saveToFile: true     // Save to /tmp
    })
  });
  const { data: chartData } = await chartResponse.json();

  // Step 3: Read local file for analysis
  const fs = require('fs');
  const chartBuffer = fs.readFileSync(chartData.localPath);
  const base64Data = chartBuffer.toString('base64');

  // Analyze chart (your AI service here)
  console.log(`Chart saved to: ${chartData.localPath}`);
  console.log(`Chart ready for AI analysis`);

  // Step 4: Upload to S3 for permanent storage
  const s3Response = await fetch(`${baseURL}/storage/s3`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageData: base64Data,
      metadata: {
        symbol: configData.config.symbol,
        interval: configData.config.interval,
        generatedAt: chartData.metadata.generatedAt
      }
    })
  });
  const { data: s3Data } = await s3Response.json();

  return {
    config: configData.config,
    localPath: chartData.localPath,        // For immediate analysis
    permanentUrl: s3Data.url,              // Never expires
    s3Key: s3Data.key,
    metadata: chartData.metadata
  };
}

// Usage
const result = await generateAndAnalyzeChart(
  "Bitcoin with RSI and MACD for the last 7 days"
);

console.log('Local file:', result.localPath);
console.log('Permanent URL:', result.permanentUrl);
```

**Python - Full Workflow**

```python
import requests
import base64

def generate_and_analyze_chart(natural_language: str):
    base_url = 'http://localhost:3010/api/v1'

    # Step 1: Construct configuration
    config_response = requests.post(
        f'{base_url}/charts/construct',
        json={'naturalLanguage': natural_language}
    )
    config_data = config_response.json()['data']

    # Step 2: Generate chart locally
    chart_response = requests.post(
        f'{base_url}/charts/generate',
        json={
            'config': config_data['config'],
            'storage': False,      # No cloud storage
            'saveToFile': True     # Save to /tmp
        }
    )
    chart_data = chart_response.json()['data']

    # Step 3: Read local file for analysis
    with open(chart_data['localPath'], 'rb') as f:
        chart_bytes = f.read()
        base64_data = base64.b64encode(chart_bytes).decode('utf-8')

    print(f"Chart saved to: {chart_data['localPath']}")
    print(f"Chart ready for AI analysis")

    # Step 4: Upload to S3 for permanent storage
    s3_response = requests.post(
        f'{base_url}/storage/s3',
        json={
            'imageData': base64_data,
            'metadata': {
                'symbol': config_data['config']['symbol'],
                'interval': config_data['config']['interval'],
                'generatedAt': chart_data['metadata']['generatedAt']
            }
        }
    )
    s3_data = s3_response.json()['data']

    return {
        'config': config_data['config'],
        'local_path': chart_data['localPath'],
        'permanent_url': s3_data['url'],
        's3_key': s3_data['key'],
        'metadata': chart_data['metadata']
    }

# Usage
result = generate_and_analyze_chart(
    "Bitcoin with RSI and MACD for the last 7 days"
)

print(f"Local file: {result['local_path']}")
print(f"Permanent URL: {result['permanent_url']}")
```

**cURL - Step-by-Step**

```bash
#!/bin/bash

# Step 1: Construct configuration
CONFIG=$(curl -s -X POST http://localhost:3010/api/v1/charts/construct \
  -H "Content-Type: application/json" \
  -d '{
    "naturalLanguage": "Bitcoin with RSI and MACD for the last 7 days"
  }' | jq '.data.config')

# Step 2: Generate chart locally
CHART=$(curl -s -X POST http://localhost:3010/api/v1/charts/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"config\": $CONFIG,
    \"storage\": false,
    \"saveToFile\": true
  }")

LOCAL_PATH=$(echo $CHART | jq -r '.data.localPath')
echo "Chart saved to: $LOCAL_PATH"

# Step 3: Read file and convert to base64
BASE64_DATA=$(base64 -i "$LOCAL_PATH" | tr -d '\n')

# Step 4: Upload to S3
S3_RESULT=$(curl -s -X POST http://localhost:3010/api/v1/storage/s3 \
  -H "Content-Type: application/json" \
  -d "{
    \"imageData\": \"$BASE64_DATA\",
    \"metadata\": {
      \"symbol\": \"BINANCE:BTCUSDT\",
      \"interval\": \"4h\"
    }
  }")

S3_URL=$(echo $S3_RESULT | jq -r '.data.url')
echo "Permanent URL: $S3_URL"
```

#### Workflow Comparison: MCP Tools vs REST API

| Aspect | MCP Tools | REST API |
|--------|-----------|----------|
| **Single Call** | ✅ `uploadToS3: true` in one tool call | ❌ Requires 2-4 calls (construct → generate → upload) |
| **Flexibility** | ⚠️ All-or-nothing parameter | ✅ Skip S3 if not needed, local-only mode |
| **Error Handling** | ⚠️ If S3 fails, whole call may fail | ✅ Each operation independent |
| **Rate Limiting** | ⚠️ Single tool rate limit | ✅ Separate limits per endpoint |
| **Best For** | Claude Desktop users, simple workflows | Production apps, web services, mobile apps |
| **Programming** | MCP protocol required | Standard HTTP (works everywhere) |
| **Monitoring** | Limited visibility | ✅ Track each step separately |

**When to use MCP Tools**: Claude Desktop integration, conversational AI workflows

**When to use REST API**: Web apps, mobile apps, microservices, production systems

#### Error Handling Best Practices

```typescript
async function generateChartWithErrorHandling(naturalLanguage: string) {
  try {
    // Step 1: Construct
    const configResponse = await fetch(`${baseURL}/charts/construct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ naturalLanguage })
    });

    if (!configResponse.ok) {
      const error = await configResponse.json();
      throw new Error(`Config construction failed: ${error.error.message}`);
    }

    const { data: configData } = await configResponse.json();

    // Step 2: Generate locally
    const chartResponse = await fetch(`${baseURL}/charts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: configData.config,
        storage: false,
        saveToFile: true
      })
    });

    if (!chartResponse.ok) {
      const error = await chartResponse.json();
      throw new Error(`Chart generation failed: ${error.error.message}`);
    }

    const { data: chartData } = await chartResponse.json();

    // Step 3: Upload to S3 (optional - continue even if fails)
    try {
      const fs = require('fs');
      const base64Data = fs.readFileSync(chartData.localPath).toString('base64');

      const s3Response = await fetch(`${baseURL}/storage/s3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64Data,
          metadata: {
            symbol: configData.config.symbol,
            interval: configData.config.interval
          }
        })
      });

      if (s3Response.ok) {
        const { data: s3Data } = await s3Response.json();
        return {
          ...chartData,
          s3Url: s3Data.url,
          s3Key: s3Data.key
        };
      } else {
        console.warn('S3 upload failed, but local chart available');
        return chartData;  // Still have local file
      }
    } catch (s3Error) {
      console.warn('S3 upload error:', s3Error);
      return chartData;  // Still have local file
    }

  } catch (error) {
    console.error('Chart generation workflow failed:', error);
    throw error;
  }
}
```

#### Rate Limiting Awareness

The REST API uses token bucket rate limiting with different limits per endpoint:

```typescript
// Rate limit headers in response
{
  "X-RateLimit-Remaining": "19",
  "X-RateLimit-Reset": "2025-11-16T02:00:30Z"
}

// Check before making calls
if (response.headers.get('X-RateLimit-Remaining') < 5) {
  const resetTime = new Date(response.headers.get('X-RateLimit-Reset'));
  const waitTime = resetTime - Date.now();
  console.log(`Rate limit low, waiting ${waitTime}ms`);
  await new Promise(resolve => setTimeout(resolve, waitTime));
}
```

**Endpoint Limits** (default configuration):
- **Construct/Validate**: 20 burst, 10/sec refill
- **Generate**: 10 burst, 2/sec refill (stricter - expensive operation)
- **S3 Upload**: 10 burst, 5/sec refill

**Best Practice**: Implement exponential backoff when rate limits are hit.

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

### AWS S3 Storage (Permanent Chart Storage)

The server now supports **permanent chart storage** in AWS S3, replacing the 7-day expiration limit of chart-img.com URLs.

#### Why Use S3 Storage?

| Feature | chart-img.com | AWS S3 |
|---------|---------------|--------|
| **URL Expiration** | 7 days | Never (permanent) |
| **Storage Control** | chart-img.com servers | Your AWS account |
| **CDN Support** | Limited | CloudFront integration |
| **Metadata Tagging** | No | Yes (symbol, interval, etc.) |
| **Cost** | Included in plan | Pay-as-you-go (~$0.023/GB) |

#### Setup AWS S3

1. **Create S3 Bucket** (via AWS Console or CLI):
```bash
aws s3api create-bucket \
  --bucket my-trading-charts \
  --region us-east-1 \
  --acl public-read
```

2. **Create IAM User** with S3 permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-trading-charts/*",
        "arn:aws:s3:::my-trading-charts"
      ]
    }
  ]
}
```

3. **Add Credentials to `.env`**:
```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=my-trading-charts
AWS_S3_BUCKET_REGION=us-east-1

# Optional: CloudFront CDN
AWS_CLOUDFRONT_DOMAIN=d123abc.cloudfront.net
```

4. **Restart Server** to load new credentials:
```bash
npm run dev
```

#### MCP Tool: `upload_chart_to_s3`

**Usage in Claude Code**:
> "Generate a Bitcoin chart with RSI, then upload it to S3 for permanent storage"

**Workflow**:
1. Generate chart with `generate_chart_image` (returns 7-day URL)
2. Upload to S3 with `upload_chart_to_s3` (returns permanent URL)

**Example**:
```typescript
// Step 1: Generate chart (temporary URL)
const chart = await generate_chart_image({
  config: { symbol: "BINANCE:BTCUSDT", interval: "4h", range: "1M" }
});
// chart.imageUrl = "https://r2.chart-img.com/..." (expires in 7 days)

// Step 2: Upload to S3 (permanent URL)
const s3Result = await upload_chart_to_s3({
  imageUrl: chart.imageUrl,
  metadata: {
    symbol: "BINANCE:BTCUSDT",
    interval: "4h",
    indicators: ["RSI", "MACD"]
  }
});
// s3Result.url = "https://my-bucket.s3.us-east-1.amazonaws.com/charts/..." (never expires)
```

#### REST API Endpoint: `POST /api/v1/storage/s3`

**Upload from URL**:
```bash
curl -X POST http://localhost:3010/api/v1/storage/s3 \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://r2.chart-img.com/...",
    "metadata": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "indicators": ["RSI", "MACD"],
      "generatedAt": "2025-11-16T10:30:00Z"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://my-trading-charts.s3.us-east-1.amazonaws.com/charts/2025/11/BTCUSDT-4h-20251116T103000-abc12345.png",
    "bucket": "my-trading-charts",
    "key": "charts/2025/11/BTCUSDT-4h-20251116T103000-abc12345.png",
    "size": 245678,
    "uploadedAt": "2025-11-16T10:30:15Z",
    "metadata": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "indicators": "RSI,MACD",
      "source": "chart-img.com"
    }
  }
}
```

**Upload from Base64**:
```bash
curl -X POST http://localhost:3010/api/v1/storage/s3 \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "iVBORw0KGgoAAAANSUhEUgAA...",
    "metadata": {
      "symbol": "BINANCE:ETHUSDT",
      "interval": "1D"
    }
  }'
```

#### JavaScript/TypeScript Example

```typescript
// Full workflow: Generate → Upload to S3 → Get permanent URL
async function generateAndStoreChart(symbol: string, interval: string) {
  // 1. Construct config from natural language
  const configResponse = await fetch('http://localhost:3010/api/v1/charts/construct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      naturalLanguage: `${symbol} chart with RSI and MACD, ${interval} timeframe, last month`
    })
  });
  const { data: configData } = await configResponse.json();

  // 2. Generate chart (7-day URL)
  const chartResponse = await fetch('http://localhost:3010/api/v1/charts/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: configData.config,
      storage: true
    })
  });
  const { data: chartData } = await chartResponse.json();

  // 3. Upload to S3 (permanent URL)
  const s3Response = await fetch('http://localhost:3010/api/v1/storage/s3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl: chartData.imageUrl,
      metadata: {
        symbol: configData.config.symbol,
        interval: configData.config.interval,
        indicators: ['RSI', 'MACD']
      }
    })
  });
  const { data: s3Data } = await s3Response.json();

  return {
    temporaryUrl: chartData.imageUrl,  // Expires in 7 days
    permanentUrl: s3Data.url,          // Never expires
    s3Key: s3Data.key,
    metadata: s3Data.metadata
  };
}

// Usage
const result = await generateAndStoreChart('BINANCE:BTCUSDT', '4h');
console.log('Permanent chart URL:', result.permanentUrl);
```

#### Python Example

```python
import requests

def generate_and_store_chart(symbol: str, interval: str):
    # 1. Construct config
    config_response = requests.post(
        'http://localhost:3010/api/v1/charts/construct',
        json={
            'naturalLanguage': f'{symbol} chart with RSI and MACD, {interval} timeframe, last month'
        }
    )
    config_data = config_response.json()['data']

    # 2. Generate chart (7-day URL)
    chart_response = requests.post(
        'http://localhost:3010/api/v1/charts/generate',
        json={
            'config': config_data['config'],
            'storage': True
        }
    )
    chart_data = chart_response.json()['data']

    # 3. Upload to S3 (permanent URL)
    s3_response = requests.post(
        'http://localhost:3010/api/v1/storage/s3',
        json={
            'imageUrl': chart_data['imageUrl'],
            'metadata': {
                'symbol': config_data['config']['symbol'],
                'interval': config_data['config']['interval'],
                'indicators': ['RSI', 'MACD']
            }
        }
    )
    s3_data = s3_response.json()['data']

    return {
        'temporary_url': chart_data['imageUrl'],  # Expires in 7 days
        'permanent_url': s3_data['url'],          # Never expires
        's3_key': s3_data['key'],
        'metadata': s3_data['metadata']
    }

# Usage
result = generate_and_store_chart('BINANCE:BTCUSDT', '4h')
print(f"Permanent chart URL: {result['permanent_url']}")
```

#### S3 Object Key Structure

Charts are organized by date for easy management:

```
charts/
  2025/
    11/
      BTCUSDT-4h-20251116T103000-abc12345.png
      ETHUSDT-1D-20251116T143000-def67890.png
    12/
      BTCUSDT-1h-20251201T090000-ghi11121.png
```

**Key Format**: `charts/{year}/{month}/{symbol}-{interval}-{timestamp}-{hash}.png`

#### CloudFront CDN (Optional)

For faster global delivery, configure CloudFront:

1. **Create CloudFront Distribution**:
   - Origin: S3 bucket
   - Viewer Protocol: HTTPS only
   - Cache behavior: Cache based on query strings

2. **Add to `.env`**:
```bash
AWS_CLOUDFRONT_DOMAIN=d123abc.cloudfront.net
```

3. **URLs will automatically use CloudFront**:
```
https://d123abc.cloudfront.net/charts/2025/11/BTCUSDT-4h-20251116T103000-abc12345.png
```

#### Storage Costs

AWS S3 pricing (as of 2025):

| Storage | Cost |
|---------|------|
| First 50 TB/month | $0.023 per GB |
| Next 450 TB/month | $0.022 per GB |

**Example**: Storing 1,000 charts (average 250KB each):
- Total size: 250 MB
- Monthly cost: ~$0.006 (less than 1 cent!)

**Data Transfer**: First 100 GB/month free, then $0.09/GB

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
