---
name: database-loader
description: Use when working with indicators, drawings, or adding new JSON database structures. Teaches database loader pattern, fuzzy search algorithms, natural language detection, and caching strategies.
keywords: ["database", "loader", "indicator", "drawing", "JSON", "search", "fuzzy", "cache", "detection"]
---

# Database & Data Loader Expert

You are an expert on the **database loader system** for indicators and drawings in the mcp-chart-image project. This skill teaches JSON database management, fuzzy search algorithms, natural language detection, and caching strategies.

## Database Overview

### Database Files

**Location**: `src/core/database/`

```
src/core/database/
├── indicators.json     # 100+ technical indicators
├── drawings.json       # Chart drawings (lines, positions, orders)
└── loaders/            # Loader utilities
    ├── indicators.loader.ts
    └── drawings.loader.ts
```

### Indicators Database Structure

**Location**: `src/core/database/indicators.json`

```json
{
  "totalCount": 129,
  "addedCount": 104,
  "progress": {
    "remaining": 25,
    "completionPercentage": 80.62
  },
  "indicators": [
    {
      "id": "RSI@tv-basicstudies",
      "name": "Relative Strength Index",
      "category": "oscillator",
      "keywords": ["rsi", "momentum", "overbought", "oversold"],
      "description": "Momentum oscillator measuring speed and magnitude of price changes",
      "tested": true,
      "inputs": [
        {
          "id": "length",
          "name": "Length",
          "param": "in_0",
          "default": 14,
          "type": "integer"
        }
      ]
    },
    {
      "id": "MACD@tv-basicstudies",
      "name": "MACD",
      "category": "oscillator",
      "keywords": ["macd", "moving average convergence divergence"],
      "tested": true,
      "inputs": [
        {
          "id": "fastLength",
          "name": "Fast Length",
          "param": "in_0",
          "default": 12
        },
        {
          "id": "slowLength",
          "name": "Slow Length",
          "param": "in_1",
          "default": 26
        },
        {
          "id": "signalLength",
          "name": "Signal Smoothing",
          "param": "in_2",
          "default": 9
        }
      ]
    }
  ]
}
```

**Field Descriptions**:
- **id**: Unique identifier (format: `NAME@tv-basicstudies`)
- **name**: Human-readable display name
- **category**: Category grouping (oscillator, trend, volatility, volume, support_resistance)
- **keywords**: Search terms for natural language detection
- **tested**: Boolean flag indicating if indicator works with chart-img API
- **inputs**: Configurable parameters with defaults

### Drawings Database Structure

**Location**: `src/core/database/drawings.json`

```json
{
  "totalCount": 8,
  "drawings": [
    {
      "id": "horizontal_line",
      "name": "Horizontal Line",
      "category": "lines",
      "keywords": ["horizontal", "support", "resistance", "level", "line"],
      "description": "Draw horizontal support/resistance lines",
      "inputs": [
        {
          "id": "price",
          "name": "Price",
          "param": "price",
          "type": "number",
          "required": true
        },
        {
          "id": "color",
          "name": "Color",
          "param": "color",
          "type": "string",
          "default": "#2196F3"
        }
      ]
    }
  ]
}
```

## Loader Pattern

### Lazy Loading with Caching

**Location**: `src/core/database/loaders/indicators.loader.ts`

```typescript
/**
 * Lazy-loaded indicators database
 * Cached in memory after first load to avoid repeated file reads
 */
let cachedDatabase: IndicatorsDatabase | null = null;
let loadError: Error | null = null;

/**
 * Load the indicators database from JSON file
 * Uses caching to avoid repeated file reads
 */
export function loadIndicatorsDatabase(): IndicatorsDatabase {
  // Return cached if available
  if (cachedDatabase) {
    return cachedDatabase;
  }

  // Throw cached error if previous load failed
  if (loadError) {
    throw loadError;
  }

  try {
    // Load from file
    const dbPath = path.resolve(__dirname, '../indicators.json');
    const rawData = fs.readFileSync(dbPath, 'utf-8');
    cachedDatabase = JSON.parse(rawData) as IndicatorsDatabase;
    return cachedDatabase;
  } catch (error) {
    loadError = error as Error;
    throw new Error(
      `Failed to load indicators database: ${(error as Error).message}`
    );
  }
}

/**
 * Clear the cached database (useful for testing)
 */
export function clearCache(): void {
  cachedDatabase = null;
  loadError = null;
}
```

**Why this pattern?**
- ✅ **Lazy loading** - Database loaded only when first accessed
- ✅ **Caching** - Avoid repeated file I/O (expensive operation)
- ✅ **Error caching** - Don't retry failed loads repeatedly
- ✅ **Testability** - `clearCache()` for test isolation

## Search Algorithms

### 1. Fuzzy Search by Keyword

**Confidence Scoring System**:

```typescript
/**
 * Search indicators by keyword with confidence scoring
 * Returns results sorted by relevance
 */
export function searchIndicatorsByKeyword(
  keyword: string
): IndicatorSearchResult[] {
  const db = loadIndicatorsDatabase();
  const searchTerm = keyword.toLowerCase();
  const results: IndicatorSearchResult[] = [];

  for (const indicator of db.indicators) {
    let confidence = 0;
    let matchType: 'id' | 'name' | 'keyword' | 'category' = 'keyword';

    // Exact ID match (highest priority)
    if (indicator.id === searchTerm) {
      confidence = 1.0;
      matchType = 'id';
    }
    // Exact name match
    else if (indicator.name.toLowerCase() === searchTerm) {
      confidence = 0.95;
      matchType = 'name';
    }
    // ID contains search term
    else if (indicator.id.includes(searchTerm)) {
      confidence = 0.9;
      matchType = 'id';
    }
    // Name contains search term
    else if (indicator.name.toLowerCase().includes(searchTerm)) {
      confidence = 0.85;
      matchType = 'name';
    }
    // Keyword match (exact)
    else if (indicator.keywords.some((kw) => kw === searchTerm)) {
      confidence = 0.8;
      matchType = 'keyword';
    }
    // Keyword match (partial)
    else if (indicator.keywords.some((kw) => kw.includes(searchTerm))) {
      confidence = 0.7;
      matchType = 'keyword';
    }
    // Category match
    else if (indicator.category.toLowerCase().includes(searchTerm)) {
      confidence = 0.5;
      matchType = 'category';
    }

    if (confidence > 0) {
      results.push({ indicator, matchType, confidence });
    }
  }

  // Sort by confidence (highest first), then by tested flag, then by name
  return results.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }
    if (a.indicator.tested !== b.indicator.tested) {
      return a.indicator.tested ? -1 : 1;
    }
    return a.indicator.name.localeCompare(b.indicator.name);
  });
}
```

**Confidence Levels**:
- **1.0** - Exact ID match (`"RSI@tv-basicstudies"`)
- **0.95** - Exact name match (`"Relative Strength Index"`)
- **0.9** - ID contains keyword (`"RSI"` matches `"RSI@tv-basicstudies"`)
- **0.85** - Name contains keyword (`"RSI"` matches `"Relative Strength Index"`)
- **0.8** - Exact keyword match (keyword array contains exact term)
- **0.7** - Partial keyword match (keyword contains search term)
- **0.5** - Category match (`"oscillator"` matches category)

### 2. Natural Language Detection

**Pattern**: Scan text for indicator keywords

```typescript
/**
 * Smart indicator detection from natural language
 * Searches text for indicator keywords and returns matching indicators
 * Prioritizes tested indicators and higher confidence matches
 */
export function detectIndicatorsFromText(
  text: string,
  options?: {
    testedOnly?: boolean;
    limit?: number;
  }
): IndicatorSearchResult[] {
  const searchText = text.toLowerCase();
  const allResults: IndicatorSearchResult[] = [];
  const db = loadIndicatorsDatabase();
  const seenIds = new Set<string>();

  // Search for each indicator's keywords in the text
  for (const indicator of db.indicators) {
    // Skip untested indicators if requested
    if (options?.testedOnly && !indicator.tested) {
      continue;
    }

    // Skip if we've already added this indicator
    if (seenIds.has(indicator.id)) {
      continue;
    }

    let confidence = 0;
    let matchType: 'name' | 'keyword' = 'keyword';

    // Check exact name match first (highest priority)
    if (searchText.includes(indicator.name.toLowerCase())) {
      confidence = 0.95;
      matchType = 'name';
    }
    // Check keywords
    else {
      for (const keyword of indicator.keywords) {
        if (searchText.includes(keyword)) {
          confidence = 0.8;
          matchType = 'keyword';
          break;
        }
      }
    }

    // If we found a match, add it
    if (confidence > 0) {
      allResults.push({ indicator, matchType, confidence });
      seenIds.add(indicator.id);
    }
  }

  // Sort by confidence
  allResults.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }
    if (a.indicator.tested !== b.indicator.tested) {
      return a.indicator.tested ? -1 : 1;
    }
    return a.indicator.name.localeCompare(b.indicator.name);
  });

  // Apply limit if specified
  if (options?.limit) {
    return allResults.slice(0, options.limit);
  }

  return allResults;
}
```

**Example Usage**:

```typescript
const text = 'Bitcoin chart with RSI and Bollinger Bands for last 7 days';
const indicators = detectIndicatorsFromText(text, { testedOnly: true, limit: 10 });

// Result:
// [
//   { indicator: { id: 'RSI@tv-basicstudies', ... }, confidence: 0.8, matchType: 'keyword' },
//   { indicator: { id: 'BB@tv-basicstudies', ... }, confidence: 0.8, matchType: 'keyword' }
// ]
```

## Helper Functions

### Find by ID

```typescript
export function findIndicatorById(id: string): Indicator | undefined {
  const db = loadIndicatorsDatabase();
  return db.indicators.find((ind) => ind.id === id);
}
```

### Find by Name (Case-Insensitive)

```typescript
export function findIndicatorByName(name: string): Indicator | undefined {
  const db = loadIndicatorsDatabase();
  const normalized = name.toLowerCase();

  return db.indicators.find(
    (ind) =>
      ind.name.toLowerCase() === normalized ||
      ind.id.toLowerCase() === normalized
  );
}
```

### Get by Category

```typescript
export function getIndicatorsByCategory(category: string): Indicator[] {
  const db = loadIndicatorsDatabase();
  const normalized = category.toLowerCase();

  return db.indicators.filter(
    (ind) => ind.category.toLowerCase() === normalized
  );
}
```

### Build Study Object

Convert indicator definition to chart-img API format:

```typescript
export function buildStudyFromIndicator(
  indicator: Indicator,
  customInputs?: Record<string, any>
): {
  name: string;
  inputs?: Record<string, any>;
} {
  const inputs: Record<string, any> = {};

  // Build inputs from indicator definition
  for (const inputDef of indicator.inputs) {
    const paramName = inputDef.param;

    // Use custom input if provided, otherwise use default
    if (customInputs && customInputs[inputDef.name] !== undefined) {
      inputs[paramName] = customInputs[inputDef.name];
    } else if (customInputs && customInputs[paramName] !== undefined) {
      inputs[paramName] = customInputs[paramName];
    } else {
      inputs[paramName] = inputDef.default;
    }
  }

  return {
    name: `${indicator.name}@tv-basicstudies`,
    ...(Object.keys(inputs).length > 0 && { inputs }),
  };
}
```

**Example**:

```typescript
const indicator = findIndicatorByName('RSI');
const study = buildStudyFromIndicator(indicator, { Length: 21 });

// Result:
// {
//   name: 'Relative Strength Index@tv-basicstudies',
//   inputs: { in_0: 21 }
// }
```

### Get Statistics

```typescript
export function getIndicatorsStats(): {
  total: number;
  added: number;
  remaining: number;
  categories: Record<string, number>;
  testedCount: number;
  untestedCount: number;
} {
  const db = loadIndicatorsDatabase();

  const categories: Record<string, number> = {};
  let testedCount = 0;
  let untestedCount = 0;

  for (const indicator of db.indicators) {
    categories[indicator.category] = (categories[indicator.category] ?? 0) + 1;

    if (indicator.tested) {
      testedCount++;
    } else {
      untestedCount++;
    }
  }

  return {
    total: db.totalCount,
    added: db.addedCount,
    remaining: db.progress.remaining,
    categories,
    testedCount,
    untestedCount,
  };
}
```

## Adding a New Indicator

### Step 1: Update JSON Database

**Location**: `src/core/database/indicators.json`

```json
{
  "indicators": [
    {
      "id": "ATR@tv-basicstudies",
      "name": "Average True Range",
      "category": "volatility",
      "keywords": ["atr", "average true range", "volatility", "range"],
      "description": "Measures market volatility by decomposing entire range of price movement",
      "tested": false,
      "inputs": [
        {
          "id": "length",
          "name": "Length",
          "param": "in_0",
          "default": 14,
          "type": "integer"
        }
      ]
    }
  ]
}
```

**Guidelines**:
- **id**: Use format `NAME@tv-basicstudies`
- **keywords**: Add all common variations and abbreviations
- **tested**: Set to `false` until verified with chart-img API
- **inputs**: Match chart-img API parameter names (`in_0`, `in_1`, etc.)

### Step 2: Update Domain Types (if needed)

**Location**: `src/modules/chart/domain/indicators.ts`

```typescript
export type IndicatorCategory =
  | 'oscillator'
  | 'trend'
  | 'volatility'
  | 'volume'
  | 'support_resistance';
```

### Step 3: Test with Loader

```typescript
import { findIndicatorByName, searchIndicatorsByKeyword } from '@/core/database/loaders/indicators.loader';

// Test by name
const atr = findIndicatorByName('Average True Range');
console.log(atr);

// Test by keyword
const results = searchIndicatorsByKeyword('atr');
console.log(results);
```

### Step 4: Mark as Tested

After verifying with chart-img API, update `"tested": true`.

## Adding a New Drawing

### Step 1: Update JSON Database

**Location**: `src/core/database/drawings.json`

```json
{
  "drawings": [
    {
      "id": "fibonacci_retracement",
      "name": "Fibonacci Retracement",
      "category": "fibonacci",
      "keywords": ["fibonacci", "fib", "retracement", "levels"],
      "description": "Draw Fibonacci retracement levels",
      "inputs": [
        {
          "id": "startPrice",
          "name": "Start Price",
          "param": "startPrice",
          "type": "number",
          "required": true
        },
        {
          "id": "endPrice",
          "name": "End Price",
          "param": "endPrice",
          "type": "number",
          "required": true
        }
      ]
    }
  ]
}
```

### Step 2: Update Loader

**Location**: `src/core/database/loaders/drawings.loader.ts`

Follow same pattern as indicators loader:
- Lazy loading with caching
- Search by keyword
- Natural language detection
- Build drawing object for API

## Repository Integration

Loaders are consumed by repositories:

**Location**: `src/modules/chart/repositories/indicators.repository.ts`

```typescript
import { loadIndicatorsDatabase, detectIndicatorsFromText } from '@/core/database/loaders/indicators.loader';

export class IndicatorsRepository implements IIndicatorsRepository {
  private database: IndicatorsDatabase;

  constructor() {
    // Load database on instantiation (cached)
    this.database = loadIndicatorsDatabase();
  }

  detectFromText(text: string, options?: DetectionOptions): IndicatorSearchResult[] {
    // Use loader utility
    return detectIndicatorsFromText(text, {
      testedOnly: options?.testedOnly,
      limit: options?.limit,
    });
  }

  // ... other methods
}
```

## Testing Loaders

**Location**: `src/core/database/loaders/__tests__/indicators.loader.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadIndicatorsDatabase,
  findIndicatorByName,
  searchIndicatorsByKeyword,
  detectIndicatorsFromText,
  clearCache,
} from '../indicators.loader';

describe('Indicators Loader', () => {
  beforeAll(() => {
    clearCache(); // Clear cache before tests
  });

  afterAll(() => {
    clearCache(); // Clean up after tests
  });

  describe('loadIndicatorsDatabase', () => {
    it('should load database successfully', () => {
      const db = loadIndicatorsDatabase();
      expect(db.indicators).toBeDefined();
      expect(db.totalCount).toBeGreaterThan(0);
    });

    it('should cache database after first load', () => {
      const db1 = loadIndicatorsDatabase();
      const db2 = loadIndicatorsDatabase();
      expect(db1).toBe(db2); // Same reference = cached
    });
  });

  describe('findIndicatorByName', () => {
    it('should find RSI indicator', () => {
      const indicator = findIndicatorByName('Relative Strength Index');
      expect(indicator).toBeDefined();
      expect(indicator?.id).toBe('RSI@tv-basicstudies');
    });

    it('should be case-insensitive', () => {
      const indicator = findIndicatorByName('relative strength index');
      expect(indicator).toBeDefined();
    });
  });

  describe('searchIndicatorsByKeyword', () => {
    it('should return results sorted by confidence', () => {
      const results = searchIndicatorsByKeyword('momentum');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThanOrEqual(results[1]?.confidence || 0);
    });
  });

  describe('detectIndicatorsFromText', () => {
    it('should detect multiple indicators from text', () => {
      const text = 'Show me Bitcoin with RSI and MACD';
      const results = detectIndicatorsFromText(text);

      const ids = results.map(r => r.indicator.id);
      expect(ids).toContain('RSI@tv-basicstudies');
      expect(ids).toContain('MACD@tv-basicstudies');
    });

    it('should filter by tested only', () => {
      const results = detectIndicatorsFromText('indicators', { testedOnly: true });
      results.forEach(r => {
        expect(r.indicator.tested).toBe(true);
      });
    });
  });
});
```

## Best Practices

### ✅ Do

1. **Use lazy loading** - Load database only when needed
2. **Cache in memory** - Avoid repeated file I/O
3. **Use fuzzy search** - Confidence scoring for flexible matching
4. **Prioritize tested indicators** - Sort tested indicators first
5. **Provide natural language detection** - Keyword-based search in text
6. **Clear cache in tests** - Ensure test isolation
7. **Update totalCount** - Keep metadata accurate
8. **Add comprehensive keywords** - Enable better search
9. **Document new indicators** - Add descriptions
10. **Test before marking tested: true** - Verify with chart-img API

### ❌ Don't

1. **Don't load database repeatedly** - Use caching
2. **Don't skip keywords** - Reduces search quality
3. **Don't hardcode indicator IDs** - Use search functions
4. **Don't forget to update stats** - Keep totalCount, addedCount accurate
5. **Don't add untested indicators as tested** - Verify first
6. **Don't use direct file access** - Use loader functions
7. **Don't skip confidence scoring** - Helps prioritize results
8. **Don't forget category** - Required for grouping

## Database Statistics

Current status (as of migration):

```
Total Indicators: 129
Added: 104 (80.62%)
Remaining: 25
Tested: ~36 indicators

Categories:
- oscillator: 40+
- trend: 30+
- volatility: 15+
- volume: 10+
- support_resistance: 5+
```

## Related Skills

- **service-repository-builder**: Learn how repositories use loaders
- **module-architecture**: Understand where database code fits
- **testing-strategy**: Learn how to test loaders

## Questions This Skill Answers

- "How do I add a new indicator?"
- "How does indicator search work?"
- "What's the caching strategy?"
- "How do I detect indicators from natural language?"
- "Show me the structure of the indicators JSON"
- "How do I update the database?"
- "What's the confidence scoring system?"
- "How do I test the loader?"
- "Where are database files located?"
- "How do I add custom indicator inputs?"
