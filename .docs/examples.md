# Usage Examples

This document provides real-world examples of using the MCP Chart-Image server with AI clients.

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Advanced Examples](#advanced-examples)
3. [Multi-Step Workflows](#multi-step-workflows)
4. [Error Handling Examples](#error-handling-examples)
5. [Trading Strategy Examples](#trading-strategy-examples)

---

## Basic Examples

### Example 1: Simple Bitcoin Chart

**User Prompt**:
> "Show me a Bitcoin chart"

**AI Client Tool Sequence**:

1. **construct_chart_config**:
```json
{
  "naturalLanguage": "Show me a Bitcoin chart",
  "exchange": "BINANCE"
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "1h",
    "range": "1D",
    "theme": "dark",
    "style": "candle",
    "width": 1200,
    "height": 675
  },
  "reasoning": "Detected Bitcoin, defaulted to BINANCE:BTCUSDT with 1-hour candles for the last day"
}
```

2. **generate_chart_image**:
```json
{
  "config": { /* config from step 1 */ },
  "storage": true
}
```

**Response**:
```json
{
  "success": true,
  "imageUrl": "https://api.chart-img.com/storage/abc123.png",
  "metadata": {
    "format": "PNG",
    "resolution": "1200x675",
    "generatedAt": "2024-10-24T12:00:00Z"
  }
}
```

---

### Example 2: Chart with Single Indicator

**User Prompt**:
> "Generate a BTC chart with RSI indicator"

**Tool Sequence**:

1. **construct_chart_config**:
```json
{
  "naturalLanguage": "BTC chart with RSI indicator"
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "1h",
    "range": "1D",
    "studies": [
      {
        "name": "RSI@tv-basicstudies",
        "inputs": { "length": 14 }
      }
    ]
  }
}
```

2. **generate_chart_image** (same as above)

---

### Example 3: Specific Time Range

**User Prompt**:
> "Show me Ethereum for the last 7 days"

**Tool Sequence**:

1. **construct_chart_config**:
```json
{
  "naturalLanguage": "Ethereum for the last 7 days"
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "symbol": "BINANCE:ETHUSDT",
    "interval": "1h",
    "range": "7D",
    "theme": "dark",
    "style": "candle"
  },
  "reasoning": "Detected Ethereum, interpreted 'last 7 days' as range '7D' with 1-hour interval"
}
```

---

## Advanced Examples

### Example 4: Multiple Indicators

**User Prompt**:
> "I want a Bitcoin chart with Bollinger Bands, RSI, and MACD indicators showing the last month"

**Tool Sequence**:

1. **fetch_chart_documentation** (to get indicator specs):
```json
{
  "section": "indicators"
}
```

2. **construct_chart_config**:
```json
{
  "naturalLanguage": "Bitcoin with Bollinger Bands, RSI, and MACD for last month"
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "1M",
    "theme": "dark",
    "studies": [
      {
        "name": "BollingerBands@tv-basicstudies",
        "inputs": {
          "length": 20,
          "stdDev": 2
        }
      },
      {
        "name": "RSI@tv-basicstudies",
        "inputs": { "length": 14 }
      },
      {
        "name": "MACD@tv-basicstudies",
        "inputs": {
          "fast": 12,
          "slow": 26,
          "signal": 9
        }
      }
    ]
  },
  "reasoning": "Detected 3 indicators: Bollinger Bands, RSI, MACD. Set 4h interval for 1-month range to balance detail and clarity."
}
```

3. **validate_chart_config**:
```json
{
  "config": { /* from step 2 */ },
  "planLevel": "PRO"
}
```

**Response**:
```json
{
  "valid": true,
  "errors": [],
  "suggestions": [],
  "rateLimitCheck": {
    "withinLimits": true,
    "studyCount": 3,
    "maxStudies": 5
  }
}
```

4. **generate_chart_image**

---

### Example 5: Custom Symbol from Specific Exchange

**User Prompt**:
> "Show me Apple stock from NASDAQ with moving averages"

**Tool Sequence**:

1. **get_exchanges** (optional - to confirm NASDAQ):
```json
{}
```

2. **get_symbols**:
```json
{
  "exchange": "NASDAQ",
  "search": "AAPL",
  "limit": 5
}
```

**Response**:
```json
{
  "success": true,
  "exchange": "NASDAQ",
  "symbols": [
    {
      "symbol": "AAPL",
      "fullSymbol": "NASDAQ:AAPL",
      "description": "Apple Inc.",
      "type": "stock"
    }
  ]
}
```

3. **construct_chart_config**:
```json
{
  "naturalLanguage": "Apple stock with moving averages",
  "symbol": "NASDAQ:AAPL"
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "symbol": "NASDAQ:AAPL",
    "interval": "1D",
    "range": "3M",
    "studies": [
      {
        "name": "MA@tv-basicstudies",
        "inputs": { "length": 20 }
      },
      {
        "name": "MA@tv-basicstudies",
        "inputs": { "length": 50 }
      }
    ]
  },
  "reasoning": "Added two moving averages (20-day and 50-day) for trend analysis"
}
```

---

### Example 6: Light Theme with Custom Resolution

**User Prompt**:
> "Create a high-resolution light theme chart of EUR/USD forex pair with Ichimoku Cloud"

**Tool Sequence**:

1. **construct_chart_config**:
```json
{
  "naturalLanguage": "EUR/USD forex with Ichimoku Cloud",
  "preferences": {
    "theme": "light",
    "resolution": "1920x1080"
  }
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "symbol": "FX:EURUSD",
    "interval": "1h",
    "range": "1M",
    "theme": "light",
    "width": 1920,
    "height": 1080,
    "studies": [
      {
        "name": "IchimokuCloud@tv-basicstudies"
      }
    ]
  }
}
```

2. **validate_chart_config**:
```json
{
  "config": { /* above */ },
  "planLevel": "BASIC"
}
```

**Response**:
```json
{
  "valid": false,
  "errors": [
    {
      "field": "resolution",
      "message": "Resolution 1920x1080 exceeds BASIC plan limit of 800x600",
      "severity": "error"
    }
  ],
  "suggestions": [
    "Reduce to 800x600 for BASIC plan",
    "Or upgrade to PRO plan for 1920x1080"
  ]
}
```

3. **AI adjusts and retries with lower resolution**

---

## Multi-Step Workflows

### Example 7: Exploration to Generation

**User Prompt**:
> "What cryptocurrency exchanges are available? Show me the top Bitcoin pair from Binance with volume indicator"

**Tool Sequence**:

**Step 1: Explore exchanges**
```json
{
  "tool": "get_exchanges"
}
```

**Response**:
```json
{
  "exchanges": [
    { "id": "BINANCE", "name": "Binance", "type": "crypto" },
    { "id": "COINBASE", "name": "Coinbase", "type": "crypto" },
    { "id": "KRAKEN", "name": "Kraken", "type": "crypto" }
  ]
}
```

**AI Response to User**: "Available crypto exchanges include Binance, Coinbase, and Kraken. Let me get Bitcoin pairs from Binance..."

**Step 2: Get symbols**
```json
{
  "tool": "get_symbols",
  "input": {
    "exchange": "BINANCE",
    "search": "BTC",
    "limit": 10
  }
}
```

**Response**:
```json
{
  "symbols": [
    { "symbol": "BTCUSDT", "fullSymbol": "BINANCE:BTCUSDT", "description": "Bitcoin / TetherUS" },
    { "symbol": "BTCBUSD", "fullSymbol": "BINANCE:BTCBUSD", "description": "Bitcoin / BUSD" }
  ]
}
```

**AI Response**: "Top pair is BTCUSDT. Generating chart with volume..."

**Step 3: Generate chart**
```json
{
  "tool": "construct_chart_config",
  "input": {
    "naturalLanguage": "BTCUSDT with volume indicator",
    "symbol": "BINANCE:BTCUSDT"
  }
}
```

**Step 4: Generate image**
```json
{
  "tool": "generate_chart_image",
  "input": { "config": { /* from step 3 */ }, "storage": true }
}
```

---

### Example 8: Documentation-Driven Configuration

**User Prompt**:
> "What indicators are available for volatility analysis? Use them to analyze Bitcoin"

**Tool Sequence**:

**Step 1: Fetch documentation**
```json
{
  "tool": "fetch_chart_documentation",
  "input": { "section": "indicators" }
}
```

**Response**:
```json
{
  "studies": [
    { "name": "BollingerBands@tv-basicstudies", "category": "Volatility" },
    { "name": "ATR@tv-basicstudies", "category": "Volatility" },
    { "name": "DonchianChannels@tv-basicstudies", "category": "Volatility" },
    { "name": "KeltnerChannels@tv-basicstudies", "category": "Volatility" }
  ]
}
```

**AI Response**: "Available volatility indicators: Bollinger Bands, ATR, Donchian Channels, and Keltner Channels. I'll create a Bitcoin chart with Bollinger Bands and ATR..."

**Step 2: Construct config**
```json
{
  "naturalLanguage": "Bitcoin with Bollinger Bands and ATR"
}
```

**Step 3: Generate**

---

## Error Handling Examples

### Example 9: Invalid Symbol Recovery

**User Prompt**:
> "Show me XYZ coin"

**Tool Sequence**:

**Step 1: Construct (fails)**
```json
{
  "success": false,
  "error": "Could not identify symbol 'XYZ coin'",
  "suggestions": ["Please specify the exchange", "Try using full name"]
}
```

**AI Response**: "I couldn't find 'XYZ coin'. Could you clarify which coin you mean or which exchange?"

**User**: "I meant XRP from Binance"

**Step 2: Retry**
```json
{
  "naturalLanguage": "XRP from Binance"
}
```

**Success!**

---

### Example 10: Rate Limit Handling

**Scenario**: User on BASIC plan tries to add too many indicators

**Tool Sequence**:

**Step 1: Construct**
```json
{
  "naturalLanguage": "Bitcoin with RSI, MACD, Bollinger Bands, and Stochastic"
}
```

**Step 2: Validate**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "studies",
      "message": "Study count (4) exceeds BASIC plan limit (3)",
      "severity": "error"
    }
  ],
  "suggestions": [
    "Remove one indicator",
    "Upgrade to PRO plan for up to 5 indicators"
  ]
}
```

**AI Response**: "Your BASIC plan allows up to 3 indicators, but you requested 4. Which indicator would you like to remove? Or would you like to upgrade to PRO?"

**User**: "Remove Stochastic"

**Step 3: Reconstruct with 3 indicators**

---

## Trading Strategy Examples

### Example 11: Trend Following Strategy

**User Prompt**:
> "I want to analyze Bitcoin using a trend-following strategy with moving average crossovers and momentum confirmation. Show last 3 months"

**Tool Sequence**:

```json
{
  "tool": "construct_chart_config",
  "input": {
    "naturalLanguage": "Bitcoin trend-following with MA crossovers and momentum, last 3 months"
  }
}
```

**Response**:
```json
{
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "3M",
    "studies": [
      {
        "name": "EMA@tv-basicstudies",
        "inputs": { "length": 20 },
        "override": { "plot.color": "#2196F3" }
      },
      {
        "name": "EMA@tv-basicstudies",
        "inputs": { "length": 50 },
        "override": { "plot.color": "#FF5252" }
      },
      {
        "name": "MACD@tv-basicstudies"
      }
    ]
  },
  "reasoning": "Added 20 and 50-period EMAs for crossover signals, plus MACD for momentum confirmation"
}
```

---

### Example 12: Mean Reversion Strategy

**User Prompt**:
> "Generate a chart for mean reversion trading on Ethereum. I need Bollinger Bands, RSI, and want to identify overbought/oversold conditions"

**Tool Sequence**:

```json
{
  "tool": "construct_chart_config",
  "input": {
    "naturalLanguage": "Ethereum mean reversion with Bollinger Bands and RSI for overbought/oversold"
  }
}
```

**Response**:
```json
{
  "config": {
    "symbol": "BINANCE:ETHUSDT",
    "interval": "1h",
    "range": "1M",
    "studies": [
      {
        "name": "BollingerBands@tv-basicstudies",
        "inputs": {
          "length": 20,
          "stdDev": 2
        }
      },
      {
        "name": "RSI@tv-basicstudies",
        "inputs": { "length": 14 }
      }
    ],
    "drawings": [
      {
        "type": "horizontal_line",
        "coordinates": { "price": 70 },
        "style": { "color": "#FF5252", "linestyle": 2 }
      },
      {
        "type": "horizontal_line",
        "coordinates": { "price": 30 },
        "style": { "color": "#4CAF50", "linestyle": 2 }
      }
    ]
  },
  "reasoning": "BB for volatility bands, RSI with 70/30 levels marked for overbought/oversold zones"
}
```

---

### Example 13: Multi-Timeframe Analysis

**User Prompt**:
> "I want to analyze Bitcoin on multiple timeframes. Show me daily chart with weekly moving averages"

**Note**: Multi-chart generation requires multiple tool calls

**Tool Sequence**:

**Chart 1: Daily timeframe**
```json
{
  "naturalLanguage": "Bitcoin daily chart with 20 and 50-day moving averages"
}
```

**Chart 2: Weekly timeframe**
```json
{
  "naturalLanguage": "Bitcoin weekly chart with 10 and 20-week moving averages",
  "preferences": { "interval": "1W" }
}
```

**AI generates both charts and presents them together**

---

## Advanced Configuration Examples

### Example 14: Custom Indicator Parameters

**User Prompt**:
> "Create a Bitcoin chart with a 50-period RSI (instead of default 14) and Bollinger Bands with 3 standard deviations"

**Tool Sequence**:

```json
{
  "tool": "construct_chart_config",
  "input": {
    "naturalLanguage": "Bitcoin with 50-period RSI and Bollinger Bands with 3 std dev"
  }
}
```

**Response**:
```json
{
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "studies": [
      {
        "name": "RSI@tv-basicstudies",
        "inputs": { "length": 50 }
      },
      {
        "name": "BollingerBands@tv-basicstudies",
        "inputs": {
          "length": 20,
          "stdDev": 3
        }
      }
    ]
  },
  "reasoning": "Custom RSI period set to 50, BB standard deviation increased to 3 for wider bands"
}
```

---

### Example 15: Forex Pair with Custom Styling

**User Prompt**:
> "Show me GBP/USD with EMA and make the chart look professional for a presentation"

**Tool Sequence**:

```json
{
  "tool": "construct_chart_config",
  "input": {
    "naturalLanguage": "GBP/USD with EMA, professional presentation style",
    "preferences": {
      "theme": "light",
      "resolution": "1920x1080"
    }
  }
}
```

**Response**:
```json
{
  "config": {
    "symbol": "FX:GBPUSD",
    "interval": "1D",
    "range": "6M",
    "theme": "light",
    "style": "candle",
    "width": 1920,
    "height": 1080,
    "studies": [
      {
        "name": "EMA@tv-basicstudies",
        "inputs": { "length": 21 }
      }
    ],
    "override": {
      "paneProperties.background": "#FFFFFF",
      "paneProperties.vertGridProperties.color": "#E0E0E0",
      "paneProperties.horzGridProperties.color": "#E0E0E0",
      "scalesProperties.textColor": "#333333"
    }
  }
}
```

---

## Integration Examples

### Example 16: Claude Desktop Usage

**Setup in Claude Desktop config**:
```json
{
  "mcpServers": {
    "chart-img": {
      "command": "node",
      "args": ["/path/to/mcp-chart-image/src/mcp/server.ts"],
      "env": {
        "CHART_IMG_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**In Chat**:
> User: "I'm analyzing a potential Bitcoin entry. Can you show me the current trend with indicators?"

> Claude: "I'll generate a Bitcoin chart with trend analysis indicators..."
>
> [Uses fetch_chart_documentation → construct_chart_config → generate_chart_image]
>
> "Here's the chart: [image]. Based on the indicators:
> - 20 EMA is above 50 EMA (bullish crossover)
> - RSI at 62 (neutral, room to run)
> - MACD showing positive momentum
>
> The trend appears bullish in the short-term..."

---

## Tips for Users

### Best Practices

1. **Be specific with time ranges**: "last 7 days" is better than "recent"
2. **Mention exchange for crypto**: "Bitcoin on Binance" vs just "Bitcoin"
3. **List indicators explicitly**: "RSI and MACD" vs "momentum indicators"
4. **Specify theme preference**: "dark theme" or "light theme for presentation"

### Common Phrases

**Time Ranges**:
- "last 24 hours" / "today" → 1D
- "last week" / "past 7 days" → 7D
- "last month" / "30 days" → 1M
- "last quarter" / "3 months" → 3M
- "year to date" → YTD
- "last year" → 1Y

**Assets**:
- "Bitcoin" / "BTC" → BINANCE:BTCUSDT
- "Ethereum" / "ETH" → BINANCE:ETHUSDT
- "Apple" / "AAPL" → NASDAQ:AAPL
- "EUR/USD" / "EURUSD" → FX:EURUSD

**Indicators**:
- "Bollinger Bands" / "BB"
- "RSI" / "Relative Strength Index"
- "MACD" / "Moving Average Convergence Divergence"
- "Moving Average" / "MA" / "EMA" / "SMA"

---

## Troubleshooting Examples

### Problem: Chart generation takes too long

**Solution**: Use simpler configurations
```json
{
  "symbol": "BINANCE:BTCUSDT",
  "interval": "1h",
  "range": "1D"
  // Minimal config - fastest generation
}
```

### Problem: Can't find specific indicator

**Solution**: Use fetch_chart_documentation first
```json
{
  "tool": "fetch_chart_documentation",
  "input": { "section": "indicators" }
}
```

### Problem: Symbol not found

**Solution**: Use get_exchanges and get_symbols to discover
```json
// Step 1
{ "tool": "get_exchanges" }

// Step 2
{ "tool": "get_symbols", "input": { "exchange": "BINANCE", "search": "BTC" } }
```

---

## Next Steps

- See [deployment.md](./deployment.md) for setup instructions
- See [mcp-tools.md](./mcp-tools.md) for detailed tool specifications
- See [architecture.md](./architecture.md) for system design
