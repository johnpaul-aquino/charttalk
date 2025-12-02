/**
 * SSE (Server-Sent Events) Middleware
 *
 * Provides utilities for streaming responses via Server-Sent Events
 * Used for real-time AI chat responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { StreamEvent } from '../../modules/conversation';

/**
 * SSE Headers for streaming responses
 */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no', // Disable nginx buffering
};

/**
 * Format data as SSE event
 */
export function formatSSEEvent(event: string, data: unknown): string {
  const jsonData = JSON.stringify(data);
  return `event: ${event}\ndata: ${jsonData}\n\n`;
}

/**
 * Format SSE comment (keep-alive ping)
 */
export function formatSSEComment(comment: string): string {
  return `: ${comment}\n\n`;
}

/**
 * Create a ReadableStream for SSE responses
 */
export function createSSEStream(
  onSubscribe: (controller: SSEController) => Promise<void>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const sseController = new SSEController(controller);

      try {
        await onSubscribe(sseController);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        sseController.sendEvent('error', { code: 'STREAM_ERROR', message: errorMessage });
      } finally {
        sseController.close();
      }
    },
  });
}

/**
 * SSE Controller for sending events
 */
export class SSEController {
  private controller: ReadableStreamDefaultController;
  private encoder: TextEncoder;
  private isClosed: boolean = false;

  constructor(controller: ReadableStreamDefaultController) {
    this.controller = controller;
    this.encoder = new TextEncoder();
  }

  /**
   * Send an SSE event
   */
  sendEvent(event: string, data: unknown): void {
    if (this.isClosed) return;

    try {
      const formatted = formatSSEEvent(event, data);
      this.controller.enqueue(this.encoder.encode(formatted));
    } catch (error) {
      console.error('[SSE] Error sending event:', error);
    }
  }

  /**
   * Send a StreamEvent (convenience method)
   */
  sendStreamEvent(streamEvent: StreamEvent): void {
    this.sendEvent(streamEvent.event, streamEvent.data);
  }

  /**
   * Send a keep-alive ping
   */
  sendPing(): void {
    if (this.isClosed) return;

    try {
      const comment = formatSSEComment('ping');
      this.controller.enqueue(this.encoder.encode(comment));
    } catch (error) {
      console.error('[SSE] Error sending ping:', error);
    }
  }

  /**
   * Close the stream
   */
  close(): void {
    if (this.isClosed) return;

    try {
      this.isClosed = true;
      this.controller.close();
    } catch (error) {
      console.error('[SSE] Error closing stream:', error);
    }
  }

  /**
   * Check if stream is closed
   */
  get closed(): boolean {
    return this.isClosed;
  }
}

/**
 * Create SSE Response with proper headers
 */
export function createSSEResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: SSE_HEADERS,
  });
}

/**
 * SSE Middleware wrapper for handlers that return streams
 */
export function withSSE(
  handler: (req: NextRequest) => Promise<ReadableStream>
): (req: NextRequest) => Promise<Response> {
  return async (req: NextRequest) => {
    try {
      const stream = await handler(req);
      return createSSEResponse(stream);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Stream error';

      // Create error stream
      const errorStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const errorEvent = formatSSEEvent('error', {
            code: 'STREAM_ERROR',
            message: errorMessage,
          });
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        },
      });

      return createSSEResponse(errorStream);
    }
  };
}

/**
 * Helper to handle SSE requests with keep-alive
 */
export async function handleSSEWithKeepAlive(
  onSubscribe: (controller: SSEController) => Promise<void>,
  keepAliveInterval: number = 15000 // 15 seconds
): Promise<ReadableStream> {
  return new ReadableStream({
    async start(controller) {
      const sseController = new SSEController(controller);
      let keepAliveTimer: NodeJS.Timeout | null = null;

      try {
        // Start keep-alive pings
        keepAliveTimer = setInterval(() => {
          if (!sseController.closed) {
            sseController.sendPing();
          }
        }, keepAliveInterval);

        // Run the subscriber
        await onSubscribe(sseController);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        sseController.sendEvent('error', { code: 'STREAM_ERROR', message: errorMessage });
      } finally {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
        }
        sseController.close();
      }
    },
  });
}
