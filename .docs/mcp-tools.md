# MCP Tools Specification

This document provides detailed specifications for all 6 MCP tools exposed by the Chart-Image server.

## Tool Overview

| Tool Name | Purpose | Priority | Dependencies |
|-----------|---------|----------|--------------|
| fetch_chart_documentation | Fetch & parse chart-img.com docs | High | None |
| get_exchanges | List available exchanges | Medium | chart-img.com API |
| get_symbols | Get symbols for exchange | Medium | chart-img.com API |
| construct_chart_config | Build JSON config from NL | High | fetch_chart_documentation |
| validate_chart_config | Validate chart config | Medium | fetch_chart_documentation |
| generate_chart_image | Generate chart image | High | chart-img.com API |

---

## Tool 1: fetch_chart_documentation

### Description
Dynamically fetches and parses the chart-img.com documentation from https://doc.chart-img.com. Returns structured JSON data about API capabilities, indicators, parameters, and constraints.

### Use Cases
- Before constructing a chart config
- When user asks about available indicators
- To understand API limits and constraints
- Cache refresh (every 24h)

### Input Schema

```typescript
{
  section?: string;  // Optional: "indicators" | "parameters" | "exchanges" | "all"
  forceRefresh?: boolean;  // Optional: bypass cache
}
```

### Output Schema

```typescript
{
  success: boolean;
  data: {
    indicators: Array<{
      name: string;              // e.g., "BollingerBands@tv-basicstudies"
      displayName: string;       // e.g., "Bollinger Bands"
      category: string;          // e.g., "Volatility"
      inputs: Record<string, {
        type: string;            // "number" | "string" | "boolean"
        default: any;
        description: string;
        min?: number;
        max?: number;
      }>;
    }>;
    chartParameters: {
      intervals: string[];       // ["1m", "5m", "15m", "1h", ...]
      ranges: string[];          // ["1D", "5D", "1M", "3M", ...]
      themes: string[];          // ["light", "dark"]
      styles: string[];          // ["candle", "line", "bar", ...]
    };
    rateLimits: Record<string, {
      requestsPerSecond: number;
      dailyMax: number;
      maxResolution: string;
      maxStudies: number;
    }>;
    examples: Array<{
      description: string;
      config: object;
    }>;
  };
  cachedAt: string;            // ISO 8601 timestamp
  error?: string;
}
```

### Example Usage

**AI Client Request**:
```json
{
  "tool": "fetch_chart_documentation",
  "input": {
    "section": "indicators"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "studies": [
      {
        "name": "BollingerBands@tv-basicstudies",
        "displayName": "Bollinger Bands",
        "category": "Volatility",
        "inputs": {
          "length": { "type": "number", "default": 20 },
          "stdDev": { "type": "number", "default": 2 }
        }
      },
      {
        "name": "RSI@tv-basicstudies",
        "displayName": "RSI",
        "category": "Momentum",
        "inputs": {
          "length": { "type": "number", "default": 14 }
        }
      }
    ]
  },
  "cachedAt": "2024-10-24T12:00:00Z"
}
```

### Implementation Notes
- Cache documentation for 24 hours
- Parse HTML using Cheerio
- Extract data from anchor links and sections
- Fallback to cached version on fetch failure
- Log cache hits/misses

---

## Tool 2: get_exchanges

### Description
Retrieves the list of available exchanges from chart-img.com API v3. Useful for symbol discovery and validation.

### Use Cases
- User asks "What exchanges are available?"
- Before constructing symbol string
- Validating user-provided exchange names

### Input Schema

```typescript
{
  // No inputs - returns all exchanges
}
```

### Output Schema

```typescript
{
  success: boolean;
  exchanges: Array<{
    id: string;              // e.g., "BINANCE"
    name: string;            // e.g., "Binance"
    type: string;            // "crypto" | "stock" | "forex" | "futures"
    description: string;
  }>;
  count: number;
  error?: string;
}
```

### Example Usage

**AI Client Request**:
```json
{
  "tool": "get_exchanges",
  "input": {}
}
```

**Response**:
```json
{
  "success": true,
  "exchanges": [
    {
      "id": "BINANCE",
      "name": "Binance",
      "type": "crypto",
      "description": "Global cryptocurrency exchange"
    },
    {
      "id": "NASDAQ",
      "name": "NASDAQ",
      "type": "stock",
      "description": "US stock exchange"
    }
  ],
  "count": 50
}
```

### Implementation Notes
- Calls `/v3/tradingview/exchanges`
- Cache results for 1 hour (exchanges rarely change)
- Return sorted by type then name

---

## Tool 3: get_symbols

### Description
Retrieves available trading symbols for a specific exchange.

### Use Cases
- User specifies exchange but not symbol
- Symbol validation
- Symbol suggestions

### Input Schema

```typescript
{
  exchange: string;        // Required: exchange ID (e.g., "BINANCE")
  search?: string;         // Optional: filter symbols (e.g., "BTC")
  limit?: number;          // Optional: max results (default: 50)
}
```

### Output Schema

```typescript
{
  success: boolean;
  exchange: string;
  symbols: Array<{
    symbol: string;          // e.g., "BTCUSDT"
    fullSymbol: string;      // e.g., "BINANCE:BTCUSDT"
    description: string;     // e.g., "Bitcoin / TetherUS"
    type: string;            // "crypto" | "stock" | etc.
  }>;
  count: number;
  error?: string;
}
```

### Example Usage

**AI Client Request**:
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
  "success": true,
  "exchange": "BINANCE",
  "symbols": [
    {
      "symbol": "BTCUSDT",
      "fullSymbol": "BINANCE:BTCUSDT",
      "description": "Bitcoin / TetherUS",
      "type": "crypto"
    },
    {
      "symbol": "BTCBUSD",
      "fullSymbol": "BINANCE:BTCBUSD",
      "description": "Bitcoin / BUSD",
      "type": "crypto"
    }
  ],
  "count": 10
}
```

### Implementation Notes
- Calls `/v3/tradingview/exchange/<EXCHANGE>/symbols`
- Client-side filtering if API doesn't support search
- Cache per exchange for 1 hour

---

## Tool 4: construct_chart_config

### Description
**Core intelligence tool** that constructs a complete chart-img.com API v2 JSON configuration from natural language requirements.

### Use Cases
- User provides natural language chart description
- Convert AI-interpreted requirements to API format
- Apply sensible defaults

### Input Schema

```typescript
{
  naturalLanguage: string;     // Required: user's description
  symbol?: string;             // Optional: override symbol detection
  exchange?: string;           // Optional: preferred exchange
  preferences?: {
    theme?: "light" | "dark";
    resolution?: string;       // "800x600" | "1920x1080" etc.
    interval?: string;
    range?: string;
  };
}
```

### Output Schema

```typescript
{
  success: boolean;
  config: {
    symbol: string;            // "EXCHANGE:SYMBOL"
    interval: string;          // "1m" | "5m" | "1h" | etc.
    range?: string;            // "1D" | "7D" | "1M" | etc.
    theme?: "light" | "dark";
    style?: string;            // "candle" | "line" | etc.
    width?: number;
    height?: number;
    studies?: Array<{
      name: string;            // Indicator name
      inputs?: Record<string, any>;
      override?: Record<string, any>;
    }>;
    drawings?: Array<{
      type: string;
      coordinates: any;
      style?: any;
    }>;
    override?: Record<string, any>;
  };
  reasoning: string;           // Explanation of choices
  warnings: string[];          // Potential issues
  error?: string;
}
```

### Example Usage

**AI Client Request**:
```json
{
  "tool": "construct_chart_config",
  "input": {
    "naturalLanguage": "Show Bitcoin with Bollinger Bands and RSI for the last 7 days",
    "exchange": "BINANCE",
    "preferences": {
      "theme": "dark"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "1h",
    "range": "7D",
    "theme": "dark",
    "style": "candle",
    "width": 1200,
    "height": 675,
    "studies": [
      {
        "name": "BollingerBands@tv-basicstudies",
        "inputs": { "length": 20, "stdDev": 2 }
      },
      {
        "name": "RSI@tv-basicstudies",
        "inputs": { "length": 14 }
      }
    ]
  },
  "reasoning": "Detected Bitcoin (BTCUSDT), interpreted '7 days' as range '7D', selected 1h interval for good resolution, added requested indicators with default parameters",
  "warnings": []
}
```

### Intelligence Patterns

**Symbol Detection**:
- "Bitcoin" | "BTC" → BTCUSDT
- "Ethereum" | "ETH" → ETHUSDT
- "Apple" | "AAPL" → NASDAQ:AAPL
- "EUR/USD" → FX:EURUSD

**Time Range Detection**:
- "last 7 days" | "past week" → "7D"
- "last month" | "30 days" → "1M"
- "last year" → "1Y"
- "today" → "1D"

**Interval Selection** (based on range):
- Range < 1D → interval: "5m" or "15m"
- Range 1D-7D → interval: "1h"
- Range 1M-3M → interval: "4h" or "1D"
- Range > 3M → interval: "1D" or "1W"

**Indicator Detection**:
- "Bollinger Bands" → BollingerBands@tv-basicstudies
- "RSI" | "Relative Strength" → RSI@tv-basicstudies
- "MACD" → MACD@tv-basicstudies
- "Moving Average" | "MA" → MA@tv-basicstudies

### Implementation Notes
- Use fetch_chart_documentation first to get available indicators
- Pattern matching + NLP heuristics
- Validate all parameters against documentation
- Return warnings for ambiguous inputs
- Log construction decisions for debugging

---

## Tool 5: validate_chart_config

### Description
Validates a chart configuration against chart-img.com API constraints and best practices before submission.

### Use Cases
- Pre-flight validation
- Debugging failed chart generation
- Rate limit checking

### Input Schema

```typescript
{
  config: object;              // Chart config to validate
  planLevel?: string;          // Optional: "BASIC" | "PRO" | "MEGA" | "ULTRA"
}
```

### Output Schema

```typescript
{
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: "error" | "warning";
  }>;
  suggestions: string[];
  rateLimitCheck: {
    withinLimits: boolean;
    studyCount: number;
    maxStudies: number;
    resolution: string;
    maxResolution: string;
  };
}
```

### Example Usage

**AI Client Request**:
```json
{
  "tool": "validate_chart_config",
  "input": {
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "1h",
      "studies": [
        { "name": "BollingerBands@tv-basicstudies" },
        { "name": "RSI@tv-basicstudies" }
      ],
      "width": 1920,
      "height": 1080
    },
    "planLevel": "BASIC"
  }
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
    "Reduce width to 800 and height to 600 for BASIC plan",
    "Upgrade to PRO plan for higher resolution"
  ],
  "rateLimitCheck": {
    "withinLimits": true,
    "studyCount": 2,
    "maxStudies": 3,
    "resolution": "1920x1080",
    "maxResolution": "800x600"
  }
}
```

### Validation Rules

**Required Fields**:
- symbol (must match EXCHANGE:SYMBOL format)
- interval (must be valid interval)

**Optional Field Validations**:
- resolution: Check against plan limits
- studies: Count must be ≤ plan limit
- theme: Must be "light" or "dark"
- style: Must be valid chart style

**Rate Limit Checks**:
- Study count vs plan limit
- Resolution vs plan limit
- Drawing count vs plan limit

### Implementation Notes
- Fetch documentation to get valid values
- Check against plan-specific limits
- Provide actionable error messages
- Return warnings for suboptimal configs

---

## Tool 6: generate_chart_image

### Description
Sends the validated configuration to chart-img.com API v2 and returns the generated chart image.

### Use Cases
- Final chart generation step
- After validation passes
- Direct chart generation with pre-built config

### Input Schema

```typescript
{
  config: object;              // Required: chart configuration
  storage?: boolean;           // Optional: use storage endpoint (returns URL)
  format?: "png" | "jpeg";    // Optional: image format
}
```

### Output Schema

```typescript
{
  success: boolean;
  imageUrl?: string;           // If storage=true
  imageData?: string;          // Base64 if storage=false
  metadata: {
    format: string;
    resolution: string;
    generatedAt: string;       // ISO 8601
    expiresAt?: string;        // If storage=true
  };
  apiResponse: {
    statusCode: number;
    rateLimitRemaining?: number;
  };
  error?: string;
}
```

### Example Usage

**AI Client Request**:
```json
{
  "tool": "generate_chart_image",
  "input": {
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "1h",
      "range": "7D",
      "studies": [
        { "name": "BollingerBands@tv-basicstudies" }
      ]
    },
    "storage": true,
    "format": "png"
  }
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
    "generatedAt": "2024-10-24T12:00:00Z",
    "expiresAt": "2024-10-31T12:00:00Z"
  },
  "apiResponse": {
    "statusCode": 200,
    "rateLimitRemaining": 498
  }
}
```

### Implementation Notes
- POST to `/v2/tradingview/advanced-chart` or `/v2/tradingview/advanced-chart/storage`
- Include `x-api-key` header
- Handle rate limiting (exponential backoff)
- Return both URL and metadata
- Log API response details
- Implement retry logic (max 3 retries)

---

## Tool Interaction Patterns

### Pattern 1: Simple Chart Generation
```
1. construct_chart_config (NL → JSON)
2. validate_chart_config (optional)
3. generate_chart_image
```

### Pattern 2: Exploration First
```
1. get_exchanges
2. get_symbols
3. construct_chart_config
4. generate_chart_image
```

### Pattern 3: Documentation-Driven
```
1. fetch_chart_documentation
2. construct_chart_config (informed by docs)
3. validate_chart_config
4. generate_chart_image
```

### Pattern 4: Iterative Refinement
```
1. construct_chart_config
2. validate_chart_config (validation fails)
3. construct_chart_config (retry with corrections)
4. validate_chart_config (success)
5. generate_chart_image
```

---

## Error Handling

### Common Errors

**Authentication Errors**:
```json
{
  "success": false,
  "error": "Invalid API key. Check CHART_IMG_API_KEY environment variable."
}
```

**Rate Limit Errors**:
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60
}
```

**Validation Errors**:
```json
{
  "success": false,
  "error": "Invalid configuration",
  "details": [
    { "field": "symbol", "message": "Invalid symbol format" }
  ]
}
```

### Error Recovery Strategies

1. **API Key Missing**: Prompt user to set environment variable
2. **Rate Limit**: Wait and retry with exponential backoff
3. **Invalid Config**: Use validate_chart_config to identify issues
4. **Network Error**: Retry up to 3 times with backoff

---

## Testing Recommendations

### Unit Tests
- Test each tool in isolation
- Mock chart-img.com API responses
- Test error handling paths

### Integration Tests
- Test tool interaction patterns
- Test with real API (rate-limited)
- Test caching behavior

### AI Client Tests
- Test with Claude Desktop
- Test with ChatGPT (if supported)
- Test natural language variations

---

## Performance Metrics

### Target Latencies

| Tool | Target | Notes |
|------|--------|-------|
| fetch_chart_documentation | < 2s (uncached) | Cache hit: < 50ms |
| get_exchanges | < 1s | Cached: < 50ms |
| get_symbols | < 2s | Depends on exchange size |
| construct_chart_config | < 500ms | Pure computation |
| validate_chart_config | < 200ms | Pure validation |
| generate_chart_image | < 5s | Depends on complexity |

### Optimization Strategies
- Cache documentation for 24h
- Cache exchanges for 1h
- Cache symbols per exchange for 1h
- Parallel tool execution where possible
- Connection pooling for API requests
