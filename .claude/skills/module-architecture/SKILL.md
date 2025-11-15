---
name: module-architecture
description: Use when developer asks about project structure, architecture, module boundaries, or where to add new features. Explains the modular monolith pattern used in mcp-chart-image.
keywords: ["architecture", "structure", "module", "where to add", "organize", "directory", "modular monolith", "boundaries"]
---

# Module Architecture Navigator

You are an expert on the **mcp-chart-image modular monolith architecture**. This skill helps developers understand the project structure and make correct decisions about where to add new features.

## Project Overview

The mcp-chart-image project is a TypeScript-based MCP (Model Context Protocol) server that generates professional trading charts via chart-img.com API. The codebase follows a **3-layer modular monolith** pattern designed for easy maintenance and future microservice extraction.

## Architecture Layers

```
src/
├── modules/           # Domain modules (business logic)
│   ├── chart/        # Chart generation, config, validation
│   ├── analysis/     # AI-powered chart analysis (planned)
│   ├── storage/      # File operations & storage
│   └── user/         # User management (planned for SaaS)
│
├── core/             # Core infrastructure
│   ├── database/     # JSON database loaders (indicators, drawings)
│   ├── http/         # HTTP clients (chart-img.com API)
│   └── di/           # Dependency injection container
│
├── shared/           # Shared utilities
│   ├── config/       # Environment configuration
│   ├── types/        # Common TypeScript types
│   └── utils/        # Helper functions
│
├── mcp/              # MCP Protocol Layer
│   ├── server.ts     # MCP entry point (8 tools)
│   └── tools/        # Tool implementations
│
└── app/              # REST API Layer (Next.js 14)
    └── api/v1/       # API endpoints
```

## When to Use Each Directory

### `modules/` - Domain Business Logic

**Use when**: Adding features specific to a business domain

**Module Responsibilities**:
- **chart/**: Chart configuration, generation, validation, indicators, drawings
- **analysis/**: AI chart analysis, signal generation (planned)
- **storage/**: File operations, downloads, permanent storage (planned)
- **user/**: Authentication, quotas, billing (planned)

**Internal Structure** (each module):
```
modules/[domain]/
├── services/         # Business logic orchestration
├── repositories/     # Data access layer
├── domain/           # Domain models (Indicator, Drawing, etc.)
└── interfaces/       # Service contracts (I-prefix interfaces)
```

**Example Questions**:
- ❓ "Where do I add chart validation logic?"
  ✅ `modules/chart/services/chart-validation.service.ts`

- ❓ "Where do I create a new indicator search feature?"
  ✅ `modules/chart/repositories/indicators.repository.ts`

### `core/` - Infrastructure

**Use when**: Adding shared infrastructure that multiple modules need

**Core Responsibilities**:
- **database/loaders/**: JSON database loaders with caching
- **http/**: HTTP clients for external APIs
- **di/**: Dependency injection container and tokens

**Example Questions**:
- ❓ "Where do I add a new database loader for symbols?"
  ✅ `core/database/loaders/symbols.loader.ts`

- ❓ "Where do I add rate limiting for API calls?"
  ✅ `core/http/chart-img.client.ts` (if API-specific) or middleware (if cross-cutting)

### `shared/` - Cross-Cutting Utilities

**Use when**: Adding utilities used across the entire application

**Shared Responsibilities**:
- **config/**: Environment variable management
- **types/**: Common TypeScript interfaces/types
- **utils/**: Helper functions (formatting, validation, etc.)

**Example Questions**:
- ❓ "Where do I add a date formatting utility?"
  ✅ `shared/utils/date.util.ts`

- ❓ "Where do I add a new environment variable?"
  ✅ `shared/config/environment.config.ts`

### `mcp/` - MCP Protocol Layer

**Use when**: Adding MCP tools or modifying server behavior

**MCP Layer Responsibilities**:
- **server.ts**: MCP server registration and request handling
- **tools/**: Individual tool implementations (8 tools currently)

**Tools should be thin wrappers** - delegate to services in `modules/`

**Example Questions**:
- ❓ "Where do I add a new MCP tool for symbol search?"
  ✅ `mcp/tools/search-symbols.ts` (handler + definition)
  ✅ `mcp/server.ts` (registration)
  ✅ `modules/chart/services/symbol-search.service.ts` (business logic)

### `app/api/` - REST API Layer

**Use when**: Adding HTTP endpoints for SaaS platform

**API Layer Responsibilities**:
- **v1/**: Versioned API endpoints
- **controllers/**: Request handling logic (in `src/api/controllers/`)
- **middleware/**: Cross-cutting concerns (CORS, auth, rate-limiting)

**Example Questions**:
- ❓ "Where do I add a REST endpoint for chart generation?"
  ✅ `app/api/v1/charts/generate/route.ts`
  ✅ `src/api/controllers/chart.controller.ts`

## Decision Tree: Where Does My Code Go?

### Step 1: Identify the Domain

```
Is it about...
├─ Chart operations? → modules/chart/
├─ AI analysis? → modules/analysis/
├─ File storage? → modules/storage/
└─ User management? → modules/user/
```

### Step 2: Identify the Layer

```
Within the module:
├─ Business logic? → services/
├─ Data access? → repositories/
├─ Domain model? → domain/
└─ Interface/contract? → interfaces/
```

### Step 3: Check for Infrastructure Needs

```
Does it require...
├─ New database loader? → core/database/loaders/
├─ External API client? → core/http/
└─ DI registration? → core/di/
```

### Step 4: Check for Shared Concerns

```
Is it used everywhere?
├─ Configuration? → shared/config/
├─ Common types? → shared/types/
└─ Utility function? → shared/utils/
```

## Module Boundaries (Important!)

### ✅ Allowed Dependencies

```
modules/chart → core/ (infrastructure)
modules/chart → shared/ (utilities)
mcp/tools → modules/chart/services (business logic)
app/api → modules/chart/services (business logic)
```

### ❌ Forbidden Dependencies

```
modules/chart ❌ mcp/ (modules shouldn't know about MCP)
core/ ❌ modules/ (infrastructure shouldn't depend on domains)
modules/chart ❌ modules/analysis (modules shouldn't depend on each other directly)
```

**Why?** Maintains clear separation of concerns and allows future microservice extraction.

## Migration Status

The project is undergoing architectural transformation:

**✅ Completed**:
- Module structure created
- Repository pattern implemented (indicators, drawings)
- Service interfaces defined
- Core infrastructure (loaders, HTTP client, DI container)

**🟡 In Progress**:
- Service layer implementation
- DI container integration
- Refactoring MCP tools to use services

**⚪ Planned**:
- Analysis module (AI chart analysis)
- Storage module (permanent storage)
- User module (auth, quotas)
- REST API completion

**Implication**: You'll see **two patterns** in the codebase:
1. **Legacy**: MCP tools directly calling utilities/loaders
2. **New**: MCP tools → Services → Repositories

**Always use the new pattern** when adding features.

## Architectural Patterns Used

### 1. Repository Pattern
- **Purpose**: Abstract data access
- **Location**: `modules/[domain]/repositories/`
- **Example**: `IndicatorsRepository` abstracts indicator database access
- **When to use**: Accessing data sources (JSON files, APIs, databases)

### 2. Service Layer Pattern
- **Purpose**: Encapsulate business logic
- **Location**: `modules/[domain]/services/`
- **Example**: `ChartConfigService` orchestrates config construction
- **When to use**: Implementing business rules, coordinating multiple repositories

### 3. Dependency Injection
- **Purpose**: Loose coupling, testability
- **Location**: `core/di/container.ts`, `core/di/tokens.ts`
- **Example**: Services injected via `container.resolve(CHART_CONFIG_SERVICE)`
- **When to use**: Always for services and repositories

### 4. Interface-First Design
- **Purpose**: Contract-driven development
- **Location**: `modules/[domain]/interfaces/`
- **Example**: `IChartConfigService` interface, `ChartConfigService` implementation
- **When to use**: Defining all services and repositories

## Example Scenarios

### Scenario 1: Adding Support for New Indicator Categories

**Question**: "I want to add support for volume profile indicators"

**Answer**:
1. **Add data**: Update `src/data/indicators.json` with new volume profile indicators
2. **Add domain type**: Update `modules/chart/domain/indicators.ts` with category type
3. **Update repository**: Add search method in `modules/chart/repositories/indicators.repository.ts`
4. **Update service**: Add detection logic in `modules/chart/services/chart-config.service.ts`
5. **Add tests**: Create tests in `modules/chart/services/__tests__/`

**Layers touched**: Data → Domain → Repository → Service → Tests

### Scenario 2: Adding New MCP Tool for Symbol Search

**Question**: "I want to add a tool to search all available symbols"

**Answer**:
1. **Create service**: `modules/chart/services/symbol-search.service.ts` (business logic)
2. **Create interface**: `modules/chart/interfaces/chart.interface.ts` (add `ISymbolSearchService`)
3. **Register in DI**: `core/di/tokens.ts` + `core/di/providers.ts`
4. **Create MCP tool**: `mcp/tools/search-symbols.ts` (thin wrapper)
5. **Register tool**: Update `mcp/server.ts` (add to tool definitions + handler)
6. **Add tests**: Test service with mocks

**Flow**: Service → DI → MCP Tool → Server Registration

### Scenario 3: Adding REST API Endpoint for Chart Templates

**Question**: "I want to add an API endpoint to save/load chart templates"

**Answer**:
1. **Create service**: `modules/chart/services/chart-template.service.ts`
2. **Create repository** (if needed): `modules/chart/repositories/templates.repository.ts`
3. **Define DTOs**: `src/api/dto/template.dto.ts`
4. **Create controller**: `src/api/controllers/template.controller.ts`
5. **Create route**: `app/api/v1/templates/route.ts`
6. **Add middleware**: Apply CORS, rate-limit, auth, error-handler
7. **Add tests**: Service tests + integration tests

**Flow**: Service ← Controller ← Route + Middleware

## Best Practices

### ✅ Do

- **Define interfaces first** (`IMyService`) before implementations
- **Use dependency injection** for all services and repositories
- **Keep modules independent** - no direct module-to-module dependencies
- **Delegate from MCP tools to services** - tools should be thin wrappers
- **Write tests alongside features** in `__tests__/` directories
- **Follow naming conventions**:
  - Services: `*.service.ts`
  - Repositories: `*.repository.ts`
  - Interfaces: `I` prefix, `*.interface.ts`

### ❌ Don't

- **Don't add business logic to MCP tools** - delegate to services
- **Don't bypass DI container** - always use `container.resolve()`
- **Don't create deep relative imports** (`../../../core/...`) - use path aliases or DI
- **Don't add shared concerns to modules** - put in `shared/` or `core/`
- **Don't mix legacy and new patterns** - always use the new service-based approach

## Related Skills

- **service-repository-builder**: Learn how to implement services and repositories
- **mcp-tool-developer**: Learn how to create MCP tools that use this architecture
- **testing-strategy**: Learn how to test this layered architecture
- **api-endpoint-creator**: Learn how to create REST API endpoints

## Key References

- **CLAUDE.md**: Project overview and architecture section
- **.docs/saas-architecture.md**: Complete SaaS platform design
- **src/modules/chart/**: Example of fully implemented module
- **src/core/di/**: Dependency injection container

## Questions This Skill Answers

- "Where should I add this feature?"
- "What's the difference between modules and core?"
- "How do I know if something belongs in shared vs core?"
- "Explain the project's layered architecture"
- "What's the migration status?"
- "Why can't modules depend on each other?"
- "What architectural patterns are used?"
- "How do MCP tools relate to services?"
- "Where do I add a new domain?"
- "What's the structure of a module?"
