/**
 * Chart Download Proxy Endpoint
 *
 * Proxies chart image downloads from chart-img.com to avoid CORS issues.
 * Frontend can use this endpoint to download charts that would otherwise
 * be blocked by browser CORS policy.
 *
 * GET /api/v1/charts/download?url=<chart-img-url>
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Allowed URL prefixes for security
 * Only allows chart-img.com URLs to prevent abuse as an open proxy
 */
const ALLOWED_URL_PREFIXES = [
  'https://r2.chart-img.com/',
  'https://api.chart-img.com/',
];

/**
 * Validate that URL is from an allowed domain
 */
function isAllowedUrl(url: string): boolean {
  return ALLOWED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Extract filename from URL or generate a default
 */
function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      return lastPart;
    }
  } catch {
    // Ignore URL parsing errors
  }
  return `chart-${Date.now()}.png`;
}

/**
 * GET handler - Download chart image via proxy
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  // Validate URL parameter
  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_URL',
          message: 'URL parameter is required',
        },
      },
      { status: 400 }
    );
  }

  // Security: Only allow chart-img.com URLs
  if (!isAllowedUrl(url)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Only chart-img.com URLs are allowed',
        },
      },
      { status: 400 }
    );
  }

  try {
    // Fetch the image from chart-img.com
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChartTalk-Proxy/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[Download Proxy] Upstream error: ${response.status} for URL: ${url}`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: `Failed to fetch chart: ${response.status}`,
          },
        },
        { status: response.status }
      );
    }

    // Get the image data
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    const filename = extractFilename(url);

    console.log(`[Download Proxy] Successfully proxied ${buffer.byteLength} bytes for: ${filename}`);

    // Return the image with download headers
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
        // CORS headers to allow frontend access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('[Download Proxy] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to download chart',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler - CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
