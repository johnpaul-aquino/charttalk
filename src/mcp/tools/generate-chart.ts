/**
 * Generate Chart Tool
 *
 * MCP tool for generating chart images via chart-img.com API.
 */

import { z } from 'zod';
import { container, CHART_GENERATION_SERVICE } from '../../core/di';
import type {
  IChartGenerationService,
  ChartConfig,
  ChartGenerationResult
} from '../../modules/chart';
import path from 'path';
import os from 'os';

// Input schema
export const GenerateChartInputSchema = z.object({
  config: z.any().describe('Chart configuration object'),
  storage: z
    .boolean()
    .optional()
    .default(true)
    .describe('Use storage endpoint (returns URL) instead of direct image'),
  format: z
    .enum(['png', 'jpeg'])
    .optional()
    .default('png')
    .describe('Image format'),
  saveToFile: z
    .boolean()
    .optional()
    .default(false)
    .describe('When storage=false, automatically save image to /tmp for AI analysis'),
  filename: z
    .string()
    .optional()
    .describe('Custom filename when saveToFile=true (default: chart-{timestamp}.png)'),
});

export type GenerateChartInput = z.infer<typeof GenerateChartInputSchema>;

// Output matches ChartGenerationResult
export type GenerateChartOutput = ChartGenerationResult;

/**
 * Generate chart tool handler
 */
export async function generateChartTool(
  input: GenerateChartInput
): Promise<GenerateChartOutput> {
  try {
    // Resolve service from DI container
    const generationService = container.resolve<IChartGenerationService>(CHART_GENERATION_SERVICE);
    const config = input.config as ChartConfig;

    // Special handling for saveToFile mode - use direct file writing to avoid token limits
    if (!input.storage && input.saveToFile) {
      // Generate filename
      const timestamp = Date.now();
      const filename = input.filename || `chart-${timestamp}.${input.format || 'png'}`;
      const tmpDir = os.tmpdir();
      const filePath = path.join(tmpDir, filename);

      // Generate chart directly to file (no base64 in memory)
      const result = await generationService.generateChartToFile(
        config,
        filePath,
        input.format
      );

      return result;
    }

    // Normal mode: return URL from storage endpoint or base64 data
    const result = await generationService.generateChart(
      config,
      input.storage,
      input.format
    );

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating chart',
      metadata: {
        format: '',
        resolution: '',
        generatedAt: new Date().toISOString(),
      },
      apiResponse: {
        statusCode: 500,
      },
    };
  }
}

// Tool definition for MCP server
export const generateChartToolDefinition = {
  name: 'generate_chart_image',
  description: `Generates a chart image by sending the configuration to chart-img.com API v2.

This is the **final step** in the chart generation workflow. It:
1. Sends the validated configuration to chart-img.com
2. Receives the generated chart image
3. Returns either a URL (storage mode) or base64 image data

**Two Output Modes:**

**Storage Mode** (storage: true, DEFAULT, RECOMMENDED):
- Image is stored publicly on chart-img.com
- Returns a URL that expires after 7 days
- Best for: Embedding in messages, presentations, sharing, reliable chart generation
- Example: "https://r2.chart-img.com/..."
- ✅ No token limits, works reliably in all environments

**Direct Mode** (storage: false):
- Returns base64-encoded image data
- No expiration, but larger response
- Best for: Immediate display, local processing
- ⚠️ saveToFile parameter available but may hit MCP token limits (Claude Code limitation)

**Returns:**
- \`success\`: Boolean indicating generation success
- \`imageUrl\`: Public URL (if storage=true)
- \`imageData\`: Base64 data (if storage=false) or save confirmation message
- \`localPath\`: Local file path (if saveToFile=true)
- \`metadata\`: Format, resolution, timestamps
- \`apiResponse\`: Status code, rate limit info

**Error Handling:**
- Automatically retries on network errors (max 3 attempts)
- Returns detailed error messages
- Includes rate limit information

**Rate Limiting:**
- Respects configured plan limits
- Automatically throttles requests
- Returns rate limit remaining in response

**Typical Workflow:**
1. fetch_chart_documentation (optional - get indicator info)
2. construct_chart_config (build configuration)
3. validate_chart_config (pre-flight check)
4. **generate_chart_image** ← You are here
5. AI client displays/embeds the chart

Use this tool:
- After successful validation
- As the final step in chart generation
- To regenerate charts with updated configs

Note: Requires valid CHART_IMG_API_KEY environment variable.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      config: {
        type: 'object' as const,
        description: 'Chart configuration from construct_chart_config',
      },
      storage: {
        type: 'boolean' as const,
        description: 'Use storage endpoint (returns URL). Default: true',
        default: true,
      },
      format: {
        type: 'string' as const,
        enum: ['png', 'jpeg'] as const,
        description: 'Image format. Default: png',
        default: 'png',
      },
      saveToFile: {
        type: 'boolean' as const,
        description: 'When storage=false, automatically save to /tmp for AI analysis. Default: false',
        default: false,
      },
      filename: {
        type: 'string' as const,
        description: 'Custom filename when saveToFile=true (default: chart-{timestamp}.png)',
      },
    },
    required: ['config'] as const,
  } as const,
  annotations: {
    title: 'Generate Chart Image',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};
