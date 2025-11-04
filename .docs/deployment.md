# Deployment Guide

Complete setup and deployment instructions for the MCP Chart-Image Server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Server](#running-the-server)
5. [AI Client Setup](#ai-client-setup)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Prerequisites

### Required

- **Node.js**: Version 18.0.0 or higher
- **npm** or **yarn**: Package manager
- **chart-img.com API Key**: Obtain from [chart-img.com](https://chart-img.com)

### Optional

- **Claude Desktop**: For testing with Claude
- **Git**: For version control

---

## Installation

### 1. Clone or Download the Project

```bash
# If using Git
git clone <repository-url>
cd mcp-chart-image

# Or extract from zip/tarball
cd mcp-chart-image
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- Next.js framework
- MCP SDK
- TypeScript
- Zod (validation)
- Cheerio (HTML parsing)
- node-fetch

### 3. Verify Installation

```bash
npm list --depth=0
```

You should see all dependencies listed without errors.

---

## Configuration

### 1. Get chart-img.com API Key

1. Visit [chart-img.com](https://chart-img.com)
2. Sign up for an account
3. Choose a plan (BASIC, PRO, MEGA, ULTRA, ENTERPRISE)
4. Generate an API key from your dashboard
5. Copy the API key

### 2. Create Environment File

```bash
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `.env` file:

```env
# Required
CHART_IMG_API_KEY=your_actual_api_key_here

# Optional (auto-detected from plan if not set)
CHART_IMG_PLAN=PRO

# Optional overrides
# CHART_IMG_RPS=10
# CHART_IMG_DAILY_LIMIT=500

# Optional logging
LOG_LEVEL=info
```

**Important**: Never commit the `.env` file to version control!

### 4. Verify Configuration

```bash
# Test that config loads correctly
node -e "import('./src/lib/config.js').then(c => console.log('Config OK'))"
```

---

## Running the Server

### Development Mode

**Option 1: Direct Node Execution**
```bash
node --loader ts-node/esm src/mcp/server.ts
```

**Option 2: Using npm script**
```bash
npm run mcp
```

You should see:
```
[MCP Server] chart-img-mcp-server v0.1.0 started
[MCP Server] Registered 6 tools:
  1. fetch_chart_documentation - Dynamic doc fetching
  2. get_exchanges - List available exchanges
  3. get_symbols - Get symbols for exchange
  4. construct_chart_config - Build config from NL
  5. validate_chart_config - Validate configuration
  6. generate_chart_image - Generate chart image
[MCP Server] Ready for requests via stdio
```

The server runs in stdio mode and awaits MCP client connections.

---

## AI Client Setup

### Claude Desktop Configuration

1. **Locate Claude Config File**:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Edit Configuration**:

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

**Important**:
- Replace `/absolute/path/to/` with your actual project path
- Replace `your_api_key_here` with your actual API key
- Use absolute paths, not relative paths

3. **Restart Claude Desktop**

4. **Verify Connection**:
   - Open Claude Desktop
   - Look for MCP indicator in the interface
   - You should see "chart-img" server listed

### Alternative: Environment File Approach

Instead of hardcoding the API key in Claude config:

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
        "NODE_ENV": "production"
      }
    }
  }
}
```

Then ensure `.env` file exists in the project root with `CHART_IMG_API_KEY`.

---

## Testing

### Manual Testing

1. **Test Configuration**:
```bash
node -e "import('./src/lib/config.js').then(c => {
  const cfg = c.getConfig();
  console.log('API Key set:', !!cfg.chartImg.apiKey);
  console.log('Plan:', process.env.CHART_IMG_PLAN || 'PRO');
})"
```

2. **Test API Connection**:
```bash
node -e "import('./src/mcp/utils/chart-img-client.js').then(m => {
  const client = m.createChartImgClient();
  client.getExchanges().then(r => {
    console.log('API Connection:', r.success ? 'OK' : 'FAILED');
    console.log('Exchanges:', r.count);
  });
})"
```

3. **Test Documentation Parser**:
```bash
node -e "import('./src/mcp/utils/doc-parser.js').then(m => {
  m.fetchDocumentation('indicators').then(d => {
    console.log('Indicators loaded:', d.indicators?.length || 0);
  });
})"
```

### Testing with Claude Desktop

Once Claude is configured, try these prompts:

**Test 1: Simple Chart**
> "Generate a Bitcoin chart for the last 24 hours"

**Test 2: With Indicators**
> "Show me Ethereum with Bollinger Bands and RSI for the past week"

**Test 3: Exploration**
> "What exchanges are available? Then show me Apple stock with moving averages"

**Expected Flow**:
1. Claude will call `construct_chart_config`
2. Optionally call `validate_chart_config`
3. Call `generate_chart_image`
4. Display the chart URL or image

---

## Troubleshooting

### Common Issues

#### 1. "CHART_IMG_API_KEY environment variable is required"

**Cause**: API key not set

**Solutions**:
- Verify `.env` file exists
- Check API key is correct in `.env`
- For Claude: Ensure API key is in `claude_desktop_config.json`

#### 2. "Module not found" errors

**Cause**: Dependencies not installed or TypeScript issues

**Solutions**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify TypeScript config
npx tsc --noEmit
```

#### 3. "Rate limit exceeded"

**Cause**: Too many requests

**Solutions**:
- Wait for rate limit to reset (check error message for time)
- Reduce request frequency
- Upgrade chart-img.com plan

#### 4. Claude can't connect to MCP server

**Cause**: Configuration error or path issues

**Solutions**:
- Use **absolute paths** in config, not relative
- Verify server starts manually: `npm run mcp`
- Check Claude config JSON is valid (use JSON validator)
- Restart Claude Desktop
- Check Claude logs (Help → View Logs)

#### 5. "Invalid symbol format"

**Cause**: Symbol not in EXCHANGE:SYMBOL format

**Solution**:
- Use `get_exchanges` and `get_symbols` to find valid symbols
- Ensure format is correct: `"BINANCE:BTCUSDT"`

#### 6. Chart generation fails with 400 error

**Cause**: Invalid configuration

**Solutions**:
- Use `validate_chart_config` before `generate_chart_image`
- Check indicator names match documentation
- Verify resolution is within plan limits

### Debug Mode

Enable debug logging:

```bash
# In .env
LOG_LEVEL=debug

# Or temporarily
LOG_LEVEL=debug npm run mcp
```

---

## Production Deployment

### Option 1: Standalone Server (Recommended for MCP)

Since MCP servers use stdio, they're typically run by the AI client. For production:

1. **Deploy code to server**:
```bash
git clone <repo> /opt/mcp-chart-image
cd /opt/mcp-chart-image
npm install --production
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with production API key
```

3. **Test**:
```bash
npm run mcp
```

4. **Configure AI client** to point to this server

### Option 2: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Compile TypeScript if needed
RUN npx tsc || true

CMD ["node", "--loader", "ts-node/esm", "src/mcp/server.ts"]
```

Build and run:
```bash
docker build -t mcp-chart-image .
docker run -e CHART_IMG_API_KEY=your_key mcp-chart-image
```

### Option 3: Process Manager (PM2)

```bash
npm install -g pm2

pm2 start src/mcp/server.ts --name chart-img-mcp --interpreter node --interpreter-args="--loader ts-node/esm"
pm2 save
pm2 startup
```

### Security Best Practices

1. **API Key Security**:
   - Never commit `.env` to git
   - Use environment variables in production
   - Rotate keys regularly

2. **Rate Limiting**:
   - Monitor API usage
   - Implement client-side queuing if needed
   - Set up alerts for rate limit warnings

3. **Error Handling**:
   - Log errors but don't expose sensitive info
   - Monitor error rates
   - Set up error alerting

4. **Updates**:
   - Keep dependencies updated
   - Monitor for security advisories
   - Test updates in staging first

### Monitoring

**Metrics to track**:
- Tool invocation rates
- API response times
- Error rates
- Rate limit consumption
- Cache hit/miss ratios

**Recommended Tools**:
- Application logs: Winston, Pino
- Monitoring: Datadog, New Relic
- Alerts: PagerDuty, Opsgenie

---

## Next Steps

- Read [examples.md](./examples.md) for usage patterns
- See [mcp-tools.md](./mcp-tools.md) for tool details
- Review [architecture.md](./architecture.md) for system design
- Check [api-integration.md](./api-integration.md) for API details

---

## Support

- **chart-img.com API**: support@chart-img.com
- **MCP Protocol**: https://modelcontextprotocol.io
- **Issues**: Open an issue in the project repository

---

## License

[Your License Here]

---

## Changelog

### v0.1.0 (Initial Release)
- 6 MCP tools implemented
- Dynamic documentation fetching
- Complete chart configuration pipeline
- Rate limiting and caching
- Comprehensive error handling
