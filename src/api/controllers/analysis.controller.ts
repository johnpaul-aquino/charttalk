/**
 * Analysis Controller
 *
 * Handles HTTP requests for chart analysis endpoints
 *
 * @module api/controllers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  AnalyzeChartRequestSchema,
  AnalyzeChartRequest,
  AnalyzeChartResponse,
} from '../dto/analysis.dto';
import {
  createSuccessResponse,
  jsonResponse,
  HttpStatus,
  createErrorResponse,
} from '../utils/response.util';
import { container, AI_ANALYSIS_SERVICE } from '../../core/di';
import { IAIAnalysisService } from '../../modules/analysis/interfaces/analysis.interface';

/**
 * Analyze chart handler
 *
 * POST /api/v1/analysis/chart
 *
 * Analyzes a trading chart using AI vision capabilities and returns
 * structured analysis including trend, signals, and trading recommendations.
 *
 * @param request - Next.js request object
 * @returns JSON response with analysis results
 */
export async function analyzeChartHandler(
  request: NextRequest
): Promise<NextResponse<AnalyzeChartResponse | any>> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = AnalyzeChartRequestSchema.safeParse(body);

    if (!validation.success) {
      return jsonResponse(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request body',
          { errors: validation.error.format() }
        ),
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    const requestData: AnalyzeChartRequest = validation.data;

    // Resolve AI Analysis Service from DI container
    const analysisService = container.resolve<IAIAnalysisService>(
      AI_ANALYSIS_SERVICE
    );

    // Build analysis request
    const analysisRequest = {
      chartUrl: requestData.imageUrl,
      chartPath: requestData.localPath,
      symbol: requestData.symbol,
      interval: requestData.interval,
      prompt: requestData.customPrompt,
      options: {
        tradingStyle: requestData.tradingStyle,
        includeRiskManagement: requestData.includeRiskManagement,
        confidenceThreshold: requestData.confidenceThreshold,
      },
    };

    // Perform analysis
    const analysisResult = await analysisService.analyzeChart(analysisRequest);

    // Check if analysis failed
    if (!analysisResult.success) {
      return jsonResponse(
        createErrorResponse(
          'ANALYSIS_FAILED',
          analysisResult.error || 'Chart analysis failed'
        ),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Generate trading signal if requested
    let tradingSignal = null;
    if (
      requestData.analysisTypes?.includes('signals') &&
      analysisResult.analysis
    ) {
      tradingSignal = await analysisService.generateSignal(analysisResult);
    }

    // Format response
    const responseData = {
      trend: analysisResult.analysis!.trend,
      signals: analysisResult.analysis!.signals,
      recommendation: analysisResult.analysis!.recommendation,
      confidence: analysisResult.analysis!.confidence,
      analysisText: analysisResult.analysis!.analysisText,
      entryPrice: analysisResult.analysis!.entryPrice,
      stopLoss: analysisResult.analysis!.stopLoss,
      takeProfit: analysisResult.analysis!.takeProfit,
      riskRewardRatio: analysisResult.analysis!.riskRewardRatio,
      keyLevels: analysisResult.analysis!.keyLevels,
      tradingSignal,
    };

    return jsonResponse(
      createSuccessResponse(responseData, {
        model: analysisResult.metadata!.model,
        tokensUsed: analysisResult.metadata!.tokensUsed,
        processingTime: analysisResult.metadata!.processingTime,
      }),
      HttpStatus.OK
    );
  } catch (error) {
    console.error('Error in analyzeChartHandler:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return jsonResponse(
          createErrorResponse(
            'CONFIGURATION_ERROR',
            'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file.'
          ),
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      if (error.message.includes('rate limit')) {
        return jsonResponse(
          createErrorResponse(
            'RATE_LIMIT_EXCEEDED',
            'OpenAI API rate limit exceeded. Please try again later.'
          ),
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    return jsonResponse(
      createErrorResponse(
        'INTERNAL_ERROR',
        'An unexpected error occurred during analysis',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      ),
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
