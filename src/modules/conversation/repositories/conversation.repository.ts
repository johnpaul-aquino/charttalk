/**
 * Conversation Repository
 *
 * Implements data access for conversations and messages using Prisma.
 * Handles all database operations for the conversation module.
 */

import { PrismaClient } from '@prisma/client';
import {
  IConversationRepository,
  Conversation,
  ChatMessage,
  CreateConversationInput,
  CreateMessageInput,
  UpdateConversationInput,
  ConversationFilter,
  MessageFilter,
  PaginationOptions,
  PaginatedResult,
  MessageRole,
} from '../interfaces/conversation.interface';

/**
 * Map Prisma conversation to domain model
 */
function mapPrismaConversation(
  prismaConv: {
    id: string;
    userId: string;
    title: string;
    isPinned: boolean;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt: Date;
    messages?: {
      id: string;
      role: string;
      content: string;
      chartId: string | null;
      chartUrl: string | null;
      chartSymbol: string | null;
      chartInterval: string | null;
      tokensUsed: number | null;
      createdAt: Date;
    }[];
  }
): Conversation {
  return {
    id: prismaConv.id,
    userId: prismaConv.userId,
    title: prismaConv.title,
    isPinned: prismaConv.isPinned,
    isArchived: prismaConv.isArchived,
    createdAt: prismaConv.createdAt,
    updatedAt: prismaConv.updatedAt,
    lastMessageAt: prismaConv.lastMessageAt,
    messages: prismaConv.messages?.map(mapPrismaMessage) || [],
  };
}

/**
 * Map Prisma message to domain model
 */
function mapPrismaMessage(
  prismaMsg: {
    id: string;
    role: string;
    content: string;
    chartId: string | null;
    chartUrl: string | null;
    chartSymbol: string | null;
    chartInterval: string | null;
    tokensUsed: number | null;
    createdAt: Date;
  }
): ChatMessage {
  return {
    id: prismaMsg.id,
    role: prismaMsg.role as MessageRole,
    content: prismaMsg.content,
    chartId: prismaMsg.chartId || undefined,
    createdAt: prismaMsg.createdAt,
  };
}

/**
 * Conversation Repository Implementation
 */
export class ConversationRepository implements IConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const conversation = await this.prisma.conversation.create({
      data: {
        userId: input.userId,
        title: input.title || 'New Conversation',
      },
    });

    return mapPrismaConversation(conversation);
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(id: string): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) return null;
    return mapPrismaConversation(conversation);
  }

  /**
   * Get conversation with messages
   */
  async getConversationWithMessages(id: string): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) return null;
    return mapPrismaConversation(conversation);
  }

  /**
   * List conversations for a user
   */
  async listConversations(
    filter: ConversationFilter,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<Conversation>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      userId: string;
      isPinned?: boolean;
      isArchived?: boolean;
      title?: { contains: string; mode: 'insensitive' };
    } = {
      userId: filter.userId,
    };

    if (filter.isPinned !== undefined) {
      where.isPinned = filter.isPinned;
    }

    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    }

    if (filter.search) {
      where.title = {
        contains: filter.search,
        mode: 'insensitive',
      };
    }

    // Get total count
    const total = await this.prisma.conversation.count({ where });

    // Get conversations
    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { lastMessageAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    return {
      items: conversations.map(mapPrismaConversation),
      total,
      page,
      limit,
      hasMore: skip + conversations.length < total,
    };
  }

  /**
   * Update conversation
   */
  async updateConversation(
    id: string,
    input: UpdateConversationInput
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
        ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
      },
    });

    return mapPrismaConversation(conversation);
  }

  /**
   * Delete conversation (and all messages via cascade)
   */
  async deleteConversation(id: string): Promise<void> {
    await this.prisma.conversation.delete({
      where: { id },
    });
  }

  /**
   * Add message to conversation
   */
  async addMessage(input: CreateMessageInput): Promise<ChatMessage> {
    // Create message and update conversation's lastMessageAt in a transaction
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          chartId: input.chartId,
          chartUrl: input.chartUrl,
          chartSymbol: input.chartSymbol,
          chartInterval: input.chartInterval,
          tokensUsed: input.tokensUsed,
        },
      }),
      this.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return mapPrismaMessage(message);
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    filter: MessageFilter,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<ChatMessage>> {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      conversationId: string;
      role?: string;
      chartId?: { not: null } | null;
    } = {
      conversationId: filter.conversationId,
    };

    if (filter.role) {
      where.role = filter.role;
    }

    if (filter.hasChart !== undefined) {
      where.chartId = filter.hasChart ? { not: null } : null;
    }

    // Get total count
    const total = await this.prisma.message.count({ where });

    // Get messages
    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });

    return {
      items: messages.map(mapPrismaMessage),
      total,
      page,
      limit,
      hasMore: skip + messages.length < total,
    };
  }

  /**
   * Update conversation's last message timestamp
   */
  async touchConversation(id: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });
  }
}
