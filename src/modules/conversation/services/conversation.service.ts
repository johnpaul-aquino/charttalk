/**
 * Conversation Service
 *
 * Main orchestration service for AI-powered conversations with Claude.
 * Handles message processing, tool execution, and response generation.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ClaudeProvider,
  ClaudeMessage,
  ClaudeContentBlock,
  ClaudeTextBlock,
  ClaudeToolUseBlock,
  ClaudeTool,
} from '../../analysis/providers/claude.provider';
import {
  IConversationService,
  IConversationRepository,
  SendMessageRequest,
  SendMessageResponse,
  StreamEvent,
  ChatMessage,
  ToolCallRecord,
  Conversation,
  ChartData,
  AnalysisData,
} from '../interfaces/conversation.interface';
import { ContextManagerService } from './context-manager.service';
import { createAssistantMessage, createToolCallRecord, completeToolCall, failToolCall } from '../domain/message';

// Import service interfaces for tool execution
import type { IChartConfigService } from '../../chart/interfaces/chart.interface';
import type { IChartGenerationService } from '../../chart/interfaces/chart.interface';
import type { IAIAnalysisService } from '../../analysis/interfaces/analysis.interface';

/**
 * Conversation Service Configuration
 */
export interface ConversationServiceConfig {
  claudeProvider: ClaudeProvider;
  contextManager: ContextManagerService;
  chartConfigService: IChartConfigService;
  chartGenerationService: IChartGenerationService;
  analysisService?: IAIAnalysisService;
  conversationRepository?: IConversationRepository;
}

/**
 * Conversation Service Implementation
 */
export class ConversationService implements IConversationService {
  private claudeProvider: ClaudeProvider;
  private contextManager: ContextManagerService;
  private chartConfigService: IChartConfigService;
  private chartGenerationService: IChartGenerationService;
  private analysisService?: IAIAnalysisService;
  private conversationRepository?: IConversationRepository;

  // Store generated chart data for analysis (within same conversation turn)
  private lastGeneratedChart: {
    imageUrl: string;
    symbol: string;
    interval: string;
  } | null = null;

  /**
   * Restore chart context from conversation history
   * Looks for the most recent message that has chart data (stored in chartUrl, chartSymbol, chartInterval)
   */
  private restoreChartContextFromHistory(messages: ChatMessage[]): void {
    // Find the most recent message with chart data (search from end)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      // Check if this message has chart URL persisted
      if (msg.chartUrl) {
        this.lastGeneratedChart = {
          imageUrl: msg.chartUrl,
          symbol: msg.chartSymbol || 'UNKNOWN',
          interval: msg.chartInterval || '4h',
        };
        console.log('[ConversationService] Restored chart context from history:', this.lastGeneratedChart);
        return;
      }
    }
    console.log('[ConversationService] No chart context found in conversation history');
  }

  constructor(config: ConversationServiceConfig) {
    this.claudeProvider = config.claudeProvider;
    this.contextManager = config.contextManager;
    this.chartConfigService = config.chartConfigService;
    this.chartGenerationService = config.chartGenerationService;
    this.analysisService = config.analysisService;
    this.conversationRepository = config.conversationRepository;
  }

  /**
   * Get or create a conversation for a user
   */
  async getOrCreateConversation(
    userId: string,
    conversationId?: string
  ): Promise<Conversation | null> {
    if (!this.conversationRepository) {
      console.warn('[ConversationService] Repository not configured - conversation history will not persist');
      return null;
    }

    if (conversationId) {
      const existing = await this.conversationRepository.getConversationWithMessages(conversationId);
      if (!existing) {
        console.warn(`[ConversationService] Conversation ${conversationId} not found, creating new`);
      } else if (existing.userId !== userId) {
        console.error(`[ConversationService] User ${userId} trying to access conversation of different user`);
        return null; // Don't create new - return null to indicate unauthorized
      } else {
        console.log(`[ConversationService] Loaded conversation ${conversationId} with ${existing.messages.length} messages`);
        return existing;
      }
    }

    // Create new conversation
    const newConversation = await this.conversationRepository.createConversation({ userId });
    console.log(`[ConversationService] Created new conversation ${newConversation.id}`);
    return newConversation;
  }

  /**
   * Generate a smart title from the first user message
   */
  private generateConversationTitle(message: string): string {
    const symbolPatterns = [
      /\b(BINANCE|NASDAQ|NYSE|FX):(\w+)\b/gi,
      /\b(BTC|ETH|SOL|XRP|ADA|AAPL|GOOGL|MSFT|TSLA)\b/gi,
      /\b(Bitcoin|Ethereum|Solana|Apple|Tesla)\b/gi,
    ];
    const timeframePatterns = [/\b(1m|5m|15m|30m|1h|4h|1D|1W|1M)\b/gi];
    const indicatorPatterns = [/\b(RSI|MACD|BB|EMA|SMA|MA|Bollinger)\b/gi];

    let symbol = '', timeframe = '', indicator = '';
    for (const p of symbolPatterns) { const m = message.match(p); if (m) { symbol = m[0].toUpperCase(); break; } }
    for (const p of timeframePatterns) { const m = message.match(p); if (m) { timeframe = m[0].toUpperCase(); break; } }
    for (const p of indicatorPatterns) { const m = message.match(p); if (m) { indicator = m[0].toUpperCase(); break; } }

    if (symbol) {
      const parts = [symbol];
      if (timeframe) parts.push(timeframe);
      if (indicator) parts.push(`with ${indicator}`);
      return parts.join(' ') + ' Analysis';
    }
    const cleaned = message.replace(/\s+/g, ' ').trim();
    return cleaned.length > 40 ? cleaned.substring(0, 40) + '...' : cleaned;
  }

  /**
   * Persist a user message to the database
   */
  private async persistUserMessage(
    conversationId: string,
    content: string
  ): Promise<void> {
    if (!this.conversationRepository) return;

    await this.conversationRepository.addMessage({
      conversationId,
      role: 'user',
      content,
    });
  }

  /**
   * Persist an assistant message to the database
   */
  private async persistAssistantMessage(
    conversationId: string,
    content: string,
    chartData?: SendMessageResponse['chart'],
    tokensUsed?: number
  ): Promise<void> {
    if (!this.conversationRepository) return;

    await this.conversationRepository.addMessage({
      conversationId,
      role: 'assistant',
      content,
      chartUrl: chartData?.imageUrl,
      chartSymbol: chartData?.symbol,
      chartInterval: chartData?.interval,
      tokensUsed,
    });
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // Get or create conversation if persistence is enabled
      let conversationId = request.conversationId;
      if (this.conversationRepository && request.userId) {
        const conversation = await this.getOrCreateConversation(request.userId, conversationId);
        if (conversation) {
          conversationId = conversation.id;

          // Auto-generate title if this is a new conversation (no messages yet)
          if (conversation.messages.length === 0 && conversation.title === 'New Conversation') {
            const newTitle = this.generateConversationTitle(request.message);
            await this.conversationRepository.updateConversation(conversationId, { title: newTitle });
            console.log(`[ConversationService] Auto-generated title: "${newTitle}"`);
          }

          // ALWAYS load history from database (remove the !request.conversationHistory check)
          if (conversation.messages.length > 0) {
            console.log(`[ConversationService] Using ${conversation.messages.length} messages from database`);
            request = { ...request, conversationHistory: conversation.messages };
          }
        }
      } else {
        console.warn('[ConversationService] No repository or userId - conversation history will not persist');
      }
      conversationId = conversationId || uuidv4();

      // Persist user message
      await this.persistUserMessage(conversationId, request.message);

      // Build conversation history
      const history = request.conversationHistory || [];
      const claudeMessages = this.contextManager.buildConversationHistory(history);

      // Log what we're sending to Claude for debugging
      console.log('[ConversationService] Sending to Claude:', {
        historyMessageCount: claudeMessages.length,
        newMessage: request.message.substring(0, 50) + (request.message.length > 50 ? '...' : '')
      });

      // Add the new user message
      claudeMessages.push({
        role: 'user',
        content: request.message,
      });

      // Truncate if needed
      const truncatedHistory = this.contextManager.truncateHistory(claudeMessages);

      // Get available tools
      const tools = this.getAvailableTools();

      // Send to Claude
      const response = await this.claudeProvider.sendMessage(
        truncatedHistory,
        {
          systemPrompt: this.contextManager.getSystemPrompt(),
        },
        tools
      );

      // Process response
      const result = await this.processClaudeResponse(
        response,
        conversationId,
        truncatedHistory
      );

      // Persist assistant message
      await this.persistAssistantMessage(
        conversationId,
        result.message.content,
        result.chart
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: createAssistantMessage(`I encountered an error: ${errorMessage}`),
        conversationId: request.conversationId || uuidv4(),
        error: errorMessage,
      };
    }
  }

  /**
   * Send a message with streaming response
   */
  async sendMessageStreaming(
    request: SendMessageRequest,
    onEvent: (event: StreamEvent) => void
  ): Promise<SendMessageResponse> {
    // Reset chart context for each new conversation turn (will be populated from history if available)
    this.lastGeneratedChart = null;

    // Get or create conversation if persistence is enabled
    let conversationId = request.conversationId;
    if (this.conversationRepository && request.userId) {
      const conversation = await this.getOrCreateConversation(request.userId, conversationId);
      if (conversation) {
        conversationId = conversation.id;

        // Auto-generate title if this is a new conversation (no messages yet)
        if (conversation.messages.length === 0 && conversation.title === 'New Conversation') {
          const newTitle = this.generateConversationTitle(request.message);
          await this.conversationRepository.updateConversation(conversationId, { title: newTitle });
          console.log(`[ConversationService] Auto-generated title: "${newTitle}"`);
        }

        // ALWAYS load history from database (ignore any conversationHistory from request)
        console.log(`[ConversationService] DB has ${conversation.messages.length} messages for conversation ${conversationId}`);
        request = { ...request, conversationHistory: conversation.messages };

        // Try to restore last chart context from conversation history
        this.restoreChartContextFromHistory(conversation.messages);
      }
    } else {
      console.warn('[ConversationService] No repository or userId - conversation history will not persist');
    }
    conversationId = conversationId || uuidv4();

    try {
      // Persist user message
      await this.persistUserMessage(conversationId, request.message);

      // Emit start event
      onEvent({ event: 'start', data: { messageId: uuidv4() } });

      // Build conversation history
      const history = request.conversationHistory || [];
      const claudeMessages = this.contextManager.buildConversationHistory(history);

      // Log what we're sending to Claude for debugging
      const lastContent = claudeMessages.length > 0 ? claudeMessages[claudeMessages.length - 1].content : null;
      console.log('[ConversationService] Final history being sent to Claude:', {
        messageCount: claudeMessages.length,
        roles: claudeMessages.map(m => m.role),
        lastMessagePreview: lastContent
          ? (typeof lastContent === 'string' ? lastContent.substring(0, 100) : '[complex content]')
          : 'none'
      });

      // Add the new user message
      claudeMessages.push({
        role: 'user',
        content: request.message,
      });

      // Truncate if needed
      const truncatedHistory = this.contextManager.truncateHistory(claudeMessages);

      // Get available tools
      const tools = this.getAvailableTools();

      let fullText = '';
      const toolCalls: ToolCallRecord[] = [];
      // Arrays to collect multiple charts/analyses per message
      const chartsData: ChartData[] = [];
      const analysesData: AnalysisData[] = [];

      // Send to Claude with streaming
      const response = await this.claudeProvider.sendMessage(
        truncatedHistory,
        {
          systemPrompt: this.contextManager.getSystemPrompt(),
        },
        tools,
        // Stream callback for text chunks
        (chunk: string) => {
          fullText += chunk;
          onEvent({ event: 'chunk', data: { text: chunk } });
        },
        // Tool use callback
        (toolUse: ClaudeToolUseBlock) => {
          onEvent({
            event: 'tool_use',
            data: { tool: toolUse.name, input: toolUse.input },
          });
        }
      );

      // Count total charts and analyses for index tracking
      const toolBlocks = response.filter(b => b.type === 'tool_use');
      const chartToolBlocks = toolBlocks.filter(b => (b as ClaudeToolUseBlock).name === 'generate_chart');
      const analysisToolBlocks = toolBlocks.filter(b => (b as ClaudeToolUseBlock).name === 'analyze_chart');

      let chartIndex = 0;
      let analysisIndex = 0;

      // Process any tool calls in the response
      for (const block of response) {
        if (block.type === 'tool_use') {
          const toolResult = await this.executeToolCallWithEvents(
            block as ClaudeToolUseBlock,
            onEvent,
            toolCalls
          );

          // Extract chart data and push to array
          if (block.name === 'generate_chart' && toolResult) {
            const chartData = toolResult as ChartData;
            chartsData.push(chartData);
            onEvent({
              event: 'chart_complete',
              data: {
                index: chartIndex,
                total: chartToolBlocks.length,
                chart: chartData,
              },
            });
            chartIndex++;
          }

          // Extract analysis data and push to array
          if (block.name === 'analyze_chart' && toolResult) {
            const analysisData = toolResult as AnalysisData;
            analysesData.push(analysisData);
            onEvent({
              event: 'analysis_complete',
              data: {
                index: analysisIndex,
                total: analysisToolBlocks.length,
                analysis: analysisData,
              },
            });
            analysisIndex++;
          }
        }
      }

      // If there were tool calls, continue the conversation with results
      if (toolCalls.length > 0) {
        const toolResults = toolCalls.map((tc) => ({
          type: 'tool_result' as const,
          tool_use_id: tc.id,
          content: JSON.stringify(tc.output),
        }));

        // Get final response after tool use
        // Pass the original response (with tool_use blocks) to maintain proper message sequence
        const finalResponse = await this.claudeProvider.continueWithToolResult(
          truncatedHistory,
          response, // The assistant's tool_use response
          toolResults,
          { systemPrompt: this.contextManager.getSystemPrompt() },
          tools,
          (chunk: string) => {
            fullText += chunk;
            onEvent({ event: 'chunk', data: { text: chunk } });
          }
        );

        // Extract final text
        for (const block of finalResponse) {
          if (block.type === 'text') {
            fullText = (block as ClaudeTextBlock).text;
          }
        }
      }

      const message = createAssistantMessage(fullText, {
        chartId: chartsData.length > 0 ? uuidv4() : undefined,
        analysisId: analysesData.length > 0 ? uuidv4() : undefined,
        toolCalls,
      });

      // Identify charts that are embedded in the markdown response
      // This helps frontend avoid duplicate display (markdown images + chart cards)
      const embeddedChartUrls = chartsData
        .filter((chart) => fullText.includes(chart.imageUrl))
        .map((chart) => chart.imageUrl);

      // Filter out charts that are already embedded in the markdown response
      const chartsNotInMarkdown = chartsData.filter(
        (chart) => !fullText.includes(chart.imageUrl)
      );

      const result: SendMessageResponse = {
        success: true,
        message,
        conversationId,
        // Legacy (backwards compatibility) - first chart/analysis (only if not in markdown)
        chart: chartsNotInMarkdown[0],
        analysis: analysesData[0],
        // Only include charts that aren't already embedded in markdown
        charts: chartsNotInMarkdown.length > 0 ? chartsNotInMarkdown : undefined,
        analyses: analysesData.length > 0 ? analysesData : undefined,
        // URLs of charts embedded in markdown - frontend should hide these chart cards
        embeddedChartUrls: embeddedChartUrls.length > 0 ? embeddedChartUrls : undefined,
      };

      // Persist assistant message (use first chart for backwards compat)
      await this.persistAssistantMessage(
        conversationId,
        fullText,
        chartsData[0]
      );

      // Emit complete event
      onEvent({ event: 'complete', data: result });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onEvent({
        event: 'error',
        data: { code: 'CONVERSATION_ERROR', message: errorMessage },
      });

      return {
        success: false,
        message: createAssistantMessage(`I encountered an error: ${errorMessage}`),
        conversationId,
        error: errorMessage,
      };
    }
  }

  /**
   * Get available tools for Claude
   */
  getAvailableTools(): ClaudeTool[] {
    return [
      {
        name: 'generate_chart',
        description: `Generate a TradingView chart with technical indicators.

Use this tool when the user asks for a chart, mentions a trading symbol, or wants to visualize market data.

Parameters:
- symbol: Trading symbol (e.g., "BINANCE:BTCUSDT", "NASDAQ:AAPL", "FX:EURUSD")
- interval: Time interval for candles
- range: Time range to display (IMPORTANT: "7 days" = "1M", there is no "1W" range)
- indicators: Array of indicator names (e.g., ["RSI", "MACD", "Bollinger Bands"])
- theme: "light" or "dark"

Returns: Chart image URL and metadata`,
        input_schema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Trading symbol (e.g., BINANCE:BTCUSDT, NASDAQ:AAPL)',
            },
            interval: {
              type: 'string',
              enum: ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1D', '1W'],
              description: 'Time interval for candles',
            },
            range: {
              type: 'string',
              enum: ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'],
              description: 'Time range. Use 1M for "last week" or "7 days"',
            },
            indicators: {
              type: 'array',
              items: { type: 'string' },
              description: 'Technical indicators to add (e.g., RSI, MACD)',
            },
            theme: {
              type: 'string',
              enum: ['light', 'dark'],
              description: 'Chart theme',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'analyze_chart',
        description: `Perform AI analysis on a chart to identify trends, patterns, and trading signals.

Use this tool when the user asks for analysis, trading signals, or wants to know what a chart shows.

Parameters:
- chartId: ID of the chart to analyze (from generate_chart)
- tradingStyle: "day_trading", "swing_trading", or "scalping"

Returns: Technical analysis, trend, signals, and recommended entry/exit levels`,
        input_schema: {
          type: 'object',
          properties: {
            chartId: {
              type: 'string',
              description: 'ID of the chart to analyze',
            },
            tradingStyle: {
              type: 'string',
              enum: ['day_trading', 'swing_trading', 'scalping'],
              description: 'Trading style for analysis context',
            },
          },
          required: ['chartId'],
        },
      },
    ];
  }

  /**
   * Execute a tool call from Claude
   */
  async executeToolCall(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<unknown> {
    switch (toolName) {
      case 'generate_chart':
        return this.executeGenerateChart(input);

      case 'analyze_chart':
        return this.executeAnalyzeChart(input);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Execute tool call and emit events
   */
  private async executeToolCallWithEvents(
    toolUse: ClaudeToolUseBlock,
    onEvent: (event: StreamEvent) => void,
    toolCalls: ToolCallRecord[]
  ): Promise<unknown> {
    const toolCall = createToolCallRecord(toolUse.id, toolUse.name, toolUse.input);
    toolCalls.push(toolCall);

    try {
      const result = await this.executeToolCall(toolUse.name, toolUse.input);
      Object.assign(toolCall, completeToolCall(toolCall, result));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
      Object.assign(toolCall, failToolCall(toolCall, errorMessage));
      throw error;
    }
  }

  /**
   * Execute generate_chart tool
   */
  private async executeGenerateChart(
    input: Record<string, unknown>
  ): Promise<SendMessageResponse['chart']> {
    try {
      // Parse input
      const symbol = input.symbol as string;
      const interval = (input.interval as string) || '4h';
      const range = (input.range as string) || '1M';
      const indicators = (input.indicators as string[]) || [];
      const theme = (input.theme as string) || 'dark';

      console.log('[ConversationService] Generating chart:', { symbol, interval, range, indicators, theme });

      // Build chart config - IMPORTANT: pass symbol in preferences to ensure it's used directly
      const config = await this.chartConfigService.constructFromNaturalLanguage(
        `${symbol} chart with ${indicators.join(', ')} for the last ${range}`,
        { symbol, theme: theme as 'light' | 'dark', interval, range }
      );

      console.log('[ConversationService] Chart config:', JSON.stringify(config.config, null, 2));

      // Generate chart
      const result = await this.chartGenerationService.generateChart(
        config.config,
        true, // storage
        'png' // format
      );

      console.log('[ConversationService] Chart generation result:', { success: result.success, error: result.error, imageUrl: result.imageUrl });

      if (!result.success) {
        throw new Error(result.error || 'Chart generation failed');
      }

      // Store chart data for potential analysis
      this.lastGeneratedChart = {
        imageUrl: result.imageUrl || '',
        symbol,
        interval,
      };
      console.log('[ConversationService] Stored chart for potential analysis:', this.lastGeneratedChart);

      return {
        imageUrl: result.imageUrl || '',
        symbol,
        interval,
        s3Url: result.s3Url,
      };
    } catch (error) {
      console.error('[ConversationService] Chart generation error:', error);
      throw error;
    }
  }

  /**
   * Execute analyze_chart tool
   */
  private async executeAnalyzeChart(
    input: Record<string, unknown>
  ): Promise<SendMessageResponse['analysis']> {
    if (!this.analysisService) {
      throw new Error('Analysis service not configured');
    }

    // Use stored chart data if available, otherwise try to use input
    const chartUrl = this.lastGeneratedChart?.imageUrl || (input.chartUrl as string);
    const symbol = this.lastGeneratedChart?.symbol || (input.symbol as string) || 'UNKNOWN';
    const interval = this.lastGeneratedChart?.interval || (input.interval as string) || '4h';
    const tradingStyle = (input.tradingStyle as string) || 'swing_trading';

    if (!chartUrl || !chartUrl.startsWith('http')) {
      throw new Error('No valid chart URL available for analysis. Generate a chart first.');
    }

    console.log('[ConversationService] Analyzing chart:', { chartUrl, symbol, interval, tradingStyle });

    const result = await this.analysisService.analyzeChart({
      chartUrl,
      symbol,
      interval,
      options: {
        tradingStyle: tradingStyle as 'day_trading' | 'swing_trading' | 'scalping',
      },
    });

    if (!result.success || !result.analysis) {
      throw new Error(result.error || 'Analysis failed');
    }

    return {
      trend: result.analysis.trend,
      recommendation: result.analysis.recommendation,
      confidence: result.analysis.confidence,
      signals: result.analysis.signals,
    };
  }

  /**
   * Process Claude response
   */
  private async processClaudeResponse(
    response: ClaudeContentBlock[],
    conversationId: string,
    history: ClaudeMessage[]
  ): Promise<SendMessageResponse> {
    const toolCalls: ToolCallRecord[] = [];
    const chartsData: ChartData[] = [];
    const analysesData: AnalysisData[] = [];
    let responseText = '';

    // Process each content block
    for (const block of response) {
      if (block.type === 'text') {
        responseText = (block as ClaudeTextBlock).text;
      }

      if (block.type === 'tool_use') {
        const toolUse = block as ClaudeToolUseBlock;
        const toolCall = createToolCallRecord(toolUse.id, toolUse.name, toolUse.input);
        toolCalls.push(toolCall);

        try {
          const result = await this.executeToolCall(toolUse.name, toolUse.input);
          Object.assign(toolCall, completeToolCall(toolCall, result));

          if (toolUse.name === 'generate_chart') {
            chartsData.push(result as ChartData);
          }
          if (toolUse.name === 'analyze_chart') {
            analysesData.push(result as AnalysisData);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Tool failed';
          Object.assign(toolCall, failToolCall(toolCall, errorMessage));
        }
      }
    }

    // If there were tool calls, continue the conversation
    if (toolCalls.length > 0) {
      const toolResults = toolCalls.map((tc) => ({
        type: 'tool_result' as const,
        tool_use_id: tc.id,
        content: JSON.stringify(tc.output || tc.error),
      }));

      // Pass the original assistant response (with tool_use blocks) to maintain proper message sequence
      const finalResponse = await this.claudeProvider.continueWithToolResult(
        history,
        response, // The assistant's tool_use response
        toolResults,
        { systemPrompt: this.contextManager.getSystemPrompt() }
      );

      // Extract final text
      for (const block of finalResponse) {
        if (block.type === 'text') {
          responseText = (block as ClaudeTextBlock).text;
        }
      }
    }

    const message = createAssistantMessage(responseText, {
      chartId: chartsData.length > 0 ? uuidv4() : undefined,
      analysisId: analysesData.length > 0 ? uuidv4() : undefined,
      toolCalls,
    });

    // Identify charts that are embedded in the markdown response
    const embeddedChartUrls = chartsData
      .filter((chart) => responseText.includes(chart.imageUrl))
      .map((chart) => chart.imageUrl);

    // Filter out charts that are already embedded in the markdown response
    const chartsNotInMarkdown = chartsData.filter(
      (chart) => !responseText.includes(chart.imageUrl)
    );

    return {
      success: true,
      message,
      conversationId,
      // Legacy (backwards compatibility) - first chart/analysis (only if not in markdown)
      chart: chartsNotInMarkdown[0],
      analysis: analysesData[0],
      // Only include charts that aren't already embedded in markdown
      charts: chartsNotInMarkdown.length > 0 ? chartsNotInMarkdown : undefined,
      analyses: analysesData.length > 0 ? analysesData : undefined,
      // URLs of charts embedded in markdown - frontend should hide these chart cards
      embeddedChartUrls: embeddedChartUrls.length > 0 ? embeddedChartUrls : undefined,
    };
  }
}
