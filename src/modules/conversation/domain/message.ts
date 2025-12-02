/**
 * Message Domain Model
 *
 * Represents a message in a conversation
 */

import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageRole, ToolCallRecord } from '../interfaces/conversation.interface';

/**
 * Create a new user message
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: uuidv4(),
    role: 'user',
    content,
    createdAt: new Date(),
  };
}

/**
 * Create a new assistant message
 */
export function createAssistantMessage(
  content: string,
  options?: {
    chartId?: string;
    analysisId?: string;
    toolCalls?: ToolCallRecord[];
  }
): ChatMessage {
  return {
    id: uuidv4(),
    role: 'assistant',
    content,
    chartId: options?.chartId,
    analysisId: options?.analysisId,
    toolCalls: options?.toolCalls,
    createdAt: new Date(),
  };
}

/**
 * Create a tool call record
 */
export function createToolCallRecord(
  id: string,
  name: string,
  input: Record<string, unknown>
): ToolCallRecord {
  return {
    id,
    name,
    input,
    status: 'pending',
  };
}

/**
 * Update tool call with result
 */
export function completeToolCall(
  toolCall: ToolCallRecord,
  output: unknown
): ToolCallRecord {
  return {
    ...toolCall,
    output,
    status: 'success',
  };
}

/**
 * Update tool call with error
 */
export function failToolCall(
  toolCall: ToolCallRecord,
  error: string
): ToolCallRecord {
  return {
    ...toolCall,
    error,
    status: 'error',
  };
}

/**
 * Check if message has chart attachment
 */
export function hasChart(message: ChatMessage): boolean {
  return !!message.chartId;
}

/**
 * Check if message has analysis attachment
 */
export function hasAnalysis(message: ChatMessage): boolean {
  return !!message.analysisId;
}

/**
 * Get total token estimate for a message (rough estimate)
 * Claude uses approximately 4 characters per token
 */
export function estimateMessageTokens(message: ChatMessage): number {
  const contentTokens = Math.ceil(message.content.length / 4);
  const toolCallTokens = message.toolCalls
    ? message.toolCalls.reduce((acc, tc) => {
        return acc + Math.ceil(JSON.stringify(tc).length / 4);
      }, 0)
    : 0;
  return contentTokens + toolCallTokens;
}
