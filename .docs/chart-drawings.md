# Chart Drawings Implementation Guide

## Overview

The MCP Chart-Image server now supports TradingView Chart Drawings through API v2. Drawings allow you to add visual annotations to charts such as support/resistance lines, trend lines, and order markers.

## Architecture

### Three-Layer System

```
User Request (Natural Language)
    ↓
Drawing Detection (construct-chart-config.ts)
    ├─ Detects drawing keywords
    └─ Builds drawing configuration
    ↓
Drawing Validation (validate-config.ts)
    ├─ Validates parameters
    ├─ Checks color formats
    └─ Verifies plan limits
    ↓
API Submission (chart-img-client.ts)
    └─ Sends drawings to TradingView API v2
```

### Files Structure

```
src/
├── data/
│   └── drawings.json              # Drawing database (4 types)
├── types/
│   └── drawings.ts                # Type definitions
├── lib/
│   └── drawings-loader.ts         # Database loader utility
└── mcp/
    └── tools/
        ├── construct-chart-config.ts  # Drawing detection integration
        └── validate-config.ts         # Drawing validation
```

## Supported Drawing Types

### 1. Horizontal Line

Draws a fixed horizontal line at a specified price level. Useful for marking support and resistance levels.

**Parameters:**
- `price` (required): Price level where the line is positioned

**Styling:**
- `lineWidth`: 1-10 pixels (default: 1)
- `lineColor`: RGB or RGBA format (default: `rgb(115,115,117)`)

**Example:**
```json
{
  "name": "Horizontal Line",
  "input": {
    "price": 23520
  },
  "override": {
    "lineWidth": 2,
    "lineColor": "rgb(50,205,50)"
  }
}
```

**Natural Language Examples:**
- "Add horizontal support line"
- "Show resistance level"
- "Draw horizontal line"

---

### 2. Trend Line

Draws a diagonal line connecting two price points. Useful for identifying support/resistance trends and price action.

**Parameters:**
- `price1` (required): Starting price level
- `price2` (required): Ending price level
- `time1` (required): Starting bar index
- `time2` (required): Ending bar index

**Styling:**
- `lineWidth`: 1-10 pixels (default: 2)
- `lineColor`: RGB or RGBA format (default: `rgb(255,65,129)`)
- `lineStyle`: Dash pattern - 0=solid, 1=dotted, 2=dashed, 3=dash-dot (default: 0)

**Example:**
```json
{
  "name": "Trend Line",
  "input": {
    "price1": 23500,
    "price2": 23700,
    "time1": 0,
    "time2": 50
  },
  "override": {
    "lineWidth": 2,
    "lineColor": "rgb(255,65,129)",
    "lineStyle": 0
  }
}
```

**Natural Language Examples:**
- "Add trend line"
- "Draw diagonal trend"
- "Show trend line analysis"

---

### 3. Vertical Line

Draws a vertical line at a specific time point. Useful for marking events or important time periods.

**Parameters:**
- `time` (required): Bar index position where the line is placed

**Styling:**
- `lineWidth`: 1-10 pixels (default: 1)
- `lineColor`: RGB or RGBA format (default: `rgb(115,115,117)`)

**Example:**
```json
{
  "name": "Vertical Line",
  "input": {
    "time": 25
  },
  "override": {
    "lineWidth": 1,
    "lineColor": "rgb(115,115,117)"
  }
}
```

**Natural Language Examples:**
- "Add vertical event marker"
- "Mark event time"
- "Draw vertical line"

---

### 4. Order Line

Marks specific price levels for trade entry/exit points. Similar to horizontal line but specifically designed for trading orders.

**Parameters:**
- `price` (required): Price level where the order is placed

**Styling:**
- `lineWidth`: 1-10 pixels (default: 1)
- `lineColor`: RGB or RGBA format (default: `rgb(76,175,80)`)

**Example:**
```json
{
  "name": "Order Line",
  "input": {
    "price": 23500
  },
  "override": {
    "lineWidth": 1,
    "lineColor": "rgb(76,175,80)"
  }
}
```

**Natural Language Examples:**
- "Add entry order line"
- "Show order at 50000"
- "Mark exit order"
- "Trade entry level"

---

## Natural Language Detection

### How It Works

The system uses keyword matching with confidence scoring to detect drawings from user input:

1. **Keyword Matching**: Analyzes text for drawing-related keywords
2. **Confidence Scoring**: Ranks matches by relevance (0-100%)
3. **Multiple Detection**: Can detect multiple drawings in one request
4. **Parameter Analysis**: Uses defaults from database

**Example Workflow:**

```
User Input: "Show Bitcoin with horizontal support at 45000 and trend line analysis"
     ↓
Keyword Analysis:
  - "horizontal" + "support" → Horizontal Line (50% confidence)
  - "trend" + "line" → Trend Line (100% confidence)
     ↓
Result: Both drawings detected and configured
```

### Keywords by Drawing Type

| Drawing | Keywords |
|---------|----------|
| Horizontal Line | horizontal, line, support, resistance, level, price level |
| Trend Line | trend, line, diagonal, slope, support, resistance, trendline |
| Vertical Line | vertical, line, time, event, marker, event marker |
| Order Line | order, entry, exit, trade, pending, execution, buy, sell |

---

## API Integration with chart-img.com

### Request Format

Drawings are sent as part of the chart configuration via the TradingView Chart API v2:

```bash
POST /v2/tradingview/advanced-chart
Header: x-api-key: YOUR_API_KEY
Content-Type: application/json

{
  "symbol": "BINANCE:BTCUSDT",
  "interval": "1D",
  "range": "1M",
  "theme": "dark",
  "style": "candle",
  "drawings": [
    {
      "name": "Horizontal Line",
      "input": { "price": 45000 },
      "override": { "lineWidth": 2, "lineColor": "rgb(50,205,50)" }
    },
    {
      "name": "Trend Line",
      "input": { "price1": 44000, "price2": 46000, "time1": 0, "time2": 50 },
      "override": { "lineWidth": 2, "lineColor": "rgb(255,65,129)" }
    }
  ]
}
```

### Response

The API returns a chart image with all drawings rendered at the specified positions.

---

## Validation & Constraints

### Drawing Validation Rules

1. **Required Fields**: All `input` parameters are required based on drawing type
2. **Parameter Types**: Values must match expected types (number, string, object)
3. **Parameter Ranges**:
   - Price values: Any positive number
   - Time/Index values: Non-negative integers
   - Line width: 1-10
4. **Color Format**: Must be valid RGB or RGBA
   - Valid: `rgb(255,0,0)`, `rgba(255,0,0,0.5)`
   - Invalid: `#FF0000`, `red`, `rgb(256,0,0)`

### Plan Limits

Drawing limits depend on your chart-img.com plan:

| Plan | Max Drawings | Max Studies | Max Resolution |
|------|-------------|------------|-----------------|
| BASIC | 3 | 3 | 800×600 |
| PRO | 5 | 5 | 1920×1080 |
| MEGA | 10 | 10 | 1920×1600 |
| ULTRA | 25 | 25 | 2048×1920 |
| ENTERPRISE | 50+ | 50+ | 2048×1920 |

---

## Usage Examples

### Example 1: Support/Resistance Analysis

```javascript
// Natural language request
{
  "naturalLanguage": "Bitcoin chart with horizontal support at 45000 and resistance at 50000 for the past month"
}

// Generated configuration
{
  "symbol": "BINANCE:BTCUSDT",
  "interval": "1D",
  "range": "1M",
  "drawings": [
    {
      "name": "Horizontal Line",
      "input": { "price": 45000 },
      "override": { "lineColor": "rgb(50,205,50)" }
    },
    {
      "name": "Horizontal Line",
      "input": { "price": 50000 },
      "override": { "lineColor": "rgb(255,65,129)" }
    }
  ]
}
```

### Example 2: Trend Analysis with Indicators

```javascript
// Natural language request
{
  "naturalLanguage": "Ethereum with trend line, RSI and MACD for the last 3 months"
}

// Generated configuration includes:
{
  "symbol": "BINANCE:ETHUSDT",
  "interval": "1D",
  "range": "3M",
  "studies": [
    { "name": "Relative Strength Index", ... },
    { "name": "MACD", ... }
  ],
  "drawings": [
    { "name": "Trend Line", ... }
  ]
}
```

### Example 3: Trading Setup with Order Markers

```javascript
// Natural language request
{
  "naturalLanguage": "Bitcoin with entry order at 48000, stop loss at 46000, and take profit at 52000"
}

// Generated configuration
{
  "symbol": "BINANCE:BTCUSDT",
  "drawings": [
    {
      "name": "Order Line",
      "input": { "price": 48000 },
      "override": { "lineColor": "rgb(76,175,80)" }  // Green for entry
    },
    {
      "name": "Horizontal Line",
      "input": { "price": 46000 },
      "override": { "lineColor": "rgb(255,0,0)" }  // Red for stop loss
    },
    {
      "name": "Horizontal Line",
      "input": { "price": 52000 },
      "override": { "lineColor": "rgb(0,128,0)" }  // Dark green for take profit
    }
  ]
}
```

---

## Implementation Details

### Drawing Database (src/data/drawings.json)

Contains all drawing type definitions with:
- `id`: Unique identifier
- `name`: Display name
- `type`: API type identifier
- `category`: Classification (Lines, Orders, Shapes, Advanced)
- `inputs`: Array of required parameters
- `overrides`: Array of styling options
- `keywords`: For natural language matching
- `tested`: Boolean flag for testing status
- `example`: Sample configuration

### Drawing Loader (src/lib/drawings-loader.ts)

Provides utility functions for:
- `loadDrawingsDatabase()`: Load JSON with caching
- `getAllDrawings()`: Get all drawings
- `findDrawingById(id)`: Find by ID
- `findDrawingByName(name)`: Find by name
- `searchDrawingsByKeyword(keyword)`: Search with scoring
- `detectDrawingsFromText(text)`: Natural language detection
- `getDrawingsByCategory(category)`: Filter by category
- `buildDrawingConfig()`: Build API configuration
- `validateDrawingInput()`: Validate parameters
- `getDrawingsStats()`: Get database statistics

### Integration in Tools

**construct-chart-config.ts**:
- Imports drawing loader
- Detects drawings from natural language
- Builds drawing configurations
- Includes in returned ChartConfig

**validate-config.ts**:
- Validates drawing parameters
- Checks color formats
- Verifies plan limits
- Provides helpful error messages

---

## Color Reference

### Common Colors (RGB Format)

| Color | RGB Value |
|-------|-----------|
| Green (Support) | `rgb(50,205,50)` |
| Red (Resistance/Loss) | `rgb(255,0,0)` |
| Blue | `rgb(0,0,255)` |
| Orange | `rgb(255,165,0)` |
| Purple | `rgb(128,0,128)` |
| Gray | `rgb(115,115,117)` |
| White | `rgb(255,255,255)` |
| Black | `rgb(0,0,0)` |

### With Transparency (RGBA Format)

```
rgb(50,205,50,0.5)    # 50% transparent green
rgb(255,0,0,0.3)      # 30% transparent red
rgb(0,0,255,0.7)      # 70% transparent blue
```

---

## Future Enhancements

### Planned Additions

1. **Additional Drawing Types**:
   - Rectangle
   - Arrow markers
   - Fibonacci retracement
   - Text annotations

2. **AI-Driven Parameter Detection**:
   - Analyze chart data to find support/resistance levels
   - Automatically calculate trend line coordinates
   - Detect key price levels for order placement

3. **Template System**:
   - Pre-configured drawing sets
   - Custom drawing templates
   - Save/load configurations

4. **Advanced Styling**:
   - Pattern fills
   - Gradient colors
   - Custom line patterns

---

## Troubleshooting

### Common Issues

**"Invalid color format" error**
- Ensure color is in RGB format: `rgb(R,G,B)` where R,G,B are 0-255
- For transparency: `rgba(R,G,B,A)` where A is 0-1

**"Drawing count exceeds plan limits"**
- Check your plan's maximum drawing count
- Remove unnecessary drawings or upgrade plan

**"Unknown drawing type"**
- Check spelling of drawing name (case-sensitive)
- Valid types: "Horizontal Line", "Vertical Line", "Trend Line", "Order Line"

**Drawings not appearing on chart**
- Verify all required input parameters are provided
- Check price/time values are within chart range
- Ensure drawing type is tested and supported

---

## API Reference

### Drawing Configuration Object

```typescript
interface DrawingConfig {
  name: string;                    // Required: Drawing type name
  input: Record<string, any>;     // Required: Parameters specific to drawing type
  override?: Record<string, any>; // Optional: Styling overrides
  zOrder?: number;                // Optional: Layering order
}
```

### Supported Drawing Names

- `"Horizontal Line"`
- `"Vertical Line"`
- `"Trend Line"`
- `"Order Line"`

### Input Parameters by Type

**Horizontal Line**: `{ price: number }`

**Vertical Line**: `{ time: number }`

**Trend Line**: `{ price1: number, price2: number, time1: number, time2: number }`

**Order Line**: `{ price: number }`

---

## Related Documentation

- [API Integration Guide](./api-integration.md) - Full API reference
- [MCP Tools Documentation](./mcp-tools.md) - Available MCP tools
- [Architecture Overview](./architecture.md) - System design
- [Usage Examples](./examples.md) - Example prompts and responses

---

## Support & Resources

- **API Documentation**: https://doc.chart-img.com
- **Base Endpoint**: `https://api.chart-img.com/v2/tradingview/advanced-chart`
- **Authentication**: Use `x-api-key` header with your API key
- **Rate Limits**: Check your plan limits in documentation

---

**Version**: 1.0.0
**Last Updated**: November 7, 2025
**Status**: Fully Implemented (Horizontal Line, Trend Line)
**Tested Drawing Types**: 2/4
**Future Drawing Types**: 2/4 (Vertical Line, Order Line - placeholders ready)
