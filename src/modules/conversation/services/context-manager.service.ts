/**
 * Context Manager Service
 *
 * Manages conversation context, history, and system prompts for Claude
 */

import { ClaudeMessage } from '../../analysis/providers/claude.provider';
import {
  ChatMessage,
  IContextManagerService,
} from '../interfaces/conversation.interface';

/**
 * Context Manager Service Implementation
 */
export class ContextManagerService implements IContextManagerService {
  private readonly MAX_CONTEXT_TOKENS = 100000; // Claude Opus 4.5 has 200K context
  private readonly SYSTEM_PROMPT_TOKENS = 2000; // Reserve for system prompt

  /**
   * Build conversation history for Claude API
   */
  buildConversationHistory(messages: ChatMessage[]): ClaudeMessage[] {
    return messages
      .filter((m) => m.role !== 'system') // System messages are handled separately
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));
  }

  /**
   * Get system prompt for the conversation
   */
  getSystemPrompt(): string {
    return `You are ChartTalk.ai, an AI assistant that helps traders analyze financial markets using professional TradingView charts.

## Your Capabilities

You have access to the following tools:

1. **generate_chart** - Generate a TradingView chart with technical indicators
   - Creates professional charts for any trading symbol (crypto, stocks, forex, futures)
   - Supports 100+ technical indicators (RSI, MACD, Bollinger Bands, Moving Averages, etc.)
   - Customizable timeframes (1m to 1M), themes (light/dark), and chart styles

2. **analyze_chart** - Perform AI analysis on a generated chart
   - Technical analysis (trend identification, support/resistance, patterns)
   - Trading signals (entry/exit points, stop loss, take profit)
   - Risk assessment and position sizing recommendations

## How to Respond

1. **Chart Requests**: When a user asks for a chart, use the generate_chart tool
   - Parse the request to identify: symbol, timeframe, indicators
   - Common symbols: "Bitcoin" → BINANCE:BTCUSDT, "Apple" → NASDAQ:AAPL, "EUR/USD" → FX:EURUSD

2. **Analysis Requests**: When a user asks for analysis, first generate the chart, then analyze it
   - Provide actionable insights with specific price levels
   - Always include risk management suggestions

3. **Conversational Style**:
   - Be helpful, professional, and concise
   - Explain technical concepts when appropriate
   - Use markdown formatting for clarity

## Important Guidelines

- **NOT Financial Advice**: Always remind users that your analysis is for educational purposes only
- **Risk Disclaimer**: When providing trading signals, mention that trading involves risk
- **Accuracy**: If uncertain about a symbol or request, ask for clarification
- **Context Awareness**: Remember previous messages in the conversation

## Example Interactions

User: "Show me Bitcoin with RSI for the last week"
→ Use generate_chart with symbol: BINANCE:BTCUSDT, interval: 4h, range: 1M, studies: [RSI]

User: "What's the trend? Should I buy?"
→ Use analyze_chart on the generated chart, provide analysis with entry/exit levels

User: "Add Bollinger Bands to that chart"
→ Use generate_chart with same symbol/timeframe but add Bollinger Bands to studies`;
  }

  /**
   * Truncate history to fit token limits
   */
  truncateHistory(
    messages: ClaudeMessage[],
    maxTokens: number = this.MAX_CONTEXT_TOKENS
  ): ClaudeMessage[] {
    const availableTokens = maxTokens - this.SYSTEM_PROMPT_TOKENS;

    // Start from the most recent messages
    const reversedMessages = [...messages].reverse();
    const truncated: ClaudeMessage[] = [];
    let totalTokens = 0;

    for (const message of reversedMessages) {
      const messageTokens = this.estimateMessageTokens(message);

      if (totalTokens + messageTokens > availableTokens) {
        break;
      }

      truncated.unshift(message);
      totalTokens += messageTokens;
    }

    // Ensure we always keep at least the last user message
    if (truncated.length === 0 && messages.length > 0) {
      truncated.push(messages[messages.length - 1]);
    }

    return truncated;
  }

  /**
   * Estimate token count for messages
   */
  estimateTokenCount(messages: ClaudeMessage[]): number {
    return messages.reduce((acc, message) => {
      return acc + this.estimateMessageTokens(message);
    }, 0);
  }

  /**
   * Estimate tokens for a single message
   * Claude uses approximately 4 characters per token
   */
  private estimateMessageTokens(message: ClaudeMessage): number {
    if (typeof message.content === 'string') {
      return Math.ceil(message.content.length / 4);
    }

    // For array content (images, etc.)
    return message.content.reduce((acc, block) => {
      if (block.type === 'text') {
        return acc + Math.ceil((block as { text: string }).text.length / 4);
      }
      // Images are approximately 1000 tokens
      return acc + 1000;
    }, 0);
  }
}
