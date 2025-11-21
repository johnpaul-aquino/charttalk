/**
 * Signal Generation Service
 *
 * Parses AI analysis responses into structured trading signals
 * and validates signal parameters.
 *
 * @module analysis/services
 */

import {
  ISignalGenerationService,
  TradingSignal,
} from '../interfaces/analysis.interface';

/**
 * Signal Generation Service Implementation
 *
 * Handles parsing of AI text responses into structured trading signals,
 * validation of signal parameters, and risk/reward calculations.
 */
export class SignalGenerationService implements ISignalGenerationService {
  /**
   * Parse AI response text into structured trading signal
   *
   * Uses pattern matching to extract trading parameters from natural language:
   * - Signal type: LONG/SHORT/NEUTRAL
   * - Entry price
   * - Stop loss
   * - Take profit
   * - Confidence level
   *
   * @param text - AI analysis response text
   * @returns Parsed trading signal or null if no signal found
   */
  parseAnalysisResponse(text: string): TradingSignal | null {
    try {
      // Initialize signal object
      const signal: Partial<TradingSignal> = {
        timestamp: new Date().toISOString(),
      };

      // Extract signal type
      const signalTypeMatch = text.match(
        /\b(LONG|SHORT|NEUTRAL|BUY|SELL|HOLD)\b/i
      );
      if (signalTypeMatch) {
        const type = signalTypeMatch[1].toUpperCase();
        signal.type =
          type === 'BUY'
            ? 'LONG'
            : type === 'SELL'
            ? 'SHORT'
            : type === 'HOLD'
            ? 'NEUTRAL'
            : (type as 'LONG' | 'SHORT' | 'NEUTRAL');
      } else {
        // Default to NEUTRAL if no clear signal
        signal.type = 'NEUTRAL';
      }

      // Extract entry price (look for various patterns)
      const entryPatterns = [
        /entry[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
        /enter[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
        /buy[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
        /entry price[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
      ];

      for (const pattern of entryPatterns) {
        const match = text.match(pattern);
        if (match) {
          signal.entryPrice = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }

      // Extract stop loss
      const stopPatterns = [
        /stop[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
        /stop loss[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
        /sl[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
      ];

      for (const pattern of stopPatterns) {
        const match = text.match(pattern);
        if (match) {
          signal.stopLoss = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }

      // Extract take profit
      const tpPatterns = [
        /take profit[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
        /target[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
        /tp[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
      ];

      for (const pattern of tpPatterns) {
        const match = text.match(pattern);
        if (match) {
          signal.takeProfit = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }

      // Extract confidence (0-100% or 0.0-1.0)
      const confidencePatterns = [
        /confidence[:\s]+([0-9]+)%/i,
        /confidence[:\s]+([0-9.]+)/i,
      ];

      for (const pattern of confidencePatterns) {
        const match = text.match(pattern);
        if (match) {
          let conf = parseFloat(match[1]);
          // Convert percentage to decimal
          if (conf > 1) {
            conf = conf / 100;
          }
          signal.confidence = Math.min(Math.max(conf, 0), 1);
          break;
        }
      }

      // Default confidence if not found
      if (signal.confidence === undefined) {
        signal.confidence = 0.5; // Default medium confidence
      }

      // Extract symbol (look for common formats)
      // Try exchange:symbol format first (more specific)
      const symbolPatterns = [
        /\b([A-Z]{3,6}:[A-Z]{6,10})\b/,           // BINANCE:BTCUSDT
        /symbol[:\s]+([A-Z0-9:]+)/i,              // Symbol: BINANCE:BTCUSDT
        /\b([A-Z]{2,6}USD[T]?)\b/,                // BTCUSDT (fallback)
      ];

      for (const pattern of symbolPatterns) {
        const match = text.match(pattern);
        if (match) {
          signal.symbol = match[1];
          break;
        }
      }

      // Use reasoning as the full text if no specific reasoning found
      signal.reasoning = this.extractReasoning(text) || text.slice(0, 500);

      // Validate required fields
      if (
        !signal.type ||
        !signal.entryPrice ||
        !signal.stopLoss ||
        !signal.takeProfit
      ) {
        return null; // Incomplete signal
      }

      return signal as TradingSignal;
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return null;
    }
  }

  /**
   * Calculate risk/reward ratio
   *
   * @param entry - Entry price
   * @param stopLoss - Stop loss price
   * @param takeProfit - Take profit price
   * @returns Risk/reward ratio (e.g., 3.0 means 3:1 reward to risk)
   */
  calculateRiskReward(
    entry: number,
    stopLoss: number,
    takeProfit: number
  ): number {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);

    if (risk === 0) {
      return 0;
    }

    return parseFloat((reward / risk).toFixed(2));
  }

  /**
   * Validate trading signal parameters
   *
   * Checks:
   * - All required fields are present
   * - Prices are positive numbers
   * - Stop loss is on correct side of entry
   * - Take profit is on correct side of entry
   * - Risk/reward ratio is reasonable (> 0.5)
   * - Confidence is between 0 and 1
   *
   * @param signal - Trading signal to validate
   * @returns true if signal is valid, false otherwise
   */
  validateSignal(signal: TradingSignal): boolean {
    try {
      // Check required fields
      if (
        !signal.type ||
        !signal.entryPrice ||
        !signal.stopLoss ||
        !signal.takeProfit
      ) {
        return false;
      }

      // Check prices are positive
      if (
        signal.entryPrice <= 0 ||
        signal.stopLoss <= 0 ||
        signal.takeProfit <= 0
      ) {
        return false;
      }

      // Check confidence is valid
      if (signal.confidence < 0 || signal.confidence > 1) {
        return false;
      }

      // Validate LONG signal
      if (signal.type === 'LONG') {
        // Stop loss should be below entry
        if (signal.stopLoss >= signal.entryPrice) {
          return false;
        }
        // Take profit should be above entry
        if (signal.takeProfit <= signal.entryPrice) {
          return false;
        }
      }

      // Validate SHORT signal
      if (signal.type === 'SHORT') {
        // Stop loss should be above entry
        if (signal.stopLoss <= signal.entryPrice) {
          return false;
        }
        // Take profit should be below entry
        if (signal.takeProfit >= signal.entryPrice) {
          return false;
        }
      }

      // Check risk/reward ratio is reasonable
      const rrRatio = this.calculateRiskReward(
        signal.entryPrice,
        signal.stopLoss,
        signal.takeProfit
      );

      if (rrRatio < 0.5) {
        return false; // Risk/reward too poor
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract reasoning/rationale from analysis text
   *
   * Looks for sections that explain the analysis reasoning
   *
   * @param text - Full analysis text
   * @returns Extracted reasoning or null
   */
  private extractReasoning(text: string): string | null {
    const reasoningPatterns = [
      /reasoning[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/is,
      /rationale[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/is,
      /analysis[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/is,
    ];

    for (const pattern of reasoningPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
