/**
 * OpenAI Vision Provider Tests
 *
 * Unit tests for OpenAI GPT-4 Vision API integration with mocked HTTP calls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIVisionProvider } from '../openai-vision.provider';
import axios from 'axios';
import * as fs from 'fs';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock fs
vi.mock('fs');
const mockedFs = fs as any;

describe('OpenAIVisionProvider', () => {
  let provider: OpenAIVisionProvider;
  const mockApiKey = 'sk-test-key-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock axios.create to return a mock instance
    mockedAxios.create = vi.fn().mockReturnValue({
      post: vi.fn(),
      get: vi.fn(),
    });
  });

  describe('constructor', () => {
    it('should create provider with valid configuration', () => {
      provider = new OpenAIVisionProvider({
        apiKey: mockApiKey,
        defaultModel: 'gpt-4o-mini',
      });

      expect(provider.getName()).toBe('OpenAI');
      expect(provider.getModel()).toBe('gpt-4o-mini');
    });

    it('should throw error if API key is missing', () => {
      expect(() => {
        new OpenAIVisionProvider({
          apiKey: '',
        });
      }).toThrow('OpenAI API key is required');
    });

    it('should throw error for unsupported model', () => {
      expect(() => {
        new OpenAIVisionProvider({
          apiKey: mockApiKey,
          defaultModel: 'unsupported-model',
        });
      }).toThrow('Unsupported model');
    });

    it('should use default model if not specified', () => {
      provider = new OpenAIVisionProvider({
        apiKey: mockApiKey,
      });

      expect(provider.getModel()).toBe('gpt-4o-mini');
    });

    it('should accept all supported models', () => {
      const supportedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview'];

      supportedModels.forEach((model) => {
        expect(() => {
          new OpenAIVisionProvider({
            apiKey: mockApiKey,
            defaultModel: model,
          });
        }).not.toThrow();
      });
    });
  });

  describe('getName and getModel', () => {
    beforeEach(() => {
      provider = new OpenAIVisionProvider({
        apiKey: mockApiKey,
        defaultModel: 'gpt-4o',
      });
    });

    it('should return provider name', () => {
      expect(provider.getName()).toBe('OpenAI');
    });

    it('should return current model', () => {
      expect(provider.getModel()).toBe('gpt-4o');
    });
  });

  describe('getSupportedModels', () => {
    beforeEach(() => {
      provider = new OpenAIVisionProvider({
        apiKey: mockApiKey,
      });
    });

    it('should return list of supported models', () => {
      const models = provider.getSupportedModels();

      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('gpt-4-turbo');
      expect(models).toContain('gpt-4-vision-preview');
    });

    it('should return a copy of the array', () => {
      const models1 = provider.getSupportedModels();
      const models2 = provider.getSupportedModels();

      expect(models1).not.toBe(models2); // Different array instances
      expect(models1).toEqual(models2); // Same content
    });
  });

  describe('setModel', () => {
    beforeEach(() => {
      provider = new OpenAIVisionProvider({
        apiKey: mockApiKey,
        defaultModel: 'gpt-4o-mini',
      });
    });

    it('should update the model', () => {
      provider.setModel('gpt-4o');
      expect(provider.getModel()).toBe('gpt-4o');
    });

    it('should throw error for unsupported model', () => {
      expect(() => {
        provider.setModel('invalid-model');
      }).toThrow('Unsupported model');
    });
  });

  describe('isAvailable', () => {
    beforeEach(() => {
      provider = new OpenAIVisionProvider({
        apiKey: mockApiKey,
      });
    });

    it('should return true when API is accessible', async () => {
      const mockHttpClient = mockedAxios.create();
      mockHttpClient.get.mockResolvedValue({ status: 200 });

      const isAvailable = await provider.isAvailable();

      expect(isAvailable).toBe(true);
    });

    it('should return false when API is not accessible', async () => {
      const mockHttpClient = mockedAxios.create();
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      const isAvailable = await provider.isAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  describe('analyzeImage', () => {
    beforeEach(() => {
      provider = new OpenAIVisionProvider({
        apiKey: mockApiKey,
        defaultModel: 'gpt-4o-mini',
      });
    });

    it('should analyze image from URL', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Detailed chart analysis...',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        },
      };

      const mockHttpClient = mockedAxios.create();
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await provider.analyzeImage(
        { url: 'https://example.com/chart.png' },
        'Analyze this trading chart'
      );

      expect(result).toBe('Detailed chart analysis...');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: expect.objectContaining({
                    url: 'https://example.com/chart.png',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should analyze image from base64 data', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Analysis result',
              },
            },
          ],
        },
      };

      const mockHttpClient = mockedAxios.create();
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAUA...';

      const result = await provider.analyzeImage(
        { base64: base64Data },
        'Analyze this chart'
      );

      expect(result).toBe('Analysis result');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: expect.objectContaining({
                    url: `data:image/png;base64,${base64Data}`,
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should analyze image from file path', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'File analysis',
              },
            },
          ],
        },
      };

      const mockHttpClient = mockedAxios.create();
      mockHttpClient.post.mockResolvedValue(mockResponse);

      // Mock fs functions
      mockedFs.existsSync = vi.fn().mockReturnValue(true);
      mockedFs.readFileSync = vi.fn().mockReturnValue(Buffer.from('fake-image-data'));

      const result = await provider.analyzeImage(
        { filePath: '/tmp/chart.png' },
        'Analyze this chart'
      );

      expect(result).toBe('File analysis');
      expect(mockedFs.existsSync).toHaveBeenCalledWith('/tmp/chart.png');
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/tmp/chart.png');
    });

    it('should throw error for non-existent file', async () => {
      mockedFs.existsSync = vi.fn().mockReturnValue(false);

      await expect(
        provider.analyzeImage(
          { filePath: '/nonexistent/file.png' },
          'Analyze this chart'
        )
      ).rejects.toThrow('File not found');
    });

    it('should throw error when no image input provided', async () => {
      await expect(
        provider.analyzeImage({}, 'Analyze this chart')
      ).rejects.toThrow('No image input provided');
    });

    it('should use custom model from options', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Result' } }],
        },
      };

      const mockHttpClient = mockedAxios.create();
      mockHttpClient.post.mockResolvedValue(mockResponse);

      await provider.analyzeImage(
        { url: 'https://example.com/chart.png' },
        'Analyze',
        { model: 'gpt-4o' }
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          model: 'gpt-4o',
        })
      );
    });

    it('should include system prompt when provided', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Result' } }],
        },
      };

      const mockHttpClient = mockedAxios.create();
      mockHttpClient.post.mockResolvedValue(mockResponse);

      await provider.analyzeImage(
        { url: 'https://example.com/chart.png' },
        'Analyze',
        { systemPrompt: 'You are an expert trader' }
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'You are an expert trader',
            }),
          ]),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockHttpClient = mockedAxios.create();
      mockHttpClient.post.mockRejectedValue({
        response: {
          status: 429,
          data: {
            error: {
              message: 'Rate limit exceeded',
            },
          },
        },
        isAxiosError: true,
      });

      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      await expect(
        provider.analyzeImage(
          { url: 'https://example.com/chart.png' },
          'Analyze'
        )
      ).rejects.toThrow('OpenAI API error');
    });

    it('should throw error when no response choices', async () => {
      const mockResponse = {
        data: {
          choices: [],
        },
      };

      const mockHttpClient = mockedAxios.create();
      mockHttpClient.post.mockResolvedValue(mockResponse);

      await expect(
        provider.analyzeImage(
          { url: 'https://example.com/chart.png' },
          'Analyze'
        )
      ).rejects.toThrow('No response from OpenAI API');
    });
  });
});
