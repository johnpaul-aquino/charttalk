/**
 * Conversation Module Interfaces
 *
 * Defines contracts for AI-powered conversation handling with Claude
 */

import { ClaudeMessage, ClaudeContentBlock, ClaudeTool } from '../../analysis/providers/claude.provider';

/**
 * Message role in a conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Chat message with optional attachments
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  chartId?: string;
  analysisId?: string;
  toolCalls?: ToolCallRecord[];
  createdAt: Date;
}

/**
 * Conversation (Chat session)
 */
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

/**
 * Tool call record for tracking Claude tool usage
 */
export interface ToolCallRecord {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

/**
 * Request to send a message
 */
export interface SendMessageRequest {
  message: string;
  userId: string;
  conversationId?: string;
  conversationHistory?: ChatMessage[];
}

/**
 * Response from sending a message
 */
export interface SendMessageResponse {
  success: boolean;
  message: ChatMessage;
  conversationId: string;
  chart?: {
    imageUrl: string;
    symbol: string;
    interval: string;
    s3Url?: string;
  };
  analysis?: {
    trend: string;
    recommendation: string;
    confidence: number;
    signals: string[];
  };
  error?: string;
}

/**
 * Streaming event types for SSE
 */
export type StreamEventType =
  | 'start'
  | 'chunk'
  | 'tool_use'
  | 'chart_complete'
  | 'analysis_complete'
  | 'complete'
  | 'error';

/**
 * Streaming event data
 */
export interface StreamEvent {
  event: StreamEventType;
  data: unknown;
}

/**
 * Tool definition for conversation context
 */
export interface ConversationTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

/**
 * IConversationService interface
 *
 * Main orchestration service for AI conversations
 */
export interface IConversationService {
  /**
   * Send a message and get AI response
   */
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;

  /**
   * Send a message with streaming response
   */
  sendMessageStreaming(
    request: SendMessageRequest,
    onEvent: (event: StreamEvent) => void
  ): Promise<SendMessageResponse>;

  /**
   * Get available tools for Claude
   */
  getAvailableTools(): ClaudeTool[];

  /**
   * Execute a tool call from Claude
   */
  executeToolCall(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<unknown>;
}

/**
 * IContextManagerService interface
 *
 * Manages conversation context and history
 */
export interface IContextManagerService {
  /**
   * Build conversation history for Claude API
   */
  buildConversationHistory(messages: ChatMessage[]): ClaudeMessage[];

  /**
   * Get system prompt for the conversation
   */
  getSystemPrompt(): string;

  /**
   * Truncate history to fit token limits
   */
  truncateHistory(
    messages: ClaudeMessage[],
    maxTokens: number
  ): ClaudeMessage[];

  /**
   * Estimate token count for messages
   */
  estimateTokenCount(messages: ClaudeMessage[]): number;
}

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Conversation filter options
 */
export interface ConversationFilter {
  userId: string;
  isPinned?: boolean;
  isArchived?: boolean;
  search?: string;
}

/**
 * Message filter options
 */
export interface MessageFilter {
  conversationId: string;
  role?: MessageRole;
  hasChart?: boolean;
}

/**
 * Create conversation input
 */
export interface CreateConversationInput {
  userId: string;
  title?: string;
}

/**
 * Create message input
 */
export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  chartId?: string;
  chartUrl?: string;
  chartSymbol?: string;
  chartInterval?: string;
  tokensUsed?: number;
}

/**
 * Update conversation input
 */
export interface UpdateConversationInput {
  title?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

/**
 * IConversationRepository interface
 *
 * Data access layer for conversations and messages
 */
export interface IConversationRepository {
  /**
   * Create a new conversation
   */
  createConversation(input: CreateConversationInput): Promise<Conversation>;

  /**
   * Get conversation by ID
   */
  getConversationById(id: string): Promise<Conversation | null>;

  /**
   * Get conversation with messages
   */
  getConversationWithMessages(id: string): Promise<Conversation | null>;

  /**
   * List conversations for a user
   */
  listConversations(
    filter: ConversationFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Conversation>>;

  /**
   * Update conversation
   */
  updateConversation(
    id: string,
    input: UpdateConversationInput
  ): Promise<Conversation>;

  /**
   * Delete conversation (and all messages)
   */
  deleteConversation(id: string): Promise<void>;

  /**
   * Add message to conversation
   */
  addMessage(input: CreateMessageInput): Promise<ChatMessage>;

  /**
   * Get messages for a conversation
   */
  getMessages(
    filter: MessageFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ChatMessage>>;

  /**
   * Update conversation's last message timestamp
   */
  touchConversation(id: string): Promise<void>;
}
