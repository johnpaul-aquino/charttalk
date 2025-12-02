/**
 * Claude Provider
 *
 * Implements the ILLMProvider interface using Anthropic's Claude API.
 * Supports Claude Opus 4.5, Sonnet 4, and other Claude models.
 * Includes streaming support for real-time chat responses.
 *
 * @module analysis/providers
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import {
  ILLMProvider,
  ImageInput,
  LLMAnalysisOptions,
} from './llm-provider.interface';

/**
 * Claude Provider Configuration
 */
export interface ClaudeProviderConfig {
  /**
   * Anthropic API key
   */
  apiKey: string;

  /**
   * Default model to use
   */
  defaultModel?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Maximum retry attempts for failed requests
   */
  maxRetries?: number;
}

/**
 * Claude Message Content Types
 */
export interface ClaudeTextContent {
  type: 'text';
  text: string;
}

export interface ClaudeImageContentBase64 {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

export type ClaudeContent = ClaudeTextContent | ClaudeImageContentBase64;

/**
 * Claude Message
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContent[];
}

/**
 * Claude Tool Definition
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Claude Tool Use Block
 */
export interface ClaudeToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Claude Text Block
 */
export interface ClaudeTextBlock {
  type: 'text';
  text: string;
}

export type ClaudeContentBlock = ClaudeTextBlock | ClaudeToolUseBlock;

/**
 * Streaming callback type
 */
export type StreamCallback = (chunk: string) => void;

/**
 * Tool use callback type
 */
export type ToolUseCallback = (toolUse: ClaudeToolUseBlock) => void;

/**
 * Claude Provider Implementation
 */
export class ClaudeProvider implements ILLMProvider {
  private readonly SUPPORTED_MODELS = [
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ];

  private readonly DEFAULT_MODEL = 'claude-opus-4-5-20251101';
  private readonly DEFAULT_MAX_TOKENS = 4096;
  private readonly DEFAULT_TEMPERATURE = 0.7;
  private readonly DEFAULT_TIMEOUT = 60000; // 60 seconds
  private readonly DEFAULT_MAX_RETRIES = 3;

  private client: Anthropic;
  private currentModel: string;
  private maxRetries: number;

  constructor(config: ClaudeProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.currentModel = config.defaultModel || this.DEFAULT_MODEL;
    this.maxRetries = config.maxRetries || this.DEFAULT_MAX_RETRIES;

    // Validate model
    if (!this.SUPPORTED_MODELS.includes(this.currentModel)) {
      throw new Error(
        `Unsupported model: ${this.currentModel}. Supported models: ${this.SUPPORTED_MODELS.join(', ')}`
      );
    }

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || this.DEFAULT_TIMEOUT,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Analyze a chart image using Claude's vision capabilities
   */
  async analyzeImage(
    imageInput: ImageInput,
    prompt: string,
    options?: LLMAnalysisOptions
  ): Promise<string> {
    // Prepare image content
    const imageContent = await this.prepareImageContent(imageInput);

    // Build request
    const model = options?.model || this.currentModel;
    const maxTokens = options?.maxTokens || this.DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature || this.DEFAULT_TEMPERATURE;

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: [
          imageContent,
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ];

    // Make API call
    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: options?.systemPrompt,
      messages,
    });

    // Extract text from response
    const textContent = response.content.find(
      (block) => block.type === 'text'
    ) as ClaudeTextBlock | undefined;

    if (!textContent) {
      throw new Error('No text response from Claude API');
    }

    return textContent.text;
  }

  /**
   * Send a message to Claude with optional tools and streaming
   *
   * @param messages - Conversation history
   * @param options - Request options
   * @param tools - Optional tool definitions
   * @param streamCallback - Optional callback for streaming text chunks
   * @param toolUseCallback - Optional callback for tool use events
   * @returns Claude's response content blocks
   */
  async sendMessage(
    messages: ClaudeMessage[],
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      model?: string;
    },
    tools?: ClaudeTool[],
    streamCallback?: StreamCallback,
    toolUseCallback?: ToolUseCallback
  ): Promise<ClaudeContentBlock[]> {
    const model = options?.model || this.currentModel;
    const maxTokens = options?.maxTokens || this.DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature || this.DEFAULT_TEMPERATURE;

    if (streamCallback) {
      // Streaming mode
      return this.sendMessageStreaming(
        messages,
        {
          model,
          maxTokens,
          temperature,
          systemPrompt: options?.systemPrompt,
        },
        tools,
        streamCallback,
        toolUseCallback
      );
    }

    // Non-streaming mode
    const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages as Anthropic.MessageParam[],
    };

    if (options?.systemPrompt) {
      requestParams.system = options.systemPrompt;
    }

    if (tools && tools.length > 0) {
      requestParams.tools = tools as Anthropic.Tool[];
    }

    const response = await this.client.messages.create(requestParams);

    return response.content as ClaudeContentBlock[];
  }

  /**
   * Send message with streaming support
   */
  private async sendMessageStreaming(
    messages: ClaudeMessage[],
    options: {
      model: string;
      maxTokens: number;
      temperature: number;
      systemPrompt?: string;
    },
    tools?: ClaudeTool[],
    streamCallback?: StreamCallback,
    toolUseCallback?: ToolUseCallback
  ): Promise<ClaudeContentBlock[]> {
    const requestParams: Anthropic.MessageCreateParamsStreaming = {
      model: options.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      messages: messages as Anthropic.MessageParam[],
      stream: true,
    };

    if (options.systemPrompt) {
      requestParams.system = options.systemPrompt;
    }

    if (tools && tools.length > 0) {
      requestParams.tools = tools as Anthropic.Tool[];
    }

    const stream = await this.client.messages.create(requestParams);

    const contentBlocks: ClaudeContentBlock[] = [];
    let currentTextBlock: ClaudeTextBlock | null = null;
    let currentToolUse: ClaudeToolUseBlock | null = null;

    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_start':
          if (event.content_block.type === 'text') {
            currentTextBlock = { type: 'text', text: '' };
          } else if (event.content_block.type === 'tool_use') {
            currentToolUse = {
              type: 'tool_use',
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            };
          }
          break;

        case 'content_block_delta':
          if (event.delta.type === 'text_delta' && currentTextBlock) {
            currentTextBlock.text += event.delta.text;
            if (streamCallback) {
              streamCallback(event.delta.text);
            }
          } else if (
            event.delta.type === 'input_json_delta' &&
            currentToolUse
          ) {
            // Accumulate tool input JSON
            // The delta contains partial JSON, we'll parse it at block_stop
          }
          break;

        case 'content_block_stop':
          if (currentTextBlock) {
            contentBlocks.push(currentTextBlock);
            currentTextBlock = null;
          }
          if (currentToolUse) {
            contentBlocks.push(currentToolUse);
            if (toolUseCallback) {
              toolUseCallback(currentToolUse);
            }
            currentToolUse = null;
          }
          break;

        case 'message_stop':
          // Message complete
          break;
      }
    }

    return contentBlocks;
  }

  /**
   * Continue a conversation after tool use
   *
   * The message sequence must be:
   * 1. Original messages (user, assistant, etc.)
   * 2. Assistant message with tool_use blocks
   * 3. User message with tool_result blocks
   *
   * @param messages - Original conversation history (before tool use)
   * @param assistantToolUse - The assistant's response containing tool_use blocks
   * @param toolResults - The results of executing the tools
   * @param options - Request options
   * @param tools - Optional tool definitions for continued use
   * @param streamCallback - Optional streaming callback
   * @returns Claude's response content blocks
   */
  async continueWithToolResult(
    messages: ClaudeMessage[],
    assistantToolUse: ClaudeContentBlock[],
    toolResults: Array<{
      type: 'tool_result';
      tool_use_id: string;
      content: string;
    }>,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      model?: string;
    },
    tools?: ClaudeTool[],
    streamCallback?: StreamCallback
  ): Promise<ClaudeContentBlock[]> {
    // Build the message sequence correctly:
    // 1. Original messages
    // 2. Assistant message with tool_use
    // 3. User message with tool_result
    const messagesWithResults: ClaudeMessage[] = [
      ...messages,
      {
        role: 'assistant',
        content: assistantToolUse as unknown as ClaudeContent[],
      },
      {
        role: 'user',
        content: toolResults as unknown as ClaudeContent[],
      },
    ];

    return this.sendMessage(
      messagesWithResults,
      options,
      tools,
      streamCallback
    );
  }

  /**
   * Get provider name
   */
  getName(): string {
    return 'Anthropic';
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.currentModel;
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a minimal API call to verify the key works
      await this.client.messages.create({
        model: this.currentModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get supported models
   */
  getSupportedModels(): string[] {
    return [...this.SUPPORTED_MODELS];
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    if (!this.SUPPORTED_MODELS.includes(model)) {
      throw new Error(
        `Unsupported model: ${model}. Supported models: ${this.SUPPORTED_MODELS.join(', ')}`
      );
    }
    this.currentModel = model;
  }

  /**
   * Get the underlying Anthropic client (for advanced usage)
   */
  getClient(): Anthropic {
    return this.client;
  }

  /**
   * Prepare image content from different input types
   */
  private async prepareImageContent(
    imageInput: ImageInput
  ): Promise<ClaudeImageContentBase64> {
    // If URL is provided, fetch and convert to base64
    // Note: Claude API prefers base64 for reliability
    if (imageInput.url) {
      // For S3/public URLs, we can try to use them directly
      // but Claude recommends base64 for best results
      const response = await fetch(imageInput.url);
      const buffer = await response.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';

      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: contentType as
            | 'image/jpeg'
            | 'image/png'
            | 'image/gif'
            | 'image/webp',
          data: base64Data,
        },
      };
    }

    // If base64 is provided, use it directly
    if (imageInput.base64) {
      // Remove data URI prefix if present
      const base64Data = imageInput.base64.replace(
        /^data:image\/[a-z]+;base64,/,
        ''
      );
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: base64Data,
        },
      };
    }

    // If file path is provided, read and convert to base64
    if (imageInput.filePath) {
      if (!fs.existsSync(imageInput.filePath)) {
        throw new Error(`File not found: ${imageInput.filePath}`);
      }

      const imageBuffer = fs.readFileSync(imageInput.filePath);
      const base64Data = imageBuffer.toString('base64');

      // Detect media type from extension
      const extension = imageInput.filePath.toLowerCase().split('.').pop();
      const mediaType =
        extension === 'jpg' || extension === 'jpeg'
          ? 'image/jpeg'
          : extension === 'gif'
            ? 'image/gif'
            : extension === 'webp'
              ? 'image/webp'
              : 'image/png';

      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      };
    }

    throw new Error('No image input provided (url, base64, or filePath)');
  }
}
