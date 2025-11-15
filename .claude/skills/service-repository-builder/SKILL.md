---
name: service-repository-builder
description: Use when developer needs to create services, repositories, or implement domain logic. Teaches service layer pattern, repository pattern, dependency injection, and interface-first design.
keywords: ["service", "repository", "create service", "add service", "business logic", "data access", "dependency injection", "DI", "interface"]
---

# Service & Repository Builder

You are an expert on implementing the **Service Layer** and **Repository patterns** in TypeScript with dependency injection. This skill guides developers through creating maintainable, testable business logic and data access layers.

## Core Patterns

### 1. Service Layer Pattern
- **Purpose**: Encapsulate business logic, orchestrate operations across multiple repositories
- **Location**: `modules/[domain]/services/`
- **Characteristics**: Stateless, testable, injected dependencies
- **Examples**: `ChartConfigService`, `ChartValidationService`, `ChartGenerationService`

### 2. Repository Pattern
- **Purpose**: Abstract data access, provide clean interface for data operations
- **Location**: `modules/[domain]/repositories/`
- **Characteristics**: Single data source responsibility, caching when appropriate
- **Examples**: `IndicatorsRepository`, `DrawingsRepository`

### 3. Dependency Injection (DI)
- **Purpose**: Loose coupling, testability, dependency inversion
- **Mechanism**: Symbol-based tokens, container resolution
- **Location**: `core/di/container.ts`, `core/di/tokens.ts`

## Creating a New Service

### Step 1: Define the Interface

**Location**: `modules/[domain]/interfaces/[domain].interface.ts`

**Pattern**: Interface-first design with `I` prefix

```typescript
// modules/chart/interfaces/chart.interface.ts

export interface IChartConfigService {
  /**
   * Construct chart configuration from natural language
   * @param text - Natural language description
   * @param options - Override options (symbol, exchange, preferences)
   * @returns Chart configuration result with reasoning
   */
  constructFromNaturalLanguage(
    text: string,
    options?: ConstructOptions
  ): Promise<ConstructResult>;

  /**
   * Detect technical indicators from text
   * @param text - Text to analyze
   * @returns Array of detected indicators with confidence scores
   */
  detectIndicators(text: string): Promise<IndicatorMatch[]>;
}

export interface ConstructOptions {
  symbol?: string;
  exchange?: string;
  theme?: 'light' | 'dark';
  interval?: string;
  range?: string;
}

export interface ConstructResult {
  success: boolean;
  config?: ChartConfig;
  reasoning?: string;
  warnings?: string[];
}
```

**Why interface-first?**
- Defines contract before implementation
- Enables easy mocking in tests
- Supports multiple implementations
- Documents expected behavior

### Step 2: Implement the Service

**Location**: `modules/[domain]/services/[name].service.ts`

```typescript
// modules/chart/services/chart-config.service.ts

import {
  IChartConfigService,
  ConstructOptions,
  ConstructResult
} from '../interfaces/chart.interface';
import { IndicatorsRepository } from '../repositories/indicators.repository';
import { DrawingsRepository } from '../repositories/drawings.repository';
import { ChartConfig } from '../domain/chart-config';

export class ChartConfigService implements IChartConfigService {
  constructor(
    private indicatorsRepo: IndicatorsRepository,
    private drawingsRepo: DrawingsRepository
  ) {}

  async constructFromNaturalLanguage(
    text: string,
    options?: ConstructOptions
  ): Promise<ConstructResult> {
    try {
      // 1. Detect symbol
      const symbol = this.detectSymbol(text, options?.symbol);
      if (!symbol) {
        return {
          success: false,
          reasoning: 'Could not detect trading symbol from text'
        };
      }

      // 2. Detect time range
      const { interval, range } = this.detectTimeRange(text, options);

      // 3. Detect indicators (use repository)
      const indicators = await this.detectIndicators(text);

      // 4. Detect drawings (use repository)
      const drawings = this.drawingsRepo.detectFromText(text);

      // 5. Construct config
      const config: ChartConfig = {
        symbol,
        interval,
        range,
        indicators: indicators.map(i => i.config),
        drawings: drawings.map(d => d.config),
        theme: options?.theme || 'dark',
      };

      // 6. Return result
      return {
        success: true,
        config,
        reasoning: this.buildReasoning(symbol, interval, range, indicators, drawings),
        warnings: this.checkWarnings(indicators, drawings)
      };
    } catch (error) {
      return {
        success: false,
        reasoning: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async detectIndicators(text: string): Promise<IndicatorMatch[]> {
    // Delegate to repository
    const results = this.indicatorsRepo.detectFromText(text, {
      testedOnly: true,
      minConfidence: 0.8
    });

    return results.map(result => ({
      indicator: result.indicator,
      confidence: result.confidence,
      config: this.buildIndicatorConfig(result.indicator)
    }));
  }

  // Private helper methods
  private detectSymbol(text: string, override?: string): string | null {
    if (override) return override;

    // Symbol detection logic
    const cryptoMatch = text.match(/\b(bitcoin|btc|ethereum|eth)\b/i);
    if (cryptoMatch) {
      return this.mapToSymbol(cryptoMatch[1]);
    }

    return null;
  }

  private detectTimeRange(
    text: string,
    options?: ConstructOptions
  ): { interval: string; range: string } {
    // Time range detection logic
    // ...
  }

  private buildReasoning(...args): string {
    // Build human-readable reasoning
    // ...
  }

  private checkWarnings(...args): string[] {
    // Check for potential issues
    // ...
  }
}
```

**Key Service Characteristics**:
- ✅ **Constructor injection** - All dependencies injected
- ✅ **Interface implementation** - Implements `IChartConfigService`
- ✅ **Delegation** - Uses repositories for data access
- ✅ **Error handling** - Try-catch with structured errors
- ✅ **Private helpers** - Internal logic in private methods
- ✅ **Stateless** - No instance state, only dependencies

### Step 3: Register in DI Container

**Location 1**: `core/di/tokens.ts` (define token)

```typescript
// core/di/tokens.ts

// Chart module tokens
export const CHART_CONFIG_SERVICE = Symbol('CHART_CONFIG_SERVICE');
export const CHART_VALIDATION_SERVICE = Symbol('CHART_VALIDATION_SERVICE');
export const CHART_GENERATION_SERVICE = Symbol('CHART_GENERATION_SERVICE');
export const INDICATORS_REPOSITORY = Symbol('INDICATORS_REPOSITORY');
export const DRAWINGS_REPOSITORY = Symbol('DRAWINGS_REPOSITORY');
```

**Location 2**: `core/di/providers.ts` (register provider)

```typescript
// core/di/providers.ts

import { container } from './container';
import { ChartConfigService } from '@/modules/chart/services/chart-config.service';
import { IndicatorsRepository } from '@/modules/chart/repositories/indicators.repository';
import { DrawingsRepository } from '@/modules/chart/repositories/drawings.repository';
import {
  CHART_CONFIG_SERVICE,
  INDICATORS_REPOSITORY,
  DRAWINGS_REPOSITORY
} from './tokens';

// Register repositories first (dependencies)
container.registerSingleton(
  INDICATORS_REPOSITORY,
  () => new IndicatorsRepository()
);

container.registerSingleton(
  DRAWINGS_REPOSITORY,
  () => new DrawingsRepository()
);

// Register service (depends on repositories)
container.registerSingleton(
  CHART_CONFIG_SERVICE,
  (c) => new ChartConfigService(
    c.resolve(INDICATORS_REPOSITORY),
    c.resolve(DRAWINGS_REPOSITORY)
  )
);
```

**Why Symbol tokens?**
- Type-safe service identification
- Avoid string-based lookups
- Better refactoring support
- Clear dependency graph

### Step 4: Resolve from Container

**Usage in MCP tools** (`mcp/tools/construct-chart-config.ts`):

```typescript
import { container, CHART_CONFIG_SERVICE } from '@/core/di';
import type { IChartConfigService } from '@/modules/chart/interfaces/chart.interface';

export async function constructChartConfigTool(input: Input) {
  // Resolve service from DI container
  const configService = container.resolve<IChartConfigService>(
    CHART_CONFIG_SERVICE
  );

  // Call service method
  const result = await configService.constructFromNaturalLanguage(
    input.naturalLanguage,
    input.preferences
  );

  return result;
}
```

**Usage in API controllers** (`src/api/controllers/chart.controller.ts`):

```typescript
import { container, CHART_CONFIG_SERVICE } from '@/core/di';
import type { IChartConfigService } from '@/modules/chart/interfaces/chart.interface';

export class ChartController {
  async constructConfig(dto: ConstructConfigDto): Promise<ConstructConfigResponse> {
    const service = container.resolve<IChartConfigService>(CHART_CONFIG_SERVICE);
    const result = await service.constructFromNaturalLanguage(dto.text, dto.options);
    return this.toResponse(result);
  }
}
```

## Creating a New Repository

### Step 1: Define the Interface

```typescript
// modules/chart/interfaces/chart.interface.ts

export interface IIndicatorsRepository {
  /**
   * Find indicator by exact name
   */
  findByName(name: string): Indicator | null;

  /**
   * Search indicators by keyword with fuzzy matching
   */
  searchByKeyword(query: string, limit?: number): IndicatorSearchResult[];

  /**
   * Detect indicators from natural language text
   */
  detectFromText(text: string, options?: DetectionOptions): IndicatorSearchResult[];

  /**
   * Get indicators by category
   */
  getByCategory(category: IndicatorCategory): Indicator[];

  /**
   * Get repository statistics
   */
  getStats(): IndicatorStats;
}

export interface DetectionOptions {
  testedOnly?: boolean;
  minConfidence?: number;
  limit?: number;
}

export interface IndicatorSearchResult {
  indicator: Indicator;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'keyword' | 'category';
}
```

### Step 2: Implement the Repository

```typescript
// modules/chart/repositories/indicators.repository.ts

import { loadIndicatorsDatabase } from '@/core/database/loaders/indicators.loader';
import {
  IIndicatorsRepository,
  DetectionOptions,
  IndicatorSearchResult
} from '../interfaces/chart.interface';
import { Indicator, IndicatorCategory } from '../domain/indicators';

export class IndicatorsRepository implements IIndicatorsRepository {
  private database: IndicatorsDatabase;

  constructor() {
    // Load database on instantiation (cached)
    this.database = loadIndicatorsDatabase();
  }

  findByName(name: string): Indicator | null {
    return this.database.indicators.find(
      i => i.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  searchByKeyword(query: string, limit = 10): IndicatorSearchResult[] {
    const results: IndicatorSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const indicator of this.database.indicators) {
      // Exact ID match
      if (indicator.id.toLowerCase() === queryLower) {
        results.push({ indicator, confidence: 1.0, matchType: 'exact' });
        continue;
      }

      // Exact name match
      if (indicator.name.toLowerCase() === queryLower) {
        results.push({ indicator, confidence: 0.95, matchType: 'exact' });
        continue;
      }

      // Keyword match
      const keywordMatch = indicator.keywords?.some(
        k => k.toLowerCase().includes(queryLower)
      );
      if (keywordMatch) {
        results.push({ indicator, confidence: 0.8, matchType: 'keyword' });
      }
    }

    // Sort by confidence, return top N
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  detectFromText(
    text: string,
    options: DetectionOptions = {}
  ): IndicatorSearchResult[] {
    const { testedOnly = false, minConfidence = 0.7, limit = 10 } = options;
    const results: Map<string, IndicatorSearchResult> = new Map();
    const textLower = text.toLowerCase();

    for (const indicator of this.database.indicators) {
      // Skip untested if required
      if (testedOnly && !indicator.tested) continue;

      // Check all keywords
      for (const keyword of indicator.keywords || []) {
        if (textLower.includes(keyword.toLowerCase())) {
          const existing = results.get(indicator.id);
          const confidence = this.calculateConfidence(keyword, indicator, textLower);

          if (!existing || confidence > existing.confidence) {
            results.set(indicator.id, {
              indicator,
              confidence,
              matchType: 'keyword'
            });
          }
        }
      }
    }

    // Filter by confidence and return top N
    return Array.from(results.values())
      .filter(r => r.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  getByCategory(category: IndicatorCategory): Indicator[] {
    return this.database.indicators.filter(i => i.category === category);
  }

  getStats(): IndicatorStats {
    return {
      total: this.database.totalCount,
      tested: this.database.indicators.filter(i => i.tested).length,
      byCategory: this.groupByCategory()
    };
  }

  // Private helpers
  private calculateConfidence(
    keyword: string,
    indicator: Indicator,
    text: string
  ): number {
    // Confidence calculation logic
    // ...
  }

  private groupByCategory(): Record<IndicatorCategory, number> {
    // Grouping logic
    // ...
  }
}
```

**Key Repository Characteristics**:
- ✅ **Single responsibility** - Only indicator data access
- ✅ **Caching** - Uses cached database loader
- ✅ **Clean interface** - Implements `IIndicatorsRepository`
- ✅ **Fuzzy search** - Confidence scoring for matches
- ✅ **Configurable** - Options for filtering and limits
- ✅ **Stateless queries** - No side effects

### Step 3: Register in DI Container

```typescript
// core/di/providers.ts

import { IndicatorsRepository } from '@/modules/chart/repositories/indicators.repository';
import { INDICATORS_REPOSITORY } from './tokens';

container.registerSingleton(
  INDICATORS_REPOSITORY,
  () => new IndicatorsRepository()
);
```

## Service Composition (Services Depending on Services)

Services can depend on other services for layered orchestration:

```typescript
// modules/chart/services/chart-validation.service.ts

export class ChartValidationService implements IChartValidationService {
  constructor(
    private indicatorsRepo: IndicatorsRepository,
    private configService: IChartConfigService  // Service dependency!
  ) {}

  async validate(config: ChartConfig, plan: PlanLevel): Promise<ValidationResult> {
    // Use config service to parse indicator configs
    const indicators = await this.configService.detectIndicators(
      config.indicators.map(i => i.name).join(' ')
    );

    // Validate against plan limits
    return this.validatePlanLimits(config, indicators, plan);
  }
}
```

**Registration**:

```typescript
container.registerSingleton(
  CHART_VALIDATION_SERVICE,
  (c) => new ChartValidationService(
    c.resolve(INDICATORS_REPOSITORY),
    c.resolve(CHART_CONFIG_SERVICE)  // Service dependency
  )
);
```

## Testing Services and Repositories

### Testing Pattern with Vitest

**Location**: `modules/[domain]/services/__tests__/[name].service.test.ts`

```typescript
// modules/chart/services/__tests__/chart-config.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChartConfigService } from '../chart-config.service';
import { IndicatorsRepository } from '../../repositories/indicators.repository';
import { DrawingsRepository } from '../../repositories/drawings.repository';

// Mock dependencies
vi.mock('../../repositories/indicators.repository');
vi.mock('../../repositories/drawings.repository');

describe('ChartConfigService', () => {
  let service: ChartConfigService;
  let mockIndicatorsRepo: IndicatorsRepository;
  let mockDrawingsRepo: DrawingsRepository;

  beforeEach(() => {
    // Create mocked repositories
    mockIndicatorsRepo = new IndicatorsRepository();
    mockDrawingsRepo = new DrawingsRepository();

    // Create service with mocks
    service = new ChartConfigService(
      mockIndicatorsRepo,
      mockDrawingsRepo
    );
  });

  describe('constructFromNaturalLanguage', () => {
    it('should construct valid config from Bitcoin description', async () => {
      // Arrange
      const text = 'Bitcoin chart with RSI for last 7 days';

      vi.spyOn(mockIndicatorsRepo, 'detectFromText').mockReturnValue([
        {
          indicator: { id: 'RSI', name: 'Relative Strength Index' },
          confidence: 0.95,
          matchType: 'keyword'
        }
      ]);

      // Act
      const result = await service.constructFromNaturalLanguage(text);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.symbol).toBe('BINANCE:BTCUSDT');
      expect(result.config?.indicators).toHaveLength(1);
      expect(result.config?.indicators[0].id).toBe('RSI');
    });

    it('should return error when symbol cannot be detected', async () => {
      // Arrange
      const text = 'chart with RSI';  // No symbol mentioned

      // Act
      const result = await service.constructFromNaturalLanguage(text);

      // Assert
      expect(result.success).toBe(false);
      expect(result.reasoning).toContain('Could not detect trading symbol');
    });
  });

  describe('detectIndicators', () => {
    it('should detect multiple indicators from text', async () => {
      // Arrange
      const text = 'RSI and Bollinger Bands';

      vi.spyOn(mockIndicatorsRepo, 'detectFromText').mockReturnValue([
        { indicator: { id: 'RSI' }, confidence: 0.95, matchType: 'keyword' },
        { indicator: { id: 'BB' }, confidence: 0.9, matchType: 'keyword' }
      ]);

      // Act
      const results = await service.detectIndicators(text);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].indicator.id).toBe('RSI');
      expect(results[1].indicator.id).toBe('BB');
    });
  });
});
```

**Key Testing Practices**:
- ✅ **Mock dependencies** - Use `vi.mock()` for repositories
- ✅ **Arrange-Act-Assert** - Clear test structure
- ✅ **Test public methods only** - Don't test private helpers directly
- ✅ **Descriptive names** - "should [behavior] when [condition]"
- ✅ **Edge cases** - Test error conditions
- ✅ **Spy on methods** - Use `vi.spyOn()` to verify calls

## Common Patterns and Best Practices

### ✅ Do

1. **Define interfaces first** (`IMyService` before `MyService`)
2. **Use constructor injection** for all dependencies
3. **Keep services stateless** - no instance variables except dependencies
4. **Delegate to repositories** - services orchestrate, repositories access data
5. **Return structured results** - `{ success, data?, error? }` pattern
6. **Write tests alongside** - TDD or test-immediately-after
7. **Use Symbol tokens** for DI registration
8. **Document with JSDoc** - Especially public methods
9. **Handle errors gracefully** - Try-catch with meaningful messages
10. **Keep methods focused** - Single Responsibility Principle

### ❌ Don't

1. **Don't add business logic to repositories** - only data access
2. **Don't skip interfaces** - always define contracts
3. **Don't use `any` types** - maintain type safety
4. **Don't create circular dependencies** - service A → service B → service A
5. **Don't bypass DI container** - always resolve from container
6. **Don't test private methods** - test public interface
7. **Don't mix concerns** - separate business logic from data access
8. **Don't hardcode values** - use configuration

## Example: Complete Service Implementation

See these real examples in the codebase:

1. **ChartConfigService** (`modules/chart/services/chart-config.service.ts`):
   - Natural language parsing
   - Multi-repository orchestration
   - Complex business logic

2. **ChartValidationService** (`modules/chart/services/chart-validation.service.ts`):
   - Plan-based validation
   - Service-to-service composition
   - Structured error reporting

3. **IndicatorsRepository** (`modules/chart/repositories/indicators.repository.ts`):
   - Fuzzy search implementation
   - Confidence scoring
   - Caching strategy

## Related Skills

- **module-architecture**: Understand where services and repositories fit
- **testing-strategy**: Learn comprehensive testing patterns
- **mcp-tool-developer**: See how services are consumed by tools
- **api-endpoint-creator**: See how services are consumed by REST APIs

## Questions This Skill Answers

- "How do I create a new service?"
- "Show me the repository pattern"
- "How do I test a service with mocked dependencies?"
- "What's the pattern for service dependencies?"
- "How do services communicate with each other?"
- "Where do I define interfaces?"
- "How do I register a service in the DI container?"
- "Should business logic go in services or repositories?"
- "How do I inject dependencies?"
- "What's the difference between a service and a repository?"
