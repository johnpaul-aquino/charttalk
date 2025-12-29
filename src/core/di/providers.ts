/**
 * Service Providers
 *
 * Registers all services with the DI container
 */

import { DIContainer } from './container';
import * as tokens from './tokens';

// Chart Module
import { ChartConfigService } from '../../modules/chart/services/chart-config.service';
import { ChartValidationService } from '../../modules/chart/services/chart-validation.service';
import { ChartGenerationService } from '../../modules/chart/services/chart-generation.service';
import { ChartRegistryService } from '../../modules/chart/services/chart-registry.service';
import { MultiTimeframeChartService } from '../../modules/chart/services/multi-timeframe-chart.service';
import { IndicatorsRepository } from '../../modules/chart/repositories/indicators.repository';
import { DrawingsRepository } from '../../modules/chart/repositories/drawings.repository';
import { ChartRepository } from '../../modules/chart/repositories/chart.repository';

// Storage Module
import { ChartStorageService } from '../../modules/storage/services/chart-storage.service';
import { DownloadService } from '../../modules/storage/services/download.service';
import { S3ClientService } from '../../modules/storage/services/s3-client.service';
import { S3StorageService } from '../../modules/storage/services/s3-storage.service';

// Analysis Module
import { AIAnalysisService } from '../../modules/analysis/services/ai-analysis.service';
import { SignalGenerationService } from '../../modules/analysis/services/signal-generation.service';
import { MultiTimeframeAnalysisService } from '../../modules/analysis/services/multi-timeframe-analysis.service';
import { OpenAIVisionProvider } from '../../modules/analysis/providers/openai-vision.provider';
import { ClaudeProvider } from '../../modules/analysis/providers/claude.provider';
import { ILLMProvider } from '../../modules/analysis/providers/llm-provider.interface';

// Conversation Module
import { ConversationService } from '../../modules/conversation/services/conversation.service';
import { ContextManagerService } from '../../modules/conversation/services/context-manager.service';
import { ConversationRepository } from '../../modules/conversation/repositories/conversation.repository';
import { IConversationRepository } from '../../modules/conversation/interfaces/conversation.interface';

// User Module
import { JWTService } from '../../modules/user/services/jwt.service';
import { UserRateLimitService } from '../../modules/user/services/user-rate-limit.service';

// Database
import { prisma, getPrismaClient } from '../database/prisma.client';
import type { PrismaClient } from '@prisma/client';

// Controllers
import { ChatController } from '../../api/controllers/chat.controller';

// Core
import { createChartImgClient } from '../../mcp/utils/chart-img-client';
import { getAppConfig } from '../../shared/config/environment.config';

/**
 * Register all services with the DI container
 */
export function registerProviders(container: DIContainer): void {
  // ============================================================
  // Core Services
  // ============================================================

  // ChartImgClient (singleton)
  container.registerSingleton(tokens.CHART_IMG_CLIENT, () => {
    return createChartImgClient();
  });

  // ============================================================
  // Database
  // ============================================================

  // Prisma Client (singleton)
  container.registerSingleton(tokens.PRISMA_CLIENT, () => {
    return getPrismaClient();
  });

  // ============================================================
  // User Module - Services (singletons)
  // ============================================================

  // JWT Service (singleton)
  container.registerSingleton(tokens.JWT_SERVICE, () => {
    return new JWTService();
  });

  // User Rate Limit Service (depends on Prisma)
  container.registerSingleton(tokens.USER_RATE_LIMIT_SERVICE, (c) => {
    try {
      const prismaClient = c.resolve<PrismaClient>(tokens.PRISMA_CLIENT);
      return new UserRateLimitService(prismaClient);
    } catch {
      console.warn('[DI] UserRateLimitService not available - DATABASE_URL not configured');
      return undefined;
    }
  });

  // ============================================================
  // Chart Module - Repositories (singletons)
  // ============================================================

  container.registerSingleton(tokens.INDICATORS_REPOSITORY, () => {
    return new IndicatorsRepository();
  });

  container.registerSingleton(tokens.DRAWINGS_REPOSITORY, () => {
    return new DrawingsRepository();
  });

  // ChartRepository (depends on Prisma client) - optional, only if DB configured
  container.registerSingleton(tokens.CHART_REPOSITORY, (c) => {
    try {
      const prismaClient = c.resolve<PrismaClient>(tokens.PRISMA_CLIENT);
      return new ChartRepository(prismaClient);
    } catch {
      console.warn('[DI] ChartRepository not available - DATABASE_URL not configured');
      return undefined;
    }
  });

  // ============================================================
  // Chart Module - Services (singletons)
  // ============================================================

  // ChartConfigService (depends on repositories)
  container.registerSingleton(tokens.CHART_CONFIG_SERVICE, (c) => {
    const indicatorsRepo = c.resolve<IndicatorsRepository>(tokens.INDICATORS_REPOSITORY);
    const drawingsRepo = c.resolve<DrawingsRepository>(tokens.DRAWINGS_REPOSITORY);
    return new ChartConfigService(indicatorsRepo, drawingsRepo);
  });

  // ChartValidationService (no dependencies)
  container.registerSingleton(tokens.CHART_VALIDATION_SERVICE, () => {
    return new ChartValidationService();
  });

  // ChartGenerationService (depends on ChartImgClient, optionally UserRateLimitService)
  container.registerSingleton(tokens.CHART_GENERATION_SERVICE, (c) => {
    const client = c.resolve<ReturnType<typeof createChartImgClient>>(tokens.CHART_IMG_CLIENT);
    const service = new ChartGenerationService(client);

    // Inject rate limit service if available
    try {
      const rateLimitService = c.resolve<UserRateLimitService>(tokens.USER_RATE_LIMIT_SERVICE);
      if (rateLimitService) {
        service.setRateLimitService(rateLimitService);
      }
    } catch {
      console.warn('[DI] UserRateLimitService not available - per-user rate limiting disabled');
    }

    return service;
  });

  // ChartRegistryService (depends on ChartRepository - optional)
  container.registerSingleton(tokens.CHART_REGISTRY_SERVICE, (c) => {
    let chartRepository: ChartRepository | undefined;
    try {
      chartRepository = c.resolve<ChartRepository>(tokens.CHART_REPOSITORY);
    } catch {
      // ChartRepository not available - proceed without DB persistence
    }
    return new ChartRegistryService(chartRepository);
  });

  // MultiTimeframeChartService (depends on config, generation, registry, S3 services)
  container.registerSingleton(tokens.MULTI_TIMEFRAME_CHART_SERVICE, (c) => {
    const chartConfigService = c.resolve<ChartConfigService>(tokens.CHART_CONFIG_SERVICE);
    const chartGenerationService = c.resolve<ChartGenerationService>(tokens.CHART_GENERATION_SERVICE);
    const chartRegistryService = c.resolve<ChartRegistryService>(tokens.CHART_REGISTRY_SERVICE);

    // S3 storage is optional
    let s3StorageService: S3StorageService | undefined;
    try {
      s3StorageService = c.resolve<S3StorageService>(tokens.S3_STORAGE_SERVICE);
    } catch {
      console.warn('[DI] S3StorageService not available for MultiTimeframeChartService');
    }

    return new MultiTimeframeChartService(
      chartConfigService,
      chartGenerationService,
      chartRegistryService,
      s3StorageService
    );
  });

  // ============================================================
  // Storage Module - Services (singletons)
  // ============================================================

  // DownloadService (no dependencies)
  container.registerSingleton(tokens.DOWNLOAD_SERVICE, () => {
    return new DownloadService();
  });

  // ChartStorageService (depends on DownloadService)
  container.registerSingleton(tokens.CHART_STORAGE_SERVICE, (c) => {
    const downloadService = c.resolve<DownloadService>(tokens.DOWNLOAD_SERVICE);
    return new ChartStorageService(downloadService);
  });

  // S3ClientService (no dependencies)
  container.registerSingleton(tokens.S3_CLIENT_SERVICE, () => {
    return new S3ClientService();
  });

  // S3StorageService (depends on S3ClientService)
  container.registerSingleton(tokens.S3_STORAGE_SERVICE, (c) => {
    const s3Client = c.resolve<S3ClientService>(tokens.S3_CLIENT_SERVICE);
    return new S3StorageService(s3Client);
  });

  // ============================================================
  // Analysis Module - Providers (singletons)
  // ============================================================

  // OpenAI Vision Provider (no dependencies, reads from env config)
  container.registerSingleton(tokens.OPENAI_VISION_PROVIDER, () => {
    const config = getAppConfig();

    // Check if OpenAI API key is configured
    if (!config.openai?.apiKey) {
      throw new Error(
        'OPENAI_API_KEY not configured. Please set it in .env file.'
      );
    }

    return new OpenAIVisionProvider({
      apiKey: config.openai.apiKey,
      defaultModel: config.openai.defaultModel || 'gpt-4o-mini',
      timeout: config.openai.timeout || 60000,
      maxRetries: config.openai.maxRetries || 3,
    });
  });

  // ============================================================
  // Analysis Module - Services (singletons)
  // ============================================================

  // SignalGenerationService (no dependencies)
  container.registerSingleton(tokens.SIGNAL_GENERATION_SERVICE, () => {
    return new SignalGenerationService();
  });

  // AIAnalysisService (depends on LLM provider and signal generation service)
  // Using Claude provider for analysis (instead of OpenAI)
  container.registerSingleton(tokens.AI_ANALYSIS_SERVICE, (c) => {
    const llmProvider = c.resolve<ILLMProvider>(tokens.CLAUDE_PROVIDER);
    const signalGenerator = c.resolve<SignalGenerationService>(
      tokens.SIGNAL_GENERATION_SERVICE
    );
    return new AIAnalysisService(llmProvider, signalGenerator);
  });

  // MultiTimeframeAnalysisService (depends on Claude provider and signal generation service)
  container.registerSingleton(tokens.MULTI_TIMEFRAME_ANALYSIS_SERVICE, (c) => {
    const claudeProvider = c.resolve<ClaudeProvider>(tokens.CLAUDE_PROVIDER);
    const signalGenerator = c.resolve<SignalGenerationService>(
      tokens.SIGNAL_GENERATION_SERVICE
    );
    return new MultiTimeframeAnalysisService(claudeProvider, signalGenerator);
  });

  // ============================================================
  // Claude Provider (for conversation)
  // ============================================================

  // Claude Provider (reads from env config)
  container.registerSingleton(tokens.CLAUDE_PROVIDER, () => {
    const config = getAppConfig();

    // Check if Anthropic API key is configured
    if (!config.anthropic?.apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not configured. Please set it in .env file for chat functionality.'
      );
    }

    return new ClaudeProvider({
      apiKey: config.anthropic.apiKey,
      defaultModel: config.anthropic.defaultModel || 'claude-opus-4-5-20251101',
      timeout: config.anthropic.timeout || 60000,
      maxRetries: config.anthropic.maxRetries || 3,
    });
  });

  // ============================================================
  // Conversation Module - Services (singletons)
  // ============================================================

  // ContextManagerService (no dependencies)
  container.registerSingleton(tokens.CONTEXT_MANAGER_SERVICE, () => {
    return new ContextManagerService();
  });

  // ConversationRepository (depends on Prisma client)
  container.registerSingleton(tokens.CONVERSATION_REPOSITORY, (c) => {
    const prismaClient = c.resolve<PrismaClient>(tokens.PRISMA_CLIENT);
    return new ConversationRepository(prismaClient);
  });

  // ConversationService (depends on Claude provider, context manager, chart services, repository)
  container.registerSingleton(tokens.CONVERSATION_SERVICE, (c) => {
    const claudeProvider = c.resolve<ClaudeProvider>(tokens.CLAUDE_PROVIDER);
    const contextManager = c.resolve<ContextManagerService>(tokens.CONTEXT_MANAGER_SERVICE);
    const chartConfigService = c.resolve<ChartConfigService>(tokens.CHART_CONFIG_SERVICE);
    const chartGenerationService = c.resolve<ChartGenerationService>(tokens.CHART_GENERATION_SERVICE);

    // AI Analysis service is optional (may not have Anthropic key)
    let analysisService: AIAnalysisService | undefined;
    try {
      analysisService = c.resolve<AIAnalysisService>(tokens.AI_ANALYSIS_SERVICE);
    } catch {
      // Analysis service not available (Anthropic key not configured)
      console.warn('[DI] AI Analysis service not available - ANTHROPIC_API_KEY not configured');
    }

    // ConversationRepository is optional (may not have DATABASE_URL)
    let conversationRepository: IConversationRepository | undefined;
    try {
      conversationRepository = c.resolve<IConversationRepository>(tokens.CONVERSATION_REPOSITORY);
    } catch {
      // Repository not available (DATABASE_URL not configured)
      console.warn('[DI] ConversationRepository not available - DATABASE_URL not configured');
    }

    return new ConversationService({
      claudeProvider,
      contextManager,
      chartConfigService,
      chartGenerationService,
      analysisService,
      conversationRepository,
    });
  });

  // ============================================================
  // Controllers
  // ============================================================

  // ChatController (depends on ConversationService)
  container.registerSingleton(tokens.CHAT_CONTROLLER, (c) => {
    const conversationService = c.resolve<ConversationService>(tokens.CONVERSATION_SERVICE);
    return new ChatController(conversationService);
  });
}
