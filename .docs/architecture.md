# MCP Chart-Image Server - Architecture

## Overview

The MCP Chart-Image Server is a specialized Model Context Protocol (MCP) server built on Next.js that enables AI clients (Claude, ChatGPT, etc.) to generate trading charts through the chart-img.com API. The server provides a bridge between natural language chart requests and the chart-img.com REST API.

## System Architecture

### High-Level Flow

```
┌─────────────┐
│  AI Client  │  (Claude, ChatGPT, etc.)
│  (Desktop)  │
└──────┬──────┘
       │ MCP Protocol
       │ (stdio/SSE)
       ▼
┌─────────────────────────────────┐
│   MCP Chart-Image Server        │
│   (Next.js + MCP SDK)           │
│                                 │
│  ┌──────────────────────────┐  │
│  │   MCP Tools Layer        │  │
│  │  - fetch_chart_docs      │  │
│  │  - get_exchanges         │  │
│  │  - get_symbols           │  │
│  │  - construct_chart_config│  │
│  │  - validate_config       │  │
│  │  - generate_chart        │  │
│  └────────┬─────────────────┘  │
│           │                    │
│  ┌────────▼─────────────────┐  │
│  │  Business Logic Layer    │  │
│  │  - Doc Parser            │  │
│  │  - Config Constructor    │  │
│  │  - Chart Client Wrapper  │  │
│  └────────┬─────────────────┘  │
│           │                    │
└───────────┼────────────────────┘
            │ HTTPS
            ▼
┌─────────────────────────────────┐
│   chart-img.com API             │
│   - /v2/tradingview/advanced-chart │
│   - /v3/tradingview/exchanges   │
│   - /v3/tradingview/exchange/<EXCHANGE>/symbols │
└─────────────────────────────────┘
```

## Architecture Components

### 1. MCP Server Layer (`src/mcp/server.ts`)

**Purpose**: Entry point for the MCP server that registers and exposes tools to AI clients.

**Key Responsibilities**:
- Initialize MCP server with stdio/SSE transport
- Register all 6 MCP tools
- Handle tool invocations from AI clients
- Manage error handling and logging
- Coordinate between tools and business logic

**Technology**: `@modelcontextprotocol/sdk`

### 2. MCP Tools Layer (`src/mcp/tools/`)

Individual tool implementations that AI clients can invoke. Each tool is self-contained with:
- Input schema (Zod validation)
- Business logic execution
- Output formatting
- Error handling

**Tools**:
1. **fetch-documentation.ts**: Dynamic doc fetching from chart-img.com
2. **get-exchanges.ts**: Retrieve available exchanges
3. **get-symbols.ts**: Get tradable symbols per exchange
4. **construct-chart-config.ts**: AI-powered JSON config construction
5. **validate-config.ts**: Pre-flight validation of chart configurations
6. **generate-chart.ts**: Final image generation

### 3. Business Logic Layer (`src/mcp/utils/`)

Reusable utilities shared across tools:

**doc-parser.ts**:
- Fetches https://doc.chart-img.com
- Parses HTML using Cheerio
- Extracts: indicators, parameters, examples, constraints
- Caches documentation (24h TTL)
- Returns structured JSON

**chart-img-client.ts**:
- HTTP client wrapper for chart-img.com API
- Handles authentication (x-api-key header)
- Implements retry logic and rate limiting
- Manages API versioning (v2/v3)
- Error translation and logging

### 4. Configuration Layer (`src/lib/config.ts`)

Environment-based configuration:
- API keys management
- Rate limiting settings
- Cache TTL configuration
- Logging levels

### 5. Next.js API Routes (`src/app/api/`)

Future extensibility for non-MCP use cases:
- REST API endpoints
- Webhooks
- Admin dashboard
- Health checks

## Data Flow: Chart Generation Example

### User Request Flow

1. **User Prompt** (to AI client):
   > "Generate a Bitcoin chart with Bollinger Bands and RSI indicator showing last 7 days"

2. **AI Client Decision**:
   - Determines it needs chart generation
   - Calls MCP tools in sequence

3. **Tool Invocation Sequence**:

   **Step 1: fetch_chart_documentation**
   ```
   Input: { section: "indicators" }
   Output: {
     indicators: ["BollingerBands", "RSI", ...],
     parameters: { BollingerBands: {...}, RSI: {...} }
   }
   ```

   **Step 2: get_exchanges** (optional - if symbol ambiguous)
   ```
   Input: {}
   Output: { exchanges: ["BINANCE", "COINBASE", ...] }
   ```

   **Step 3: construct_chart_config**
   ```
   Input: {
     naturalLanguage: "Bitcoin with Bollinger Bands and RSI, last 7 days",
     preferences: { exchange: "BINANCE" }
   }
   Output: {
     symbol: "BINANCE:BTCUSDT",
     interval: "1h",
     range: "7D",
     studies: [
       { name: "BollingerBands@tv-basicstudies", inputs: {...} },
       { name: "RSI@tv-basicstudies", inputs: {...} }
     ],
     theme: "dark",
     width: 1200,
     height: 675
   }
   ```

   **Step 4: validate_chart_config**
   ```
   Input: { config: <from_step_3> }
   Output: { valid: true, warnings: [] }
   ```

   **Step 5: generate_chart**
   ```
   Input: { config: <from_step_3> }
   Output: {
     imageUrl: "https://api.chart-img.com/storage/...",
     success: true,
     metadata: { resolution: "1200x675", format: "PNG" }
   }
   ```

4. **AI Client Response**:
   - Embeds the image in chat
   - Provides context about the chart

## Key Design Decisions

### 1. Why Next.js + MCP?

**Next.js Benefits**:
- Future-proof for adding REST API endpoints
- Built-in TypeScript support
- Easy deployment (Vercel, self-hosted)
- Rich ecosystem

**MCP Benefits**:
- Standard protocol for AI-tool integration
- Works with multiple AI clients (Claude, ChatGPT)
- Type-safe tool definitions

### 2. Multi-Tool vs Single Tool

**Chosen**: Multiple specialized tools

**Rationale**:
- **Modularity**: Each tool has single responsibility
- **Testability**: Easier to test isolated tools
- **AI Flexibility**: AI client can choose optimal path
- **Debugging**: Clear separation of concerns
- **Caching**: Can cache doc fetching independently

**Alternative considered**: Single "generate_chart" tool
- Pro: Simpler for users
- Con: Less control, harder to debug, all-or-nothing failures

### 3. Dynamic Documentation Fetching

**Chosen**: Dynamic fetching with caching

**Rationale**:
- **Always up-to-date**: Reflects latest API changes
- **No maintenance**: No manual updates needed
- **Flexibility**: Can fetch specific sections on-demand

**Implementation**:
- 24h cache TTL (balances freshness vs performance)
- Fallback to cached version on fetch failure
- Structured parsing into JSON for AI consumption

### 4. Config Construction Strategy

The `construct_chart_config` tool uses a hybrid approach:

1. **Pattern Matching**: Recognizes common phrases
   - "last 7 days" → `range: "7D"`
   - "Bollinger Bands" → `studies: [{name: "BollingerBands@tv-basicstudies"}]`

2. **Defaults**: Sensible defaults for missing parameters
   - Default interval: `"1h"`
   - Default theme: `"dark"`
   - Default resolution: `1200x675`

3. **Validation**: Cross-check against documentation
   - Valid indicator names
   - Valid symbol formats
   - Rate limit compliance

## Security Considerations

### 1. API Key Management
- Never expose API keys in responses
- Store in environment variables
- Validate key presence at startup

### 2. Rate Limiting
- Respect chart-img.com rate limits
- Implement client-side throttling
- Queue requests if needed

### 3. Input Validation
- Zod schemas for all tool inputs
- Sanitize user inputs
- Validate against allowed values from documentation

### 4. Error Handling
- Don't leak sensitive info in errors
- Log errors server-side only
- Return user-friendly error messages

## Scalability Considerations

### Current Architecture
- Single-instance MCP server
- In-memory caching
- Synchronous tool execution

### Future Enhancements
1. **Redis caching**: Shared cache across instances
2. **Queue system**: For rate-limited API calls
3. **Webhook support**: Async chart generation
4. **Analytics**: Track usage patterns
5. **Multi-tenancy**: Support multiple API keys

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 14.2+ | Web framework |
| Runtime | Node.js | 18+ | JavaScript runtime |
| MCP SDK | @modelcontextprotocol/sdk | 1.0.4+ | MCP protocol |
| Validation | Zod | 3.23+ | Schema validation |
| HTTP Client | node-fetch | 3.3+ | API requests |
| HTML Parser | Cheerio | 1.0+ | Doc parsing |
| Language | TypeScript | 5+ | Type safety |

## Deployment Architecture

### Development
```
npm run dev           # Next.js dev server (port 3000)
npm run mcp          # MCP server (stdio mode)
```

### Production
```
npm run build        # Build Next.js
npm run start        # Production Next.js server
npm run mcp          # MCP server for AI clients
```

### Recommended Hosting
1. **Vercel**: For Next.js API routes
2. **Dedicated server**: For MCP server (stdio requires persistent process)
3. **Docker**: Containerized deployment

## Monitoring & Observability

### Metrics to Track
1. Tool invocation rates
2. chart-img.com API response times
3. Error rates per tool
4. Cache hit/miss ratios
5. Rate limit consumption

### Logging Strategy
- Structured JSON logs
- Log levels: DEBUG, INFO, WARN, ERROR
- Include: tool name, input hash, execution time, result status

## File Structure

```
mcp-chart-image/
├── .docs/
│   ├── architecture.md          # This file
│   ├── mcp-tools.md            # Tool specifications
│   ├── api-integration.md      # API integration guide
│   ├── examples.md             # Usage examples
│   └── deployment.md           # Deployment guide
├── src/
│   ├── mcp/
│   │   ├── server.ts           # MCP server entry
│   │   ├── tools/
│   │   │   ├── fetch-documentation.ts
│   │   │   ├── get-exchanges.ts
│   │   │   ├── get-symbols.ts
│   │   │   ├── construct-chart-config.ts
│   │   │   ├── validate-config.ts
│   │   │   └── generate-chart.ts
│   │   └── utils/
│   │       ├── chart-img-client.ts
│   │       └── doc-parser.ts
│   ├── app/
│   │   └── api/                # Future REST endpoints
│   └── lib/
│       └── config.ts           # Configuration
├── package.json
├── tsconfig.json
├── next.config.mjs
└── .env.example
```

## Next Steps

See [deployment.md](./deployment.md) for setup instructions.
See [mcp-tools.md](./mcp-tools.md) for detailed tool specifications.
See [examples.md](./examples.md) for usage examples.
