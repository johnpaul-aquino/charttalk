---
name: typescript-expert
description: Use when dealing with TypeScript issues, type errors, interface design, or type safety questions. Expert in this repository's TypeScript patterns including DI, Zod validation, and strict typing.
keywords: ["typescript", "type error", "interface", "type", "generic", "zod", "validation", "strict mode", "type safety", "ts", "typing"]
---

# TypeScript Expert for mcp-chart-image

You are a TypeScript expert specializing in the **mcp-chart-image codebase**. This skill helps developers write type-safe code, fix type errors, and follow TypeScript best practices specific to this project.

## TypeScript Configuration

### Project Settings (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "strict": true,              // Strict type checking enabled
    "esModuleInterop": true,     // CommonJS/ESM compatibility
    "skipLibCheck": true,        // Skip .d.ts file checking
    "target": "ES2020",          // Modern JavaScript target
    "module": "ESNext",          // ESM module system
    "moduleResolution": "bundler", // Next.js bundler resolution
    "resolveJsonModule": true,   // Import JSON files
    "isolatedModules": true,     // Each file as separate module
    "jsx": "preserve",           // Preserve JSX for Next.js
    "incremental": true          // Faster rebuilds
  }
}
```

**Key Implications**:
- ✅ **Strict mode** = No implicit `any`, strict null checks, strict property initialization
- ✅ **No `any` allowed** without explicit annotation
- ✅ **Null safety** enforced (`strictNullChecks`)
- ✅ **Import JSON** directly with full type inference

## Common Type Patterns in This Codebase

### 1. Interface-First Design

**Pattern**: Define interfaces before implementations

```typescript
// modules/chart/interfaces/chart.interface.ts
export interface IChartGenerationService {
  generateChart(
    config: ChartConfig,
    storage?: boolean,
    format?: 'png' | 'jpeg'
  ): Promise<ChartGenerationResult>;
}

// modules/chart/services/chart-generation.service.ts
export class ChartGenerationService implements IChartGenerationService {
  async generateChart(
    config: ChartConfig,
    storage = true,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<ChartGenerationResult> {
    // Implementation
  }
}
```

**Why**:
- Enables dependency injection
- Facilitates testing with mocks
- Clear contracts between layers

### 2. Service Interface Pattern

**Naming Convention**:
- Interface: `IMyService` (I-prefix)
- Implementation: `MyService` (no prefix)
- Export both from module

```typescript
// ✅ Correct
export interface IChartConfigService { }
export class ChartConfigService implements IChartConfigService { }

// ❌ Wrong
export interface ChartConfigService { }  // Missing I-prefix
export class ChartConfigServiceImpl { }  // Don't add Impl suffix
```

### 3. Result Types (Discriminated Unions)

**Pattern**: Use `success` boolean for result types

```typescript
export interface ChartGenerationResult {
  success: boolean;        // Discriminator
  imageUrl?: string;       // Present when success=true
  error?: string;          // Present when success=false
  metadata: ChartMetadata; // Always present
}

// Usage with type narrowing
if (result.success) {
  console.log(result.imageUrl); // ✅ TypeScript knows this exists
} else {
  console.log(result.error);    // ✅ TypeScript knows this exists
}
```

**Why**: Type-safe error handling without exceptions

### 4. Optional Properties vs Undefined

```typescript
// ✅ Use optional properties for truly optional data
interface ChartConfig {
  symbol: string;        // Required
  interval: string;      // Required
  theme?: 'light' | 'dark';  // Optional (may be undefined)
}

// ✅ Use undefined union for nullable results
interface ChartGenerationResult {
  imageUrl?: string;  // May not exist (result.imageUrl = undefined)
  error?: string;     // May not exist
}

// ❌ Don't use null in this codebase
interface BadExample {
  value: string | null;  // Avoid - use undefined instead
}
```

### 5. Zod Schema + TypeScript Inference

**Pattern**: Define Zod schema, infer TypeScript type

```typescript
// mcp/tools/generate-chart.ts
export const GenerateChartInputSchema = z.object({
  config: z.any().describe('Chart configuration'),
  storage: z.boolean().optional().default(true),
  format: z.enum(['png', 'jpeg']).optional().default('png'),
  uploadToS3: z.boolean().optional().default(false),
});

// ✅ Infer type from schema
export type GenerateChartInput = z.infer<typeof GenerateChartInputSchema>;

// ❌ Don't define type manually
export type GenerateChartInput = {  // Duplicates schema
  config: any;
  storage?: boolean;
  // ...
}
```

**Why**: Single source of truth, runtime validation matches compile-time types

### 6. Generic Dependency Injection

```typescript
// core/di/container.ts
export class DIContainer {
  resolve<T>(token: symbol): T {
    const factory = this.providers.get(token);
    return factory(this) as T;
  }
}

// Usage with type inference
const service = container.resolve<IChartGenerationService>(CHART_GENERATION_SERVICE);
//    ↑ TypeScript knows service is IChartGenerationService
```

### 7. Const Assertions for Tool Definitions

```typescript
// mcp/tools/generate-chart.ts
export const generateChartToolDefinition = {
  name: 'generate_chart_image',
  inputSchema: {
    type: 'object' as const,  // ✅ as const = literal type
    properties: {
      storage: {
        type: 'boolean' as const,
        default: true,
      },
    },
    required: ['config'] as const,  // ✅ readonly array
  } as const,
} as const;
```

**Why**:
- Prevents mutation
- Literal types for better inference
- Satisfies MCP protocol strict types

## Common Type Errors & Fixes

### Error 1: Property doesn't exist on type

**Error**:
```
Property 's3Url' does not exist on type 'ChartGenerationResult'
```

**Fix**: Add property to interface
```typescript
// modules/chart/interfaces/chart.interface.ts
export interface ChartGenerationResult {
  success: boolean;
  s3Url?: string;     // ✅ Add missing property
  s3Key?: string;
  s3UploadedAt?: string;
}
```

### Error 2: Module has no exported member

**Error**:
```
Module '"../../modules/storage"' has no exported member 'IS3StorageService'
```

**Fix**: Check the actual export name
```typescript
// ❌ Wrong import
import type { IS3StorageService } from '../../modules/storage';

// ✅ Correct import (check modules/storage/interfaces/storage.interface.ts)
import type { ICloudStorageService } from '../../modules/storage';
```

**How to find**:
1. Check `modules/storage/index.ts` for exports
2. Check `modules/storage/interfaces/*.ts` for interface names
3. Use IDE "Go to Definition" on import

### Error 3: readonly vs mutable array

**Error**:
```
Type 'readonly ["config"]' is not assignable to type 'string[]'
```

**Fix**: Remove `as const` or use mutable array
```typescript
// ❌ Causes error
required: ['config'] as const  // readonly array

// ✅ Fix 1: Use mutable array (if allowed by receiving type)
required: ['config']

// ✅ Fix 2: Cast to mutable (if needed for protocol)
required: ['config'] as string[]
```

### Error 4: Implicit any parameter

**Error**:
```
Parameter 'error' implicitly has an 'any' type
```

**Fix**: Add explicit type annotation
```typescript
// ❌ Implicit any
.catch(error => console.log(error))

// ✅ Explicit type
.catch((error: Error) => console.log(error.message))

// ✅ Or use unknown for safety
.catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.log(message);
})
```

### Error 5: Type vs Interface

**When to use Type**:
```typescript
// ✅ Use type for unions
export type ChartStyle = 'candle' | 'line' | 'bar' | 'area';

// ✅ Use type for inference
export type GenerateChartInput = z.infer<typeof GenerateChartInputSchema>;

// ✅ Use type for aliases
export type ChartConfig = {
  symbol: string;
  interval: string;
};
```

**When to use Interface**:
```typescript
// ✅ Use interface for service contracts
export interface IChartGenerationService {
  generateChart(): Promise<ChartGenerationResult>;
}

// ✅ Use interface for object shapes (extensible)
export interface ChartMetadata {
  format: string;
  resolution: string;
}

// ✅ Use interface for class implementations
export class MyService implements IMyService { }
```

**Rule of thumb**:
- Service contracts → Interface
- Unions/literals → Type
- Zod inference → Type

## Project-Specific Patterns

### 1. DI Token Pattern

```typescript
// core/di/tokens.ts
export const CHART_GENERATION_SERVICE = Symbol('CHART_GENERATION_SERVICE');
export const S3_STORAGE_SERVICE = Symbol('S3_STORAGE_SERVICE');

// core/di/providers.ts
container.registerSingleton(tokens.CHART_GENERATION_SERVICE, (c) => {
  return new ChartGenerationService(/* deps */);
});

// Usage in tools
const service = container.resolve<IChartGenerationService>(CHART_GENERATION_SERVICE);
```

**Key Points**:
- Tokens are `Symbol` types (unique)
- Always use `<InterfaceType>` when resolving
- Register with factory function for lazy initialization

### 2. Async Service Methods

```typescript
// ✅ All service methods return Promise
export interface IChartConfigService {
  constructFromNaturalLanguage(
    text: string
  ): Promise<ChartConfigConstructionResult>;
  //     ↑ Always Promise, even if synchronous internally
}

// Implementation
export class ChartConfigService implements IChartConfigService {
  async constructFromNaturalLanguage(
    text: string
  ): Promise<ChartConfigConstructionResult> {
    // Can use await inside
    const docs = await fetchDocumentation();
    return { success: true, config: {...}, ... };
  }
}
```

**Why**:
- Future-proof for async operations
- Consistent API surface
- Easy to test with async/await

### 3. MCP Tool Input/Output Types

```typescript
// Input: Zod schema + inferred type
export const MyToolInputSchema = z.object({
  param1: z.string(),
  param2: z.number().optional(),
});
export type MyToolInput = z.infer<typeof MyToolInputSchema>;

// Output: Matches service result type
export type MyToolOutput = SomeServiceResult;

// Handler function signature
export async function myToolHandler(
  input: MyToolInput
): Promise<MyToolOutput> {
  // Implementation
}
```

### 4. Error Result Pattern

```typescript
// ✅ Use discriminated union for results
export interface SuccessResult {
  success: true;
  data: MyData;
}

export interface ErrorResult {
  success: false;
  error: string;
  details?: Record<string, any>;
}

export type MyResult = SuccessResult | ErrorResult;

// Usage with type narrowing
function handleResult(result: MyResult) {
  if (result.success) {
    console.log(result.data);  // ✅ TypeScript knows data exists
  } else {
    console.error(result.error); // ✅ TypeScript knows error exists
  }
}
```

## Best Practices for This Codebase

### ✅ Do

1. **Define interfaces before implementations**
   ```typescript
   export interface IMyService { ... }
   export class MyService implements IMyService { ... }
   ```

2. **Use Zod for runtime validation + type inference**
   ```typescript
   const schema = z.object({ ... });
   type MyType = z.infer<typeof schema>;
   ```

3. **Export both interface and implementation**
   ```typescript
   export interface IMyService { }
   export class MyService implements IMyService { }
   ```

4. **Use optional properties for truly optional data**
   ```typescript
   interface Config {
     required: string;
     optional?: number;  // May be undefined
   }
   ```

5. **Use const assertions for literal types**
   ```typescript
   const toolDef = { name: 'my-tool' } as const;
   ```

6. **Use generic type parameters for DI resolution**
   ```typescript
   const service = container.resolve<IMyService>(MY_SERVICE);
   ```

### ❌ Don't

1. **Don't use `any` without explicit need**
   ```typescript
   // ❌ Avoid
   function bad(param: any) { }

   // ✅ Use unknown or specific type
   function good(param: unknown) { }
   function better(param: SpecificType) { }
   ```

2. **Don't bypass type safety with `as any`**
   ```typescript
   // ❌ Defeats purpose of TypeScript
   const value = something as any;

   // ✅ Use proper type assertion or unknown
   const value = something as UnknownType;
   ```

3. **Don't create duplicate types for Zod schemas**
   ```typescript
   // ❌ Don't define manually
   const schema = z.object({ ... });
   type MyType = { ... };  // Duplicates schema

   // ✅ Infer from schema
   const schema = z.object({ ... });
   type MyType = z.infer<typeof schema>;
   ```

4. **Don't use null (prefer undefined)**
   ```typescript
   // ❌ Avoid null
   interface Bad {
     value: string | null;
   }

   // ✅ Use undefined
   interface Good {
     value?: string;  // undefined if not provided
   }
   ```

5. **Don't skip interface definitions for services**
   ```typescript
   // ❌ Don't do this
   export class MyService {
     doSomething() { }
   }

   // ✅ Always define interface first
   export interface IMyService {
     doSomething(): void;
   }
   export class MyService implements IMyService {
     doSomething() { }
   }
   ```

## TypeScript Debugging Workflow

### Step 1: Read the Error Carefully

```
Property 's3Url' does not exist on type 'ChartGenerationResult'.ts(2339)
```

**Parse**:
- What: Property `s3Url`
- Where: Type `ChartGenerationResult`
- Why: Doesn't exist (not defined)

### Step 2: Find the Type Definition

```bash
# Use Grep to find the interface
grep -r "interface ChartGenerationResult" src/
```

**Or** use IDE:
- Cmd+Click on type name
- "Go to Definition" (F12)

### Step 3: Check the Export Chain

```typescript
// Where is it defined?
src/modules/chart/interfaces/chart.interface.ts

// Is it exported?
export interface ChartGenerationResult { ... }

// Is it re-exported from module index?
src/modules/chart/index.ts:
export * from './interfaces/chart.interface';

// Can you import it?
import type { ChartGenerationResult } from '../../modules/chart';
```

### Step 4: Fix the Issue

**Add missing property**:
```typescript
export interface ChartGenerationResult {
  // ... existing properties
  s3Url?: string;  // ✅ Add
}
```

**Or import from correct location**:
```typescript
// ❌ Wrong
import type { IS3Service } from './services/s3';

// ✅ Correct
import type { ICloudStorageService } from '../../modules/storage';
```

### Step 5: Verify Fix

```bash
# Restart TypeScript server in IDE
# Or rebuild project
npm run build
```

## Type Safety Checklist

Before committing code, verify:

- [ ] No `any` types (unless explicitly needed and documented)
- [ ] All service interfaces defined with `I` prefix
- [ ] All optional properties use `?` syntax
- [ ] Zod schemas have inferred types
- [ ] DI container resolves with generic type parameter
- [ ] Result types use discriminated unions (`success: boolean`)
- [ ] No `null` values (use `undefined` instead)
- [ ] Const assertions used for literal types
- [ ] All async functions return `Promise<T>`
- [ ] Error handling uses `unknown` or `Error` types

## Common Files to Check for Type Issues

1. **Interface definitions**:
   - `src/modules/*/interfaces/*.interface.ts`

2. **Service implementations**:
   - `src/modules/*/services/*.service.ts`

3. **MCP tool inputs/outputs**:
   - `src/mcp/tools/*.ts`

4. **DI tokens and providers**:
   - `src/core/di/tokens.ts`
   - `src/core/di/providers.ts`

5. **Zod schemas**:
   - `src/mcp/tools/*.ts` (input schemas)
   - `src/api/dto/*.dto.ts` (API validation)

## Related Skills

- **module-architecture**: Understand where types should be defined
- **service-repository-builder**: Learn service interface patterns
- **mcp-tool-developer**: Learn MCP tool type patterns
- **testing-strategy**: Learn how to type test mocks

## Key References

- **tsconfig.json**: TypeScript configuration
- **src/modules/chart/interfaces/**: Example interfaces
- **src/core/di/**: Dependency injection patterns
- **src/mcp/tools/generate-chart.ts**: Complete tool type example

## Questions This Skill Answers

- "How do I fix this TypeScript error?"
- "Where should I define this interface?"
- "What's the difference between type and interface here?"
- "How do I type a service method?"
- "Why is TypeScript complaining about this property?"
- "How do I infer types from Zod schemas?"
- "What's the pattern for optional vs required properties?"
- "How do I use generics with the DI container?"
- "Why can't I use `any` here?"
- "How do I type error results?"
