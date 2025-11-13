/**
 * Get Symbols Tool
 *
 * MCP tool for retrieving available trading symbols for a specific exchange.
 */

import { z } from 'zod';
import { container, CHART_IMG_CLIENT } from '../../core/di';
import type { ChartImgClient } from '../utils/chart-img-client';

// Input schema
export const GetSymbolsInputSchema = z.object({
  exchange: z
    .string()
    .min(1)
    .describe('Exchange ID (e.g., "BINANCE", "NASDAQ", "FX")'),
  search: z
    .string()
    .optional()
    .describe('Optional: filter symbols by search term (e.g., "BTC", "AAPL")'),
  limit: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum number of results to return (default: 50, max: 200)'),
  forceRefresh: z
    .boolean()
    .optional()
    .default(false)
    .describe('Bypass cache and fetch fresh symbol list'),
});

export type GetSymbolsInput = z.infer<typeof GetSymbolsInputSchema>;

// Output matches the SymbolResponse from client
export interface GetSymbolsOutput {
  success: boolean;
  exchange: string;
  symbols: Array<{
    symbol: string;
    fullSymbol: string;
    description: string;
    type: string;
  }>;
  count: number;
  error?: string;
}

/**
 * Get symbols tool handler
 */
export async function getSymbolsTool(
  input: GetSymbolsInput
): Promise<GetSymbolsOutput> {
  try {
    // Resolve client from DI container
    const client = container.resolve<ChartImgClient>(CHART_IMG_CLIENT);

    const result = await client.getSymbols(
      input.exchange,
      input.search,
      input.limit,
      input.forceRefresh
    );

    return result;
  } catch (error) {
    return {
      success: false,
      exchange: input.exchange,
      symbols: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error fetching symbols',
    };
  }
}

// Tool definition for MCP server
export const getSymbolsToolDefinition = {
  name: 'get_symbols',
  description: `Retrieves available trading symbols for a specific exchange.

Returns symbol information including:
- \`symbol\`: Short symbol name (e.g., "BTCUSDT", "AAPL")
- \`fullSymbol\`: Complete symbol format for API (e.g., "BINANCE:BTCUSDT", "NASDAQ:AAPL")
- \`description\`: Human-readable description (e.g., "Bitcoin / TetherUS", "Apple Inc.")
- \`type\`: Asset type (crypto, stock, forex, futures)

Parameters:
- **exchange** (required): Exchange ID from get_exchanges tool (e.g., "BINANCE", "NASDAQ")
- **search** (optional): Filter symbols by keyword (e.g., "BTC" returns Bitcoin pairs)
- **limit** (optional): Maximum results to return (default: 50, max: 200)

Use this tool:
- When user specifies an exchange but not a specific symbol
- For symbol discovery (e.g., "What Bitcoin pairs are on Binance?")
- To validate symbol names before chart generation
- In multi-step workflows: get_exchanges → get_symbols → construct_chart_config

Example usage:
- Search Bitcoin pairs on Binance: \`{ "exchange": "BINANCE", "search": "BTC", "limit": 10 }\`
- List tech stocks on NASDAQ: \`{ "exchange": "NASDAQ", "search": "tech", "limit": 20 }\`

Results are cached per exchange for 1 hour.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      exchange: {
        type: 'string' as const,
        description: 'Exchange ID (e.g., "BINANCE", "NASDAQ", "FX")',
      },
      search: {
        type: 'string' as const,
        description: 'Optional search filter (e.g., "BTC" for Bitcoin pairs)',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of results (default: 50, max: 200)',
        default: 50,
      },
      forceRefresh: {
        type: 'boolean' as const,
        description: 'Bypass cache and fetch fresh data',
        default: false,
      },
    },
    required: ['exchange'] as const,
  } as const,
};
