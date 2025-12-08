/**
 * Chart Repository
 *
 * Handles database operations for the Chart model.
 * Supports multi-timeframe analysis by storing multiple charts per message.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  IChartRepository,
  CreateChartInput,
  ChartRecord,
  TimeframeRole,
} from '../../analysis/interfaces/multi-timeframe.interface';
import { ChartConfig } from '../interfaces/chart.interface';

/**
 * Map Prisma chart to domain model
 */
function mapPrismaChart(prismaChart: {
  id: string;
  messageId: string;
  requestId: string;
  symbol: string;
  interval: string;
  role: string | null;
  imageUrl: string;
  s3Url: string | null;
  indicators: Prisma.JsonValue;
  config: Prisma.JsonValue;
  generatedAt: Date;
}): ChartRecord {
  return {
    id: prismaChart.id,
    messageId: prismaChart.messageId,
    requestId: prismaChart.requestId,
    symbol: prismaChart.symbol,
    interval: prismaChart.interval,
    role: (prismaChart.role as TimeframeRole) || undefined,
    imageUrl: prismaChart.imageUrl,
    s3Url: prismaChart.s3Url || undefined,
    indicators: prismaChart.indicators as unknown as string[] | undefined,
    config: prismaChart.config as unknown as ChartConfig | undefined,
    generatedAt: prismaChart.generatedAt,
  };
}

/**
 * Chart Repository Implementation
 */
export class ChartRepository implements IChartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new chart record
   */
  async createChart(input: CreateChartInput): Promise<ChartRecord> {
    const chart = await this.prisma.chart.create({
      data: {
        messageId: input.messageId,
        requestId: input.requestId,
        symbol: input.symbol,
        interval: input.interval,
        role: input.role || null,
        imageUrl: input.imageUrl,
        s3Url: input.s3Url || null,
        indicators: input.indicators || Prisma.JsonNull,
        config: input.config ? (input.config as unknown as Prisma.JsonObject) : Prisma.JsonNull,
      },
    });

    return mapPrismaChart(chart);
  }

  /**
   * Create multiple chart records in a transaction
   */
  async createCharts(inputs: CreateChartInput[]): Promise<ChartRecord[]> {
    const charts = await this.prisma.$transaction(
      inputs.map((input) =>
        this.prisma.chart.create({
          data: {
            messageId: input.messageId,
            requestId: input.requestId,
            symbol: input.symbol,
            interval: input.interval,
            role: input.role || null,
            imageUrl: input.imageUrl,
            s3Url: input.s3Url || null,
            indicators: input.indicators || Prisma.JsonNull,
            config: input.config ? (input.config as unknown as Prisma.JsonObject) : Prisma.JsonNull,
          },
        })
      )
    );

    return charts.map(mapPrismaChart);
  }

  /**
   * Get chart by ID
   */
  async getChartById(id: string): Promise<ChartRecord | null> {
    const chart = await this.prisma.chart.findUnique({
      where: { id },
    });

    if (!chart) return null;
    return mapPrismaChart(chart);
  }

  /**
   * Get charts by message ID
   */
  async getChartsByMessageId(messageId: string): Promise<ChartRecord[]> {
    const charts = await this.prisma.chart.findMany({
      where: { messageId },
      orderBy: { generatedAt: 'asc' },
    });

    return charts.map(mapPrismaChart);
  }

  /**
   * Get charts by request ID
   */
  async getChartsByRequestId(requestId: string): Promise<ChartRecord[]> {
    const charts = await this.prisma.chart.findMany({
      where: { requestId },
      orderBy: { generatedAt: 'asc' },
    });

    return charts.map(mapPrismaChart);
  }

  /**
   * Get charts by symbol and interval (for finding similar charts)
   */
  async getChartsBySymbolAndInterval(
    symbol: string,
    interval: string,
    limit: number = 10
  ): Promise<ChartRecord[]> {
    const charts = await this.prisma.chart.findMany({
      where: { symbol, interval },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });

    return charts.map(mapPrismaChart);
  }

  /**
   * Update chart with S3 URL
   */
  async updateChartS3Url(id: string, s3Url: string): Promise<ChartRecord> {
    const chart = await this.prisma.chart.update({
      where: { id },
      data: { s3Url },
    });

    return mapPrismaChart(chart);
  }

  /**
   * Delete charts by message ID
   */
  async deleteChartsByMessageId(messageId: string): Promise<void> {
    await this.prisma.chart.deleteMany({
      where: { messageId },
    });
  }

  /**
   * Delete charts by request ID
   */
  async deleteChartsByRequestId(requestId: string): Promise<void> {
    await this.prisma.chart.deleteMany({
      where: { requestId },
    });
  }

  /**
   * Count charts by message ID
   */
  async countChartsByMessageId(messageId: string): Promise<number> {
    return this.prisma.chart.count({
      where: { messageId },
    });
  }

  /**
   * Get the most recent chart for a symbol
   */
  async getMostRecentChart(symbol: string): Promise<ChartRecord | null> {
    const chart = await this.prisma.chart.findFirst({
      where: { symbol },
      orderBy: { generatedAt: 'desc' },
    });

    if (!chart) return null;
    return mapPrismaChart(chart);
  }
}
