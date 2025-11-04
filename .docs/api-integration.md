# chart-img.com API Integration Guide

This document details how the MCP Chart-Image server integrates with the chart-img.com REST API.

## API Overview

**Base URL**: `https://api.chart-img.com`

**Documentation**: https://doc.chart-img.com

**API Versions Used**:
- **v2**: Advanced chart generation (POST with JSON)
- **v3**: Exchange and symbol metadata (GET)

---

## Authentication

### API Key Configuration

chart-img.com uses API key authentication via headers.

**Header Format**:
```
x-api-key: YOUR_API_KEY
```

**Environment Variable**:
```bash
CHART_IMG_API_KEY=your_api_key_here
```

### Obtaining an API Key

1. Sign up at https://chart-img.com
2. Choose a plan (BASIC, PRO, MEGA, ULTRA, ENTERPRISE)
3. Generate API key from dashboard
4. Store in `.env` file (never commit to git)

### Rate Limits by Plan

| Plan | Requests/sec | Daily Max | Max Resolution | Studies+Drawings |
|------|-------------|-----------|----------------|------------------|
| BASIC | 1 | 50 | 800×600 | 3 |
| PRO | 10 | 500 | 1920×1080 | 5 |
| MEGA | 15 | 1,000 | 1920×1600 | 10 |
| ULTRA | 35 | 3,000 | 2048×1920 | 25 |
| ENTERPRISE | 35+ | 5,000+ | 2048×1920 | 50 |

---

## API Endpoints Used

### 1. POST /v2/tradingview/advanced-chart

**Purpose**: Generate advanced charts with indicators, drawings, and custom settings.

**Request**:
```http
POST https://api.chart-img.com/v2/tradingview/advanced-chart
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
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
      "inputs": {
        "length": 20,
        "stdDev": 2
      }
    }
  ]
}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: image/png

[Binary PNG data]
```

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1698134400
```

### 2. POST /v2/tradingview/advanced-chart/storage

**Purpose**: Same as above but stores image publicly and returns URL.

**Request**: Same as advanced-chart

**Response**:
```json
{
  "success": true,
  "url": "https://api.chart-img.com/storage/abc123.png",
  "expiresAt": "2024-10-31T12:00:00Z",
  "metadata": {
    "format": "PNG",
    "resolution": "1200x675"
  }
}
```

### 3. GET /v3/tradingview/exchanges

**Purpose**: List all available exchanges.

**Request**:
```http
GET https://api.chart-img.com/v3/tradingview/exchanges
x-api-key: YOUR_API_KEY
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
  ]
}
```

### 4. GET /v3/tradingview/exchange/{EXCHANGE}/symbols

**Purpose**: Get available symbols for a specific exchange.

**Request**:
```http
GET https://api.chart-img.com/v3/tradingview/exchange/BINANCE/symbols
x-api-key: YOUR_API_KEY
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
    }
  ]
}
```

---

## Request/Response Formats

### Chart Configuration Schema (v2)

```typescript
interface ChartConfig {
  // Required
  symbol: string;              // Format: "EXCHANGE:SYMBOL"

  // Time & Range
  interval?: string;           // "1m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "1D" | "1W" | "1M"
  range?: string;              // "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "ALL"
  // OR
  from?: string;               // ISO 8601 date
  to?: string;                 // ISO 8601 date

  // Appearance
  theme?: "light" | "dark";
  style?: "bar" | "candle" | "line" | "area" | "heikinAshi" | "hollowCandle" | "baseline" | "hiLo" | "column";
  width?: number;              // Max depends on plan
  height?: number;             // Max depends on plan

  // Indicators
  studies?: Array<{
    name: string;              // e.g., "RSI@tv-basicstudies"
    inputs?: Record<string, any>;
    override?: Record<string, any>;  // Style overrides
  }>;

  // Drawings
  drawings?: Array<{
    type: string;              // "horizontal_line" | "vertical_line" | "trend_line" | "rectangle" | etc.
    coordinates: {
      time?: number;           // Unix timestamp
      price?: number;
      time2?: number;
      price2?: number;
    };
    style?: {
      color?: string;
      linewidth?: number;
      linestyle?: number;      // 0=solid, 1=dotted, 2=dashed
    };
  }>;

  // Advanced Overrides
  override?: {
    // Chart settings
    "mainSeriesProperties.showCountdown"?: boolean;
    "mainSeriesProperties.showPriceLine"?: boolean;
    "paneProperties.background"?: string;
    "paneProperties.vertGridProperties.color"?: string;
    "paneProperties.horzGridProperties.color"?: string;
    "scalesProperties.showLeftScale"?: boolean;
    "scalesProperties.showRightScale"?: boolean;
    // ... many more options
  };
}
```

### Available Indicators

**Volatility**:
- `BollingerBands@tv-basicstudies`
- `ATR@tv-basicstudies`
- `DonchianChannels@tv-basicstudies`
- `KeltnerChannels@tv-basicstudies`

**Momentum**:
- `RSI@tv-basicstudies`
- `MACD@tv-basicstudies`
- `Stochastic@tv-basicstudies`
- `CCI@tv-basicstudies`
- `MOM@tv-basicstudies`

**Trend**:
- `MA@tv-basicstudies` (Simple Moving Average)
- `EMA@tv-basicstudies` (Exponential Moving Average)
- `WMA@tv-basicstudies` (Weighted Moving Average)
- `IchimokuCloud@tv-basicstudies`
- `ParabolicSAR@tv-basicstudies`

**Volume**:
- `Volume@tv-basicstudies`
- `VWAP@tv-basicstudies`
- `VolumeProfile@tv-basicstudies`

**See full list**: https://doc.chart-img.com#indicators

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Return image/data |
| 400 | Bad Request | Validate config, fix errors |
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check plan limits |
| 429 | Rate Limit | Wait and retry |
| 500 | Server Error | Retry with backoff |
| 503 | Service Unavailable | Retry with backoff |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SYMBOL",
    "message": "Symbol 'INVALID:SYMBOL' not found",
    "details": {
      "field": "symbol",
      "provided": "INVALID:SYMBOL"
    }
  }
}
```

### Common Errors

**Invalid API Key**:
```json
{
  "error": "Invalid API key"
}
```
**Action**: Verify `CHART_IMG_API_KEY` environment variable

**Rate Limit Exceeded**:
```json
{
  "error": "Rate limit exceeded. Retry after 60 seconds.",
  "retryAfter": 60
}
```
**Action**: Implement exponential backoff, queue requests

**Plan Limit Exceeded**:
```json
{
  "error": "Resolution 1920x1080 exceeds plan limit of 800x600"
}
```
**Action**: Reduce resolution or upgrade plan

**Invalid Symbol**:
```json
{
  "error": "Symbol not found: INVALID:SYMBOL"
}
```
**Action**: Use get_exchanges and get_symbols to validate

---

## Implementation: ChartImgClient

### Client Wrapper (`src/mcp/utils/chart-img-client.ts`)

```typescript
class ChartImgClient {
  private apiKey: string;
  private baseUrl = 'https://api.chart-img.com';

  async generateChart(config: ChartConfig, storage = false): Promise<ChartResponse> {
    const endpoint = storage
      ? '/v2/tradingview/advanced-chart/storage'
      : '/v2/tradingview/advanced-chart';

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new ChartImgError(response.status, await response.json());
    }

    if (storage) {
      return await response.json();
    } else {
      const imageBuffer = await response.arrayBuffer();
      return {
        imageData: Buffer.from(imageBuffer).toString('base64'),
        contentType: response.headers.get('content-type'),
      };
    }
  }

  async getExchanges(): Promise<Exchange[]> {
    const response = await fetch(`${this.baseUrl}/v3/tradingview/exchanges`, {
      headers: { 'x-api-key': this.apiKey },
    });

    const data = await response.json();
    return data.exchanges;
  }

  async getSymbols(exchange: string): Promise<Symbol[]> {
    const response = await fetch(
      `${this.baseUrl}/v3/tradingview/exchange/${exchange}/symbols`,
      { headers: { 'x-api-key': this.apiKey } }
    );

    const data = await response.json();
    return data.symbols;
  }
}
```

---

## Rate Limiting Strategy

### Client-Side Rate Limiting

**Implementation**:
```typescript
class RateLimiter {
  private requestQueue: Array<() => Promise<any>> = [];
  private requestsPerSecond: number;
  private dailyLimit: number;
  private requestCount = 0;
  private lastReset = Date.now();

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    // Check daily limit
    if (this.requestCount >= this.dailyLimit) {
      throw new Error('Daily rate limit exceeded');
    }

    // Wait if too many requests per second
    await this.waitIfNeeded();

    this.requestCount++;
    return await fn();
  }

  private async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastReset;

    if (elapsed >= 1000) {
      this.lastReset = now;
      this.requestCount = 0;
    }

    const maxRequests = this.requestsPerSecond;
    if (this.requestCount >= maxRequests) {
      const waitTime = 1000 - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

### Exponential Backoff for Retries

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Caching Strategy

### Cache Layers

**1. Documentation Cache**:
- TTL: 24 hours
- Key: `chart-img-docs-${section}`
- Storage: In-memory (Map) or Redis

**2. Exchange List Cache**:
- TTL: 1 hour
- Key: `chart-img-exchanges`
- Storage: In-memory

**3. Symbol List Cache**:
- TTL: 1 hour
- Key: `chart-img-symbols-${exchange}`
- Storage: In-memory

### Cache Implementation

```typescript
class SimpleCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  set(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }
}
```

---

## Security Considerations

### API Key Protection

**DO**:
- Store in environment variables
- Never log API keys
- Use `.env.local` for development
- Rotate keys periodically

**DON'T**:
- Commit API keys to git
- Expose in error messages
- Send to client-side code
- Share across projects

### Request Validation

**Validate Before Sending**:
- Symbol format (EXCHANGE:SYMBOL)
- Numeric ranges (width, height, inputs)
- Enum values (theme, style, interval)
- Array lengths (studies, drawings)

### Response Validation

**Verify Responses**:
- Content-Type headers
- JSON structure
- HTTP status codes
- Rate limit headers

---

## Testing with API

### Development Testing

**Use Storage Endpoint**:
- Easier to debug (URLs instead of binary)
- Can view charts in browser
- URLs expire after 7 days

**Test Incrementally**:
1. Simple chart (symbol + interval only)
2. Add theme and style
3. Add one indicator
4. Add multiple indicators
5. Add drawings

### Example Test Sequence

```typescript
// Test 1: Minimal config
const test1 = await client.generateChart({
  symbol: 'BINANCE:BTCUSDT',
  interval: '1h',
}, true);

// Test 2: With styling
const test2 = await client.generateChart({
  symbol: 'BINANCE:BTCUSDT',
  interval: '1h',
  theme: 'dark',
  style: 'candle',
  width: 800,
  height: 600,
}, true);

// Test 3: With indicator
const test3 = await client.generateChart({
  symbol: 'BINANCE:BTCUSDT',
  interval: '1h',
  theme: 'dark',
  studies: [
    { name: 'RSI@tv-basicstudies' }
  ],
}, true);
```

---

## API Limitations & Workarounds

### Known Limitations

1. **No real-time data on free plans**
   - Workaround: Use appropriate intervals

2. **Limited studies per chart**
   - Workaround: Create multiple charts if needed

3. **No custom indicators**
   - Workaround: Use built-in indicators creatively

4. **Fixed symbol formats**
   - Workaround: Maintain symbol mapping table

### Future Enhancements

1. **Webhook support** for async generation
2. **Batch chart generation**
3. **Custom templates**
4. **Historical data export**

---

## Resources

- **Official Docs**: https://doc.chart-img.com
- **API Status**: https://status.chart-img.com (if available)
- **Support**: support@chart-img.com
- **Pricing**: https://chart-img.com/pricing
- **Examples**: https://chart-img.com/examples

---

## Appendix: Full Example Request

```typescript
const fullExample = {
  symbol: 'BINANCE:BTCUSDT',
  interval: '1h',
  range: '7D',
  theme: 'dark',
  style: 'candle',
  width: 1920,
  height: 1080,
  studies: [
    {
      name: 'BollingerBands@tv-basicstudies',
      inputs: {
        length: 20,
        stdDev: 2,
      },
      override: {
        'plot.color.0': '#2196F3',
        'plot.color.1': '#FF5252',
        'plot.color.2': '#2196F3',
      },
    },
    {
      name: 'RSI@tv-basicstudies',
      inputs: {
        length: 14,
      },
      override: {
        'plot.color': '#9C27B0',
      },
    },
    {
      name: 'MACD@tv-basicstudies',
      inputs: {
        fast: 12,
        slow: 26,
        signal: 9,
      },
    },
  ],
  drawings: [
    {
      type: 'horizontal_line',
      coordinates: {
        price: 50000,
      },
      style: {
        color: '#FFC107',
        linewidth: 2,
        linestyle: 2, // dashed
      },
    },
  ],
  override: {
    'mainSeriesProperties.showCountdown': false,
    'paneProperties.background': '#000000',
    'paneProperties.vertGridProperties.color': '#1E1E1E',
    'paneProperties.horzGridProperties.color': '#1E1E1E',
    'scalesProperties.textColor': '#AAA',
  },
};
```
