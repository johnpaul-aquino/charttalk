/**
 * Claude Provider Tests
 *
 * Unit tests for Anthropic Claude API integration.
 * Tests image analysis, message sending, streaming, and tool use.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as fs from 'fs';

// Create the mock function at module scope
const mockMessagesCreate = vi.fn();

// Mock the Anthropic SDK before any imports
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockMessagesCreate,
      };
    },
  };
});

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Import after mocks are set up
import { ClaudeProvider, ClaudeProviderConfig } from '../claude.provider';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  const validConfig: ClaudeProviderConfig = {
    apiKey: 'sk-ant-test-key',
    defaultModel: 'claude-opus-4-5-20251101',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ClaudeProvider(validConfig);
  });

  // ==========================================================================
  // CONSTRUCTOR TESTS
  // ==========================================================================

  describe('Constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => {
        new ClaudeProvider({ apiKey: '' });
      }).toThrow('Anthropic API key is required');
    });

    it('should accept valid configuration', () => {
      const provider = new ClaudeProvider(validConfig);
      expect(provider.getName()).toBe('Anthropic');
      expect(provider.getModel()).toBe('claude-opus-4-5-20251101');
    });

    it('should use default model if not specified', () => {
      const provider = new ClaudeProvider({ apiKey: 'sk-ant-test' });
      expect(provider.getModel()).toBe('claude-opus-4-5-20251101');
    });

    it('should throw error for unsupported model', () => {
      expect(() => {
        new ClaudeProvider({
          apiKey: 'sk-ant-test',
          defaultModel: 'invalid-model',
        });
      }).toThrow('Unsupported model');
    });

    it('should accept all supported models', () => {
      const supportedModels = [
        'claude-opus-4-5-20251101',
        'claude-sonnet-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
      ];

      for (const model of supportedModels) {
        expect(() => {
          new ClaudeProvider({ apiKey: 'sk-ant-test', defaultModel: model });
        }).not.toThrow();
      }
    });
  });

  // ==========================================================================
  // GETTER/SETTER TESTS
  // ==========================================================================

  describe('Getters and Setters', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('Anthropic');
    });

    it('should return current model', () => {
      expect(provider.getModel()).toBe('claude-opus-4-5-20251101');
    });

    it('should return supported models', () => {
      const models = provider.getSupportedModels();
      expect(models).toContain('claude-opus-4-5-20251101');
      expect(models).toContain('claude-sonnet-4-20250514');
      expect(models.length).toBe(5);
    });

    it('should set valid model', () => {
      provider.setModel('claude-3-5-sonnet-20241022');
      expect(provider.getModel()).toBe('claude-3-5-sonnet-20241022');
    });

    it('should throw error when setting invalid model', () => {
      expect(() => {
        provider.setModel('invalid-model');
      }).toThrow('Unsupported model');
    });

    it('should expose the Anthropic client', () => {
      const client = provider.getClient();
      expect(client).toBeDefined();
      expect(client.messages).toBeDefined();
    });
  });

  // ==========================================================================
  // analyzeImage TESTS
  // ==========================================================================

  describe('analyzeImage', () => {
    it('should analyze image from URL', async () => {
      // Mock fetch for URL image
      mockFetch.mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: {
          get: () => 'image/png',
        },
      });

      // Mock Claude API response
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Analysis result' }],
      });

      const result = await provider.analyzeImage(
        { url: 'https://example.com/chart.png' },
        'Analyze this chart'
      );

      expect(result).toBe('Analysis result');
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/chart.png');
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          messages: expect.any(Array),
        })
      );
    });

    it('should analyze image from base64', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Base64 analysis' }],
      });

      const result = await provider.analyzeImage(
        { base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
        'Analyze this chart'
      );

      expect(result).toBe('Base64 analysis');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should analyze image from file path', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(Buffer.from('fake-image-data'));

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'File analysis' }],
      });

      const result = await provider.analyzeImage(
        { filePath: '/tmp/chart.png' },
        'Analyze this chart'
      );

      expect(result).toBe('File analysis');
      expect(fs.existsSync).toHaveBeenCalledWith('/tmp/chart.png');
      expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/chart.png');
    });

    it('should throw error if file does not exist', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      await expect(
        provider.analyzeImage({ filePath: '/tmp/missing.png' }, 'Analyze')
      ).rejects.toThrow('File not found');
    });

    it('should throw error if no image input provided', async () => {
      await expect(provider.analyzeImage({}, 'Analyze')).rejects.toThrow(
        'No image input provided'
      );
    });

    it('should detect correct media type from file extension', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(Buffer.from('fake'));

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Result' }],
      });

      // Test JPEG
      await provider.analyzeImage({ filePath: '/tmp/chart.jpg' }, 'Analyze');
      expect(mockMessagesCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  source: expect.objectContaining({
                    media_type: 'image/jpeg',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );

      // Test GIF
      await provider.analyzeImage({ filePath: '/tmp/chart.gif' }, 'Analyze');
      expect(mockMessagesCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  source: expect.objectContaining({
                    media_type: 'image/gif',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );

      // Test WebP
      await provider.analyzeImage({ filePath: '/tmp/chart.webp' }, 'Analyze');
      expect(mockMessagesCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  source: expect.objectContaining({
                    media_type: 'image/webp',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should strip data URI prefix from base64', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Result' }],
      });

      await provider.analyzeImage(
        { base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=' },
        'Analyze'
      );

      // Verify the data URI prefix was removed
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  source: expect.objectContaining({
                    data: 'iVBORw0KGgoAAAANSUhEUgAAAAE=',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should pass options to API', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Result' }],
      });

      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(Buffer.from('fake'));

      await provider.analyzeImage(
        { filePath: '/tmp/chart.png' },
        'Analyze',
        {
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 2048,
          temperature: 0.3,
          systemPrompt: 'You are a chart analyst',
        }
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2048,
          temperature: 0.3,
          system: 'You are a chart analyst',
        })
      );
    });

    it('should throw error if no text response from API', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(Buffer.from('fake'));

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'test', name: 'test', input: {} }],
      });

      await expect(
        provider.analyzeImage({ filePath: '/tmp/chart.png' }, 'Analyze')
      ).rejects.toThrow('No text response from Claude API');
    });
  });

  // ==========================================================================
  // sendMessage TESTS
  // ==========================================================================

  describe('sendMessage', () => {
    it('should send message and return content blocks', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [
          { type: 'text', text: 'Hello!' },
          { type: 'text', text: 'How can I help?' },
        ],
      });

      const result = await provider.sendMessage([
        { role: 'user', content: 'Hello' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'text', text: 'Hello!' });
    });

    it('should pass system prompt and options', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
      });

      await provider.sendMessage(
        [{ role: 'user', content: 'Test' }],
        {
          systemPrompt: 'You are helpful',
          maxTokens: 1000,
          temperature: 0.5,
          model: 'claude-3-5-sonnet-20241022',
        }
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          temperature: 0.5,
          system: 'You are helpful',
        })
      );
    });

    it('should include tools when provided', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Using tool' }],
      });

      const tools = [
        {
          name: 'get_weather',
          description: 'Get weather for a location',
          input_schema: {
            type: 'object' as const,
            properties: {
              location: { type: 'string' },
            },
            required: ['location'],
          },
        },
      ];

      await provider.sendMessage(
        [{ role: 'user', content: 'What is the weather?' }],
        {},
        tools
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: tools,
        })
      );
    });

    it('should use default values when options not provided', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
      });

      await provider.sendMessage([{ role: 'user', content: 'Test' }]);

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 4096,
          temperature: 0.7,
        })
      );
    });
  });

  // ==========================================================================
  // STREAMING TESTS
  // ==========================================================================

  describe('sendMessage with streaming', () => {
    it('should call stream callback with text chunks', async () => {
      // Create a mock async iterator for streaming
      const mockStreamEvents = [
        { type: 'content_block_start', content_block: { type: 'text' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } },
        { type: 'content_block_stop' },
        { type: 'message_stop' },
      ];

      mockMessagesCreate.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockStreamEvents) {
            yield event;
          }
        },
      });

      const chunks: string[] = [];
      const streamCallback = (chunk: string) => chunks.push(chunk);

      const result = await provider.sendMessage(
        [{ role: 'user', content: 'Hi' }],
        {},
        undefined,
        streamCallback
      );

      expect(chunks).toEqual(['Hello', ' world']);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', text: 'Hello world' });
    });

    it('should handle tool use in streaming', async () => {
      const mockStreamEvents = [
        { type: 'content_block_start', content_block: { type: 'tool_use', id: 'tool-1', name: 'get_weather' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"loc' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: 'ation": "NYC"}' } },
        { type: 'content_block_stop' },
        { type: 'message_stop' },
      ];

      mockMessagesCreate.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockStreamEvents) {
            yield event;
          }
        },
      });

      const toolUses: any[] = [];
      const toolUseCallback = (toolUse: any) => toolUses.push(toolUse);

      // Need a stream callback to trigger streaming mode
      const result = await provider.sendMessage(
        [{ role: 'user', content: 'Weather in NYC?' }],
        {},
        undefined,
        () => {}, // Stream callback to trigger streaming mode
        toolUseCallback
      );

      expect(toolUses).toHaveLength(1);
      expect(toolUses[0].name).toBe('get_weather');
      expect(toolUses[0].input).toEqual({ location: 'NYC' });
      expect(result).toHaveLength(1);
    });

    it('should handle mixed text and tool use in streaming', async () => {
      const mockStreamEvents = [
        { type: 'content_block_start', content_block: { type: 'text' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Let me check...' } },
        { type: 'content_block_stop' },
        { type: 'content_block_start', content_block: { type: 'tool_use', id: 'tool-1', name: 'search' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"q": "test"}' } },
        { type: 'content_block_stop' },
        { type: 'message_stop' },
      ];

      mockMessagesCreate.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockStreamEvents) {
            yield event;
          }
        },
      });

      const result = await provider.sendMessage(
        [{ role: 'user', content: 'Search for test' }],
        {},
        undefined,
        () => {}
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('text');
      expect(result[1].type).toBe('tool_use');
    });
  });

  // ==========================================================================
  // continueWithToolResult TESTS
  // ==========================================================================

  describe('continueWithToolResult', () => {
    it('should continue conversation after tool use', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'The weather is sunny' }],
      });

      const originalMessages = [
        { role: 'user' as const, content: 'What is the weather in NYC?' },
      ];

      const assistantToolUse = [
        {
          type: 'tool_use' as const,
          id: 'tool-123',
          name: 'get_weather',
          input: { location: 'NYC' },
        },
      ];

      const toolResults = [
        {
          type: 'tool_result' as const,
          tool_use_id: 'tool-123',
          content: 'Weather in NYC: 72°F, sunny',
        },
      ];

      const result = await provider.continueWithToolResult(
        originalMessages,
        assistantToolUse,
        toolResults
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', text: 'The weather is sunny' });

      // Verify the correct message structure was sent
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'user', content: 'What is the weather in NYC?' },
            { role: 'assistant', content: assistantToolUse },
            { role: 'user', content: toolResults },
          ]),
        })
      );
    });

    it('should pass tools for continued use', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Done' }],
      });

      const tools = [
        {
          name: 'another_tool',
          description: 'Another tool',
          input_schema: { type: 'object' as const, properties: {} },
        },
      ];

      await provider.continueWithToolResult(
        [{ role: 'user', content: 'Test' }],
        [{ type: 'tool_use', id: 't1', name: 'test', input: {} }],
        [{ type: 'tool_result', tool_use_id: 't1', content: 'result' }],
        {},
        tools
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: tools,
        })
      );
    });
  });

  // ==========================================================================
  // isAvailable TESTS
  // ==========================================================================

  describe('isAvailable', () => {
    it('should return true when API is available', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      });

      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API Error'));

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it('should make minimal API call to check availability', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      });

      await provider.isAvailable();

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        })
      );
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should propagate API errors', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(Buffer.from('fake'));

      mockMessagesCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        provider.analyzeImage({ filePath: '/tmp/chart.png' }, 'Analyze')
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle malformed streaming responses gracefully', async () => {
      const mockStreamEvents = [
        { type: 'content_block_start', content_block: { type: 'tool_use', id: 'tool-1', name: 'test' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{invalid json' } },
        { type: 'content_block_stop' },
        { type: 'message_stop' },
      ];

      mockMessagesCreate.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockStreamEvents) {
            yield event;
          }
        },
      });

      // Should not throw, just keep empty input
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await provider.sendMessage(
        [{ role: 'user', content: 'Test' }],
        {},
        undefined,
        () => {}
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('tool_use');
      expect((result[0] as any).input).toEqual({}); // Empty due to parse failure

      consoleSpy.mockRestore();
    });

    it('should handle network errors during image fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        provider.analyzeImage({ url: 'https://example.com/chart.png' }, 'Analyze')
      ).rejects.toThrow('Network error');
    });
  });
});
