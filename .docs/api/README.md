# MCP Chart-Image REST API Documentation

Version: **v1**
Base URL: `http://localhost:3000/api/v1` (development)
Production: `https://your-domain.com/api/v1`

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Chart Endpoints](#chart-endpoints)
  - [Exchange Endpoints](#exchange-endpoints)
  - [Documentation](#documentation)
  - [Storage](#storage)
- [Examples](#examples)
- [Plan Limits](#plan-limits)

---

## Overview

The MCP Chart-Image REST API provides programmatic access to professional trading chart generation with 100+ technical indicators. The API is built with Next.js 14 App Router and uses the chart-img.com service for chart rendering.

### Key Features

- **Natural Language Processing**: Convert text descriptions to chart configurations
- **100+ Technical Indicators**: RSI, MACD, Bollinger Bands, and more
- **Multiple Asset Classes**: Crypto, stocks, forex, futures
- **Chart Drawings**: Horizontal lines, trend lines, positions, orders
- **Pre-flight Validation**: Validate configurations before generation
- **Plan-based Limits**: BASIC, PRO, MEGA, ULTRA, ENTERPRISE tiers

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Validation**: Zod schemas
- **Rate Limiting**: Token bucket algorithm
- **CORS**: Enabled for cross-origin requests
- **Content Type**: `application/json`

---

## Authentication

### Optional Authentication

Most endpoints support **optional authentication**. Authenticated requests receive higher rate limits and access to premium features.

**Header Format**:

```http
Authorization: Bearer YOUR_API_KEY
```

**Example**:

```bash
curl -X POST https://api.example.com/v1/charts/generate \
  -H "Authorization: Bearer sk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{ "config": {...} }'
```

### Required Authentication

Some endpoints (marked with 🔒) require authentication and will return `401 Unauthorized` if the API key is missing or invalid.

### Getting an API Key

1. Sign up at [https://chart-img.com](https://chart-img.com)
2. Choose a plan (BASIC, PRO, MEGA, ULTRA, ENTERPRISE)
3. Generate API key from dashboard
4. Use the key in the `Authorization` header

---

## Rate Limiting

### Plan-Based Limits

| Plan       | Requests/Second | Daily Limit | Max Resolution | Max Indicators |
|------------|----------------|-------------|----------------|----------------|
| BASIC      | 1              | 50          | 800×600        | 3              |
| PRO        | 10             | 500         | 1920×1080      | 5              |
| MEGA       | 15             | 1,000       | 1920×1600      | 10             |
| ULTRA      | 35             | 3,000       | 2048×1920      | 25             |
| ENTERPRISE | 35+            | 5,000+      | 2048×1920      | 50             |

### Rate Limit Headers

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1699564800
```

### Rate Limit Exceeded

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded. Please try again later."
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

---

## Response Format

### Success Response

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    // Response data specific to endpoint
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

### Error Response

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      // Optional array of validation errors or additional info
    ]
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Status                | Description                                   |
|------|-----------------------|-----------------------------------------------|
| 200  | OK                    | Request successful                            |
| 201  | Created               | Resource created successfully                 |
| 400  | Bad Request           | Invalid request body or parameters            |
| 401  | Unauthorized          | Missing or invalid API key                    |
| 403  | Forbidden             | API key valid but lacks permissions           |
| 404  | Not Found             | Resource not found                            |
| 429  | Too Many Requests     | Rate limit exceeded                           |
| 500  | Internal Server Error | Server error (retry with exponential backoff) |

### Common Error Codes

| Error Code          | HTTP Status | Description                          |
|---------------------|-------------|--------------------------------------|
| `BAD_REQUEST`       | 400         | Invalid request format               |
| `VALIDATION_ERROR`  | 400         | Request validation failed            |
| `UNAUTHORIZED`      | 401         | Missing or invalid credentials       |
| `FORBIDDEN`         | 403         | Insufficient permissions             |
| `NOT_FOUND`         | 404         | Resource not found                   |
| `TOO_MANY_REQUESTS` | 429         | Rate limit exceeded                  |
| `INTERNAL_ERROR`    | 500         | Internal server error                |

### Validation Error Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "number",
        "path": ["naturalLanguage"],
        "message": "Expected string, received number"
      }
    ]
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

---

## Endpoints

### Health Check

Check API health and status.

**Endpoint**: `GET /health`

**Authentication**: None required

**Rate Limit**: 100 requests/minute

**Response**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-11-14T12:34:56.789Z",
    "version": "1.0.0",
    "uptime": 86400
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Example**:

```bash
curl https://api.example.com/v1/health
```

---

## Chart Endpoints

### 1. Construct Chart Config

Convert natural language description to chart configuration.

**Endpoint**: `POST /charts/construct`

**Authentication**: Optional (🔓)

**Rate Limit**: 20 req/s (PRO plan)

**Request Body**:

```json
{
  "naturalLanguage": "Bitcoin chart with RSI and MACD for the last 7 days",
  "symbol": "BINANCE:BTCUSDT",  // Optional: override symbol detection
  "exchange": "BINANCE",         // Optional: preferred exchange
  "preferences": {               // Optional: user preferences
    "theme": "dark",
    "interval": "4h",
    "range": "7D",
    "resolution": "1920x1080"
  }
}
```

**Request Schema**:

| Field            | Type   | Required | Description                              |
|------------------|--------|----------|------------------------------------------|
| naturalLanguage  | string | Yes      | Natural language chart description       |
| symbol           | string | No       | Override symbol (e.g., "BINANCE:BTCUSDT")|
| exchange         | string | No       | Preferred exchange (e.g., "BINANCE")     |
| preferences      | object | No       | User preferences                         |
| ├─ theme         | string | No       | "light" or "dark"                        |
| ├─ interval      | string | No       | Chart interval (e.g., "4h", "1D")        |
| ├─ range         | string | No       | Time range (e.g., "7D", "1M", "1Y")      |
| └─ resolution    | string | No       | Image resolution (e.g., "1920x1080")     |

**Response**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "7D",
      "theme": "dark",
      "indicators": [
        {
          "name": "Relative Strength Index@tv-basicstudies",
          "inputs": {
            "in_0": 14
          }
        },
        {
          "name": "MACD@tv-basicstudies",
          "inputs": {
            "in_0": 12,
            "in_1": 26,
            "in_2": 9
          }
        }
      ],
      "drawings": []
    },
    "reasoning": "Detected Bitcoin (BINANCE:BTCUSDT), 7-day range with 4-hour interval. Added RSI (period 14) and MACD indicators.",
    "warnings": []
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Example Request**:

```bash
curl -X POST https://api.example.com/v1/charts/construct \
  -H "Content-Type: application/json" \
  -d '{
    "naturalLanguage": "Ethereum chart with Bollinger Bands for the past month"
  }'
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "config": {
      "symbol": "BINANCE:ETHUSDT",
      "interval": "1D",
      "range": "1M",
      "theme": "dark",
      "indicators": [
        {
          "name": "Bollinger Bands@tv-basicstudies",
          "inputs": {
            "in_0": 20,
            "in_1": 2
          }
        }
      ]
    },
    "reasoning": "Detected Ethereum, 1-month range with daily interval. Added Bollinger Bands (period 20, stddev 2)."
  }
}
```

---

### 2. Validate Chart Config

Validate chart configuration against API constraints and plan limits.

**Endpoint**: `POST /charts/validate`

**Authentication**: Optional (🔓)

**Rate Limit**: 30 req/s (PRO plan)

**Request Body**:

```json
{
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "7D",
    "indicators": [
      {
        "name": "RSI@tv-basicstudies",
        "inputs": { "in_0": 14 }
      }
    ]
  },
  "planLevel": "PRO"  // Optional: default "PRO"
}
```

**Request Schema**:

| Field     | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| config    | object | Yes      | Chart configuration to validate                  |
| planLevel | string | No       | Plan level (BASIC, PRO, MEGA, ULTRA, ENTERPRISE) |

**Response**:

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
          "valid": true,
          "current": "1920x1080",
          "limit": "1920x1080"
        },
        "indicators": {
          "valid": true,
          "current": 1,
          "limit": 5
        },
        "drawings": {
          "valid": true,
          "current": 0,
          "limit": 5
        }
      }
    }
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Validation Error Response**:

```json
{
  "success": true,
  "data": {
    "valid": false,
    "errors": [
      {
        "field": "indicators",
        "message": "Indicator count (6) exceeds PRO plan limit (5)",
        "severity": "error"
      },
      {
        "field": "resolution",
        "message": "Resolution 2048x1920 exceeds PRO plan limit of 1920x1080",
        "severity": "error"
      }
    ],
    "suggestions": [
      "Remove 1 indicator to meet PRO plan limit",
      "Reduce resolution to 1920x1080 or upgrade to MEGA plan"
    ],
    "rateLimitCheck": {
      "withinLimits": false,
      "checks": {
        "indicators": {
          "valid": false,
          "current": 6,
          "limit": 5
        }
      }
    }
  }
}
```

**Example Request**:

```bash
curl -X POST https://api.example.com/v1/charts/validate \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "1h",
      "range": "7D",
      "indicators": [
        { "name": "RSI@tv-basicstudies" },
        { "name": "MACD@tv-basicstudies" },
        { "name": "BB@tv-basicstudies" }
      ]
    },
    "planLevel": "BASIC"
  }'
```

---

### 3. Generate Chart Image

Generate chart image from configuration.

**Endpoint**: `POST /charts/generate`

**Authentication**: Optional (🔓)

**Rate Limit**: 10 req/s (PRO plan) - **Stricter limit** due to resource intensity

**Request Body**:

```json
{
  "config": {
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "7D",
    "theme": "dark",
    "indicators": [
      {
        "name": "Relative Strength Index@tv-basicstudies",
        "inputs": { "in_0": 14 }
      }
    ]
  },
  "storage": true,           // Optional: use storage endpoint (returns URL), default: true
  "format": "png",           // Optional: "png" or "jpeg", default: "png"
  "saveToFile": false,       // Optional: save to file, default: false
  "filename": "chart.png"    // Optional: custom filename when saveToFile=true
}
```

**Request Schema**:

| Field      | Type    | Required | Description                                    |
|------------|---------|----------|------------------------------------------------|
| config     | object  | Yes      | Chart configuration from construct endpoint    |
| storage    | boolean | No       | Use storage endpoint (returns URL), default: true |
| format     | string  | No       | Image format ("png" or "jpeg"), default: "png" |
| saveToFile | boolean | No       | Save to /tmp for analysis, default: false      |
| filename   | string  | No       | Custom filename when saveToFile=true           |

**Response (Storage Mode - storage: true)**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "imageUrl": "https://r2.chart-img.com/charts/abc123.png",
    "metadata": {
      "format": "png",
      "resolution": "1920x1080",
      "generatedAt": "2025-11-14T12:34:56.789Z"
    },
    "apiResponse": {
      "statusCode": 200,
      "rateLimitRemaining": 499
    }
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Response (Direct Mode - storage: false)**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "imageData": "iVBORw0KGgoAAAANSUhEUgAA...",  // Base64-encoded image
    "metadata": {
      "format": "png",
      "resolution": "1920x1080",
      "generatedAt": "2025-11-14T12:34:56.789Z"
    },
    "apiResponse": {
      "statusCode": 200,
      "rateLimitRemaining": 499
    }
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Example Request**:

```bash
curl -X POST https://api.example.com/v1/charts/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "1D",
      "range": "1M",
      "theme": "dark",
      "indicators": [
        {
          "name": "Relative Strength Index@tv-basicstudies",
          "inputs": { "in_0": 14 }
        }
      ]
    },
    "storage": true,
    "format": "png"
  }'
```

---

## Exchange Endpoints

### 1. Get Exchanges

List all available trading exchanges.

**Endpoint**: `GET /exchanges`

**Authentication**: Optional (🔓)

**Rate Limit**: 30 req/s (PRO plan)

**Query Parameters**:

| Parameter    | Type    | Required | Description                        |
|--------------|---------|----------|------------------------------------|
| forceRefresh | boolean | No       | Bypass cache, fetch fresh data     |

**Response**:

```json
{
  "success": true,
  "data": {
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
        "description": "NASDAQ Stock Market"
      },
      {
        "id": "FX",
        "name": "FX.com",
        "type": "forex",
        "description": "Forex trading platform"
      }
    ],
    "totalCount": 25,
    "cached": true,
    "cacheAge": 1800
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Example Request**:

```bash
curl https://api.example.com/v1/exchanges
```

**Example with Force Refresh**:

```bash
curl https://api.example.com/v1/exchanges?forceRefresh=true
```

---

### 2. Get Symbols for Exchange

Get tradable symbols for a specific exchange.

**Endpoint**: `GET /exchanges/{exchangeId}/symbols`

**Authentication**: Optional (🔓)

**Rate Limit**: 30 req/s (PRO plan)

**Path Parameters**:

| Parameter  | Type   | Required | Description            |
|------------|--------|----------|------------------------|
| exchangeId | string | Yes      | Exchange ID (e.g., "BINANCE") |

**Query Parameters**:

| Parameter    | Type    | Required | Description                           |
|--------------|---------|----------|---------------------------------------|
| search       | string  | No       | Filter symbols by keyword (e.g., "BTC") |
| limit        | number  | No       | Maximum results (default: 50, max: 200) |
| forceRefresh | boolean | No       | Bypass cache, fetch fresh data        |

**Response**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "symbols": [
      {
        "symbol": "BTCUSDT",
        "fullSymbol": "BINANCE:BTCUSDT",
        "description": "Bitcoin / TetherUS",
        "type": "crypto"
      },
      {
        "symbol": "ETHUSDT",
        "fullSymbol": "BINANCE:ETHUSDT",
        "description": "Ethereum / TetherUS",
        "type": "crypto"
      }
    ],
    "totalResults": 500,
    "exchange": "BINANCE",
    "cached": true
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Example Request**:

```bash
# Get all symbols for Binance
curl https://api.example.com/v1/exchanges/BINANCE/symbols

# Search for Bitcoin pairs
curl https://api.example.com/v1/exchanges/BINANCE/symbols?search=BTC&limit=10

# Get fresh data
curl https://api.example.com/v1/exchanges/BINANCE/symbols?forceRefresh=true
```

---

## Documentation

### Get Chart Documentation

Fetch latest chart-img.com API documentation.

**Endpoint**: `GET /documentation`

**Authentication**: Optional (🔓)

**Rate Limit**: 10 req/s (PRO plan)

**Query Parameters**:

| Parameter    | Type    | Required | Description                                |
|--------------|---------|----------|--------------------------------------------|
| section      | string  | No       | Specific section ("indicators", "parameters", "rateLimits", "examples", "all") |
| forceRefresh | boolean | No       | Bypass cache (default: false)              |

**Response**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "documentation": {
      "indicators": {
        "total": 129,
        "categories": ["oscillator", "trend", "volatility", "volume"],
        "examples": [
          {
            "id": "RSI@tv-basicstudies",
            "name": "Relative Strength Index",
            "category": "oscillator",
            "inputs": [
              {
                "id": "length",
                "name": "Length",
                "default": 14
              }
            ]
          }
        ]
      },
      "parameters": {
        "intervals": ["1m", "5m", "15m", "1h", "4h", "1D", "1W", "1M"],
        "ranges": ["1D", "7D", "1M", "3M", "6M", "1Y", "5Y", "ALL"],
        "themes": ["light", "dark"],
        "styles": ["candle", "line", "bar", "hollow_candle"]
      },
      "rateLimits": {
        "BASIC": {
          "requestsPerSecond": 1,
          "dailyLimit": 50
        },
        "PRO": {
          "requestsPerSecond": 10,
          "dailyLimit": 500
        }
      }
    },
    "cached": true,
    "cacheAge": 3600
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Example Request**:

```bash
# Get all documentation
curl https://api.example.com/v1/documentation

# Get only indicators
curl https://api.example.com/v1/documentation?section=indicators

# Force refresh
curl https://api.example.com/v1/documentation?forceRefresh=true
```

---

## Storage

### Save Chart Image

Save base64-encoded chart image to local storage.

**Endpoint**: `POST /storage/save`

**Authentication**: Optional (🔓)

**Rate Limit**: 10 req/s (PRO plan)

**Request Body**:

```json
{
  "imageData": "iVBORw0KGgoAAAANSUhEUgAA...",  // Base64-encoded image
  "filename": "bitcoin-chart.png",          // Optional: custom filename
  "directory": "/tmp"                       // Optional: save directory
}
```

**Request Schema**:

| Field     | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| imageData | string | Yes      | Base64-encoded image data                      |
| filename  | string | No       | Custom filename (default: chart-{timestamp}.png) |
| directory | string | No       | Save directory (default: /tmp)                 |

**Response**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "path": "/tmp/bitcoin-chart.png",
    "metadata": {
      "size": 245678,
      "savedAt": "2025-11-14T12:34:56.789Z"
    }
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

**Example Request**:

```bash
curl -X POST https://api.example.com/v1/storage/save \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "iVBORw0KGgoAAAANSUhEUgAA...",
    "filename": "my-chart.png"
  }'
```

---

## Examples

### Complete Workflow: Generate Chart from Natural Language

**Step 1**: Construct configuration from natural language

```bash
curl -X POST https://api.example.com/v1/charts/construct \
  -H "Content-Type: application/json" \
  -d '{
    "naturalLanguage": "Bitcoin with RSI and MACD for the last 30 days"
  }'
```

**Step 2**: Validate configuration (optional but recommended)

```bash
curl -X POST https://api.example.com/v1/charts/validate \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "30D",
      "indicators": [...]
    },
    "planLevel": "PRO"
  }'
```

**Step 3**: Generate chart image

```bash
curl -X POST https://api.example.com/v1/charts/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "30D",
      "indicators": [...]
    },
    "storage": true,
    "format": "png"
  }'
```

**Step 4**: Use the returned URL

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://r2.chart-img.com/charts/abc123.png"
  }
}
```

### Symbol Discovery Workflow

**Step 1**: Get available exchanges

```bash
curl https://api.example.com/v1/exchanges
```

**Step 2**: Get symbols for specific exchange

```bash
curl https://api.example.com/v1/exchanges/BINANCE/symbols?search=BTC&limit=10
```

**Step 3**: Use discovered symbol in chart generation

```bash
curl -X POST https://api.example.com/v1/charts/construct \
  -H "Content-Type: application/json" \
  -d '{
    "naturalLanguage": "Chart with RSI",
    "symbol": "BINANCE:BTCUSDT"
  }'
```

---

## Plan Limits

### Feature Comparison

| Feature              | BASIC  | PRO   | MEGA  | ULTRA | ENTERPRISE |
|----------------------|--------|-------|-------|-------|------------|
| **Rate Limiting**    |        |       |       |       |            |
| Requests/Second      | 1      | 10    | 15    | 35    | 35+        |
| Daily Limit          | 50     | 500   | 1,000 | 3,000 | 5,000+     |
| **Chart Features**   |        |       |       |       |            |
| Max Resolution       | 800×600 | 1920×1080 | 1920×1600 | 2048×1920 | 2048×1920 |
| Max Indicators       | 3      | 5     | 10    | 25    | 50         |
| Max Drawings         | 2      | 5     | 10    | 20    | 50         |
| **Support**          |        |       |       |       |            |
| Email Support        | ✅     | ✅    | ✅    | ✅    | ✅         |
| Priority Support     | ❌     | ❌    | ✅    | ✅    | ✅         |
| Dedicated Account Manager | ❌ | ❌    | ❌    | ❌    | ✅         |

### Upgrade Your Plan

Visit [https://chart-img.com/pricing](https://chart-img.com/pricing) to upgrade your plan and increase limits.

---

## Support

### Documentation
- **API Reference**: `.docs/api/README.md` (this file)
- **Architecture**: `.docs/saas-architecture.md`
- **Examples**: `.docs/examples.md`

### Contact
- **Email**: support@chart-img.com
- **Issues**: Open an issue in the repository
- **Discord**: Join our community server

### Status Page
- **API Status**: https://status.chart-img.com
- **Uptime**: 99.9% SLA (PRO and above)

---

## Changelog

### v1.0.0 (2025-11-14)
- Initial REST API release
- 8 endpoints across charts, exchanges, documentation, storage
- Plan-based rate limiting
- Comprehensive validation
- CORS support
- Middleware pipeline (CORS → Rate Limit → Auth → Error Handler)

---

**Last Updated**: 2025-11-14
**API Version**: v1
**Documentation Version**: 1.0.0
