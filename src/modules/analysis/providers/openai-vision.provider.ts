/**
 * OpenAI Vision Provider
 *
 * Implements the ILLMProvider interface using OpenAI's GPT-4 Vision API.
 * Supports gpt-4o, gpt-4o-mini, and gpt-4-turbo models.
 *
 * @module analysis/providers
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import {
  ILLMProvider,
  ImageInput,
  LLMAnalysisOptions,
} from './llm-provider.interface';

/**
 * OpenAI Vision Provider Configuration
 */
export interface OpenAIVisionConfig {
  /**
   * OpenAI API key
   */
  apiKey: string;

  /**
   * Default model to use
   */
  defaultModel?: string;

  /**
   * API endpoint (defaults to OpenAI's official endpoint)
   */
  apiEndpoint?: string;

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
 * OpenAI Chat Completion Message
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

/**
 * OpenAI Chat Completion Request
 */
interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * OpenAI Chat Completion Response
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Vision Provider Implementation
 */
export class OpenAIVisionProvider implements ILLMProvider {
  private readonly SUPPORTED_MODELS = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4-vision-preview',
  ];

  private readonly DEFAULT_MODEL = 'gpt-4o-mini';
  private readonly DEFAULT_MAX_TOKENS = 2000;
  private readonly DEFAULT_TEMPERATURE = 0.7;
  private readonly DEFAULT_TIMEOUT = 60000; // 60 seconds
  private readonly DEFAULT_MAX_RETRIES = 3;

  private apiKey: string;
  private currentModel: string;
  private apiEndpoint: string;
  private timeout: number;
  private maxRetries: number;
  private httpClient: AxiosInstance;

  constructor(config: OpenAIVisionConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = config.apiKey;
    this.currentModel = config.defaultModel || this.DEFAULT_MODEL;
    this.apiEndpoint = config.apiEndpoint || 'https://api.openai.com/v1';
    this.timeout = config.timeout || this.DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries || this.DEFAULT_MAX_RETRIES;

    // Validate model
    if (!this.SUPPORTED_MODELS.includes(this.currentModel)) {
      throw new Error(
        `Unsupported model: ${this.currentModel}. Supported models: ${this.SUPPORTED_MODELS.join(', ')}`
      );
    }

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.apiEndpoint,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  /**
   * Analyze a chart image using OpenAI's vision capabilities
   */
  async analyzeImage(
    imageInput: ImageInput,
    prompt: string,
    options?: LLMAnalysisOptions
  ): Promise<string> {
    // Prepare image URL (handle different input types)
    const imageUrl = await this.prepareImageUrl(imageInput);

    // Build request
    const model = options?.model || this.currentModel;
    const maxTokens = options?.maxTokens || this.DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature || this.DEFAULT_TEMPERATURE;
    const detail = options?.detail || 'high';

    const messages: ChatMessage[] = [];

    // Add system prompt if provided
    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    // Add user message with image and prompt
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    });

    const requestBody: ChatCompletionRequest = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    // Make API call with retry logic
    const response = await this.makeRequestWithRetry(requestBody);

    // Extract and return the analysis
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    return response.choices[0].message.content;
  }

  /**
   * Get provider name
   */
  getName(): string {
    return 'OpenAI';
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
      // Make a simple API call to verify the key works
      const response = await this.httpClient.get('/models');
      return response.status === 200;
    } catch (error) {
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
   * Prepare image URL from different input types
   */
  private async prepareImageUrl(imageInput: ImageInput): Promise<string> {
    // If URL is provided, use it directly
    if (imageInput.url) {
      return imageInput.url;
    }

    // If base64 is provided, format it for OpenAI
    if (imageInput.base64) {
      // Remove data URI prefix if present
      const base64Data = imageInput.base64.replace(
        /^data:image\/[a-z]+;base64,/,
        ''
      );
      return `data:image/png;base64,${base64Data}`;
    }

    // If file path is provided, read and convert to base64
    if (imageInput.filePath) {
      if (!fs.existsSync(imageInput.filePath)) {
        throw new Error(`File not found: ${imageInput.filePath}`);
      }

      const imageBuffer = fs.readFileSync(imageInput.filePath);
      const base64Data = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Data}`;
    }

    throw new Error('No image input provided (url, base64, or filePath)');
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequestWithRetry(
    requestBody: ChatCompletionRequest,
    attempt: number = 1
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await this.httpClient.post<ChatCompletionResponse>(
        '/chat/completions',
        requestBody
      );

      return response.data;
    } catch (error) {
      // Retry on rate limit or server errors
      if (attempt < this.maxRetries) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          // Retry on rate limit (429), server errors (5xx), or timeout
          if (
            status === 429 ||
            (status && status >= 500) ||
            error.code === 'ECONNABORTED'
          ) {
            const delayMs = this.calculateRetryDelay(attempt);
            await this.sleep(delayMs);
            return this.makeRequestWithRetry(requestBody, attempt + 1);
          }
        }
      }

      // Format error message
      let errorMessage = 'OpenAI API request failed';
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as any;
        errorMessage = `OpenAI API error (${status}): ${
          data?.error?.message || error.message
        }`;
      } else if (error instanceof Error) {
        errorMessage = `OpenAI API error: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
