/**
 * Fetch Documentation Tool
 *
 * MCP tool for fetching and parsing chart-img.com documentation.
 */

import { z } from 'zod';
import { fetchDocumentation, getCachedDocumentation } from '../utils/doc-parser.js';

// Input schema
export const FetchDocumentationInputSchema = z.object({
  section: z
    .enum(['indicators', 'parameters', 'rateLimits', 'examples', 'all'])
    .optional()
    .describe('Section to fetch (default: all)'),
  forceRefresh: z
    .boolean()
    .optional()
    .default(false)
    .describe('Bypass cache and fetch fresh documentation'),
});

export type FetchDocumentationInput = z.infer<typeof FetchDocumentationInputSchema>;

// Output type
export interface FetchDocumentationOutput {
  success: boolean;
  data?: any;
  cachedAt?: string;
  error?: string;
  cacheHit?: boolean;
}

/**
 * Fetch documentation tool handler
 */
export async function fetchDocumentationTool(
  input: FetchDocumentationInput
): Promise<FetchDocumentationOutput> {
  try {
    // Check if we're using cached data
    const cached = getCachedDocumentation();
    const cacheHit = !input.forceRefresh && cached !== null;

    // Fetch documentation
    const result = await fetchDocumentation(input.section, input.forceRefresh);

    // Determine which data to return based on section
    let data: any;
    if (input.section === 'indicators' || !input.section) {
      data = result.indicators || result.all?.indicators;
    } else if (input.section === 'parameters') {
      data = result.parameters || result.all?.chartParameters;
    } else if (input.section === 'rateLimits') {
      data = result.rateLimits || result.all?.rateLimits;
    } else if (input.section === 'examples') {
      data = result.examples || result.all?.examples;
    } else if (input.section === 'all') {
      data = result.all;
    }

    return {
      success: true,
      data,
      cachedAt: result.all?.lastUpdated || new Date().toISOString(),
      cacheHit,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching documentation',
    };
  }
}

// Tool definition for MCP server
export const fetchDocumentationToolDefinition = {
  name: 'fetch_chart_documentation',
  description: `Fetches and parses the chart-img.com documentation from https://doc.chart-img.com.

Returns structured information about:
- **indicators**: Available technical indicators with their parameters (Bollinger Bands, RSI, MACD, etc.)
- **parameters**: Valid chart parameters (intervals, ranges, themes, styles)
- **rateLimits**: Rate limit constraints for different plan levels
- **examples**: Example chart configurations

Use this tool:
- Before constructing a chart config to understand available options
- When a user asks about available indicators or parameters
- To validate indicator names and parameters
- To check rate limits for a specific plan level

The documentation is cached for 24 hours to improve performance.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      section: {
        type: 'string' as const,
        enum: ['indicators', 'parameters', 'rateLimits', 'examples', 'all'] as const,
        description: 'Specific section to fetch, or "all" for complete documentation',
      },
      forceRefresh: {
        type: 'boolean' as const,
        description: 'Set to true to bypass cache and fetch fresh documentation',
        default: false,
      },
    },
  } as const,
};
