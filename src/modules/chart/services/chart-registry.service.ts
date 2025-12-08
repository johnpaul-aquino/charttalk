/**
 * Chart Registry Service
 *
 * Manages in-memory chart storage for multi-timeframe analysis.
 * Each registry is scoped to a single request and can hold multiple charts.
 * Registries can be persisted to the database after analysis completion.
 */

import { randomUUID } from 'crypto';
import {
  ChartRegistry,
  ChartInfo,
  TimeframeRole,
  IChartRepository,
  CreateChartInput,
} from '../../analysis/interfaces/multi-timeframe.interface';

/**
 * Implementation of ChartRegistry for in-memory chart storage
 */
class ChartRegistryImpl implements ChartRegistry {
  private charts: Map<string, ChartInfo> = new Map();

  constructor(
    public readonly requestId: string,
    public readonly symbol: string
  ) {}

  /**
   * Add a chart to the registry
   * Key format: "symbol:interval"
   */
  addChart(chart: ChartInfo): void {
    const key = `${chart.symbol}:${chart.interval}`;
    this.charts.set(key, chart);
  }

  /**
   * Get chart by timeframe interval
   */
  getByTimeframe(interval: string): ChartInfo | undefined {
    return this.charts.get(`${this.symbol}:${interval}`);
  }

  /**
   * Get chart by role (htf, etf, ltf)
   */
  getByRole(role: TimeframeRole): ChartInfo | undefined {
    return Array.from(this.charts.values()).find((c) => c.role === role);
  }

  /**
   * Get all charts in the registry
   */
  getAllCharts(): ChartInfo[] {
    return Array.from(this.charts.values());
  }

  /**
   * Get chart count
   */
  size(): number {
    return this.charts.size;
  }

  /**
   * Check if registry has a chart for given role
   */
  hasRole(role: TimeframeRole): boolean {
    return this.getByRole(role) !== undefined;
  }

  /**
   * Clear all charts from registry
   */
  clear(): void {
    this.charts.clear();
  }
}

/**
 * Chart Registry Service
 *
 * Manages multiple chart registries across requests.
 * Each request gets its own registry for multi-timeframe charts.
 */
export class ChartRegistryService {
  private registries: Map<string, ChartRegistry> = new Map();

  constructor(private chartRepository?: IChartRepository) {}

  /**
   * Create a new chart registry for a request
   */
  createRegistry(symbol: string, requestId?: string): ChartRegistry {
    const id = requestId || randomUUID();
    const registry = new ChartRegistryImpl(id, symbol);
    this.registries.set(id, registry);

    console.log(
      `[ChartRegistryService] Created registry ${id} for symbol ${symbol}`
    );

    return registry;
  }

  /**
   * Get an existing registry by request ID
   */
  getRegistry(requestId: string): ChartRegistry | undefined {
    return this.registries.get(requestId);
  }

  /**
   * Check if a registry exists
   */
  hasRegistry(requestId: string): boolean {
    return this.registries.has(requestId);
  }

  /**
   * Delete a registry (cleanup after use)
   */
  deleteRegistry(requestId: string): boolean {
    const deleted = this.registries.delete(requestId);
    if (deleted) {
      console.log(`[ChartRegistryService] Deleted registry ${requestId}`);
    }
    return deleted;
  }

  /**
   * Get all active registry IDs
   */
  getActiveRegistryIds(): string[] {
    return Array.from(this.registries.keys());
  }

  /**
   * Get the most recent registry (useful for single-chart compatibility)
   */
  getMostRecentRegistry(): ChartRegistry | undefined {
    const ids = this.getActiveRegistryIds();
    if (ids.length === 0) return undefined;
    return this.registries.get(ids[ids.length - 1]);
  }

  /**
   * Find registry by symbol
   */
  findRegistryBySymbol(symbol: string): ChartRegistry | undefined {
    for (const registry of this.registries.values()) {
      if (registry.symbol === symbol) {
        return registry;
      }
    }
    return undefined;
  }

  /**
   * Persist registry charts to database
   *
   * @param registry - The registry to persist
   * @param messageId - The message ID to associate charts with
   * @returns Number of charts persisted
   */
  async persistRegistry(
    registry: ChartRegistry,
    messageId: string
  ): Promise<number> {
    if (!this.chartRepository) {
      console.warn(
        '[ChartRegistryService] No chart repository configured, skipping persistence'
      );
      return 0;
    }

    const charts = registry.getAllCharts();
    if (charts.length === 0) {
      console.log('[ChartRegistryService] No charts to persist');
      return 0;
    }

    let persisted = 0;

    for (const chart of charts) {
      try {
        const input: CreateChartInput = {
          messageId,
          requestId: registry.requestId,
          symbol: chart.symbol,
          interval: chart.interval,
          role: chart.role,
          imageUrl: chart.imageUrl,
          s3Url: chart.s3Url,
          indicators: chart.indicators,
          config: chart.config,
        };

        await this.chartRepository.createChart(input);
        persisted++;
      } catch (error) {
        console.error(
          `[ChartRegistryService] Failed to persist chart ${chart.id}:`,
          error
        );
      }
    }

    console.log(
      `[ChartRegistryService] Persisted ${persisted}/${charts.length} charts for message ${messageId}`
    );

    return persisted;
  }

  /**
   * Load charts from database into a new registry
   *
   * @param requestId - The request ID to load charts for
   * @returns The loaded registry, or undefined if no charts found
   */
  async loadRegistryFromDatabase(
    requestId: string
  ): Promise<ChartRegistry | undefined> {
    if (!this.chartRepository) {
      console.warn(
        '[ChartRegistryService] No chart repository configured, cannot load from database'
      );
      return undefined;
    }

    const charts = await this.chartRepository.getChartsByRequestId(requestId);
    if (charts.length === 0) {
      return undefined;
    }

    // Get symbol from first chart
    const symbol = charts[0].symbol;
    const registry = this.createRegistry(symbol, requestId);

    for (const chart of charts) {
      registry.addChart({
        id: chart.id,
        role: chart.role || 'htf', // Default to htf if not set
        symbol: chart.symbol,
        interval: chart.interval,
        imageUrl: chart.imageUrl,
        s3Url: chart.s3Url,
        indicators: chart.indicators || [],
        config: chart.config || { symbol: chart.symbol, interval: chart.interval },
        generatedAt: chart.generatedAt,
      });
    }

    console.log(
      `[ChartRegistryService] Loaded ${charts.length} charts from database for request ${requestId}`
    );

    return registry;
  }

  /**
   * Cleanup old registries (older than TTL)
   * Call this periodically to prevent memory leaks
   */
  cleanup(maxAge: number = 30 * 60 * 1000): number {
    // Default: 30 minutes
    let cleaned = 0;
    const now = Date.now();

    for (const [id, registry] of this.registries.entries()) {
      const charts = registry.getAllCharts();
      if (charts.length === 0) {
        this.registries.delete(id);
        cleaned++;
        continue;
      }

      // Check if all charts are older than maxAge
      const allOld = charts.every(
        (chart) => now - chart.generatedAt.getTime() > maxAge
      );

      if (allOld) {
        this.registries.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[ChartRegistryService] Cleaned up ${cleaned} old registries`);
    }

    return cleaned;
  }

  /**
   * Get statistics about active registries
   */
  getStats(): {
    totalRegistries: number;
    totalCharts: number;
    symbols: string[];
  } {
    let totalCharts = 0;
    const symbols = new Set<string>();

    for (const registry of this.registries.values()) {
      totalCharts += registry.getAllCharts().length;
      symbols.add(registry.symbol);
    }

    return {
      totalRegistries: this.registries.size,
      totalCharts,
      symbols: Array.from(symbols),
    };
  }
}
