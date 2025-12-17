# Chart Service (mcp-chart-image)

MCP server + REST API for generating professional trading charts with 100+ technical indicators. Supports crypto, stocks, and forex via chart-img.com API.

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start REST API (localhost:3010)
npm run mcp          # Start MCP server
npm test             # Run tests (109 tests)
npm run build        # Build project
```

## Prerequisites

- **Node.js 18+**
- **chart-img.com API Key** ([chart-img.com](https://chart-img.com))
- **OpenAI API Key** (optional, for AI chart analysis)
- **AWS credentials** (optional, for S3 storage)

## Project Structure

```
src/
├── modules/              # Domain modules (modular monolith)
│   ├── chart/           # Chart generation (services, repositories, domain)
│   ├── analysis/        # AI-powered chart analysis (OpenAI GPT-4o)
│   ├── storage/         # File storage, S3 integration
│   ├── user/            # JWT auth, plan-based access control
│   └── conversation/    # Chat history (PostgreSQL/Prisma)
│
├── core/                # Infrastructure
│   ├── database/        # JSON databases, loaders (indicators, drawings)
│   ├── http/            # HTTP clients
│   └── di/              # Dependency injection container
│
├── shared/              # Utilities
│   ├── config/          # Environment configuration
│   ├── types/           # Common types
│   └── utils/           # Helpers
│
├── mcp/                 # MCP server
│   ├── server.ts        # Entry point
│   └── tools/           # 9 MCP tools
│
├── api/                 # REST API layer
│   ├── controllers/     # HTTP handlers
│   ├── middleware/      # Auth, rate limiting, CORS, errors
│   └── dto/             # Zod validation schemas
│
└── app/                 # Next.js App Router
    └── api/v1/          # API route handlers
```

## Module Architecture

Each module has clear boundaries:

| Module | Responsibility |
|--------|---------------|
| **chart** | Config construction, validation, generation, indicators, drawings |
| **analysis** | AI vision analysis, signal generation, LLM providers |
| **storage** | Local file ops, S3 uploads, chart downloads |
| **user** | JWT validation, plan access control, Laravel integration |
| **conversation** | Message persistence, chat history |

### Key Services

- `ChartConfigService` - Natural language to chart config
- `ChartValidationService` - Plan-based validation
- `ChartGenerationService` - API calls to chart-img.com
- `AIAnalysisService` - OpenAI GPT-4o chart analysis
- `S3StorageService` - Permanent chart storage

## MCP Tools (9 tools)

| Tool | Purpose |
|------|---------|
| `health_check` | Server status and diagnostics |
| `fetch_chart_documentation` | Get chart-img.com API docs |
| `get_exchanges` | List available exchanges |
| `get_symbols` | List trading pairs for exchange |
| `construct_chart_config` | Natural language to chart config |
| `validate_chart_config` | Validate against plan limits |
| `generate_chart_image` | Generate chart image |
| `upload_chart_to_s3` | Upload to S3 (permanent storage) |
| `analyze_chart` | AI analysis with GPT-4o |

### Claude Code Setup

```bash
# Add MCP server to Claude Code
claude mcp add --transport stdio chart-img -- npx tsx src/mcp/server.ts

# Verify connection
claude mcp list
```

## REST API Endpoints

Base URL: `http://localhost:3010/api/v1`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/charts/construct` | POST | Natural language to config |
| `/charts/validate` | POST | Validate configuration |
| `/charts/generate` | POST | Generate chart image |
| `/exchanges` | GET | List exchanges |
| `/exchanges/:id/symbols` | GET | List symbols |
| `/documentation` | GET | API documentation |
| `/storage/save` | POST | Save chart locally |
| `/storage/s3` | POST | Upload to S3 |
| `/chat/messages` | POST | AI chat (requires auth) |
| `/chat/messages/stream` | POST | Streaming chat (SSE) |
| `/conversations` | GET/POST | Conversation management |
| `/conversations/:id` | GET/PATCH/DELETE | Single conversation |
| `/analysis/chart` | POST | AI chart analysis |

### Middleware Stack

```typescript
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 20, refillRate: 10 }),
  withOptionalAuth,
  withErrorHandler
)(handler);
```

**Full API docs**: `.docs/api/README.md`

## Environment Variables

```bash
# Required
CHART_IMG_API_KEY=your-api-key
CHART_IMG_PLAN=PRO              # BASIC, PRO, MEGA, ULTRA, ENTERPRISE

# Optional - AI Analysis
OPENAI_API_KEY=sk-your-key
ANALYSIS_DEFAULT_MODEL=gpt-4o-mini

# Optional - Database (for conversations)
DATABASE_URL=postgresql://...

# Optional - JWT Auth
JWT_PUBLIC_KEY_PATH=./keys/jwt-public.pem
JWT_ISSUER=laravel-user-service
AUTH_DEV_BYPASS=true            # Skip auth in development

# Optional - AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=my-charts
AWS_REGION=us-east-1
```

## Plan Limits

| Plan | RPS | Daily | Resolution | Indicators |
|------|-----|-------|------------|------------|
| BASIC | 1 | 50 | 800x600 | 3 |
| PRO | 10 | 500 | 1920x1080 | 5 |
| MEGA | 15 | 1,000 | 1920x1600 | 10 |
| ULTRA | 35 | 3,000 | 2048x1920 | 25 |
| ENTERPRISE | 35+ | 5,000+ | 2048x1920 | 50 |

## Testing

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm run test:coverage       # Coverage report
```

**Test structure**: Tests in `__tests__/` directories alongside code.

**Coverage**: 109 tests, 100% passing (ChartConfig, ChartValidation, etc.)

**E2E tests**: Separate repo at `charttalk-test`

**Full testing docs**: `.docs/testing.md`

## Development Patterns

### Adding a New Service

1. Create interface in `modules/{module}/interfaces/`
2. Implement in `modules/{module}/services/`
3. Register in `core/di/container.ts`
4. Add tests in `services/__tests__/`

### Adding a New MCP Tool

1. Create tool file in `mcp/tools/`
2. Import service from DI container
3. Register in `mcp/server.ts`
4. Add tests

### Adding a REST Endpoint

1. Create DTO in `api/dto/`
2. Create controller in `api/controllers/`
3. Create route in `app/api/v1/`
4. Apply middleware pipeline

## Key Files

| File | Purpose |
|------|---------|
| `src/mcp/server.ts` | MCP server entry point |
| `src/core/di/container.ts` | Dependency injection |
| `src/modules/chart/services/chart-config.service.ts` | NL to config |
| `src/modules/chart/services/chart-validation.service.ts` | Validation |
| `src/modules/analysis/services/ai-analysis.service.ts` | AI analysis |
| `src/api/middleware/` | REST API middleware |
| `vitest.config.ts` | Test configuration |

## Troubleshooting

### MCP server not connecting

```bash
# Test server manually
npm run mcp

# Should see:
# [MCP Server] chart-img-mcp-server v0.1.1 started
# [MCP Server] Registered 9 tools
```

### Invalid API key

1. Check `.env` has correct `CHART_IMG_API_KEY`
2. Verify key at chart-img.com/dashboard

### Rate limit exceeded

- Wait for reset (check error message)
- Reduce request frequency
- Upgrade plan

### Chart generation fails

- Verify symbol format: `EXCHANGE:SYMBOL`
- Check indicator count vs plan limit
- Check resolution vs plan limit

## Documentation

| Document | Location |
|----------|----------|
| REST API | `.docs/api/README.md` |
| Architecture | `.docs/saas-architecture.md` |
| MCP Tools | `.docs/mcp-tools.md` |
| Examples | `.docs/examples.md` |
| Testing | `.docs/testing.md` |
| S3 Storage | `.docs/s3-storage.md` |
| Claude Desktop | `.docs/claude-desktop-setup.md` |
| JWT Auth | `.docs/jwt-authentication.md` |
| Advanced | `.docs/advanced-features.md` |
| Changelog | `CHANGELOG.md` |

## Example Usage

### MCP (via Claude)

> "Show me Bitcoin with RSI for the last 7 days"

Claude uses: `construct_chart_config` -> `generate_chart_image`

### REST API

```bash
# Construct config
curl -X POST http://localhost:3010/api/v1/charts/construct \
  -H "Content-Type: application/json" \
  -d '{"naturalLanguage": "Bitcoin with RSI for 7 days"}'

# Generate chart
curl -X POST http://localhost:3010/api/v1/charts/generate \
  -H "Content-Type: application/json" \
  -d '{"config": {...}, "storage": true}'
```

### Best Practice Workflow

```javascript
// 1. Generate chart locally
const chart = await generate_chart_image({
  config: config,
  storage: false,
  saveToFile: true,
  filename: "btc-analysis.png"
});
// Returns: { localPath: "/tmp/btc-analysis.png" }

// 2. AI analyzes the local file

// 3. Upload to S3 for permanent storage
const s3Result = await upload_chart_to_s3({
  imageData: fs.readFileSync(chart.localPath, 'base64'),
  metadata: { symbol: "BINANCE:BTCUSDT", interval: "4h" }
});
// Returns: { url: "https://s3-bucket.s3.../chart.png" }
```

## Contributing

1. Review architecture in `.docs/saas-architecture.md`
2. Follow module patterns (repository for data, service for logic)
3. Write tests in `__tests__/` directories
4. Run `npm test` before committing
5. Use DI container for dependencies

## Current Status

**Completed**:
- Modular monolith architecture
- 9 MCP tools with DI
- 15 REST API endpoints
- JWT authentication
- AI chart analysis (GPT-4o)
- S3 permanent storage
- 109 unit tests

**Planned**:
- OpenAPI/Swagger spec
- Additional LLM providers
- Redis rate limiting
- GitHub Actions CI/CD
