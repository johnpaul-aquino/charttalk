# Chart Service - Frontend Integration Guide

API reference for the **Chart Service** microservice.

> **Service Name**: Chart Service
> **Purpose**: Chart generation, AI analysis, and conversational AI for trading charts
> **Repository**: `mcp-chart-image`

---

## Overview

### Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3010/api/v1` |
| Production | `https://api.charttalk.ai/api/v1` |

### Authentication Header

```
Authorization: Bearer <JWT_TOKEN>
```

JWT tokens are issued by the Laravel User Service.

### Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-12-01T10:30:00.000Z"
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-12-01T10:30:00.000Z",
    "path": "/api/v1/...",
    "method": "POST"
  }
}
```

---

## Authentication

### JWT Token Structure

Tokens from Laravel User Service contain:

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "plan": "pro",
  "plan_name": "Pro",
  "subscription_status": "active",
  "iat": 1732708800,
  "exp": 1732712400,
  "iss": "laravel-user-service"
}
```

### Plan-Based Access

| Plan | Free Endpoints | Premium Endpoints |
|------|----------------|-------------------|
| `free` | Charts, Exchanges, Docs | - |
| `pro` | All | AI Analysis, Chat, Conversations, S3 Storage |
| `max` | All | All (higher rate limits) |

**Subscription Status**: Must be `active` or `trialing` for premium endpoints.

---

## Endpoints Reference

### 1. Health Check

```
GET /api/v1/health
```

**Auth**: No | **Plan**: All

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.1",
    "timestamp": "2025-12-01T10:30:00.000Z",
    "uptime": 3600
  }
}
```

---

### 2. Construct Chart Config

Converts natural language to chart configuration.

```
POST /api/v1/charts/construct
```

**Auth**: Optional | **Plan**: All

**Request:**
```json
{
  "naturalLanguage": "Bitcoin with RSI for last 7 days",
  "exchange": "BINANCE",
  "symbol": "BTCUSDT",
  "preferences": {
    "interval": "4h",
    "range": "1M",
    "theme": "dark",
    "resolution": "1920x1080"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `naturalLanguage` | string | Yes | Chart description |
| `exchange` | string | No | Preferred exchange |
| `symbol` | string | No | Override symbol |
| `preferences.interval` | string | No | `1m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `1D`, `1W` |
| `preferences.range` | string | No | `1D`, `5D`, `1M`, `3M`, `6M`, `YTD`, `1Y`, `5Y`, `ALL` |
| `preferences.theme` | string | No | `light`, `dark` |
| `preferences.resolution` | string | No | e.g., `1920x1080` |

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
      "height": 1080,
      "studies": [
        {
          "name": "RelativeStrengthIndex@tv-basicstudies",
          "input": { "length": 14 }
        }
      ]
    },
    "reasoning": "Symbol: BINANCE:BTCUSDT | Time range: 1M | Interval: 4h",
    "warnings": []
  }
}
```

---

### 3. Validate Chart Config

Validates configuration against plan limits.

```
POST /api/v1/charts/validate
```

**Auth**: Optional | **Plan**: All

**Request:**
```json
{
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "1M",
    "width": 1920,
    "height": 1080,
    "studies": []
  },
  "planLevel": "PRO"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `config` | object | Yes | Chart configuration from construct |
| `planLevel` | string | No | `BASIC`, `PRO`, `MEGA`, `ULTRA`, `ENTERPRISE` |

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
        "resolution": { "pass": true, "message": "..." },
        "studyCount": { "pass": true, "message": "..." }
      }
    }
  }
}
```

---

### 4. Generate Chart Image

Generates chart image from configuration.

```
POST /api/v1/charts/generate
```

**Auth**: Optional | **Plan**: All

**Request:**
```json
{
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "1M",
    "theme": "dark",
    "style": "candle",
    "width": 1200,
    "height": 675,
    "studies": []
  },
  "format": "png",
  "storage": true,
  "saveToFile": false,
  "filename": "btc-chart"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `config` | object | Yes | Chart configuration |
| `format` | string | No | `png`, `jpeg` (default: `png`) |
| `storage` | boolean | No | Use cloud storage (default: `true`) |
| `saveToFile` | boolean | No | Save to /tmp (default: `false`) |
| `filename` | string | No | Custom filename |

**Response (storage: true):**
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://r2.chart-img.com/abc123.png",
    "metadata": {
      "format": "png",
      "width": 1200,
      "height": 675,
      "generatedAt": "2025-12-01T10:30:15.000Z"
    },
    "apiResponse": {
      "statusCode": 200,
      "rateLimitRemaining": 498
    }
  }
}
```

**Response (saveToFile: true):**
```json
{
  "success": true,
  "data": {
    "localPath": "/tmp/chart-1733053815000.png",
    "metadata": { ... }
  }
}
```

**Note**: Cloud storage URLs expire after 7 days. Use S3 upload for permanent storage.

---

### 5. Get Exchanges

Lists available trading exchanges.

```
GET /api/v1/exchanges?forceRefresh=false
```

**Auth**: No | **Plan**: All

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `forceRefresh` | boolean | Bypass cache |

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
    },
    {
      "id": "NASDAQ",
      "name": "NASDAQ",
      "type": "stock",
      "description": "US Stock Market"
    }
  ],
  "meta": { "total": 150 }
}
```

---

### 6. Get Symbols

Lists symbols for an exchange.

```
GET /api/v1/exchanges/:id/symbols?search=BTC&limit=10
```

**Auth**: No | **Plan**: All

**Path Parameters:**
| Param | Description |
|-------|-------------|
| `id` | Exchange ID (e.g., `BINANCE`) |

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by keyword |
| `limit` | number | Max results (1-200, default: 50) |
| `forceRefresh` | boolean | Bypass cache |

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
  "meta": { "total": 10, "exchange": "BINANCE" }
}
```

---

### 7. Get Documentation

Fetches chart-img.com API documentation.

```
GET /api/v1/documentation?section=all
```

**Auth**: No | **Plan**: All

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `section` | string | `indicators`, `parameters`, `rateLimits`, `examples`, `all` |
| `forceRefresh` | boolean | Bypass cache |

**Response:**
```json
{
  "success": true,
  "data": {
    "indicators": { ... },
    "parameters": {
      "intervals": ["1m", "5m", "15m", ...],
      "ranges": ["1D", "1W", "1M", ...],
      "styles": ["candle", "line", "bar", ...],
      "themes": ["light", "dark"]
    },
    "rateLimits": { ... }
  }
}
```

---

### 8. AI Chart Analysis

Analyzes chart with AI vision.

```
POST /api/v1/analysis/chart
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Request:**
```json
{
  "imageUrl": "https://r2.chart-img.com/abc123.png",
  "symbol": "BINANCE:BTCUSDT",
  "interval": "4h",
  "model": "gpt-4o-mini",
  "tradingStyle": "swing_trading",
  "analysisTypes": ["technical", "sentiment", "signals", "risk"],
  "includeRiskManagement": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageUrl` | string | Yes* | Chart image URL |
| `imageData` | string | Yes* | Base64 image data |
| `symbol` | string | Yes | Trading symbol |
| `interval` | string | Yes | Timeframe |
| `model` | string | No | `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo` |
| `tradingStyle` | string | No | `day_trading`, `swing_trading`, `scalping` |

*One of `imageUrl` or `imageData` required.

**Response:**
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
      "Price bouncing off major support"
    ],
    "keyLevels": {
      "support": [94000, 92000],
      "resistance": [97500, 100000]
    },
    "analysisText": "Detailed analysis...",
    "tradingSignal": {
      "type": "LONG",
      "symbol": "BINANCE:BTCUSDT",
      "entryPrice": 94100,
      "stopLoss": 93500,
      "takeProfit": 97500,
      "confidence": 0.78,
      "reasoning": "..."
    }
  },
  "metadata": {
    "model": "gpt-4o-mini",
    "tokensUsed": 1847,
    "processingTime": 3241
  }
}
```

---

### 9. Chat Message (Non-Streaming)

Send message and get complete AI response.

```
POST /api/v1/chat/messages
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Request:**
```json
{
  "message": "Show me Bitcoin chart with RSI",
  "conversationId": "conv_123",
  "conversationHistory": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User message |
| `conversationId` | string | No | Existing conversation ID |
| `conversationHistory` | array | No | Previous messages for context |

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": {
      "id": "msg_456",
      "role": "assistant",
      "content": "Here's the Bitcoin chart...",
      "createdAt": "2025-12-01T10:30:15.000Z"
    },
    "conversationId": "conv_123",
    "chart": {
      "imageUrl": "https://r2.chart-img.com/...",
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h"
    },
    "analysis": null
  }
}
```

---

### 10. Chat Message (Streaming)

Send message with SSE streaming response.

```
POST /api/v1/chat/messages/stream
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Request:** Same as non-streaming.

**Response:** Server-Sent Events stream.

See [SSE Streaming](#sse-streaming) section below.

---

### 11. List Conversations

```
GET /api/v1/conversations?page=1&limit=20
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (1-100, default: 20) |
| `isPinned` | boolean | Filter pinned |
| `isArchived` | boolean | Filter archived |

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
      "lastMessageAt": "2025-12-01T10:30:00.000Z",
      "createdAt": "2025-12-01T09:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 12. Create Conversation

```
POST /api/v1/conversations
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Request:**
```json
{
  "title": "Bitcoin Trading Strategy"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_789",
    "title": "Bitcoin Trading Strategy",
    "userId": "user_123",
    "isPinned": false,
    "isArchived": false,
    "createdAt": "2025-12-01T10:30:15.000Z"
  }
}
```

---

### 13. Get Conversation

```
GET /api/v1/conversations/:id
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_123",
    "userId": "user_123",
    "title": "Bitcoin Analysis",
    "isPinned": false,
    "isArchived": false,
    "messages": [
      {
        "id": "msg_1",
        "role": "user",
        "content": "Show me Bitcoin 4H chart",
        "createdAt": "2025-12-01T09:00:00.000Z"
      },
      {
        "id": "msg_2",
        "role": "assistant",
        "content": "Here's the Bitcoin chart...",
        "chartUrl": "https://...",
        "chartSymbol": "BINANCE:BTCUSDT",
        "chartInterval": "4h",
        "createdAt": "2025-12-01T09:00:05.000Z"
      }
    ],
    "createdAt": "2025-12-01T09:00:00.000Z",
    "updatedAt": "2025-12-01T10:30:00.000Z"
  }
}
```

---

### 14. Update Conversation

```
PATCH /api/v1/conversations/:id
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Request:**
```json
{
  "title": "Updated Title",
  "isPinned": true,
  "isArchived": false
}
```

All fields optional.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_123",
    "title": "Updated Title",
    "isPinned": true,
    "isArchived": false,
    "updatedAt": "2025-12-01T10:30:15.000Z"
  }
}
```

---

### 15. Delete Conversation

```
DELETE /api/v1/conversations/:id
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Response:**
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

### 16. Save Chart to Disk

```
POST /api/v1/storage/save
```

**Auth**: Optional | **Plan**: All

**Request:**
```json
{
  "imageData": "iVBORw0KGgoAAAANSUhEUgAA...",
  "filename": "my-chart.png",
  "directory": "/tmp"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "/tmp/my-chart.png",
    "filename": "my-chart.png",
    "size": 245678,
    "savedAt": "2025-12-01T10:30:15.000Z"
  }
}
```

---

### 17. Upload to S3

Permanent storage (URLs never expire).

```
POST /api/v1/storage/s3
Authorization: Bearer <token>
```

**Auth**: Required | **Plan**: Pro/Max

**Request:**
```json
{
  "imageUrl": "https://r2.chart-img.com/abc123.png",
  "metadata": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "indicators": ["RSI", "MACD"],
    "generatedAt": "2025-12-01T10:30:00.000Z"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageUrl` | string | Yes* | Source image URL |
| `imageData` | string | Yes* | Base64 image data |
| `metadata` | object | No | Chart metadata for organization |

*One of `imageUrl` or `imageData` required.

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.us-east-1.amazonaws.com/charts/2025/12/BTCUSDT-4h-abc123.png",
    "bucket": "bucket-name",
    "key": "charts/2025/12/BTCUSDT-4h-abc123.png",
    "size": 245678,
    "uploadedAt": "2025-12-01T10:30:15.000Z"
  }
}
```

---

## SSE Streaming

For `/api/v1/chat/messages/stream`, the response is a Server-Sent Events stream.

### Event Types

| Event | Data | Description |
|-------|------|-------------|
| `start` | `{ messageId: string }` | Stream started |
| `chunk` | `{ text: string }` | Text chunk from AI |
| `tool_use` | `{ tool: string, input: object }` | Tool being called |
| `chart_complete` | `{ imageUrl, symbol, interval }` | Chart generated |
| `analysis_complete` | `{ trend, recommendation, confidence, ... }` | Analysis done |
| `complete` | `{ message, chart, analysis }` | Stream finished |
| `error` | `{ code: string, message: string }` | Error occurred |

### Implementation Notes

```javascript
// Use POST with fetch, then handle SSE
const response = await fetch('/api/v1/chat/messages/stream', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Show me Bitcoin chart' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  // Parse SSE events from text
  // Format: "event: <type>\ndata: <json>\n\n"
}
```

---

## Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Plan upgrade required or subscription inactive |
| 404 | `NOT_FOUND` | Resource not found |
| 422 | `VALIDATION_ERROR` | Request validation failed |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `EXTERNAL_API_ERROR` | chart-img.com API unavailable |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "This feature requires one of: pro, max. Current plan: free"
  },
  "meta": {
    "timestamp": "2025-12-01T10:30:00.000Z",
    "path": "/api/v1/analysis/chart",
    "method": "POST"
  }
}
```

---

## Rate Limits

### Response Headers

```
X-RateLimit-Remaining: 19
X-RateLimit-Reset: 2025-12-01T10:30:30.000Z
```

### Limits by Endpoint Type

| Endpoint Type | Capacity | Refill Rate |
|---------------|----------|-------------|
| Health, Construct, Validate, Exchanges, Symbols, Docs | 20 | 10/sec |
| Generate Chart, Chat, Analysis | 10 | 2/sec |
| Storage (Save, S3) | 10 | 5/sec |
| Conversations List | 30 | 15/sec |

### Handling 429

When rate limited:
1. Check `X-RateLimit-Reset` header for reset time
2. Implement exponential backoff
3. Retry after reset time

---

## Quick Reference

### Free Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/charts/construct` | Natural language to config |
| POST | `/charts/validate` | Validate config |
| POST | `/charts/generate` | Generate chart image |
| GET | `/exchanges` | List exchanges |
| GET | `/exchanges/:id/symbols` | List symbols |
| GET | `/documentation` | API documentation |
| POST | `/storage/save` | Save to disk |

### Premium Endpoints (Auth + Pro/Max Plan)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analysis/chart` | AI chart analysis |
| POST | `/chat/messages` | Chat (non-streaming) |
| POST | `/chat/messages/stream` | Chat (SSE streaming) |
| GET | `/conversations` | List conversations |
| POST | `/conversations` | Create conversation |
| GET | `/conversations/:id` | Get conversation |
| PATCH | `/conversations/:id` | Update conversation |
| DELETE | `/conversations/:id` | Delete conversation |
| POST | `/storage/s3` | Upload to S3 |
