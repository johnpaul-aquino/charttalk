---
name: api-endpoint-creator
description: Use when adding REST API endpoints for the SaaS platform. Teaches Next.js App Router patterns, middleware pipeline composition, DTO validation, and controller integration.
keywords: ["API", "endpoint", "REST", "Next.js", "route", "middleware", "controller", "DTO", "HTTP"]
---

# REST API Endpoint Creator

You are an expert on building **REST API endpoints** with **Next.js 14 App Router**. This skill guides developers through creating type-safe, middleware-protected API routes for the mcp-chart-image SaaS platform.

## API Architecture

### Technology Stack

- **Framework**: Next.js 14 App Router (`app/api/` directory)
- **Validation**: Zod schemas for DTOs
- **Middleware**: Composable pipeline with `pipe()` function
- **Controllers**: Business logic delegation to services
- **Response Format**: Standardized JSON responses

### Directory Structure

```
src/
├── app/
│   └── api/
│       └── v1/              # API version 1
│           ├── charts/
│           │   ├── construct/
│           │   │   └── route.ts
│           │   ├── validate/
│           │   │   └── route.ts
│           │   └── generate/
│           │       └── route.ts
│           ├── documentation/
│           │   └── route.ts
│           ├── exchanges/
│           │   ├── route.ts
│           │   └── [id]/
│           │       └── symbols/
│           │           └── route.ts
│           └── health/
│               └── route.ts
│
└── api/                     # API infrastructure
    ├── controllers/         # Request handlers
    ├── dto/                 # Data transfer objects
    ├── middleware/          # Cross-cutting concerns
    └── utils/               # Response/error utilities
```

## API Endpoint Anatomy

Every REST API endpoint consists of 5 parts:

### 1. Request DTO (Zod Schema)

**Location**: `src/api/dto/[domain].dto.ts`

```typescript
// src/api/dto/chart.dto.ts

import { z } from 'zod';

/**
 * Generate Chart Image Request
 */
export const GenerateChartImageRequestSchema = z.object({
  config: z.any().describe('Chart configuration object'),
  storage: z
    .boolean()
    .optional()
    .default(true)
    .describe('Use storage endpoint (returns URL)'),
  format: z
    .enum(['png', 'jpeg'])
    .optional()
    .default('png')
    .describe('Image format'),
  saveToFile: z
    .boolean()
    .optional()
    .default(false)
    .describe('Automatically save to file'),
  filename: z
    .string()
    .optional()
    .describe('Custom filename when saveToFile=true'),
});

export type GenerateChartImageRequest = z.infer<typeof GenerateChartImageRequestSchema>;

/**
 * Generate Chart Image Response
 */
export interface GenerateChartImageResponse {
  success: boolean;
  imageUrl?: string;
  imageData?: string;
  localPath?: string;
  metadata: {
    format: string;
    resolution: string;
    generatedAt: string;
  };
  apiResponse: {
    statusCode: number;
    rateLimitRemaining?: number;
  };
}
```

**Why DTOs?**
- Type-safe request/response contracts
- Runtime validation with Zod
- Auto-generated API documentation
- Clear API interface

### 2. Controller

**Location**: `src/api/controllers/[domain].controller.ts`

```typescript
// src/api/controllers/chart.controller.ts

import { container, CHART_GENERATION_SERVICE } from '@/core/di';
import type { IChartGenerationService } from '@/modules/chart/interfaces/chart.interface';
import type {
  GenerateChartImageRequest,
  GenerateChartImageResponse,
} from '../dto/chart.dto';
import { Errors } from '../utils/error.util';

export class ChartController {
  /**
   * Generate chart image
   */
  async generateChartImage(
    dto: GenerateChartImageRequest
  ): Promise<GenerateChartImageResponse> {
    try {
      // Resolve service from DI container
      const generationService = container.resolve<IChartGenerationService>(
        CHART_GENERATION_SERVICE
      );

      // Call service
      const result = await generationService.generateChart(
        dto.config,
        dto.storage,
        dto.format
      );

      // Transform service result to response DTO
      if (!result.success) {
        throw Errors.internal(result.error || 'Chart generation failed');
      }

      return {
        success: true,
        imageUrl: result.imageUrl,
        imageData: result.imageData,
        localPath: result.localPath,
        metadata: result.metadata,
        apiResponse: result.apiResponse,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw Errors.internal(error.message);
      }
      throw error;
    }
  }

  /**
   * Construct chart config from natural language
   */
  async constructChartConfig(dto: ConstructChartConfigRequest) {
    // Similar pattern...
  }
}

// Export singleton instance
export const chartController = new ChartController();
```

**Controller Responsibilities**:
- ✅ **Thin layer** - Delegate to services
- ✅ **DTO transformation** - Service result → Response DTO
- ✅ **Error handling** - Throw HTTP-friendly errors
- ✅ **DI resolution** - Get services from container

### 3. Route Handler

**Location**: `app/api/v1/[resource]/[action]/route.ts`

```typescript
// app/api/v1/charts/generate/route.ts

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  withCors,
  withOptionalAuth,
  withRateLimit,
  pipe,
} from '../../../../../api/middleware';
import {
  createSuccessResponse,
  jsonResponse,
  HttpStatus,
} from '../../../../../api/utils/response.util';
import { Errors } from '../../../../../api/utils/error.util';
import {
  GenerateChartImageRequestSchema,
  type GenerateChartImageResponse,
} from '../../../../../api/dto/chart.dto';
import { chartController } from '../../../../../api/controllers/chart.controller';

/**
 * POST /api/v1/charts/generate
 *
 * Generate a chart image from configuration
 */
async function handler(req: NextRequest) {
  // 1. Parse request body
  const body = await req.json().catch(() => {
    throw Errors.badRequest('Invalid JSON in request body');
  });

  // 2. Validate with Zod
  const validation = GenerateChartImageRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Errors.validationError(
      'Request validation failed',
      validation.error.errors
    );
  }

  // 3. Call controller
  const result: GenerateChartImageResponse = await chartController.generateChartImage(
    validation.data
  );

  // 4. Return standardized response
  return jsonResponse(createSuccessResponse(result), HttpStatus.OK);
}

// 5. Apply middleware pipeline
export const POST = pipe(
  withCors,                                      // Handle CORS (preflight, headers)
  withRateLimit({ capacity: 10, refillRate: 2 }), // Rate limiting
  withOptionalAuth,                               // Optional authentication
  withErrorHandler                                // Catch all errors
)(handler);
```

**Route Handler Pattern**:
1. **Parse body** - Extract JSON, handle parse errors
2. **Validate** - Zod schema validation
3. **Call controller** - Delegate business logic
4. **Return response** - Standardized JSON format
5. **Apply middleware** - Composable pipeline

### 4. Middleware Pipeline

**Location**: `src/api/middleware/index.ts`

```typescript
// src/api/middleware/index.ts

export { pipe } from './pipe';
export { withCors } from './cors.middleware';
export { withRateLimit } from './rate-limit.middleware';
export { withAuth, withOptionalAuth } from './auth.middleware';
export { withErrorHandler } from './error-handler.middleware';
```

**Middleware Composition with `pipe()`**:

```typescript
// src/api/middleware/pipe.ts

export type Middleware = (handler: Handler) => Handler;
export type Handler = (req: NextRequest) => Promise<NextResponse>;

/**
 * Compose middleware functions left-to-right
 *
 * @example
 * const handler = pipe(
 *   withCors,
 *   withAuth,
 *   withErrorHandler
 * )(async (req) => { ... });
 */
export function pipe(...middlewares: Middleware[]): (handler: Handler) => Handler {
  return (handler: Handler) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}
```

**Middleware Order (Important!)**:

```typescript
export const POST = pipe(
  withCors,           // 1. First - Handle preflight requests
  withRateLimit,      // 2. Early - Prevent abuse before processing
  withAuth,           // 3. Before business logic - Authenticate user
  withErrorHandler    // 4. Last - Catch all errors from above
)(handler);
```

**Why this order?**
- `withCors` must be first to handle OPTIONS preflight
- `withRateLimit` prevents wasted processing on abusive requests
- `withAuth` runs before expensive operations
- `withErrorHandler` wraps everything to catch errors

### 5. Response Utilities

**Location**: `src/api/utils/response.util.ts`

```typescript
// src/api/utils/response.util.ts

import { NextResponse } from 'next/server';

/**
 * HTTP Status Codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * Standardized success response
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Standardized error response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
  };
  timestamp: string;
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any[]
): ErrorResponse {
  return {
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create JSON response with proper headers
 */
export function jsonResponse(
  data: SuccessResponse | ErrorResponse,
  status: HttpStatus
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
```

## Step-by-Step: Creating a New Endpoint

### Example: Symbol Search Endpoint

Let's create `POST /api/v1/symbols/search`.

#### Step 1: Define DTOs

**Location**: `src/api/dto/symbol.dto.ts`

```typescript
import { z } from 'zod';

/**
 * Search Symbols Request
 */
export const SearchSymbolsRequestSchema = z.object({
  query: z.string().min(1).describe('Search query (e.g., "BTC", "Apple")'),
  exchanges: z
    .array(z.string())
    .optional()
    .describe('Filter by exchanges'),
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
    .describe('Max results (default: 20)'),
});

export type SearchSymbolsRequest = z.infer<typeof SearchSymbolsRequestSchema>;

/**
 * Search Symbols Response
 */
export interface SearchSymbolsResponse {
  symbols: SymbolResult[];
  totalResults: number;
  query: string;
}

export interface SymbolResult {
  symbol: string;
  exchange: string;
  description: string;
  type: string;
  confidence: number;
}
```

#### Step 2: Create Controller Method

**Location**: `src/api/controllers/symbol.controller.ts`

```typescript
import { container, SYMBOL_SEARCH_SERVICE } from '@/core/di';
import type { ISymbolSearchService } from '@/modules/chart/interfaces/chart.interface';
import type { SearchSymbolsRequest, SearchSymbolsResponse } from '../dto/symbol.dto';
import { Errors } from '../utils/error.util';

export class SymbolController {
  async searchSymbols(dto: SearchSymbolsRequest): Promise<SearchSymbolsResponse> {
    try {
      // Resolve service
      const searchService = container.resolve<ISymbolSearchService>(
        SYMBOL_SEARCH_SERVICE
      );

      // Call service
      const result = await searchService.search(dto.query, {
        exchanges: dto.exchanges,
        assetTypes: dto.assetTypes,
        limit: dto.limit,
      });

      // Transform to response
      return {
        symbols: result.symbols,
        totalResults: result.total,
        query: dto.query,
      };
    } catch (error) {
      throw Errors.internal(error instanceof Error ? error.message : 'Search failed');
    }
  }
}

export const symbolController = new SymbolController();
```

#### Step 3: Create Route Handler

**Location**: `app/api/v1/symbols/search/route.ts`

```typescript
import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  withCors,
  withOptionalAuth,
  withRateLimit,
  pipe,
} from '../../../../../api/middleware';
import {
  createSuccessResponse,
  jsonResponse,
  HttpStatus,
} from '../../../../../api/utils/response.util';
import { Errors } from '../../../../../api/utils/error.util';
import {
  SearchSymbolsRequestSchema,
  type SearchSymbolsResponse,
} from '../../../../../api/dto/symbol.dto';
import { symbolController } from '../../../../../api/controllers/symbol.controller';

/**
 * POST /api/v1/symbols/search
 *
 * Search for trading symbols across exchanges
 */
async function handler(req: NextRequest) {
  // Parse body
  const body = await req.json().catch(() => {
    throw Errors.badRequest('Invalid JSON in request body');
  });

  // Validate
  const validation = SearchSymbolsRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Errors.validationError('Request validation failed', validation.error.errors);
  }

  // Call controller
  const result: SearchSymbolsResponse = await symbolController.searchSymbols(
    validation.data
  );

  // Return response
  return jsonResponse(createSuccessResponse(result), HttpStatus.OK);
}

// Apply middleware
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 20, refillRate: 5 }), // More lenient for search
  withOptionalAuth,
  withErrorHandler
)(handler);
```

#### Step 4: Test the Endpoint

```bash
# Start dev server
npm run dev

# Test with curl
curl -X POST http://localhost:3000/api/v1/symbols/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "BTC",
    "limit": 10
  }'
```

**Expected response**:
```json
{
  "success": true,
  "data": {
    "symbols": [
      {
        "symbol": "BINANCE:BTCUSDT",
        "exchange": "BINANCE",
        "description": "Bitcoin / TetherUS",
        "type": "crypto",
        "confidence": 0.95
      }
    ],
    "totalResults": 15,
    "query": "BTC"
  },
  "timestamp": "2025-11-14T12:34:56.789Z"
}
```

## Middleware Details

### 1. CORS Middleware

```typescript
// src/api/middleware/cors.middleware.ts

export function withCors(handler: Handler): Handler {
  return async (req: NextRequest) => {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Execute handler
    const response = await handler(req);

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

    return response;
  };
}
```

### 2. Rate Limit Middleware

```typescript
// src/api/middleware/rate-limit.middleware.ts

import { rateLimiter } from '../utils/rate-limiter.util';

export function withRateLimit(options: { capacity: number; refillRate: number }) {
  return function (handler: Handler): Handler {
    return async (req: NextRequest) => {
      const clientId = req.ip || 'anonymous';

      const allowed = rateLimiter.tryConsume(clientId, options.capacity, options.refillRate);

      if (!allowed) {
        throw Errors.tooManyRequests('Rate limit exceeded. Please try again later.');
      }

      return handler(req);
    };
  };
}
```

### 3. Auth Middleware

```typescript
// src/api/middleware/auth.middleware.ts

/**
 * Require authentication (throws if missing)
 */
export function withAuth(handler: Handler): Handler {
  return async (req: NextRequest) => {
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      throw Errors.unauthorized('API key required');
    }

    // Validate API key (implement your logic)
    const isValid = await validateApiKey(apiKey);
    if (!isValid) {
      throw Errors.unauthorized('Invalid API key');
    }

    // Attach user to request (optional)
    // (req as any).user = { id: userId, plan: 'PRO' };

    return handler(req);
  };
}

/**
 * Optional authentication (doesn't throw if missing)
 */
export function withOptionalAuth(handler: Handler): Handler {
  return async (req: NextRequest) => {
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (apiKey) {
      const isValid = await validateApiKey(apiKey);
      if (isValid) {
        // Attach user if valid
        // (req as any).user = { id: userId };
      }
    }

    return handler(req);
  };
}
```

### 4. Error Handler Middleware

```typescript
// src/api/middleware/error-handler.middleware.ts

export function withErrorHandler(handler: Handler): Handler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      // Handle custom errors
      if (isApiError(error)) {
        return jsonResponse(
          createErrorResponse(error.code, error.message, error.details),
          error.statusCode
        );
      }

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return jsonResponse(
          createErrorResponse('VALIDATION_ERROR', 'Validation failed', error.errors),
          HttpStatus.BAD_REQUEST
        );
      }

      // Handle unknown errors
      console.error('[API Error]', error);
      return jsonResponse(
        createErrorResponse('INTERNAL_ERROR', 'Internal server error'),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };
}
```

## Error Handling

### Error Utility

```typescript
// src/api/utils/error.util.ts

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const Errors = {
  badRequest: (message: string, details?: any[]) =>
    new ApiError(HttpStatus.BAD_REQUEST, 'BAD_REQUEST', message, details),

  unauthorized: (message: string) =>
    new ApiError(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message),

  forbidden: (message: string) =>
    new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', message),

  notFound: (message: string) =>
    new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', message),

  tooManyRequests: (message: string) =>
    new ApiError(HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS', message),

  internal: (message: string) =>
    new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', message),

  validationError: (message: string, details: any[]) =>
    new ApiError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', message, details),
};
```

## Best Practices

### ✅ Do

1. **Use DTOs for all requests/responses** - Type-safe contracts
2. **Validate with Zod** - Runtime validation catches errors early
3. **Apply middleware consistently** - CORS → Rate Limit → Auth → Error Handler
4. **Delegate to controllers** - Keep route handlers thin
5. **Use standardized responses** - `createSuccessResponse()` / `createErrorResponse()`
6. **Handle errors properly** - Structured error responses
7. **Version your API** - `/v1/`, `/v2/` directories
8. **Document with JSDoc** - Explain endpoint purpose
9. **Test endpoints** - Integration tests with supertest
10. **Use HTTP status codes correctly** - 200, 201, 400, 401, 404, 500

### ❌ Don't

1. **Don't add business logic to routes** - Delegate to controllers/services
2. **Don't skip validation** - Always validate request bodies
3. **Don't skip error handling** - Use `withErrorHandler` middleware
4. **Don't forget CORS** - Always include `withCors`
5. **Don't skip rate limiting** - Prevent abuse
6. **Don't return raw errors** - Use standardized error responses
7. **Don't hardcode values** - Use configuration
8. **Don't skip authentication** - Protect sensitive endpoints
9. **Don't mix middleware order** - Follow the standard order
10. **Don't forget versioning** - Plan for API evolution

## Related Skills

- **service-repository-builder**: Learn how to build services that APIs call
- **module-architecture**: Understand where API code fits
- **testing-strategy**: Learn how to test API endpoints

## Questions This Skill Answers

- "How do I create a REST API endpoint?"
- "What's the middleware pipeline pattern?"
- "How do I add authentication to an endpoint?"
- "Show me how to validate request bodies"
- "What's the standard response format?"
- "How do I handle errors in APIs?"
- "What order should middleware be applied?"
- "How do I add rate limiting?"
- "Where do DTOs go?"
- "How do I test API endpoints?"
