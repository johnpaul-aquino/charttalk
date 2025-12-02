/**
 * Conversation Domain Model
 *
 * Represents a chat session with a user
 */

import { v4 as uuidv4 } from 'uuid';
import { Conversation, ChatMessage } from '../interfaces/conversation.interface';
import { createUserMessage, createAssistantMessage } from './message';

/**
 * Create a new conversation
 */
export function createConversation(
  userId: string,
  title?: string
): Conversation {
  const now = new Date();
  return {
    id: uuidv4(),
    userId,
    title: title || 'New Chat',
    isPinned: false,
    isArchived: false,
    messages: [],
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
  };
}

/**
 * Add a user message to conversation
 */
export function addUserMessage(
  conversation: Conversation,
  content: string
): { conversation: Conversation; message: ChatMessage } {
  const message = createUserMessage(content);
  const now = new Date();

  return {
    conversation: {
      ...conversation,
      messages: [...conversation.messages, message],
      updatedAt: now,
      lastMessageAt: now,
    },
    message,
  };
}

/**
 * Add an assistant message to conversation
 */
export function addAssistantMessage(
  conversation: Conversation,
  content: string,
  options?: {
    chartId?: string;
    analysisId?: string;
  }
): { conversation: Conversation; message: ChatMessage } {
  const message = createAssistantMessage(content, options);
  const now = new Date();

  return {
    conversation: {
      ...conversation,
      messages: [...conversation.messages, message],
      updatedAt: now,
      lastMessageAt: now,
    },
    message,
  };
}

/**
 * Update conversation title
 */
export function updateTitle(
  conversation: Conversation,
  title: string
): Conversation {
  return {
    ...conversation,
    title,
    updatedAt: new Date(),
  };
}

/**
 * Pin/unpin conversation
 */
export function togglePinned(conversation: Conversation): Conversation {
  return {
    ...conversation,
    isPinned: !conversation.isPinned,
    updatedAt: new Date(),
  };
}

/**
 * Archive/unarchive conversation
 */
export function toggleArchived(conversation: Conversation): Conversation {
  return {
    ...conversation,
    isArchived: !conversation.isArchived,
    updatedAt: new Date(),
  };
}

/**
 * Get message count
 */
export function getMessageCount(conversation: Conversation): number {
  return conversation.messages.length;
}

/**
 * Get last message
 */
export function getLastMessage(
  conversation: Conversation
): ChatMessage | undefined {
  return conversation.messages[conversation.messages.length - 1];
}

/**
 * Get messages by role
 */
export function getMessagesByRole(
  conversation: Conversation,
  role: 'user' | 'assistant'
): ChatMessage[] {
  return conversation.messages.filter((m) => m.role === role);
}

/**
 * Generate a title from the first user message
 */
export function generateTitle(conversation: Conversation): string {
  const firstUserMessage = conversation.messages.find(
    (m) => m.role === 'user'
  );
  if (!firstUserMessage) {
    return 'New Chat';
  }

  // Take first 50 characters of the first message
  const title = firstUserMessage.content.slice(0, 50);
  return title.length < firstUserMessage.content.length
    ? `${title}...`
    : title;
}

/**
 * Check if conversation is empty
 */
export function isEmpty(conversation: Conversation): boolean {
  return conversation.messages.length === 0;
}

/**
 * Estimate total tokens in conversation
 */
export function estimateTotalTokens(conversation: Conversation): number {
  return conversation.messages.reduce((acc, message) => {
    return acc + Math.ceil(message.content.length / 4);
  }, 0);
}
