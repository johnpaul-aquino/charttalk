#!/usr/bin/env node

/**
 * MCP Chart-Image Server
 *
 * Model Context Protocol server for chart-img.com integration.
 * Provides 6 tools for AI clients to generate trading charts.
 */

// Initialize Sentry first (production only)
import {
  initSentryForMCP,
  captureMCPError,
  flushSentry,
  Sentry,
} from '../core/monitoring/sentry.js';
initSentryForMCP();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from '../lib/config.js';

// Import tool definitions and handlers
import {
  fetchDocumentationTool,
  fetchDocumentationToolDefinition,
  FetchDocumentationInputSchema,
} from './tools/fetch-documentation.js';
import {
  getExchangesTool,
  getExchangesToolDefinition,
  GetExchangesInputSchema,
} from './tools/get-exchanges.js';
import {
  getSymbolsTool,
  getSymbolsToolDefinition,
  GetSymbolsInputSchema,
} from './tools/get-symbols.js';
import {
  constructChartConfigTool,
  constructChartConfigToolDefinition,
  ConstructChartConfigInputSchema,
} from './tools/construct-chart-config.js';
import {
  validateConfigTool,
  validateConfigToolDefinition,
  ValidateConfigInputSchema,
} from './tools/validate-config.js';
import {
  generateChartTool,
  generateChartToolDefinition,
  GenerateChartInputSchema,
} from './tools/generate-chart.js';
import {
  healthCheckTool,
  healthCheckToolDefinition,
  HealthCheckInputSchema,
} from './tools/health-check.js';
import {
  saveChartImageTool,
  saveChartImageToolDefinition,
  SaveChartImageInputSchema,
} from './tools/save-chart-image.js';
import {
  uploadToS3Tool,
  uploadToS3ToolDefinition,
  UploadToS3InputSchema,
} from './tools/upload-to-s3.js';
import {
  generateMultiTimeframeChartsTool,
  generateMultiTimeframeChartsToolDefinition,
  GenerateMultiTimeframeChartsInputSchema,
} from './tools/generate-multi-timeframe-charts.js';
import {
  analyzeMultiTimeframeTool,
  analyzeMultiTimeframeToolDefinition,
  AnalyzeMultiTimeframeInputSchema,
} from './tools/analyze-multi-timeframe.js';

/**
 * Main server class
 */
class ChartImgMCPServer {
  private server: Server;
  private config: ReturnType<typeof getConfig>;

  constructor() {
    // Load configuration
    try {
      this.config = getConfig();
    } catch (error) {
      console.error('Configuration error:', error);
      process.exit(1);
    }

    // Initialize MCP server
    this.server = new Server(
      {
        name: this.config.mcp.serverName,
        version: this.config.mcp.serverVersion,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getToolDefinitions(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'fetch_chart_documentation': {
            const validated = FetchDocumentationInputSchema.parse(args);
            const result = await fetchDocumentationTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'get_exchanges': {
            const validated = GetExchangesInputSchema.parse(args);
            const result = await getExchangesTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'get_symbols': {
            const validated = GetSymbolsInputSchema.parse(args);
            const result = await getSymbolsTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'construct_chart_config': {
            const validated = ConstructChartConfigInputSchema.parse(args);
            const result = await constructChartConfigTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'validate_chart_config': {
            const validated = ValidateConfigInputSchema.parse(args);
            const result = await validateConfigTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'generate_chart_image': {
            const validated = GenerateChartInputSchema.parse(args);
            const result = await generateChartTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'health_check': {
            const validated = HealthCheckInputSchema.parse(args);
            const result = await healthCheckTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'save_chart_image': {
            const validated = SaveChartImageInputSchema.parse(args);
            const result = await saveChartImageTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'upload_chart_to_s3': {
            const validated = UploadToS3InputSchema.parse(args);
            const result = await uploadToS3Tool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'generate_multi_timeframe_charts': {
            const validated = GenerateMultiTimeframeChartsInputSchema.parse(args);
            const result = await generateMultiTimeframeChartsTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'analyze_multi_timeframe': {
            const validated = AnalyzeMultiTimeframeInputSchema.parse(args);
            const result = await analyzeMultiTimeframeTool(validated);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        // Capture error to Sentry with tool context
        if (error instanceof Error) {
          captureMCPError(error, name, args as Record<string, unknown>);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: error.message,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  /**
   * Get tool definitions for ListTools
   */
  private getToolDefinitions(): Tool[] {
    return [
      {
        name: healthCheckToolDefinition.name,
        description: healthCheckToolDefinition.description,
        inputSchema: healthCheckToolDefinition.inputSchema,
        annotations: healthCheckToolDefinition.annotations,
      },
      {
        name: fetchDocumentationToolDefinition.name,
        description: fetchDocumentationToolDefinition.description,
        inputSchema: fetchDocumentationToolDefinition.inputSchema,
        annotations: fetchDocumentationToolDefinition.annotations,
      },
      {
        name: getExchangesToolDefinition.name,
        description: getExchangesToolDefinition.description,
        inputSchema: getExchangesToolDefinition.inputSchema,
        annotations: getExchangesToolDefinition.annotations,
      },
      {
        name: getSymbolsToolDefinition.name,
        description: getSymbolsToolDefinition.description,
        inputSchema: getSymbolsToolDefinition.inputSchema,
        annotations: getSymbolsToolDefinition.annotations,
      },
      {
        name: constructChartConfigToolDefinition.name,
        description: constructChartConfigToolDefinition.description,
        inputSchema: constructChartConfigToolDefinition.inputSchema,
        annotations: constructChartConfigToolDefinition.annotations,
      },
      {
        name: validateConfigToolDefinition.name,
        description: validateConfigToolDefinition.description,
        inputSchema: validateConfigToolDefinition.inputSchema,
        annotations: validateConfigToolDefinition.annotations,
      },
      {
        name: generateChartToolDefinition.name,
        description: generateChartToolDefinition.description,
        inputSchema: generateChartToolDefinition.inputSchema,
        annotations: generateChartToolDefinition.annotations,
      },
      {
        name: saveChartImageToolDefinition.name,
        description: saveChartImageToolDefinition.description,
        inputSchema: saveChartImageToolDefinition.inputSchema,
        annotations: saveChartImageToolDefinition.annotations,
      },
      {
        name: uploadToS3ToolDefinition.name,
        description: uploadToS3ToolDefinition.description,
        inputSchema: uploadToS3ToolDefinition.inputSchema,
        annotations: uploadToS3ToolDefinition.annotations,
      },
      {
        name: generateMultiTimeframeChartsToolDefinition.name,
        description: generateMultiTimeframeChartsToolDefinition.description,
        inputSchema: generateMultiTimeframeChartsToolDefinition.inputSchema,
        annotations: generateMultiTimeframeChartsToolDefinition.annotations,
      },
      {
        name: analyzeMultiTimeframeToolDefinition.name,
        description: analyzeMultiTimeframeToolDefinition.description,
        inputSchema: analyzeMultiTimeframeToolDefinition.inputSchema,
        annotations: analyzeMultiTimeframeToolDefinition.annotations,
      },
    ];
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers() {
    // MCP server error handler
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
      if (process.env.NODE_ENV === 'production' && error instanceof Error) {
        Sentry.captureException(error);
      }
    };

    // Global uncaught exception handler
    process.on('uncaughtException', (error) => {
      console.error('[MCP Server] Uncaught exception:', error);
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error);
        flushSentry().then(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

    // Global unhandled rejection handler
    process.on('unhandledRejection', (reason) => {
      console.error('[MCP Server] Unhandled rejection:', reason);
      if (process.env.NODE_ENV === 'production' && reason instanceof Error) {
        Sentry.captureException(reason);
      }
    });

    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
      console.error('\n[MCP Server] Shutting down...');
      await flushSentry();
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('\n[MCP Server] Shutting down...');
      await flushSentry();
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Start the server
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error(`[MCP Server] ${this.config.mcp.serverName} v${this.config.mcp.serverVersion} started`);
    console.error('[MCP Server] Registered 11 tools:');
    console.error('  1. health_check - Server health and status');
    console.error('  2. fetch_chart_documentation - Dynamic doc fetching');
    console.error('  3. get_exchanges - List available exchanges');
    console.error('  4. get_symbols - Get symbols for exchange');
    console.error('  5. construct_chart_config - Build config from NL');
    console.error('  6. validate_chart_config - Validate configuration');
    console.error('  7. generate_chart_image - Generate chart image');
    console.error('  8. save_chart_image - Save base64 image to disk');
    console.error('  9. upload_chart_to_s3 - Upload to S3 storage');
    console.error('  10. generate_multi_timeframe_charts - Parallel chart gen');
    console.error('  11. analyze_multi_timeframe - Cascade MTF analysis');
    console.error('[MCP Server] Ready for requests via stdio');
  }
}

// Start the server
const server = new ChartImgMCPServer();
server.start().catch((error) => {
  console.error('[MCP Server] Fatal error:', error);
  process.exit(1);
});
