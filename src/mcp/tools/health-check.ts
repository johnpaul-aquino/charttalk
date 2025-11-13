/**
 * Health Check Tool
 *
 * MCP tool for testing server connection and getting status information.
 */

import { z } from 'zod';
import { getConfig } from '../../shared/config/environment.config';
import { container, CHART_IMG_CLIENT } from '../../core/di';
import type { ChartImgClient } from '../utils/chart-img-client';
import { getCachedDocumentation } from '../utils/doc-parser.js';

// Input schema (no parameters needed)
export const HealthCheckInputSchema = z.object({});

export type HealthCheckInput = z.infer<typeof HealthCheckInputSchema>;

// Output
export interface HealthCheckOutput {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  server: {
    name: string;
    version: string;
    uptime: number;
  };
  tools: {
    registered: number;
    available: string[];
  };
  apiConnection: {
    configured: boolean;
    keyPresent: boolean;
    plan: string;
    testConnection?: boolean;
  };
  cache: {
    documentationCached: boolean;
    cacheAge?: string;
  };
  timestamp: string;
  error?: string;
}

/**
 * Health check tool handler
 */
export async function healthCheckTool(
  input: HealthCheckInput
): Promise<HealthCheckOutput> {
  try {
    const config = getConfig();
    const startTime = Date.now();

    // Check API connection
    let apiConnectionTest = false;
    try {
      // Resolve client from DI container
      const client = container.resolve<ChartImgClient>(CHART_IMG_CLIENT);
      const testResult = await client.getExchanges();
      apiConnectionTest = testResult.success;
    } catch (error) {
      // Connection test failed, but we'll still report other info
    }

    // Check cache
    const cachedDocs = getCachedDocumentation();
    const cacheAge = cachedDocs
      ? `${Math.floor((Date.now() - new Date(cachedDocs.lastUpdated).getTime()) / 1000 / 60)} minutes ago`
      : undefined;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!config.chartImg.apiKey || !apiConnectionTest) {
      status = 'degraded';
    }

    return {
      success: true,
      status,
      server: {
        name: config.mcp.serverName,
        version: config.mcp.serverVersion,
        uptime: Date.now() - startTime,
      },
      tools: {
        registered: 7, // Now including health_check
        available: [
          'health_check',
          'fetch_chart_documentation',
          'get_exchanges',
          'get_symbols',
          'construct_chart_config',
          'validate_chart_config',
          'generate_chart_image',
        ],
      },
      apiConnection: {
        configured: true,
        keyPresent: !!config.chartImg.apiKey,
        plan: process.env.CHART_IMG_PLAN || 'PRO',
        testConnection: apiConnectionTest,
      },
      cache: {
        documentationCached: !!cachedDocs,
        cacheAge,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      status: 'unhealthy',
      server: {
        name: 'chart-img-mcp-server',
        version: '0.1.0',
        uptime: 0,
      },
      tools: {
        registered: 0,
        available: [],
      },
      apiConnection: {
        configured: false,
        keyPresent: false,
        plan: 'UNKNOWN',
      },
      cache: {
        documentationCached: false,
      },
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Tool definition for MCP server
export const healthCheckToolDefinition = {
  name: 'health_check',
  description: `Performs a health check on the MCP Chart-Image server.

Returns comprehensive status information:
- **Server Status**: Name, version, uptime
- **Tool Availability**: Number of registered tools and their names
- **API Connection**: Whether chart-img.com API is configured and accessible
- **Cache Status**: Documentation cache status and age
- **Overall Health**: healthy, degraded, or unhealthy

Use this tool:
- To verify the MCP server is working correctly
- When debugging connection issues
- To check if API key is configured
- To see which tools are available
- For monitoring and diagnostics

No input parameters required - just call the tool to get status.

Example response:
\`\`\`json
{
  "success": true,
  "status": "healthy",
  "server": {
    "name": "chart-img-mcp-server",
    "version": "0.1.0",
    "uptime": 125
  },
  "tools": {
    "registered": 7,
    "available": ["health_check", "fetch_chart_documentation", ...]
  },
  "apiConnection": {
    "configured": true,
    "keyPresent": true,
    "plan": "PRO",
    "testConnection": true
  }
}
\`\`\``,
  inputSchema: {
    type: 'object' as const,
    properties: {},
  } as const,
};
