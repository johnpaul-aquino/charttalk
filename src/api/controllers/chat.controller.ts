/**
 * Chat Controller
 *
 * Handles HTTP requests for AI-powered chat with Claude Opus 4.5
 */

import { NextRequest } from 'next/server';
import {
  SendMessageRequestSchema,
  SendMessageRequestDTO,
  SendMessageResponseDTO,
  ChatMessageDTO,
} from '../dto/chat.dto';
import {
  createSSEStream,
  SSEController,
  handleSSEWithKeepAlive,
} from '../middleware/sse.middleware';
import {
  ConversationService,
  StreamEvent,
  ChatMessage,
} from '../../modules/conversation';

/**
 * Chat Controller
 */
export class ChatController {
  private conversationService: ConversationService;

  constructor(conversationService: ConversationService) {
    this.conversationService = conversationService;
  }

  /**
   * Send a message (non-streaming)
   * POST /api/v1/chat/messages
   */
  async sendMessage(request: SendMessageRequestDTO & { userId: string }): Promise<SendMessageResponseDTO> {
    // Convert conversation history from DTO to domain model
    const conversationHistory: ChatMessage[] = request.conversationHistory?.map(
      (msg) => this.convertDTOToMessage(msg)
    ) || [];

    // Send message
    const response = await this.conversationService.sendMessage({
      message: request.message,
      userId: request.userId,
      conversationId: request.conversationId,
      conversationHistory,
    });

    // Convert response to DTO
    return {
      success: response.success,
      message: this.convertMessageToDTO(response.message),
      conversationId: response.conversationId,
      chart: response.chart,
      analysis: response.analysis,
      error: response.error,
    };
  }

  /**
   * Send a message with streaming response
   * POST /api/v1/chat/messages/stream
   */
  async sendMessageStream(request: SendMessageRequestDTO & { userId: string }): Promise<ReadableStream> {
    // Convert conversation history from DTO to domain model
    const conversationHistory: ChatMessage[] = request.conversationHistory?.map(
      (msg) => this.convertDTOToMessage(msg)
    ) || [];

    // Create stream with keep-alive
    return handleSSEWithKeepAlive(async (controller: SSEController) => {
      await this.conversationService.sendMessageStreaming(
        {
          message: request.message,
          userId: request.userId,
          conversationId: request.conversationId,
          conversationHistory,
        },
        (event: StreamEvent) => {
          controller.sendStreamEvent(event);
        }
      );
    });
  }

  /**
   * Parse and validate request body
   */
  static async parseRequest(req: NextRequest): Promise<{
    success: true;
    data: SendMessageRequestDTO;
  } | {
    success: false;
    error: string;
    details: unknown;
  }> {
    try {
      const body = await req.json();
      const parsed = SendMessageRequestSchema.safeParse(body);

      if (!parsed.success) {
        return {
          success: false,
          error: 'Invalid request body',
          details: parsed.error.errors,
        };
      }

      return {
        success: true,
        data: parsed.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse request body',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert DTO to domain message
   */
  private convertDTOToMessage(dto: ChatMessageDTO): ChatMessage {
    return {
      id: dto.id || crypto.randomUUID(),
      role: dto.role,
      content: dto.content,
      chartId: dto.chartId,
      analysisId: dto.analysisId,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    };
  }

  /**
   * Convert domain message to DTO
   */
  private convertMessageToDTO(message: ChatMessage): ChatMessageDTO {
    return {
      id: message.id,
      role: message.role as 'user' | 'assistant',
      content: message.content,
      chartId: message.chartId,
      analysisId: message.analysisId,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
