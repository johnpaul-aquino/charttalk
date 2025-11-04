/**
 * Get Exchanges Tool
 *
 * MCP tool for retrieving available exchanges from chart-img.com API.
 */

import { z } from 'zod';
import { createChartImgClient } from '../utils/chart-img-client.js';

// Input schema (empty - no parameters needed)
export const GetExchangesInputSchema = z.object({
  forceRefresh: z
    .boolean()
    .optional()
    .default(false)
    .describe('Bypass cache and fetch fresh exchange list'),
});

export type GetExchangesInput = z.infer<typeof GetExchangesInputSchema>;

// Output matches the ExchangeResponse from client
export interface GetExchangesOutput {
  success: boolean;
  exchanges: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
  }>;
  count: number;
  error?: string;
}

/**
 * Get exchanges tool handler
 */
export async function getExchangesTool(
  input: GetExchangesInput
): Promise<GetExchangesOutput> {
  try {
    const client = createChartImgClient();
    const result = await client.getExchanges(input.forceRefresh);

    return result;
  } catch (error) {
    return {
      success: false,
      exchanges: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error fetching exchanges',
    };
  }
}

// Tool definition for MCP server
export const getExchangesToolDefinition = {
  name: 'get_exchanges',
  description: `Retrieves the list of available exchanges from chart-img.com API.

Returns information about trading venues across multiple asset classes:
- **Cryptocurrency**: Binance, Coinbase, Kraken, OKX, Bybit, etc.
- **Stocks**: NASDAQ, NYSE, TSX, LSE, and other global stock exchanges
- **Forex**: OANDA, FX.com, Saxo, Interactive Brokers
- **Futures**: CME, CBOT, NYMEX, Eurex, SGX

Each exchange includes:
- \`id\`: Exchange identifier (used in symbol format: "EXCHANGE:SYMBOL")
- \`name\`: Full exchange name
- \`type\`: Asset class (crypto, stock, forex, futures)
- \`description\`: Brief description

Use this tool:
- When user asks "What exchanges are available?"
- Before constructing a symbol string
- To validate exchange names
- For symbol discovery workflows

Results are cached for 1 hour to improve performance.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      forceRefresh: {
        type: 'boolean' as const,
        description: 'Set to true to bypass cache and fetch fresh data',
        default: false,
      },
    },
  } as const,
};
