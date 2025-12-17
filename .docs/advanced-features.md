# Advanced Features & Best Practices

This document covers advanced MCP features, production best practices, and enterprise configurations.

## MCP Best Practices

### Token Usage
- Tool descriptions should be **concise but complete**
- Aim for under 25,000 characters per tool description
- Amount of tokens should match task complexity

### Tool Design
- **Read-only tools** (data fetching): Set `readOnlyHint: true`
- **Modifying tools** (file writes, API calls): Set `readOnlyHint: false`
- **Idempotent tools** (same input = same output): Set `idempotentHint: true`
- **Destructive tools** (irreversible changes): Set `destructiveHint: true`

### Security Guidelines
- **Input validation**: Always validate and sanitize user inputs
- **API key handling**: Never hardcode API keys in tool definitions
- **Rate limiting**: Respect external API rate limits
- **Error messages**: Don't expose sensitive information in errors
- **Prompt injection**: Be cautious with tools that fetch untrusted content

## Advanced MCP Features

### MCP Resources

Access data from your MCP server using the `@` syntax:

```
@chart-img:config://bitcoin-daily
@chart-img:template://trading-setup
```

**Implementation**:
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

### MCP Prompts (Slash Commands)

Expose reusable prompts as slash commands:

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'analyze_chart',
        description: 'Analyze a trading chart with technical indicators',
        arguments: [
          { name: 'symbol', description: 'Trading symbol', required: true },
        ],
      },
    ],
  };
});
```

**Usage**: `/chart-img_analyze_chart BTCUSDT`

### OAuth 2.0 Authentication (HTTP Servers)

For remote HTTP-based MCP servers:

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

## Enterprise Configuration

### Managed MCP Servers (`managed-mcp.json`)
- Enterprise-approved servers
- Deployed via MDM (Mobile Device Management)
- Users cannot remove or modify

### Managed Settings (`managed-settings.json`)
- Allowlists: Only these servers can be added
- Denylists: These servers are blocked
- Policy enforcement at org level

**Example `managed-mcp.json`**:
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

## Claude as MCP Server

Expose Claude's tools to other MCP clients:

```bash
# Start Claude as an MCP server
claude mcp serve

# Connect from another client
# Server runs on stdio or HTTP
```

**Use cases**:
- Chain multiple Claude instances
- Build complex AI workflows
- Integrate Claude tools into your own MCP client

## Production Checklist

Before deploying your MCP server:

- [ ] **Input validation**: All tool inputs validated with Zod schemas
- [ ] **Error handling**: Graceful error messages, no sensitive data leaks
- [ ] **Rate limiting**: Respect external API limits, implement internal limits
- [ ] **Logging**: Structured logging for debugging (but not sensitive data)
- [ ] **Testing**: Unit tests for all tools
- [ ] **Documentation**: Tool descriptions match actual behavior
- [ ] **Security audit**: Review for injection vulnerabilities
- [ ] **API key rotation**: Support for updating keys without restart
- [ ] **Monitoring**: Health check endpoint, uptime tracking
- [ ] **Version control**: Semantic versioning for breaking changes

## Advanced Usage Examples

### Custom Indicator Parameters

> "Create a Bitcoin chart with a 50-period RSI (instead of default 14) and Bollinger Bands with 3 standard deviations"

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

## AI Chart Analysis

The server includes **AI-powered chart analysis** using OpenAI's GPT-4 Vision API.

### Features
- Technical Analysis - Trend, support/resistance, patterns
- Trading Signals - Entry/stop/target with risk/reward
- Sentiment Analysis - Bullish/bearish/neutral with confidence
- Risk Assessment - Position sizing recommendations
- Multi-Model Support - GPT-4o, GPT-4o-mini

### Configuration

```bash
# .env file
OPENAI_API_KEY=sk-your-key-here
ANALYSIS_DEFAULT_MODEL=gpt-4o-mini
ANALYSIS_MAX_TOKENS=2000
ANALYSIS_TEMPERATURE=0.7
```

### MCP Tool: `analyze_chart`

**Parameters**:
- `chartUrl` or `chartPath` - Image to analyze
- `symbol` - Trading symbol
- `interval` - Timeframe
- `tradingStyle` - "day_trading", "swing_trading", or "scalping"
- `customPrompt` - Custom analysis instructions
- `generateSignal` - Generate actionable trading signal

**Example**:
> "Analyze this Bitcoin 4H chart and give me swing trading signals"

### Supported Models

| Model | Use Case | Cost/Chart |
|-------|----------|------------|
| gpt-4o-mini | Fast, cost-effective | ~$0.003 |
| gpt-4o | Most capable | ~$0.01 |
| gpt-4-turbo | Balanced | ~$0.007 |
