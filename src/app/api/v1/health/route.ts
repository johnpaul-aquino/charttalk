/**
 * Health Check Endpoint
 *
 * GET /api/v1/health
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  withCors,
  pipe,
} from '../../../../api/middleware';
import {
  createSuccessResponse,
  jsonResponse,
  HttpStatus,
} from '../../../../api/utils/response.util';
import type { HealthCheckResponse } from '../../../../api/dto/common.dto';
import { getConfig } from '../../../../shared/config/environment.config';
import { container, CHART_IMG_CLIENT } from '../../../../core/di';
import type { ChartImgClient } from '../../../../mcp/utils/chart-img-client';

const startTime = Date.now();

/**
 * GET /api/v1/health
 */
async function handler(req: NextRequest) {
  const config = getConfig();

  // Test chart-img.com API connection
  let chartImgApiStatus: 'up' | 'down' | 'degraded' = 'up';
  try {
    const client = container.resolve<ChartImgClient>(CHART_IMG_CLIENT);
    const result = await client.getExchanges();
    chartImgApiStatus = result.success ? 'up' : 'degraded';
  } catch (error) {
    chartImgApiStatus = 'down';
  }

  const healthData: HealthCheckResponse = {
    status: chartImgApiStatus === 'up' ? 'healthy' : 'degraded',
    version: config.mcp.serverVersion,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services: {
      api: 'up',
      chartImgApi: chartImgApiStatus,
    },
  };

  return jsonResponse(createSuccessResponse(healthData), HttpStatus.OK);
}

// Apply middleware
export const GET = pipe(withCors, withErrorHandler)(handler);

// Handle CORS preflight requests
export { OPTIONS } from '../../../../api/middleware/cors.middleware';
