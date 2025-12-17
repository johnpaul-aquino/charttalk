# Testing Guide

This project uses **Vitest** for unit testing with comprehensive test coverage.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are located alongside the code they test in `__tests__` directories:

```
src/
├── modules/
│   ├── chart/
│   │   └── services/
│   │       ├── __tests__/
│   │       │   ├── chart-config.service.test.ts      (24 tests)
│   │       │   ├── chart-validation.service.test.ts  (12 tests)
│   │       │   └── chart-generation.service.test.ts  (future)
│   │       ├── chart-config.service.ts
│   │       ├── chart-validation.service.ts
│   │       └── chart-generation.service.ts
│   └── storage/
│       └── services/
│           └── __tests__/                            (future)
```

## Current Test Coverage

**109 tests | 100% passing**

### ChartConfigService (24 tests)
- Symbol detection (crypto, stocks, forex)
- Time range detection (1D, 1M, 1Y, etc.)
- Interval detection (explicit + inferred)
- Theme detection (light/dark)
- Chart style detection (candle, line, bar, area)
- Resolution parsing
- Natural language to config conversion
- User preferences override

### ChartValidationService (12 tests)
- Required fields validation
- Symbol format validation (EXCHANGE:SYMBOL)
- Interval/range validation
- Resolution limits per plan (BASIC: 800x600, PRO: 1920x1080)
- Study count limits per plan (BASIC: 3, PRO: 5)
- Complete configuration validation

## Writing New Tests

Example test structure:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourService } from '../your-service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService();
  });

  describe('methodName', () => {
    it('should do something', () => {
      const result = service.methodName('input');
      expect(result).toBe('expected output');
    });

    it('should handle edge cases', () => {
      const result = service.methodName('edge case');
      expect(result).toBeDefined();
    });
  });
});
```

## Test Configuration

Tests are configured in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

## E2E Testing with Playwright

E2E tests have been **moved to a separate repository** for better separation of concerns.

**E2E Test Repository:** `/Users/paul/Desktop/projects/charttalk-test`

### Repository Structure

```
charttalk-test/                   # Separate E2E test repository
├── package.json                  # Standalone test project
├── playwright.config.ts          # Playwright configuration
├── tests/                        # Test specifications
│   ├── navigation.spec.ts        # 12 tests
│   ├── single-chart.spec.ts      # 12 tests
│   ├── multi-chart.spec.ts       # 4 tests
│   ├── multi-timeframe.spec.ts   # 3 tests
│   ├── conversation.spec.ts      # 11 tests
│   └── error-handling.spec.ts    # 15 tests
├── fixtures/
│   └── auth.ts                   # Mock JWT authentication
└── utils/
    └── test-helpers.ts           # Helper functions
```

### Running E2E Tests

Prerequisites: Both servers must be running.

```bash
# Terminal 1 - Frontend (charttalk.ai)
cd /path/to/charttalk.ai && npm run dev

# Terminal 2 - Backend (mcp-chart-image)
cd /path/to/mcp-chart-image && npm run dev

# Terminal 3 - Run E2E tests
cd /path/to/charttalk-test
npm test                    # Run all tests
npm run test:ui             # Run with UI (visual debugging)
npm run test:headed         # Run with browser visible
npm run test:debug          # Run in debug mode
npm run test:report         # View last test report
```

### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Navigation | 12 | UI elements, routing, responsive design |
| Single Chart | 12 | Basic chart generation, indicators, symbols |
| Multi-Chart | 4 | Multiple symbols in one request |
| Multi-Timeframe | 3 | Multiple timeframes for one symbol |
| Conversation | 11 | Message persistence, history, navigation |
| Error Handling | 15 | Edge cases, validation, network errors |

**Total: ~57 E2E tests**

### Authentication Bypass

E2E tests use mock authentication. Backend should have `AUTH_DEV_BYPASS=true` in `.env`.

## Best Practices

1. **Run tests before committing**: `npm test`
2. **Write tests for new features**: Add to `__tests__/` directories
3. **Mock external dependencies**: Don't call real APIs in tests
4. **Test edge cases**: Invalid inputs, error conditions
5. **Keep tests focused**: One assertion per test when possible
