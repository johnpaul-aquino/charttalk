---
name: testing-strategy
description: Use when developer needs to write tests or set up test infrastructure. Teaches Vitest configuration, unit testing patterns, mocking strategies, and coverage reporting for the mcp-chart-image project.
keywords: ["test", "testing", "unit test", "mock", "vitest", "coverage", "TDD", "test-driven"]
---

# Testing Strategy Guide

You are an expert on testing TypeScript applications with **Vitest**. This skill teaches the testing patterns, mocking strategies, and best practices used in the mcp-chart-image project.

## Testing Framework

### Vitest Configuration

**Location**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,              // Enable describe, it, expect globally
    environment: 'node',         // Node.js environment (not jsdom)
    coverage: {
      provider: 'v8',            // Use V8 coverage provider
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // Path alias support
    },
  },
});
```

**Key Features**:
- ✅ **Globals enabled** - No need to import `describe`, `it`, `expect`
- ✅ **Node environment** - Perfect for backend/MCP testing
- ✅ **Path aliases** - Use `@/modules/...` in tests
- ✅ **Coverage tracking** - HTML reports with V8 provider
- ✅ **Fast execution** - Parallel test running

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm test src/modules/chart/services/__tests__/chart-config.service.test.ts

# Run tests matching pattern
npm test -- chart-config
```

## Test Organization

### Directory Structure

```
src/
├── modules/
│   ├── chart/
│   │   ├── services/
│   │   │   ├── chart-config.service.ts
│   │   │   └── __tests__/
│   │   │       ├── chart-config.service.test.ts
│   │   │       └── chart-validation.service.test.ts
│   │   └── repositories/
│   │       ├── indicators.repository.ts
│   │       └── __tests__/
│   │           └── indicators.repository.test.ts
│   └── storage/
│       └── services/
│           └── __tests__/
│               └── chart-storage.service.test.ts
```

**Naming Convention**:
- Test files: `*.test.ts` or `*.spec.ts`
- Directory: `__tests__/` next to source files
- Mirror source structure

## Testing Patterns

### 1. Service Testing with Mocked Dependencies

**Location**: `modules/chart/services/__tests__/chart-config.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChartConfigService } from '../chart-config.service';
import { IndicatorsRepository } from '../../repositories/indicators.repository';
import { DrawingsRepository } from '../../repositories/drawings.repository';
import type { IndicatorSearchResult } from '../../interfaces/chart.interface';

// ============================================
// MOCK DEPENDENCIES
// ============================================

vi.mock('../../repositories/indicators.repository');
vi.mock('../../repositories/drawings.repository');

describe('ChartConfigService', () => {
  let service: ChartConfigService;
  let mockIndicatorsRepo: IndicatorsRepository;
  let mockDrawingsRepo: DrawingsRepository;

  // ============================================
  // SETUP
  // ============================================

  beforeEach(() => {
    // Create mocked instances
    mockIndicatorsRepo = new IndicatorsRepository();
    mockDrawingsRepo = new DrawingsRepository();

    // Create service with mocked dependencies
    service = new ChartConfigService(
      mockIndicatorsRepo,
      mockDrawingsRepo
    );
  });

  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks();
  });

  // ============================================
  // TESTS
  // ============================================

  describe('constructFromNaturalLanguage', () => {
    it('should construct valid config for Bitcoin with RSI', async () => {
      // Arrange
      const input = 'Bitcoin chart with RSI for the last 7 days';
      const mockIndicatorResult: IndicatorSearchResult = {
        indicator: {
          id: 'RSI@tv-basicstudies',
          name: 'Relative Strength Index',
          category: 'oscillator',
          keywords: ['rsi', 'momentum'],
          tested: true,
          inputs: [{ id: 'length', name: 'Length', default: 14 }],
        },
        confidence: 0.95,
        matchType: 'keyword',
      };

      vi.spyOn(mockIndicatorsRepo, 'detectFromText')
        .mockReturnValue([mockIndicatorResult]);

      vi.spyOn(mockDrawingsRepo, 'detectFromText')
        .mockReturnValue([]);

      // Act
      const result = await service.constructFromNaturalLanguage(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.symbol).toBe('BINANCE:BTCUSDT');
      expect(result.config?.range).toBe('7D');
      expect(result.config?.indicators).toHaveLength(1);
      expect(result.config?.indicators[0].id).toBe('RSI@tv-basicstudies');

      // Verify repository was called
      expect(mockIndicatorsRepo.detectFromText).toHaveBeenCalledWith(
        input,
        expect.objectContaining({ testedOnly: true })
      );
    });

    it('should return error when symbol cannot be detected', async () => {
      // Arrange
      const input = 'chart with RSI';  // No symbol mentioned

      // Act
      const result = await service.constructFromNaturalLanguage(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.reasoning).toContain('Could not detect trading symbol');
      expect(result.config).toBeUndefined();
    });

    it('should handle multiple indicators correctly', async () => {
      // Arrange
      const input = 'Bitcoin with RSI, MACD, and Bollinger Bands';

      const mockResults: IndicatorSearchResult[] = [
        {
          indicator: { id: 'RSI', name: 'RSI' },
          confidence: 0.95,
          matchType: 'keyword',
        },
        {
          indicator: { id: 'MACD', name: 'MACD' },
          confidence: 0.9,
          matchType: 'keyword',
        },
        {
          indicator: { id: 'BB', name: 'Bollinger Bands' },
          confidence: 0.9,
          matchType: 'keyword',
        },
      ];

      vi.spyOn(mockIndicatorsRepo, 'detectFromText')
        .mockReturnValue(mockResults);

      // Act
      const result = await service.constructFromNaturalLanguage(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config?.indicators).toHaveLength(3);
    });

    it('should apply user preferences', async () => {
      // Arrange
      const input = 'Bitcoin chart';
      const preferences = {
        theme: 'light' as const,
        interval: '1D',
        range: '1M',
      };

      vi.spyOn(mockIndicatorsRepo, 'detectFromText').mockReturnValue([]);
      vi.spyOn(mockDrawingsRepo, 'detectFromText').mockReturnValue([]);

      // Act
      const result = await service.constructFromNaturalLanguage(input, preferences);

      // Assert
      expect(result.config?.theme).toBe('light');
      expect(result.config?.interval).toBe('1D');
      expect(result.config?.range).toBe('1M');
    });
  });

  describe('detectIndicators', () => {
    it('should filter indicators by confidence threshold', async () => {
      // Arrange
      const text = 'RSI and momentum indicators';
      const mockResults: IndicatorSearchResult[] = [
        { indicator: { id: 'RSI' }, confidence: 0.95, matchType: 'keyword' },
        { indicator: { id: 'LOW_CONF' }, confidence: 0.6, matchType: 'keyword' },
      ];

      vi.spyOn(mockIndicatorsRepo, 'detectFromText')
        .mockReturnValue(mockResults);

      // Act
      const results = await service.detectIndicators(text);

      // Assert - only high-confidence results should be returned
      expect(results).toHaveLength(1);
      expect(results[0].indicator.id).toBe('RSI');
    });
  });

  describe('detectSymbol (private method tested via public API)', () => {
    it('should detect Bitcoin variations', async () => {
      const testCases = [
        'Bitcoin chart',
        'BTC price',
        'btc analysis',
      ];

      for (const input of testCases) {
        vi.spyOn(mockIndicatorsRepo, 'detectFromText').mockReturnValue([]);
        vi.spyOn(mockDrawingsRepo, 'detectFromText').mockReturnValue([]);

        const result = await service.constructFromNaturalLanguage(input);

        expect(result.config?.symbol).toBe('BINANCE:BTCUSDT');
      }
    });

    it('should detect Ethereum variations', async () => {
      const input = 'Ethereum chart';
      vi.spyOn(mockIndicatorsRepo, 'detectFromText').mockReturnValue([]);
      vi.spyOn(mockDrawingsRepo, 'detectFromText').mockReturnValue([]);

      const result = await service.constructFromNaturalLanguage(input);

      expect(result.config?.symbol).toBe('BINANCE:ETHUSDT');
    });
  });
});
```

**Key Testing Patterns**:
- ✅ **Arrange-Act-Assert** structure
- ✅ **Mock external dependencies**
- ✅ **Test public methods only**
- ✅ **Descriptive test names** - "should [behavior] when [condition]"
- ✅ **Multiple assertions** - Verify all expected outcomes
- ✅ **Edge cases** - Test error conditions
- ✅ **Mock verification** - Ensure dependencies called correctly

### 2. Repository Testing

**Location**: `modules/chart/repositories/__tests__/indicators.repository.test.ts`

```typescript
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { IndicatorsRepository } from '../indicators.repository';
import { loadIndicatorsDatabase } from '@/core/database/loaders/indicators.loader';

// Mock the database loader
vi.mock('@/core/database/loaders/indicators.loader');

describe('IndicatorsRepository', () => {
  let repository: IndicatorsRepository;

  // Mock database data
  const mockDatabase = {
    totalCount: 3,
    addedCount: 3,
    indicators: [
      {
        id: 'RSI@tv-basicstudies',
        name: 'Relative Strength Index',
        category: 'oscillator',
        keywords: ['rsi', 'momentum', 'overbought', 'oversold'],
        tested: true,
        inputs: [{ id: 'length', name: 'Length', default: 14 }],
      },
      {
        id: 'MACD@tv-basicstudies',
        name: 'MACD',
        category: 'oscillator',
        keywords: ['macd', 'moving average convergence divergence'],
        tested: true,
        inputs: [],
      },
      {
        id: 'BB@tv-basicstudies',
        name: 'Bollinger Bands',
        category: 'volatility',
        keywords: ['bollinger', 'bands', 'bb', 'volatility'],
        tested: false,
      },
    ],
  };

  beforeAll(() => {
    // Mock the loader to return our test data
    vi.mocked(loadIndicatorsDatabase).mockReturnValue(mockDatabase);

    // Create repository (will use mocked loader)
    repository = new IndicatorsRepository();
  });

  describe('findByName', () => {
    it('should find indicator by exact name', () => {
      const result = repository.findByName('Relative Strength Index');

      expect(result).toBeDefined();
      expect(result?.id).toBe('RSI@tv-basicstudies');
    });

    it('should return null for non-existent indicator', () => {
      const result = repository.findByName('NonExistent');

      expect(result).toBeNull();
    });

    it('should be case-insensitive', () => {
      const result = repository.findByName('relative strength index');

      expect(result).toBeDefined();
      expect(result?.id).toBe('RSI@tv-basicstudies');
    });
  });

  describe('searchByKeyword', () => {
    it('should find indicators by keyword', () => {
      const results = repository.searchByKeyword('momentum');

      expect(results).toHaveLength(1);
      expect(results[0].indicator.id).toBe('RSI@tv-basicstudies');
      expect(results[0].matchType).toBe('keyword');
    });

    it('should return results sorted by confidence', () => {
      const results = repository.searchByKeyword('rsi');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThan(results[results.length - 1]?.confidence || 0);
    });

    it('should respect limit parameter', () => {
      const results = repository.searchByKeyword('oscillator', 1);

      expect(results).toHaveLength(1);
    });
  });

  describe('detectFromText', () => {
    it('should detect multiple indicators from text', () => {
      const text = 'Show me Bitcoin with RSI and Bollinger Bands';
      const results = repository.detectFromText(text);

      expect(results.length).toBeGreaterThanOrEqual(2);

      const ids = results.map(r => r.indicator.id);
      expect(ids).toContain('RSI@tv-basicstudies');
      expect(ids).toContain('BB@tv-basicstudies');
    });

    it('should filter by tested only', () => {
      const text = 'RSI and Bollinger Bands';
      const results = repository.detectFromText(text, { testedOnly: true });

      // Bollinger Bands is tested: false, should be filtered out
      expect(results).toHaveLength(1);
      expect(results[0].indicator.id).toBe('RSI@tv-basicstudies');
    });

    it('should filter by min confidence', () => {
      const text = 'chart analysis';
      const results = repository.detectFromText(text, { minConfidence: 0.9 });

      // Only high-confidence matches
      results.forEach(r => {
        expect(r.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should respect limit parameter', () => {
      const text = 'momentum oscillator indicators';
      const results = repository.detectFromText(text, { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getByCategory', () => {
    it('should return indicators by category', () => {
      const results = repository.getByCategory('oscillator');

      expect(results).toHaveLength(2);
      results.forEach(indicator => {
        expect(indicator.category).toBe('oscillator');
      });
    });

    it('should return empty array for non-existent category', () => {
      const results = repository.getByCategory('nonexistent' as any);

      expect(results).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats = repository.getStats();

      expect(stats.total).toBe(3);
      expect(stats.tested).toBe(2);
      expect(stats.byCategory).toBeDefined();
    });
  });
});
```

### 3. MCP Tool Testing

**Location**: `mcp/tools/__tests__/construct-chart-config.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { constructChartConfigTool } from '../construct-chart-config';
import { container, CHART_CONFIG_SERVICE } from '@/core/di';
import type { IChartConfigService } from '@/modules/chart/interfaces/chart.interface';

// Mock the DI container
vi.mock('@/core/di', () => ({
  container: {
    resolve: vi.fn(),
  },
  CHART_CONFIG_SERVICE: Symbol('CHART_CONFIG_SERVICE'),
}));

describe('constructChartConfigTool', () => {
  let mockService: IChartConfigService;

  beforeEach(() => {
    // Create mock service
    mockService = {
      constructFromNaturalLanguage: vi.fn(),
      detectIndicators: vi.fn(),
    };

    // Mock container.resolve to return our mock service
    vi.mocked(container.resolve).mockReturnValue(mockService);
  });

  it('should return success result from service', async () => {
    // Arrange
    const input = {
      naturalLanguage: 'Bitcoin with RSI',
    };

    const serviceResult = {
      success: true,
      config: {
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        range: '7D',
        indicators: [{ id: 'RSI' }],
      },
      reasoning: 'Detected Bitcoin, RSI indicator, 7-day range',
      warnings: [],
    };

    vi.mocked(mockService.constructFromNaturalLanguage).mockResolvedValue(serviceResult);

    // Act
    const result = await constructChartConfigTool(input);

    // Assert
    expect(result.success).toBe(true);
    expect(result.config).toEqual(serviceResult.config);
    expect(result.reasoning).toBe(serviceResult.reasoning);

    // Verify service was called correctly
    expect(mockService.constructFromNaturalLanguage).toHaveBeenCalledWith(
      'Bitcoin with RSI',
      {}
    );
  });

  it('should handle service errors', async () => {
    // Arrange
    const input = { naturalLanguage: 'invalid input' };

    vi.mocked(mockService.constructFromNaturalLanguage).mockRejectedValue(
      new Error('Service error')
    );

    // Act
    const result = await constructChartConfigTool(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Service error');
  });

  it('should pass preferences to service', async () => {
    // Arrange
    const input = {
      naturalLanguage: 'Bitcoin chart',
      symbol: 'COINBASE:BTCUSD',
      preferences: {
        theme: 'light' as const,
        interval: '1D',
      },
    };

    vi.mocked(mockService.constructFromNaturalLanguage).mockResolvedValue({
      success: true,
      config: {},
    });

    // Act
    await constructChartConfigTool(input);

    // Assert
    expect(mockService.constructFromNaturalLanguage).toHaveBeenCalledWith(
      'Bitcoin chart',
      {
        symbol: 'COINBASE:BTCUSD',
        theme: 'light',
        interval: '1D',
      }
    );
  });
});
```

## Mocking Strategies

### 1. Mock External Modules

```typescript
// Mock entire module
vi.mock('@/core/database/loaders/indicators.loader');

// Then provide mock implementation
vi.mocked(loadIndicatorsDatabase).mockReturnValue(mockData);
```

### 2. Mock DI Container

```typescript
vi.mock('@/core/di', () => ({
  container: {
    resolve: vi.fn(),
  },
  SERVICE_TOKEN: Symbol('SERVICE_TOKEN'),
}));

// In test
vi.mocked(container.resolve).mockReturnValue(mockService);
```

### 3. Spy on Methods

```typescript
const spy = vi.spyOn(repository, 'detectFromText');
spy.mockReturnValue(mockResults);

// Later, verify
expect(spy).toHaveBeenCalledWith('text', { testedOnly: true });
```

### 4. Mock Return Values

```typescript
// One-time mock
vi.mocked(service.method).mockResolvedValueOnce(result1);

// Permanent mock
vi.mocked(service.method).mockResolvedValue(result);

// Reject with error
vi.mocked(service.method).mockRejectedValue(new Error('Failed'));
```

## Coverage Reporting

### Generate Coverage

```bash
npm run test:coverage
```

**Output**:
```
 % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------|----------|---------|---------|-------------------
   85.23 |    78.45 |   92.31 |   86.78 | ...
```

**HTML Report**: `coverage/index.html`

### Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 90%+
- **Lines**: 80%+

## Test-Driven Development (TDD) Workflow

### Red-Green-Refactor Cycle

1. **Red**: Write failing test
   ```typescript
   it('should detect Bitcoin from text', () => {
     const result = service.detectSymbol('Bitcoin chart');
     expect(result).toBe('BINANCE:BTCUSDT');
   });
   ```

2. **Green**: Implement minimum code to pass
   ```typescript
   detectSymbol(text: string): string | null {
     if (text.includes('Bitcoin')) {
       return 'BINANCE:BTCUSDT';
     }
     return null;
   }
   ```

3. **Refactor**: Improve implementation
   ```typescript
   detectSymbol(text: string): string | null {
     const match = text.match(/\b(bitcoin|btc)\b/i);
     return match ? this.symbolMap.get(match[1].toLowerCase()) : null;
   }
   ```

## Best Practices

### ✅ Do

1. **Write tests alongside features** - Don't defer testing
2. **Follow AAA pattern** - Arrange, Act, Assert
3. **Mock external dependencies** - Keep tests isolated
4. **Test public API only** - Don't test private methods
5. **Use descriptive test names** - Explain what and why
6. **Test edge cases** - Error conditions, null values, empty arrays
7. **Keep tests focused** - One assertion concept per test
8. **Use beforeEach/afterEach** - Clean setup and teardown
9. **Verify mock calls** - Ensure dependencies used correctly
10. **Run tests frequently** - Use watch mode during development

### ❌ Don't

1. **Don't test implementation details** - Test behavior, not internals
2. **Don't skip error cases** - Test failures as thoroughly as success
3. **Don't use production data** - Always use mocks/fixtures
4. **Don't create test dependencies** - Tests should run independently
5. **Don't test framework code** - Trust Vitest, test your code
6. **Don't overuse snapshots** - Use for complex objects only
7. **Don't ignore failing tests** - Fix immediately or remove
8. **Don't mock everything** - Only mock external dependencies
9. **Don't write mega-tests** - Keep tests small and focused
10. **Don't commit without running tests** - Pre-commit hook recommended

## Common Test Scenarios

### Testing Async Operations

```typescript
it('should handle async service calls', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should throw error for invalid input', async () => {
  await expect(service.method(null)).rejects.toThrow('Invalid input');
});

// Or with try-catch
it('should return error for invalid input', async () => {
  const result = await service.method(null);
  expect(result.success).toBe(false);
  expect(result.error).toContain('Invalid input');
});
```

### Testing Conditional Logic

```typescript
describe('conditional behavior', () => {
  it('should return A when condition is true', () => {
    const result = service.method(true);
    expect(result).toBe('A');
  });

  it('should return B when condition is false', () => {
    const result = service.method(false);
    expect(result).toBe('B');
  });
});
```

### Testing Loops and Arrays

```typescript
it('should process all items in array', () => {
  const input = [1, 2, 3];
  const result = service.processArray(input);

  expect(result).toHaveLength(3);
  result.forEach((item, index) => {
    expect(item).toBe(input[index] * 2);
  });
});
```

## Related Skills

- **service-repository-builder**: Learn service patterns to test
- **mcp-tool-developer**: Learn tool patterns to test
- **module-architecture**: Understand testable architecture

## Questions This Skill Answers

- "How do I write a test for a service?"
- "Show me how to mock dependencies"
- "How do I test async functions?"
- "What's the testing pattern for this project?"
- "How do I run tests with coverage?"
- "How do I mock the DI container?"
- "Should I test private methods?"
- "How do I verify a mock was called?"
- "What's AAA pattern?"
- "How do I test error cases?"
