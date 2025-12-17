# Claude Desktop Setup

This guide explains how to configure the Chart Service MCP server for Claude Desktop.

## 1. Get Your API Key

1. Visit [chart-img.com](https://chart-img.com)
2. Sign up and choose a plan (BASIC, PRO, MEGA, ULTRA, ENTERPRISE)
3. Generate an API key from your dashboard
4. Copy the API key

## 2. Locate Claude Config File

**macOS**:
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux**:
```bash
~/.config/Claude/claude_desktop_config.json
```

## 3. Edit Configuration

Open the file and add this configuration (replace `YOUR_API_KEY_HERE` with your actual API key):

```json
{
  "mcpServers": {
    "chart-img": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/mcp-chart-image/src/mcp/server.ts"
      ],
      "env": {
        "CHART_IMG_API_KEY": "YOUR_API_KEY_HERE",
        "CHART_IMG_PLAN": "PRO",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**If you already have other MCP servers**, merge it like this:

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": ["..."]
    },
    "chart-img": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/mcp-chart-image/src/mcp/server.ts"
      ],
      "env": {
        "CHART_IMG_API_KEY": "YOUR_API_KEY_HERE",
        "CHART_IMG_PLAN": "PRO",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 4. Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q on Mac)
2. Reopen Claude Desktop
3. Look for the MCP connection indicator

**Note**: The `.env` file in the project is optional for Claude Desktop users (environment variables are passed from the config). It's still useful for running the REST API server (`npm run dev`).

## Desktop Extensions (Alternative)

Claude Desktop supports **Extensions** (`.mcpb` format) for easier installation:

1. Open Claude Desktop > **Settings** > **Extensions**
2. Browse Anthropic-reviewed extensions
3. Sensitive fields (API keys) are automatically encrypted in Keychain/Credential Manager
4. No manual JSON editing required

**Manual JSON configuration** gives you more control and is recommended for development.

## Transport Types

- **stdio** (recommended for local servers): Runs the server as a subprocess
- **http** (for remote servers): Connects to a running HTTP server
- **sse** (deprecated): Use HTTP servers instead

## Security Notes

- Use third-party MCP servers at your own risk
- Be cautious with servers that fetch untrusted content (prompt injection risk)
- Review server code before adding to production environments
- API keys in environment variables are more secure than hardcoding

## Best Practice Workflow

For Claude Desktop, use the local file workflow:

```javascript
// Generate chart and save to /tmp (Claude Desktop can read this)
const chart = await generate_chart_image({
  config: config.config,
  storage: false,        // No cloud storage
  saveToFile: true,      // Save to /tmp automatically
  filename: "btc-analysis.png"
});
// Returns: { localPath: "/tmp/btc-analysis.png", metadata: {...} }
```

Claude Desktop can then read the local file for visual analysis.

## Environment Variables

Override in Claude config if needed:

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | debug, info, warn, error | info |
| `CHART_IMG_PLAN` | BASIC, PRO, MEGA, ULTRA, ENTERPRISE | PRO |
| `CHART_IMG_RPS` | Custom requests per second | (plan default) |
| `CHART_IMG_DAILY_LIMIT` | Custom daily limit | (plan default) |
