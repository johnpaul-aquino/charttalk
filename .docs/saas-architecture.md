# SaaS Architecture: Multi-User Chart Generation & AI Analysis

**Version:** 1.0
**Date:** 2025-11-11
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Challenge & Solution](#core-challenge--solution)
4. [System Components](#system-components)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Implementation Phases](#implementation-phases)
8. [Security & Authorization](#security--authorization)
9. [Scalability Considerations](#scalability-considerations)
10. [Cost Analysis](#cost-analysis)
11. [Deployment Guide](#deployment-guide)

---

## Executive Summary

### The Problem
Building a SaaS platform where multiple users can:
1. Generate trading charts with technical indicators
2. Have AI analyze charts and provide trading signals
3. Store and retrieve their chart history

### The Core Challenge
**AI models cannot directly read image URLs** - they can only analyze images from local file paths.

### The Solution
**Download-on-Demand Architecture:**
- Generate charts with `storage: true` → Get CDN URLs
- Store URLs in database with user isolation
- When AI analysis is needed → Download to temp file → Analyze → Delete
- Users get instant charts, AI gets readable files

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (User)                             │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ HTTPS
                ↓
┌─────────────────────────────────────────────────────────────────┐
│                     API SERVER (Node.js)                         │
│                                                                   │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐    │
│  │ Chart API    │  │ Analysis API │  │ Auth Middleware    │    │
│  └──────────────┘  └─────────────┘  └────────────────────┘    │
└───────┬──────────────────┬──────────────────────┬───────────────┘
        │                  │                      │
        │                  │                      │
┌───────▼──────────┐ ┌────▼──────────────┐ ┌────▼──────────┐
│  chart-img.com   │ │  AI Service       │ │  PostgreSQL   │
│  API (MCP)       │ │  (Claude/GPT)     │ │  Database     │
│                  │ │                   │ │               │
│  • Generate      │ │  • Download URL   │ │  • Users      │
│  • Returns URL   │ │  • Analyze Image  │ │  • Charts     │
│  • CDN Storage   │ │  • Return JSON    │ │  • Analyses   │
└──────────────────┘ └───────────────────┘ └───────────────┘
         │
         │ Returns
         ↓
┌─────────────────────────────────────────┐
│   CDN (R2/CloudFlare)                   │
│   https://r2.chart-img.com/...          │
│                                          │
│   • Public URLs (7 days)                │
│   • Fast global delivery                │
└─────────────────────────────────────────┘
```

---

## Core Challenge & Solution

### ❌ The Problem

```javascript
// This doesn't work:
const chart = await generateChart({ storage: true });
// Returns: { imageUrl: "https://r2.chart-img.com/.../chart.png" }

// AI attempt to analyze URL:
await ai.analyze(chart.imageUrl);
// Error: "Cannot fetch URLs, need local file path"
```

### ✅ The Solution

```javascript
// Phase 1: Generate Chart (Instant)
const chart = await generateChart({
  config: {...},
  storage: true
});
// User gets URL immediately: https://r2.chart-img.com/.../chart.png

// Phase 2: AI Analysis (On-Demand)
async function analyzeChart(chartUrl) {
  // 1. Download to temp location
  const tempPath = `/tmp/chart-${uuid()}.png`;
  await downloadFile(chartUrl, tempPath);

  // 2. AI reads local file
  const analysis = await ai.analyze(tempPath);

  // 3. Clean up
  await fs.unlink(tempPath);

  return analysis;
}
```

**Why This Works:**
- ✅ Users get instant chart URLs (no waiting)
- ✅ AI can analyze any chart (download on-demand)
- ✅ No permanent duplicate storage
- ✅ Scales to unlimited users
- ✅ Minimal storage costs

---

## System Components

### 1. Chart Generation Service

**Location:** `src/services/chart-generation.service.ts`

```typescript
import { createChartImgClient } from '../mcp/utils/chart-img-client';

export class ChartGenerationService {
  private client = createChartImgClient();

  async generateChart(userId: string, config: ChartConfig) {
    // 1. Generate chart with chart-img.com
    const result = await this.client.generateChart(
      config,
      true,  // storage=true → returns URL
      'png'
    );

    if (!result.success) {
      throw new Error(`Chart generation failed: ${result.error}`);
    }

    // 2. Save to database
    const chart = await db.charts.create({
      userId,
      symbol: config.symbol,
      interval: config.interval,
      config: config,
      url: result.imageUrl,
      status: 'ready',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    return {
      chartId: chart.id,
      url: result.imageUrl,
      metadata: result.metadata
    };
  }

  async getUserCharts(userId: string, limit = 50) {
    return await db.charts.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      limit
    });
  }
}
```

### 2. Chart Analysis Service

**Location:** `src/services/chart-analysis.service.ts`

```typescript
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuid } from 'uuid';

export class ChartAnalysisService {

  async analyzeChart(
    chartId: string,
    userId: string,
    prompt?: string
  ) {
    // 1. Verify ownership
    const chart = await db.charts.findFirst({
      where: { id: chartId, userId }
    });

    if (!chart) {
      throw new Error('Chart not found or access denied');
    }

    // 2. Download chart to temp location
    const tempPath = path.join(
      os.tmpdir(),
      `chart-${chartId}-${uuid()}.png`
    );

    await this.downloadChart(chart.url, tempPath);

    try {
      // 3. Analyze with AI
      const analysis = await this.analyzeWithAI(tempPath, {
        symbol: chart.symbol,
        interval: chart.interval,
        prompt: prompt || this.getDefaultPrompt(chart)
      });

      // 4. Save analysis to database
      const savedAnalysis = await db.analyses.create({
        chartId,
        userId,
        analysisText: analysis.text,
        signals: analysis.signals,
        recommendation: analysis.recommendation,
        entryPrice: analysis.entryPrice,
        stopLoss: analysis.stopLoss,
        takeProfit: analysis.takeProfit,
        confidence: analysis.confidence,
        createdAt: new Date()
      });

      return savedAnalysis;

    } finally {
      // 5. Always cleanup temp file
      await fs.unlink(tempPath).catch(() => {});
    }
  }

  private async downloadChart(url: string, destPath: string) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download chart: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(buffer));
  }

  private async analyzeWithAI(imagePath: string, context: any) {
    // Use Claude/GPT with vision capabilities
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: base64Image
            }
          },
          {
            type: "text",
            text: context.prompt
          }
        ]
      }]
    });

    // Parse AI response into structured format
    return this.parseAnalysisResponse(response.content[0].text);
  }

  private getDefaultPrompt(chart: any) {
    return `Analyze this ${chart.symbol} ${chart.interval} trading chart.

Provide:
1. **Trend Analysis**: Current trend direction and strength
2. **Technical Indicators**: Read and interpret all visible indicators (RSI, MACD, Bollinger Bands, etc.)
3. **Support/Resistance**: Identify key levels
4. **Volume Analysis**: Analyze volume patterns
5. **Trading Signal**: Provide clear recommendation (LONG/SHORT/NEUTRAL)
6. **Entry Price**: Specific entry level
7. **Stop Loss**: Risk management level
8. **Take Profit**: Target profit levels
9. **Confidence**: Rate your confidence (1-10)
10. **Risk Assessment**: Key risks to watch

Format as JSON with these exact fields:
{
  "trend": "bullish|bearish|neutral",
  "signals": ["signal1", "signal2"],
  "recommendation": "LONG|SHORT|NEUTRAL",
  "entryPrice": 12345.67,
  "stopLoss": 12000.00,
  "takeProfit": 13000.00,
  "confidence": 8,
  "text": "detailed analysis..."
}`;
  }

  private parseAnalysisResponse(text: string) {
    // Extract JSON from AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: return text-only
    return {
      text,
      recommendation: 'NEUTRAL',
      confidence: 5
    };
  }
}
```

### 3. Background Job Processor (Optional - For Permanent Storage)

**Location:** `src/workers/chart-storage.worker.ts`

```typescript
import { Queue, Worker } from 'bullmq';

// Queue for processing charts
export const chartStorageQueue = new Queue('chart-storage', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  }
});

// Worker to process permanent storage
export const chartStorageWorker = new Worker(
  'chart-storage',
  async (job) => {
    const { chartId, userId, tempUrl } = job.data;

    try {
      // 1. Download from chart-img.com
      const response = await fetch(tempUrl);
      const buffer = await response.arrayBuffer();

      // 2. Upload to your S3/R2
      const s3Key = `users/${userId}/charts/${chartId}.png`;
      await s3.upload({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: Buffer.from(buffer),
        ContentType: 'image/png'
      });

      // 3. Update database with permanent URL
      const permanentUrl = `${process.env.CDN_URL}/${s3Key}`;
      await db.charts.update({
        where: { id: chartId },
        data: {
          permanentUrl,
          status: 'stored'
        }
      });

      return { success: true, permanentUrl };

    } catch (error) {
      console.error('Chart storage failed:', error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT)
    }
  }
);
```

---

## Database Schema

### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',  -- free, pro, enterprise
  api_key_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Charts table
CREATE TABLE charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Chart metadata
  symbol VARCHAR(50) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  range VARCHAR(10),
  theme VARCHAR(20) DEFAULT 'dark',

  -- Configuration
  config JSONB NOT NULL,  -- Full chart config

  -- Storage URLs
  url TEXT NOT NULL,                    -- chart-img.com URL (7 days)
  permanent_url TEXT,                   -- Optional: Your S3/R2 URL

  -- Status
  status VARCHAR(20) DEFAULT 'ready',   -- pending, ready, stored, expired

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,                 -- When temp URL expires

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_symbol (symbol),
  INDEX idx_status (status)
);

-- Chart analyses table
CREATE TABLE chart_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Analysis content
  analysis_text TEXT NOT NULL,

  -- Structured signals
  signals JSONB,                        -- Array of trading signals
  trend VARCHAR(20),                    -- bullish, bearish, neutral
  recommendation VARCHAR(10),           -- LONG, SHORT, NEUTRAL

  -- Trading levels
  entry_price DECIMAL(15, 2),
  stop_loss DECIMAL(15, 2),
  take_profit DECIMAL(15, 2),
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 10),

  -- AI metadata
  model VARCHAR(50),                    -- claude-3.5-sonnet, gpt-4-vision, etc.
  prompt TEXT,
  tokens_used INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_chart_id (chart_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_recommendation (recommendation)
);

-- API usage tracking
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Usage metrics
  endpoint VARCHAR(100),
  method VARCHAR(10),
  status_code INTEGER,

  -- Resources
  charts_generated INTEGER DEFAULT 0,
  analyses_performed INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- User quotas
CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Monthly limits
  charts_limit INTEGER DEFAULT 100,     -- Charts per month
  analyses_limit INTEGER DEFAULT 50,    -- AI analyses per month

  -- Current usage
  charts_used INTEGER DEFAULT 0,
  analyses_used INTEGER DEFAULT 0,

  -- Reset tracking
  reset_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 month'),

  -- Timestamps
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Database Migrations

**Location:** `prisma/migrations/`

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String?
  plan         String   @default("free")
  apiKeyHash   String?  @map("api_key_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  charts       Chart[]
  analyses     ChartAnalysis[]
  quota        UserQuota?

  @@map("users")
}

model Chart {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  symbol        String
  interval      String
  range         String?
  theme         String    @default("dark")
  config        Json
  url           String
  permanentUrl  String?   @map("permanent_url")
  status        String    @default("ready")
  createdAt     DateTime  @default(now()) @map("created_at")
  expiresAt     DateTime? @map("expires_at")

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  analyses      ChartAnalysis[]

  @@index([userId])
  @@index([createdAt])
  @@index([symbol])
  @@map("charts")
}

model ChartAnalysis {
  id              String    @id @default(uuid())
  chartId         String    @map("chart_id")
  userId          String    @map("user_id")
  analysisText    String    @map("analysis_text")
  signals         Json?
  trend           String?
  recommendation  String?
  entryPrice      Decimal?  @map("entry_price") @db.Decimal(15, 2)
  stopLoss        Decimal?  @map("stop_loss") @db.Decimal(15, 2)
  takeProfit      Decimal?  @map("take_profit") @db.Decimal(15, 2)
  confidence      Int?
  model           String?
  prompt          String?
  tokensUsed      Int?      @map("tokens_used")
  createdAt       DateTime  @default(now()) @map("created_at")

  chart           Chart     @relation(fields: [chartId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([chartId])
  @@index([userId])
  @@index([createdAt])
  @@map("chart_analyses")
}

model UserQuota {
  id             String   @id @default(uuid())
  userId         String   @unique @map("user_id")
  chartsLimit    Int      @default(100) @map("charts_limit")
  analysesLimit  Int      @default(50) @map("analyses_limit")
  chartsUsed     Int      @default(0) @map("charts_used")
  analysesUsed   Int      @default(0) @map("analyses_used")
  resetAt        DateTime @map("reset_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_quotas")
}
```

---

## API Endpoints

### Base URL
```
Production:  https://api.yourapp.com/v1
Development: http://localhost:3000/v1
```

### Authentication
All endpoints require authentication via JWT token or API key:

```http
Authorization: Bearer <jwt_token>
# OR
X-API-Key: <api_key>
```

---

### 1. Chart Generation

#### POST `/charts/generate`

Generate a new trading chart.

**Request:**
```json
{
  "symbol": "BINANCE:BTCUSDT",
  "interval": "4h",
  "range": "7D",
  "theme": "dark",
  "studies": [
    {
      "name": "Relative Strength Index",
      "input": { "period": 14 }
    },
    {
      "name": "Bollinger Bands",
      "input": { "period": 20, "stddev": 2 }
    }
  ],
  "drawings": [
    {
      "name": "Horizontal Line",
      "input": { "price": 107418 },
      "override": { "linecolor": "#f23645", "text": "Resistance" }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chartId": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://r2.chart-img.com/20260110/tradingview/advanced-chart/abc123.png",
    "metadata": {
      "format": "PNG",
      "resolution": "1200x675",
      "generatedAt": "2025-11-11T01:00:00.000Z",
      "expiresAt": "2025-11-18T01:00:00.000Z"
    },
    "quota": {
      "used": 15,
      "limit": 100,
      "remaining": 85
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly chart generation limit reached. Upgrade your plan to continue."
  }
}
```

---

### 2. Chart Analysis

#### POST `/charts/:chartId/analyze`

Request AI analysis of a chart.

**Request:**
```json
{
  "prompt": "Analyze this chart for day trading opportunities. Focus on entry and exit points.",
  "options": {
    "includeRiskManagement": true,
    "tradingStyle": "day_trading",
    "confidenceThreshold": 7
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "660e8400-e29b-41d4-a716-446655440001",
    "analysis": {
      "trend": "bullish",
      "signals": [
        "RSI oversold bounce from 30 to 63",
        "Price bounced from lower Bollinger Band",
        "Increasing buying volume on recovery",
        "Break above 20-period moving average"
      ],
      "recommendation": "LONG",
      "entryPrice": 106500.00,
      "stopLoss": 104500.00,
      "takeProfit": 109000.00,
      "confidence": 8,
      "riskRewardRatio": 2.25,
      "analysisText": "Bitcoin is showing strong bullish momentum after bouncing from the lower Bollinger Band at $102,285. The RSI has recovered from oversold conditions (30) to 63, indicating renewed buying pressure. Current price at $106,558 is testing the middle Bollinger Band (20-period MA), which is a critical decision point...",
      "keyLevels": {
        "support": [102285, 104500, 105800],
        "resistance": [107418, 109000, 110500]
      }
    },
    "metadata": {
      "model": "claude-3.5-sonnet",
      "tokensUsed": 1247,
      "processingTime": 3.2
    },
    "quota": {
      "used": 8,
      "limit": 50,
      "remaining": 42
    }
  }
}
```

---

### 3. Get User Charts

#### GET `/charts`

Retrieve user's chart history.

**Query Parameters:**
- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)
- `symbol` (optional, filter by symbol)
- `status` (optional: "ready", "expired")

**Request:**
```http
GET /charts?limit=20&symbol=BTCUSDT
```

**Response:**
```json
{
  "success": true,
  "data": {
    "charts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "symbol": "BINANCE:BTCUSDT",
        "interval": "4h",
        "url": "https://r2.chart-img.com/.../chart1.png",
        "status": "ready",
        "createdAt": "2025-11-11T01:00:00.000Z",
        "expiresAt": "2025-11-18T01:00:00.000Z",
        "analysesCount": 2
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### 4. Get Chart Details

#### GET `/charts/:chartId`

Get detailed information about a specific chart.

**Response:**
```json
{
  "success": true,
  "data": {
    "chart": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "7D",
      "url": "https://r2.chart-img.com/.../chart.png",
      "config": { /* full chart config */ },
      "status": "ready",
      "createdAt": "2025-11-11T01:00:00.000Z",
      "expiresAt": "2025-11-18T01:00:00.000Z"
    },
    "analyses": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "recommendation": "LONG",
        "confidence": 8,
        "createdAt": "2025-11-11T01:05:00.000Z"
      }
    ]
  }
}
```

---

### 5. Get Analysis Details

#### GET `/analyses/:analysisId`

Get detailed analysis results.

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "chartId": "550e8400-e29b-41d4-a716-446655440000",
      "trend": "bullish",
      "signals": ["RSI oversold bounce", "BB support"],
      "recommendation": "LONG",
      "entryPrice": 106500.00,
      "stopLoss": 104500.00,
      "takeProfit": 109000.00,
      "confidence": 8,
      "analysisText": "...",
      "createdAt": "2025-11-11T01:05:00.000Z"
    }
  }
}
```

---

### 6. Get User Quota

#### GET `/user/quota`

Check current usage and limits.

**Response:**
```json
{
  "success": true,
  "data": {
    "quota": {
      "charts": {
        "used": 15,
        "limit": 100,
        "remaining": 85
      },
      "analyses": {
        "used": 8,
        "limit": 50,
        "remaining": 42
      },
      "resetAt": "2025-12-01T00:00:00.000Z"
    },
    "plan": "pro"
  }
}
```

---

### 7. Delete Chart

#### DELETE `/charts/:chartId`

Delete a chart and all associated analyses.

**Response:**
```json
{
  "success": true,
  "message": "Chart deleted successfully"
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

**Goal:** MVP with basic chart generation

**Tasks:**
- [ ] Set up PostgreSQL database
- [ ] Implement User authentication (JWT)
- [ ] Create Chart Generation Service
- [ ] Implement POST `/charts/generate` endpoint
- [ ] Implement GET `/charts` endpoint
- [ ] Add basic quota tracking
- [ ] Deploy to staging

**Deliverables:**
- Users can sign up, log in
- Users can generate charts
- Charts stored in database with URLs
- Basic rate limiting

---

### Phase 2: AI Analysis (Week 3-4)

**Goal:** Add AI chart analysis capabilities

**Tasks:**
- [ ] Create Chart Analysis Service
- [ ] Implement download-on-demand logic
- [ ] Integrate Claude/GPT vision API
- [ ] Implement POST `/charts/:chartId/analyze` endpoint
- [ ] Add analysis result parsing
- [ ] Store analyses in database
- [ ] Add analysis quota tracking

**Deliverables:**
- Users can request AI analysis
- Structured trading signals returned
- Analysis history tracked

---

### Phase 3: Advanced Features (Week 5-6)

**Goal:** Enhanced user experience

**Tasks:**
- [ ] Add bulk chart generation
- [ ] Implement chart comparison
- [ ] Add custom analysis prompts
- [ ] Create chart templates
- [ ] Add export functionality (PDF, PNG)
- [ ] Implement webhooks for analysis completion
- [ ] Add email notifications

**Deliverables:**
- Power user features
- Better UX
- Notification system

---

### Phase 4: Scalability & Optimization (Week 7-8)

**Goal:** Production-ready system

**Tasks:**
- [ ] Implement Redis caching
- [ ] Add background job processing (BullMQ)
- [ ] Set up permanent storage (S3/R2)
- [ ] Optimize database queries
- [ ] Add monitoring (Sentry, DataDog)
- [ ] Implement rate limiting per plan
- [ ] Load testing
- [ ] Security audit

**Deliverables:**
- Scalable architecture
- Production monitoring
- High availability

---

## Security & Authorization

### Authentication Strategy

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';

export async function authMiddleware(req, res, next) {
  try {
    // 1. Check for JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await db.users.findUnique({
        where: { id: decoded.userId }
      });
      return next();
    }

    // 2. Check for API key
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
      const hashedKey = hashApiKey(apiKey);
      req.user = await db.users.findFirst({
        where: { apiKeyHash: hashedKey }
      });

      if (req.user) {
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid authentication' }
    });
  }
}
```

### Resource Authorization

```typescript
// middleware/authorize-chart.ts
export async function authorizeChartAccess(req, res, next) {
  const chartId = req.params.chartId;
  const userId = req.user.id;

  const chart = await db.charts.findFirst({
    where: { id: chartId, userId }
  });

  if (!chart) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Chart not found' }
    });
  }

  req.chart = chart;
  next();
}
```

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const chartGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    // Different limits per plan
    const plan = req.user.plan;

    return {
      'free': 5,
      'pro': 50,
      'enterprise': 500
    }[plan] || 5;
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  }
});
```

### Input Validation

```typescript
// validators/chart.validator.ts
import { z } from 'zod';

export const ChartConfigSchema = z.object({
  symbol: z.string().regex(/^[A-Z]+:[A-Z]+$/),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h', '1D', '1W']),
  range: z.string().optional(),
  theme: z.enum(['light', 'dark']).default('dark'),
  studies: z.array(z.object({
    name: z.string(),
    input: z.record(z.any()).optional()
  })).optional(),
  drawings: z.array(z.object({
    name: z.string(),
    input: z.record(z.any()),
    override: z.record(z.any()).optional()
  })).optional()
});

// Usage in route
app.post('/charts/generate', async (req, res) => {
  const validated = ChartConfigSchema.parse(req.body);
  // ... proceed with validated data
});
```

---

## Scalability Considerations

### 1. Caching Strategy

**Redis Caching:**
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache chart URLs (7 days TTL)
async function getCachedChart(chartId: string) {
  const cached = await redis.get(`chart:${chartId}`);
  if (cached) return JSON.parse(cached);
  return null;
}

async function cacheChart(chartId: string, data: any) {
  await redis.setex(
    `chart:${chartId}`,
    7 * 24 * 60 * 60, // 7 days
    JSON.stringify(data)
  );
}

// Cache user quotas (5 minutes TTL)
async function getCachedQuota(userId: string) {
  const cached = await redis.get(`quota:${userId}`);
  if (cached) return JSON.parse(cached);
  return null;
}
```

### 2. Database Optimization

**Indexes:**
```sql
-- Composite indexes for common queries
CREATE INDEX idx_charts_user_created ON charts(user_id, created_at DESC);
CREATE INDEX idx_analyses_chart_created ON chart_analyses(chart_id, created_at DESC);
CREATE INDEX idx_user_email_plan ON users(email, plan);
```

**Query Optimization:**
```typescript
// Use select to limit fields
const charts = await db.charts.findMany({
  where: { userId },
  select: {
    id: true,
    symbol: true,
    url: true,
    createdAt: true,
    // Exclude large config field
  },
  take: 50
});
```

### 3. Background Jobs

**BullMQ Setup:**
```typescript
// workers/index.ts
import { Queue, Worker } from 'bullmq';

// Chart storage queue
export const storageQueue = new Queue('chart-storage', {
  connection: { host: 'localhost', port: 6379 }
});

// Analysis queue
export const analysisQueue = new Queue('chart-analysis', {
  connection: { host: 'localhost', port: 6379 }
});

// Workers
const storageWorker = new Worker('chart-storage',
  async (job) => {
    // Process permanent storage
  }
);

const analysisWorker = new Worker('chart-analysis',
  async (job) => {
    // Process AI analysis
  }
);
```

### 4. Load Balancing

**Nginx Configuration:**
```nginx
upstream api_servers {
  server api1.yourapp.com:3000;
  server api2.yourapp.com:3000;
  server api3.yourapp.com:3000;
}

server {
  listen 80;
  server_name api.yourapp.com;

  location / {
    proxy_pass http://api_servers;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
  }
}
```

### 5. Monitoring & Observability

**DataDog/Sentry Setup:**
```typescript
import * as Sentry from '@sentry/node';
import StatsD from 'hot-shots';

// Sentry for error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// StatsD for metrics
const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'trading_charts.'
});

// Track metrics
statsd.increment('charts.generated');
statsd.timing('analysis.duration', processingTime);
statsd.gauge('users.active', activeUserCount);
```

---

## Cost Analysis

### Monthly Cost Breakdown (1000 Users, Pro Plan)

**Assumptions:**
- 50 charts/user/month = 50,000 charts
- 25 analyses/user/month = 25,000 analyses
- Average chart size: 80KB

| Service | Usage | Cost |
|---------|-------|------|
| **chart-img.com API** | 50,000 charts @ $0.02/chart | $1,000 |
| **Claude API** | 25,000 analyses @ 1,500 tokens avg | $1,875 |
| **Database (PostgreSQL)** | 50GB storage, 1M queries | $100 |
| **Redis Cache** | 2GB memory | $25 |
| **Server (AWS/Vercel)** | 4 instances @ $50/mo | $200 |
| **S3 Storage** (optional) | 4GB @ $0.023/GB | $0.10 |
| **Bandwidth** | 80KB × 50K charts = 4GB | $0.36 |
| **Monitoring** | Sentry + DataDog | $100 |

**Total Monthly Cost:** ~$3,300
**Cost Per User:** $3.30/month

**Revenue Model:**
- Free: $0/mo (5 charts, 3 analyses)
- Pro: $29/mo (100 charts, 50 analyses)
- Enterprise: $99/mo (unlimited)

**Break-even:** ~115 Pro users or 35 Enterprise users

---

## Deployment Guide

### Environment Variables

```bash
# .env.production
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_HOST=redis.yourapp.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# chart-img.com API
CHART_IMG_API_KEY=your_api_key_here
CHART_IMG_PLAN=PRO

# AI Service
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# AWS (if using S3)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET=your-charts-bucket

# Monitoring
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key

# App
API_URL=https://api.yourapp.com
FRONTEND_URL=https://app.yourapp.com
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=trading_charts
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  worker:
    build: .
    command: npm run worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-charts-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trading-charts-api
  template:
    metadata:
      labels:
        app: trading-charts-api
    spec:
      containers:
      - name: api
        image: yourregistry/trading-charts-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: CHART_IMG_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: chart-img-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## Next Steps

### Immediate Actions (This Week)

1. **Database Setup**
   - [ ] Set up PostgreSQL instance
   - [ ] Run migrations
   - [ ] Create test data

2. **Core Services**
   - [ ] Implement ChartGenerationService
   - [ ] Implement ChartAnalysisService
   - [ ] Add error handling

3. **API Endpoints**
   - [ ] Create Express app
   - [ ] Implement authentication
   - [ ] Add chart generation endpoint
   - [ ] Add analysis endpoint

4. **Testing**
   - [ ] Unit tests for services
   - [ ] Integration tests for APIs
   - [ ] Load testing

### Short-term (Next 2 Weeks)

1. Deploy MVP to staging
2. Internal testing
3. Beta user testing
4. Performance optimization

### Medium-term (Next Month)

1. Production deployment
2. Monitoring setup
3. Customer onboarding
4. Feature iteration

---

## Conclusion

This architecture provides a **scalable, cost-effective solution** for multi-user chart generation and AI analysis in a SaaS environment.

**Key Advantages:**
- ✅ Users get instant chart URLs (no waiting)
- ✅ AI can analyze any chart (download-on-demand)
- ✅ No storage overhead (temp files deleted)
- ✅ Scales to unlimited users
- ✅ Cost-efficient (~$3.30/user/month)
- ✅ Simple to implement
- ✅ Production-ready architecture

**Implementation Priority:**
1. Phase 1: Core chart generation (2 weeks)
2. Phase 2: AI analysis (2 weeks)
3. Phase 3: Advanced features (2 weeks)
4. Phase 4: Production optimization (2 weeks)

**Total timeline:** 8 weeks to production-ready SaaS

---

## Resources

- **chart-img.com API Docs:** https://doc.chart-img.com
- **Claude API Docs:** https://docs.anthropic.com
- **Prisma Docs:** https://www.prisma.io/docs
- **BullMQ Docs:** https://docs.bullmq.io
- **Project Repository:** [Your GitHub URL]

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Maintained By:** Engineering Team
