# MCP Chart-Image Server

A Model Context Protocol (MCP) server that enables AI clients (Claude, ChatGPT, etc.) to generate professional trading charts using the [chart-img.com](https://chart-img.com) API.

## Overview

This MCP server provides 6 specialized tools that allow AI assistants to:
- Fetch documentation about available indicators and parameters
- Discover exchanges and trading symbols
- Construct chart configurations from natural language
- Validate configurations before generation
- Generate high-quality chart images with technical indicators

**Example Usage**:
> User: "Show me a Bitcoin chart with Bollinger Bands and RSI for the last 7 days"
>
> AI Client: [Uses MCP tools to generate chart with requested indicators]

## 📘 Claude Desktop Integration

**New to Claude Desktop?** See **[CLAUDE.md](./CLAUDE.md)** for a complete guide on:
- Setting up Claude Desktop with this MCP server
- Example prompts and usage tips
- Troubleshooting common issues
- Advanced usage patterns

## Features

### Core Capabilities

- **Dynamic Documentation**: Fetches latest API capabilities from chart-img.com
- **Natural Language Processing**: Converts plain English to chart configurations
- **100+ Technical Indicators**: Bollinger Bands, RSI, MACD, Moving Averages, etc.
- **Multiple Asset Classes**: Crypto, stocks, forex, futures
- **Multiple Exchanges**: Binance, NASDAQ, NYSE, and more
- **Intelligent Defaults**: Auto-selects optimal intervals and settings
- **Pre-flight Validation**: Catches errors before API submission
- **Rate Limiting**: Respects plan limits automatically
- **Caching**: Optimizes performance for frequently accessed data

### Architecture Highlights

- **Next.js + TypeScript**: Modern, type-safe codebase
- **MCP SDK Integration**: Standard protocol for AI tool communication
- **Modular Design**: 6 specialized tools with single responsibilities
- **Error Handling**: Comprehensive error handling and retry logic
- **Extensible**: Easy to add new features or API routes

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- [chart-img.com](https://chart-img.com) API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-chart-image

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your CHART_IMG_API_KEY
```

### Configuration

Edit `.env`:
```env
CHART_IMG_API_KEY=your_api_key_here
CHART_IMG_PLAN=PRO
LOG_LEVEL=info
```

### Running the Server

```bash
# Start MCP server
npm run mcp
```

You should see:
```
[MCP Server] chart-img-mcp-server v0.1.0 started
[MCP Server] Registered 6 tools:
  1. fetch_chart_documentation
  2. get_exchanges
  3. get_symbols
  4. construct_chart_config
  5. validate_chart_config
  6. generate_chart_image
[MCP Server] Ready for requests via stdio
```

### Claude Desktop Setup

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chart-img": {
      "command": "node",
      "args": [
        "--loader",
        "ts-node/esm",
        "/absolute/path/to/mcp-chart-image/src/mcp/server.ts"
      ],
      "env": {
        "CHART_IMG_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop and you're ready!

## MCP Tools

### 1. `fetch_chart_documentation`
Fetches and parses chart-img.com documentation dynamically.

**Returns**: Indicators, parameters, rate limits, examples

**Use Case**: Before constructing configs, understanding available options

### 2. `get_exchanges`
Lists available trading exchanges across all asset classes.

**Returns**: Exchange IDs, names, types, descriptions

**Use Case**: Symbol discovery, exchange validation

### 3. `get_symbols`
Gets tradable symbols for a specific exchange.

**Input**: Exchange ID, optional search filter

**Returns**: Symbol list with descriptions

**Use Case**: Finding specific trading pairs

### 4. `construct_chart_config`
**Core intelligence tool** that builds API configurations from natural language.

**Input**: Natural language description (e.g., "Bitcoin with RSI for last week")

**Returns**: Complete chart configuration JSON

**Use Case**: Primary tool for converting user intent to API format

### 5. `validate_chart_config`
Validates configuration against API constraints and plan limits.

**Input**: Chart configuration object

**Returns**: Validation results, errors, suggestions

**Use Case**: Pre-flight checks before generation

### 6. `generate_chart_image`
Generates the actual chart image via chart-img.com API.

**Input**: Validated configuration

**Returns**: Image URL or base64 data

**Use Case**: Final step in chart generation workflow

## Documentation

Comprehensive documentation is available in the `.docs/` directory:

- **[architecture.md](.docs/architecture.md)**: System design and data flow
- **[mcp-tools.md](.docs/mcp-tools.md)**: Detailed tool specifications
- **[api-integration.md](.docs/api-integration.md)**: chart-img.com API integration guide
- **[examples.md](.docs/examples.md)**: Real-world usage examples
- **[deployment.md](.docs/deployment.md)**: Complete setup and deployment guide

## Example Workflows

### Simple Chart Generation
```
User → "Show me Bitcoin for last 24 hours"
  ↓
construct_chart_config (natural language → JSON)
  ↓
generate_chart_image (JSON → chart image)
  ↓
User sees chart
```

### Complex Multi-Indicator Chart
```
User → "I want Bitcoin with Bollinger Bands, RSI, and MACD for last month"
  ↓
fetch_chart_documentation (get indicator specs)
  ↓
construct_chart_config (parse requirements)
  ↓
validate_chart_config (check plan limits)
  ↓
generate_chart_image (generate chart)
  ↓
User sees chart with all 3 indicators
```

### Symbol Discovery
```
User → "What crypto exchanges are available? Show me top BTC pair from Binance"
  ↓
get_exchanges (list exchanges)
  ↓
get_symbols (search BTC on BINANCE)
  ↓
construct_chart_config (use BINANCE:BTCUSDT)
  ↓
generate_chart_image
```

## Project Structure

```
mcp-chart-image/
├── .docs/                      # Comprehensive documentation
│   ├── architecture.md
│   ├── mcp-tools.md
│   ├── api-integration.md
│   ├── examples.md
│   └── deployment.md
├── src/
│   ├── mcp/
│   │   ├── server.ts          # MCP server entry point
│   │   ├── tools/             # Individual tool implementations
│   │   │   ├── fetch-documentation.ts
│   │   │   ├── get-exchanges.ts
│   │   │   ├── get-symbols.ts
│   │   │   ├── construct-chart-config.ts
│   │   │   ├── validate-config.ts
│   │   │   └── generate-chart.ts
│   │   └── utils/
│   │       ├── chart-img-client.ts   # API wrapper
│   │       └── doc-parser.ts         # Documentation parser
│   ├── app/                   # Next.js app (future REST endpoints)
│   └── lib/
│       └── config.ts          # Configuration management
├── package.json
├── tsconfig.json
├── .env.example
└── README.md                  # This file
```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **MCP SDK**: @modelcontextprotocol/sdk
- **Validation**: Zod
- **HTTP Client**: node-fetch
- **HTML Parser**: Cheerio

## Rate Limits

chart-img.com plan limits:

| Plan | Requests/sec | Daily Max | Max Resolution | Studies |
|------|-------------|-----------|----------------|---------|
| BASIC | 1 | 50 | 800×600 | 3 |
| PRO | 10 | 500 | 1920×1080 | 5 |
| MEGA | 15 | 1,000 | 1920×1600 | 10 |
| ULTRA | 35 | 3,000 | 2048×1920 | 25 |
| ENTERPRISE | 35+ | 5,000+ | 2048×1920 | 50 |

The server automatically respects these limits with client-side rate limiting.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## Troubleshooting

### Common Issues

**"API key not found"**: Ensure `.env` file exists with `CHART_IMG_API_KEY`

**"Module not found"**: Run `npm install` to install dependencies

**"Rate limit exceeded"**: Wait for reset or upgrade chart-img.com plan

**Claude can't connect**: Use absolute paths in `claude_desktop_config.json`

See [deployment.md](.docs/deployment.md#troubleshooting) for detailed troubleshooting.

## Future Enhancements

Potential features for future versions:

- [ ] Webhook support for async chart generation
- [ ] Batch chart generation
- [ ] Custom indicator definitions
- [ ] Chart templates and presets
- [ ] Historical data export
- [ ] Redis caching for multi-instance deployments
- [ ] Analytics dashboard
- [ ] REST API endpoints alongside MCP

## License

[Your License Here]

## Acknowledgments

- [chart-img.com](https://chart-img.com) for the charting API
- [Anthropic](https://anthropic.com) for the Model Context Protocol
- [TradingView](https://tradingview.com) for technical indicator specifications

## Support

- **API Issues**: support@chart-img.com
- **MCP Protocol**: https://modelcontextprotocol.io
- **Project Issues**: Open an issue in this repository

---

**Ready to generate amazing charts with AI?** Follow the [Quick Start](#quick-start) guide above!
