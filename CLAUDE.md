# Claude Integration Guide

This guide shows you how to integrate the MCP Chart-Image Server with **Claude Desktop** and **Claude Code**.

## Choose Your Claude Environment

- **[Claude Code](#claude-code-setup)** (CLI/VSCode) - Fastest setup with project-scoped config
- **[Claude Desktop](#claude-desktop-setup)** - Traditional desktop app

## Prerequisites

- **chart-img.com API Key** (get from [chart-img.com](https://chart-img.com))
- **Node.js 18+** installed
- Project dependencies installed (`npm install`)

---

## Claude Code Setup

### Quick Setup (Recommended)

The MCP server is already configured in this project! Just add it to Claude Code:

```bash
# From the project directory
claude mcp add --transport stdio chart-img -- npx tsx src/mcp/server.ts
```

That's it! The server will start automatically when Claude Code needs it.

### Verify Connection

```bash
claude mcp list
```

You should see:
```
chart-img: npx tsx /path/to/src/mcp/server.ts - ✓ Connected
```

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
      "description": "Generate professional trading charts with technical indicators"
    }
  }
}
```

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

---

## Available MCP Tools

Once connected, Claude has access to these 7 tools:

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
[MCP Server] chart-img-mcp-server v0.1.0 started
[MCP Server] Registered 6 tools
```

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
- **Architecture**: See `.docs/architecture.md`
- **Tools Reference**: See `.docs/mcp-tools.md`
- **API Integration**: See `.docs/api-integration.md`
- **Examples**: See `.docs/examples.md`
- **Deployment**: See `.docs/deployment.md`

### Help
- **chart-img.com API**: support@chart-img.com
- **MCP Protocol**: https://modelcontextprotocol.io
- **Project Issues**: Open issue in repository

---

## What's Next?

Now that you're connected:

1. **Try the example prompts** above
2. **Explore different indicators** and combinations
3. **Analyze your favorite assets** (crypto, stocks, forex)
4. **Share your charts** - URLs are valid for 7 days
5. **Read the full docs** in `.docs/` folder

Happy charting! 📈🚀

---

## Changelog

### v0.1.1 (Current)
- ✅ **7 MCP tools** (added health_check for diagnostics)
- ✅ **Claude Code support** with project-scoped configuration
- ✅ **Fixed tsx integration** (replaced ts-node)
- ✅ **Improved error handling** and connection reliability
- 100+ technical indicators
- Multiple asset classes supported
- Rate limiting and caching
- Dynamic documentation fetching

### v0.1.0
- Initial release with 6 MCP tools
- Claude Desktop integration
- Comprehensive documentation

### Upcoming Features
- Batch chart generation
- Custom chart templates
- Historical data export
- Advanced drawing tools
- Real-time chart updates
