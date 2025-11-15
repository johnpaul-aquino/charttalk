---
name: mcp-tool-developer
description: Use when adding new MCP tools or modifying existing tool behavior. Teaches MCP protocol tool structure, Zod validation, tool registration, and integration with service layer.
keywords: ["MCP", "tool", "add tool", "create tool", "MCP server", "protocol", "Zod", "validation", "tool definition"]
---

# MCP Tool Developer

You are an expert on implementing **MCP (Model Context Protocol) tools** for the mcp-chart-image server. This skill guides developers through creating, registering, and maintaining MCP tools that integrate seamlessly with the service layer.

## What is MCP?

**MCP (Model Context Protocol)** is a standardized protocol for connecting AI assistants (like Claude) to external tools and data sources. In this project:

- **MCP Server** (`src/mcp/server.ts`) - Runs via stdio transport, connects to Claude Code/Desktop
- **MCP Tools** (`src/mcp/tools/`) - 8 specialized tools that Claude can invoke
- **Tool Handler** - Function that executes tool logic
- **Tool Definition** - Metadata that describes the tool to Claude

## Current Tools (8 Total)

1. **health_check** - Server status and diagnostics
2. **fetch_chart_documentation** - Dynamic doc fetching from chart-img.com
3. **get_exchanges** - List available trading exchanges
4. **get_symbols** - Get symbols for an exchange
5. **construct_chart_config** - Natural language → JSON config
6. **validate_chart_config** - Pre-flight validation
7. **generate_chart_image** - Generate chart image
8. **save_chart_image** - Save base64 image to disk

## MCP Tool Anatomy

Every MCP tool consists of 4 parts:

### 1. Input Schema (Zod)

Defines and validates tool parameters:

```typescript
// src/mcp/tools/construct-chart-config.ts

import { z } from 'zod';

export const ConstructChartConfigInputSchema = z.object({
  naturalLanguage: z
    .string()
    .min(1)
    .describe('Natural language description of chart requirements'),
  symbol: z
    .string()
    .optional()
    .describe('Override symbol detection (e.g., "BINANCE:BTCUSDT")'),
  exchange: z
    .string()
    .optional()
    .describe('Preferred exchange (e.g., "BINANCE", "NASDAQ")'),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      resolution: z.string().optional(),
      interval: z.string().optional(),
      range: z.string().optional(),
    })
    .optional()
    .describe('User preferences to override defaults'),
});

export type ConstructChartConfigInput = z.infer<typeof ConstructChartConfigInputSchema>;
```

**Why Zod?**
- Runtime validation (TypeScript only validates at compile-time)
- Automatic type inference
- Descriptive error messages
- JSON Schema generation for MCP protocol

### 2. Output Type

Defines the structure of tool results:

```typescript
// Output interface
export interface ConstructChartConfigOutput {
  success: boolean;
  config?: ChartConfig;
  reasoning?: string;
  warnings?: string[];
  error?: string;
}
```

**Standard Response Pattern**:
```typescript
{
  success: boolean;      // Always present
  data?: any;            // On success
  error?: string;        // On failure
  metadata?: object;     // Optional contextual info
}
```

### 3. Tool Handler (Business Logic)

The actual implementation that gets executed:

```typescript
// src/mcp/tools/construct-chart-config.ts

import { container, CHART_CONFIG_SERVICE } from '../../core/di';
import type { IChartConfigService } from '../../modules/chart';

/**
 * Construct chart config tool handler
 */
export async function constructChartConfigTool(
  input: ConstructChartConfigInput
): Promise<ConstructChartConfigOutput> {
  try {
    // 1. Resolve service from DI container
    const configService = container.resolve<IChartConfigService>(
      CHART_CONFIG_SERVICE
    );

    // 2. Call service method (delegate business logic)
    const result = await configService.constructFromNaturalLanguage(
      input.naturalLanguage,
      {
        symbol: input.symbol,
        exchange: input.exchange,
        ...input.preferences,
      }
    );

    // 3. Transform service result to tool output
    return {
      success: result.success,
      config: result.config,
      reasoning: result.reasoning,
      warnings: result.warnings,
      error: result.success ? undefined : result.reasoning,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Key Handler Principles**:
- ✅ **Thin wrapper** - Delegate to services, don't implement logic here
- ✅ **Error handling** - Try-catch with structured responses
- ✅ **DI resolution** - Always resolve services from container
- ✅ **Transformation** - Convert service results to tool format

### 4. Tool Definition (Metadata)

Describes the tool to Claude:

```typescript
// src/mcp/tools/construct-chart-config.ts

export const constructChartConfigToolDefinition = {
  name: 'construct_chart_config',
  description: `**Core intelligence tool** that constructs a complete chart-img.com API v2 JSON configuration from natural language requirements.

This tool is the bridge between human intent and API format. It:
1. **Parses natural language** to extract chart requirements
2. **Detects symbols** from common names (Bitcoin → BINANCE:BTCUSDT)
3. **Infers time ranges** ("last 7 days" → range: "1M")
4. **Selects optimal intervals** based on range (1M → 4h interval)
5. **Identifies indicators** (Bollinger Bands, RSI, MACD, etc.)
6. **Applies sensible defaults** for missing parameters

Use this tool:
- When user provides natural language chart description
- After fetching documentation (for indicator validation)
- Before validate_chart_config and generate_chart_image`,

  inputSchema: {
    type: 'object' as const,
    properties: {
      naturalLanguage: {
        type: 'string' as const,
        description: 'Natural language description of chart requirements',
      },
      symbol: {
        type: 'string' as const,
        description: 'Optional: Override symbol detection (e.g., "BINANCE:BTCUSDT")',
      },
      exchange: {
        type: 'string' as const,
        description: 'Optional: Preferred exchange (e.g., "BINANCE", "NASDAQ")',
      },
      preferences: {
        type: 'object' as const,
        properties: {
          theme: {
            type: 'string' as const,
            enum: ['light', 'dark'] as const,
            description: 'Theme preference',
          },
          // ... more properties
        },
        description: 'User preferences to override defaults',
      },
    },
    required: ['naturalLanguage'] as const,
  } as const,

  annotations: {
    title: 'Construct Chart Config',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};
```

**Tool Definition Fields**:
- **name**: Unique tool identifier (snake_case)
- **description**: Detailed explanation for Claude (supports Markdown)
- **inputSchema**: JSON Schema for parameters (MCP protocol requirement)
- **annotations**: Hints for Claude about tool behavior

**Annotation Hints**:
- **readOnlyHint**: `true` if tool doesn't modify state (fetch, search, validate)
- **destructiveHint**: `true` if tool makes irreversible changes (delete, permanent actions)
- **idempotentHint**: `true` if multiple calls have same effect (GET requests, validation)

## Step-by-Step: Creating a New MCP Tool

### Example: Symbol Search Tool

Let's create a new tool that searches for trading symbols across all exchanges.

#### Step 1: Create Tool File

**Location**: `src/mcp/tools/search-symbols.ts`

```typescript
/**
 * Search Symbols Tool
 *
 * MCP tool for searching trading symbols across exchanges.
 */

import { z } from 'zod';
import { container, SYMBOL_SEARCH_SERVICE } from '../../core/di';
import type { ISymbolSearchService } from '../../modules/chart/interfaces/chart.interface';

// ============================================
// 1. INPUT SCHEMA
// ============================================

export const SearchSymbolsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('Search query (e.g., "BTC", "Apple", "EUR/USD")'),
  exchanges: z
    .array(z.string())
    .optional()
    .describe('Filter by specific exchanges (e.g., ["BINANCE", "NASDAQ"])'),
  assetTypes: z
    .array(z.enum(['crypto', 'stock', 'forex', 'futures']))
    .optional()
    .describe('Filter by asset types'),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .describe('Maximum results to return (default: 20, max: 100)'),
});

export type SearchSymbolsInput = z.infer<typeof SearchSymbolsInputSchema>;

// ============================================
// 2. OUTPUT TYPE
// ============================================

export interface SearchSymbolsOutput {
  success: boolean;
  symbols?: SymbolResult[];
  totalResults?: number;
  error?: string;
}

export interface SymbolResult {
  symbol: string;           // "BINANCE:BTCUSDT"
  exchange: string;         // "BINANCE"
  description: string;      // "Bitcoin / TetherUS"
  type: string;             // "crypto"
  confidence: number;       // 0.95
}

// ============================================
// 3. TOOL HANDLER
// ============================================

export async function searchSymbolsTool(
  input: SearchSymbolsInput
): Promise<SearchSymbolsOutput> {
  try {
    // Resolve service from DI container
    const searchService = container.resolve<ISymbolSearchService>(
      SYMBOL_SEARCH_SERVICE
    );

    // Call service method
    const results = await searchService.search(input.query, {
      exchanges: input.exchanges,
      assetTypes: input.assetTypes,
      limit: input.limit,
    });

    // Transform and return
    return {
      success: true,
      symbols: results.symbols,
      totalResults: results.total,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// 4. TOOL DEFINITION
// ============================================

export const searchSymbolsToolDefinition = {
  name: 'search_symbols',
  description: `Search for trading symbols across all available exchanges.

This tool helps discover symbols across multiple exchanges and asset classes:
- **Crypto**: Bitcoin, Ethereum, etc. on Binance, Coinbase, Kraken
- **Stocks**: Apple, Google, etc. on NASDAQ, NYSE
- **Forex**: EUR/USD, GBP/JPY on OANDA, FX.com
- **Futures**: ES, CL on CME, NYMEX

**Use Cases**:
- "What Bitcoin pairs are available?"
- "Find Apple stock symbol"
- "Search for EUR/USD on forex exchanges"

**Returns**:
- List of matching symbols with exchange and description
- Confidence score for each match
- Asset type classification

Use this tool:
- When user asks about symbol availability
- Before constructing chart config with unfamiliar symbols
- For symbol discovery across exchanges`,

  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'Search query (e.g., "BTC", "Apple", "EUR/USD")',
      },
      exchanges: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Filter by specific exchanges',
      },
      assetTypes: {
        type: 'array' as const,
        items: {
          type: 'string' as const,
          enum: ['crypto', 'stock', 'forex', 'futures'] as const,
        },
        description: 'Filter by asset types',
      },
      limit: {
        type: 'number' as const,
        default: 20,
        description: 'Maximum results (default: 20, max: 100)',
      },
    },
    required: ['query'] as const,
  } as const,

  annotations: {
    title: 'Search Symbols',
    readOnlyHint: true,      // Read-only operation
    destructiveHint: false,  // No destructive changes
    idempotentHint: true,    // Same query = same results
  },
};
```

#### Step 2: Register in MCP Server

**Location**: `src/mcp/server.ts`

```typescript
// 1. Import tool definition and handler
import {
  searchSymbolsTool,
  searchSymbolsToolDefinition,
  SearchSymbolsInputSchema,
} from './tools/search-symbols.js';

// 2. Add to getToolDefinitions() method
private getToolDefinitions(): Tool[] {
  return [
    // ... existing tools ...
    {
      name: searchSymbolsToolDefinition.name,
      description: searchSymbolsToolDefinition.description,
      inputSchema: searchSymbolsToolDefinition.inputSchema,
      annotations: searchSymbolsToolDefinition.annotations,
    },
  ];
}

// 3. Add case to CallToolRequestSchema handler
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ... existing cases ...

      case 'search_symbols': {
        const validated = SearchSymbolsInputSchema.parse(args);
        const result = await searchSymbolsTool(validated);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // Error handling
  }
});
```

#### Step 3: Implement Service

**Location**: `modules/chart/services/symbol-search.service.ts`

```typescript
export class SymbolSearchService implements ISymbolSearchService {
  constructor(
    private symbolsRepo: ISymbolsRepository
  ) {}

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    // Business logic for symbol search
    // ...
  }
}
```

#### Step 4: Register Service in DI

**Location**: `core/di/tokens.ts` + `core/di/providers.ts`

```typescript
// tokens.ts
export const SYMBOL_SEARCH_SERVICE = Symbol('SYMBOL_SEARCH_SERVICE');

// providers.ts
container.registerSingleton(
  SYMBOL_SEARCH_SERVICE,
  (c) => new SymbolSearchService(
    c.resolve(SYMBOLS_REPOSITORY)
  )
);
```

#### Step 5: Test the Tool

**Location**: `src/mcp/tools/__tests__/search-symbols.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchSymbolsTool } from '../search-symbols';
import { container, SYMBOL_SEARCH_SERVICE } from '../../../core/di';

vi.mock('../../../core/di');

describe('searchSymbolsTool', () => {
  let mockService: any;

  beforeEach(() => {
    mockService = {
      search: vi.fn(),
    };
    vi.mocked(container.resolve).mockReturnValue(mockService);
  });

  it('should search symbols successfully', async () => {
    mockService.search.mockResolvedValue({
      symbols: [{ symbol: 'BINANCE:BTCUSDT', confidence: 0.95 }],
      total: 1,
    });

    const result = await searchSymbolsTool({ query: 'BTC', limit: 20 });

    expect(result.success).toBe(true);
    expect(result.symbols).toHaveLength(1);
    expect(mockService.search).toHaveBeenCalledWith('BTC', { limit: 20 });
  });
});
```

## Common Patterns

### Read-Only Tools (Data Fetching)

```typescript
// Example: get_exchanges, get_symbols, fetch_documentation

annotations: {
  title: 'Get Exchanges',
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
}

// Handler just fetches and returns
export async function getExchangesTool(input: GetExchangesInput) {
  const service = container.resolve<IExchangeService>(EXCHANGE_SERVICE);
  const exchanges = await service.getAll(input.forceRefresh);
  return { success: true, exchanges };
}
```

### Transformation Tools (Stateless Processing)

```typescript
// Example: construct_chart_config, validate_chart_config

annotations: {
  title: 'Construct Chart Config',
  readOnlyHint: true,       // Doesn't persist anything
  destructiveHint: false,
  idempotentHint: true,     // Same input = same output
}

// Handler transforms input to output
export async function constructChartConfigTool(input: Input) {
  const service = container.resolve<IChartConfigService>(CHART_CONFIG_SERVICE);
  const config = await service.constructFromNaturalLanguage(input.naturalLanguage);
  return { success: true, config };
}
```

### Action Tools (State-Changing)

```typescript
// Example: generate_chart_image, save_chart_image

annotations: {
  title: 'Generate Chart Image',
  readOnlyHint: false,      // Creates image file/URL
  destructiveHint: false,   // Not irreversible
  idempotentHint: false,    // Different URLs each time
}

// Handler performs action with side effects
export async function generateChartTool(input: Input) {
  const service = container.resolve<IChartGenerationService>(CHART_GENERATION_SERVICE);
  const result = await service.generateChart(input.config, input.storage);
  return { success: true, imageUrl: result.imageUrl, metadata: result.metadata };
}
```

## Best Practices

### ✅ Do

1. **Delegate to services** - Tools are thin wrappers, business logic in services
2. **Use Zod validation** - Runtime validation for all inputs
3. **Return structured responses** - Always include `success` field
4. **Handle errors gracefully** - Try-catch with meaningful messages
5. **Add descriptions** - Help Claude understand when to use the tool
6. **Set annotations correctly** - readOnly, destructive, idempotent hints
7. **Document parameters** - Clear descriptions in inputSchema
8. **Test tool handlers** - Mock services, test success and error paths
9. **Keep tools focused** - One tool = one responsibility
10. **Use TypeScript** - Full type safety with Zod inference

### ❌ Don't

1. **Don't add business logic** - Delegate to services
2. **Don't skip validation** - Always use Zod schemas
3. **Don't hardcode values** - Use configuration or services
4. **Don't return raw errors** - Structure with success/error fields
5. **Don't forget error handling** - Always try-catch async operations
6. **Don't skip DI** - Always resolve services from container
7. **Don't use `any` types** - Maintain type safety
8. **Don't skip tool definition** - Claude needs metadata
9. **Don't forget annotations** - Help Claude optimize usage
10. **Don't create mega-tools** - Keep focused and composable

## Tool Workflow

```
User Question to Claude
      ↓
Claude analyzes intent
      ↓
Claude selects appropriate tool
      ↓
MCP Server receives request
      ↓
Zod validates input
      ↓
Tool handler executes
      ↓
Service performs business logic
      ↓
Tool returns structured result
      ↓
Claude receives response
      ↓
Claude formulates answer
```

## Debugging Tools

### Test Tool Manually

```bash
# Start MCP server
npm run mcp

# Server should log:
# [MCP Server] chart-img-mcp-server v0.1.1 started
# [MCP Server] Registered 8 tools

# Test with Claude Code
claude mcp list
# Should show chart-img server
```

### View MCP Logs

```bash
# Server logs to stderr
tail -f /tmp/mcp-server.log
```

### Test in TypeScript

```typescript
// Create test file: test-tool.ts
import { searchSymbolsTool } from './src/mcp/tools/search-symbols';

async function test() {
  const result = await searchSymbolsTool({ query: 'BTC', limit: 10 });
  console.log(JSON.stringify(result, null, 2));
}

test();
```

## Real-World Examples

See these tools in the codebase:

1. **construct_chart_config.ts** - Complex NL processing
2. **validate_config.ts** - Validation with structured errors
3. **generate_chart.ts** - External API integration
4. **health_check.ts** - Diagnostic tool with metadata
5. **get_symbols.ts** - Pagination and filtering

## Related Skills

- **service-repository-builder**: Learn how to build services that tools call
- **module-architecture**: Understand where tools fit in the architecture
- **testing-strategy**: Learn how to test tools and services
- **configuration-manager**: Understand configuration access in tools

## Questions This Skill Answers

- "How do I add a new MCP tool?"
- "What's the pattern for tool input validation?"
- "How do I register a tool in the MCP server?"
- "Show me how to call a service from an MCP tool"
- "What are tool annotations for?"
- "How do I test an MCP tool?"
- "What's the difference between tool definition and handler?"
- "Should I add business logic to the tool?"
- "How do I handle errors in tools?"
- "What does idempotent mean for tools?"
