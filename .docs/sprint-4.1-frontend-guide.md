# Sprint 4.1: Frontend Integration Guide

## Overview

This sprint includes two major changes:

1. **Flexible Timeframes** - Multi-timeframe analysis now supports any number of timeframes (2, 3, 4, 5+) instead of fixed `htf/etf/ltf` roles
2. **Multiple Charts Per Message** - SSE events now support arrays of charts and analyses per message

---

## Part 1: Multiple Charts/Analyses Per Message

### Problem Solved

When users request multiple charts in a single message (e.g., "Show me BTC and ETH daily charts"), the backend now returns arrays instead of overwriting.

### SSE Event Changes

#### Before (Singular)
```json
{
  "event": "complete",
  "data": {
    "message": { ... },
    "chart": { "imageUrl": "...", "symbol": "BTC", "interval": "1D" },
    "analysis": { ... }
  }
}
```

#### After (Arrays)
```json
{
  "event": "complete",
  "data": {
    "message": { ... },
    "charts": [
      { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1D" },
      { "imageUrl": "...", "symbol": "BINANCE:ETHUSDT", "interval": "1D" }
    ],
    "analyses": [
      { "symbol": "BINANCE:BTCUSDT", "recommendation": "LONG", ... },
      { "symbol": "BINANCE:ETHUSDT", "recommendation": "SHORT", ... }
    ]
  }
}
```

### New SSE Event: `chart_complete` (Per Chart)

Each chart generation emits an individual event for real-time rendering:

```json
{
  "event": "chart_complete",
  "data": {
    "index": 0,
    "total": 2,
    "chart": {
      "imageUrl": "https://...",
      "symbol": "BINANCE:BTCUSDT",
      "interval": "1D",
      "requestId": "uuid-here"
    }
  }
}
```

Frontend should **append** to pending charts array (not overwrite).

### New SSE Event: `analysis_complete` (Per Analysis)

```json
{
  "event": "analysis_complete",
  "data": {
    "index": 0,
    "total": 2,
    "analysis": {
      "symbol": "BINANCE:BTCUSDT",
      "recommendation": "LONG",
      "confidence": 0.78,
      ...
    }
  }
}
```

### Message Model Changes

```typescript
interface Message {
  // Legacy (backwards compatibility)
  chartUrl?: string;
  chartSymbol?: string;
  chartInterval?: string;
  analysisData?: AnalysisResult;

  // NEW: Arrays
  charts?: ChartData[];
  analyses?: AnalysisResult[];
}

interface ChartData {
  imageUrl: string;
  symbol: string;
  interval: string;
  requestId?: string;
}
```

### Database Schema Update

The `Message` model now includes:

| Field | Type | Description |
|-------|------|-------------|
| `charts` | JSON[] | Array of chart objects |
| `analyses` | JSON[] | Array of analysis results |

Legacy fields remain for backwards compatibility with existing messages.

---

## Part 2: Flexible Timeframes

#### Endpoint: `analyze_multi_timeframe`

#### Request Changes

| Field | Before | After |
|-------|--------|-------|
| `charts[].role` | **Required** (`htf`, `etf`, `ltf`) | **Optional** |
| `flexibleMode` | N/A | New parameter (default: `true`) |
| Min charts | 2 (HTF + ETF required) | 2 (any intervals) |
| Max charts | 3 | **Unlimited** |

#### New Parameter

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `flexibleMode` | boolean | `true` | Enable flexible analysis (any number of timeframes) |

---

## Request Examples

### Before (Legacy Mode)
```json
{
  "charts": [
    { "role": "htf", "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1D" },
    { "role": "etf", "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "4h" },
    { "role": "ltf", "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1h" }
  ],
  "symbol": "BINANCE:BTCUSDT"
}
```

### After (Flexible Mode - Default)
```json
{
  "charts": [
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1W" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1D" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "4h" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1h" }
  ],
  "symbol": "BINANCE:BTCUSDT",
  "tradingStyle": "swing_trading"
}
```

### 5-Timeframe Example
```json
{
  "charts": [
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1W" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1D" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "4h" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1h" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "15m" }
  ],
  "symbol": "BINANCE:BTCUSDT",
  "tradingStyle": "day_trading",
  "tradingRules": "Only trade with trend confirmation on all timeframes"
}
```

---

## Response Changes

### New Response Structure (Flexible Mode)

```json
{
  "success": true,
  "flexibleMode": true,
  "requestId": "uuid-here",
  "symbol": "BINANCE:BTCUSDT",

  "timeframeAnalyses": [
    {
      "interval": "1W",
      "position": 0,
      "trend": "bullish",
      "trendStrength": "strong",
      "keyLevels": { "support": [92000, 88000], "resistance": [100000, 105000] },
      "signals": ["Above 20 EMA", "RSI healthy at 58"],
      "alignsWithHigherTF": true,
      "bias": "LONG",
      "reasoning": "Weekly shows strong uptrend..."
    },
    {
      "interval": "1D",
      "position": 1,
      "trend": "bullish",
      "trendStrength": "moderate",
      "keyLevels": { "support": [94000, 92000], "resistance": [98000, 100000] },
      "signals": ["MACD bullish cross", "Volume increasing"],
      "alignsWithHigherTF": true,
      "entryZone": { "low": 94500, "high": 95500 },
      "bias": "LONG",
      "reasoning": "Daily confirms weekly trend..."
    },
    {
      "interval": "4h",
      "position": 2,
      "trend": "bullish",
      "trendStrength": "moderate",
      "keyLevels": { "support": [95000], "resistance": [97000] },
      "signals": ["RSI bouncing from 45"],
      "alignsWithHigherTF": true,
      "entryZone": { "low": 95000, "high": 95500 },
      "bias": "LONG",
      "reasoning": "4H refines entry zone..."
    },
    {
      "interval": "1h",
      "position": 3,
      "trend": "neutral",
      "trendStrength": "weak",
      "keyLevels": { "support": [95200], "resistance": [95800] },
      "signals": ["Consolidating", "Wait for breakout"],
      "alignsWithHigherTF": false,
      "entryZone": { "low": 95200, "high": 95400 },
      "bias": "NEUTRAL",
      "reasoning": "1H shows consolidation, waiting for trigger..."
    }
  ],

  "synthesis": {
    "recommendation": "LONG",
    "confidence": 0.72,
    "alignment": "partial",
    "reasoning": "1W (HIGHEST): bullish LONG | 1D (POS-2): bullish LONG, aligns: ✓ | 4h (POS-3): bullish LONG, aligns: ✓ | 1h (LOWEST): neutral NEUTRAL, aligns: ✗ | SUMMARY: 4TF cascade, alignment: PARTIAL, confidence: 72%",
    "tradePlan": {
      "entry": 95200,
      "stopLoss": 94000,
      "takeProfit": [97000, 98000, 100000],
      "riskPercentage": 1.0
    }
  },

  "analyzedAt": "2024-12-03T10:30:00.000Z"
}
```

### Key Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `flexibleMode` | boolean | `true` for flexible mode |
| `timeframeAnalyses` | array | Analysis for each timeframe (ordered highest to lowest) |
| `timeframeAnalyses[].position` | number | `0` = highest TF, `1` = second highest, etc. |
| `timeframeAnalyses[].alignsWithHigherTF` | boolean | Does this TF confirm higher TF bias? |
| `timeframeAnalyses[].entryZone` | object | Entry zone (only on lower timeframes) |
| `synthesis.alignment` | string | `"full"`, `"partial"`, or `"none"` |

---

## Analysis Flow

```
User selects timeframes: [1W, 1D, 4h, 1h]
              ↓
System sorts by interval (highest to lowest)
              ↓
┌─────────────────────────────────────────────────┐
│ 1W (position: 0) - HIGHEST                      │
│ → Establishes trend bias                        │
│ → Identifies major support/resistance           │
│ → Output: trend=bullish, bias=LONG              │
└─────────────────────────────────────────────────┘
              ↓ context passed down
┌─────────────────────────────────────────────────┐
│ 1D (position: 1)                                │
│ → Receives 1W context                           │
│ → Confirms or contradicts weekly trend          │
│ → Output: alignsWithHigherTF=true, entryZone    │
└─────────────────────────────────────────────────┘
              ↓ context passed down
┌─────────────────────────────────────────────────┐
│ 4h (position: 2)                                │
│ → Receives 1W + 1D context                      │
│ → Refines entry zone                            │
│ → Output: alignsWithHigherTF=true               │
└─────────────────────────────────────────────────┘
              ↓ context passed down
┌─────────────────────────────────────────────────┐
│ 1h (position: 3) - LOWEST                       │
│ → Receives all higher TF context                │
│ → Provides precise entry/SL/TP                  │
│ → Output: alignsWithHigherTF=false              │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│ SYNTHESIS                                       │
│ → Combines all timeframe analyses               │
│ → Calculates alignment (3/4 aligned = partial)  │
│ → Generates final recommendation + trade plan   │
└─────────────────────────────────────────────────┘
```

---

## Supported Intervals

Intervals are automatically sorted by duration:

| Interval | Minutes | Category |
|----------|---------|----------|
| `1M` | 43200 | High |
| `1W` | 10080 | High |
| `1D` | 1440 | High |
| `12h` | 720 | Medium |
| `4h` | 240 | Medium |
| `1h` | 60 | Medium |
| `30m` | 30 | Low |
| `15m` | 15 | Low |
| `5m` | 5 | Low |
| `1m` | 1 | Low |

---

## Trading Style Presets

| Style | Recommended Timeframes |
|-------|------------------------|
| Scalping | `1h`, `15m`, `5m` |
| Day Trading | `4h`, `1h`, `15m` |
| Swing Trading | `1W`, `1D`, `4h` |
| Position Trading | `1M`, `1W`, `1D`, `4h` |

---

## Error Responses

```json
{
  "success": false,
  "error": "At least 2 charts are required for multi-timeframe analysis"
}
```

```json
{
  "success": false,
  "error": "Legacy mode requires both HTF and ETF charts. Set flexibleMode: true for any-timeframe analysis."
}
```

---

## Backward Compatibility

Legacy mode is auto-detected when:
1. All charts have `role` field set, OR
2. `flexibleMode: false` is explicitly set

Legacy response fields (`htf`, `etf`, `ltf`) are returned instead of `timeframeAnalyses`.

---

## Implementation Status

### Backend (Completed)

**Files Modified:**

1. **`src/modules/conversation/interfaces/conversation.interface.ts`**
   - Added `ChartData` and `AnalysisData` interfaces
   - Updated `SendMessageResponse` to include `charts[]` and `analyses[]` arrays
   - Legacy `chart` and `analysis` fields preserved for backwards compatibility

2. **`src/modules/conversation/services/conversation.service.ts`**
   - `sendMessageStreaming()` now collects charts/analyses in arrays
   - SSE events `chart_complete` and `analysis_complete` include `index` and `total`
   - `complete` event includes both legacy (first item) and array fields
   - `processClaudeResponse()` updated to use arrays

3. **`src/shared/utils/interval.utils.ts`**
   - Interval sorting utilities for flexible timeframe support
   - `sortByIntervalDescending()`, `getIntervalMinutes()`, `categorizeTimeframes()`

4. **`src/modules/analysis/services/multi-timeframe-analysis.service.ts`**
   - `analyzeFlexibleMultiTimeframe()` for N-timeframe analysis
   - Position-based cascade with higher TF context passing

**Tests:** 201 tests passing
