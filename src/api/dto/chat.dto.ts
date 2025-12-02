/**
 * Chat DTOs
 *
 * Request and response types for chat API endpoints
 */

import { z } from 'zod';

/**
 * Chat message in conversation history
 */
export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  chartId: z.string().optional(),
  analysisId: z.string().optional(),
  createdAt: z.string().optional(),
});

export type ChatMessageDTO = z.infer<typeof ChatMessageSchema>;

/**
 * Send message request
 * Note: userId comes from JWT token, not request body
 */
export const SendMessageRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000, 'Message too long'),
  conversationId: z.string().optional(),
  conversationHistory: z.array(ChatMessageSchema).optional(),
});

export type SendMessageRequestDTO = z.infer<typeof SendMessageRequestSchema>;

/**
 * Chart data in response
 */
export const ChartDataSchema = z.object({
  imageUrl: z.string(),
  symbol: z.string(),
  interval: z.string(),
  s3Url: z.string().optional(),
});

export type ChartDataDTO = z.infer<typeof ChartDataSchema>;

/**
 * Analysis data in response
 */
export const AnalysisDataSchema = z.object({
  trend: z.string(),
  recommendation: z.string(),
  confidence: z.number(),
  signals: z.array(z.string()),
});

export type AnalysisDataDTO = z.infer<typeof AnalysisDataSchema>;

/**
 * Send message response
 */
export const SendMessageResponseSchema = z.object({
  success: z.boolean(),
  message: ChatMessageSchema,
  conversationId: z.string(),
  chart: ChartDataSchema.optional(),
  analysis: AnalysisDataSchema.optional(),
  error: z.string().optional(),
});

export type SendMessageResponseDTO = z.infer<typeof SendMessageResponseSchema>;

/**
 * Stream event types
 */
export const StreamEventTypeSchema = z.enum([
  'start',
  'chunk',
  'tool_use',
  'chart_complete',
  'analysis_complete',
  'complete',
  'error',
]);

export type StreamEventType = z.infer<typeof StreamEventTypeSchema>;

/**
 * Stream start event
 */
export const StreamStartEventSchema = z.object({
  messageId: z.string(),
});

/**
 * Stream chunk event
 */
export const StreamChunkEventSchema = z.object({
  text: z.string(),
});

/**
 * Stream tool use event
 */
export const StreamToolUseEventSchema = z.object({
  tool: z.string(),
  input: z.record(z.unknown()),
});

/**
 * Stream error event
 */
export const StreamErrorEventSchema = z.object({
  code: z.string(),
  message: z.string(),
});

/**
 * Conversation list item
 */
export const ConversationListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  lastMessageAt: z.string(),
  messageCount: z.number(),
  preview: z.string().optional(),
});

export type ConversationListItemDTO = z.infer<typeof ConversationListItemSchema>;

/**
 * Get conversations request (query params)
 */
export const GetConversationsQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  archived: z.coerce.boolean().optional().default(false),
});

export type GetConversationsQueryDTO = z.infer<typeof GetConversationsQuerySchema>;

/**
 * Get conversation by ID response
 */
export const ConversationDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  messages: z.array(ChatMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastMessageAt: z.string(),
});

export type ConversationDetailDTO = z.infer<typeof ConversationDetailSchema>;

/**
 * Update conversation request
 */
export const UpdateConversationRequestSchema = z.object({
  title: z.string().max(500).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateConversationRequestDTO = z.infer<typeof UpdateConversationRequestSchema>;

/**
 * Delete conversation response
 */
export const DeleteConversationResponseSchema = z.object({
  success: z.boolean(),
  deletedId: z.string(),
});

export type DeleteConversationResponseDTO = z.infer<typeof DeleteConversationResponseSchema>;
