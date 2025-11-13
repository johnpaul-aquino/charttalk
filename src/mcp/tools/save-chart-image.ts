/**
 * Save Chart Image Tool
 *
 * Saves a base64-encoded chart image to local disk for AI analysis.
 * Enables AI models to visually analyze charts using the Read tool.
 */

import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Input schema
export const SaveChartImageInputSchema = z.object({
  imageData: z
    .string()
    .describe('Base64-encoded image data from generate_chart_image'),
  filename: z
    .string()
    .optional()
    .describe('Optional filename (default: chart-{timestamp}.png)'),
  directory: z
    .string()
    .optional()
    .describe('Optional directory path (default: /tmp)'),
});

export type SaveChartImageInput = z.infer<typeof SaveChartImageInputSchema>;

// Output
export interface SaveChartImageOutput {
  success: boolean;
  path?: string;
  error?: string;
  metadata?: {
    size: number;
    savedAt: string;
  };
}

/**
 * Save chart image tool handler
 */
export async function saveChartImageTool(
  input: SaveChartImageInput
): Promise<SaveChartImageOutput> {
  try {
    // Validate base64 data
    if (!input.imageData || input.imageData.length === 0) {
      return {
        success: false,
        error: 'No image data provided',
      };
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = input.filename || `chart-${timestamp}.png`;

    // Ensure filename has proper extension
    const ext = path.extname(filename);
    const finalFilename = ext ? filename : `${filename}.png`;

    // Determine directory (default to /tmp)
    const directory = input.directory || os.tmpdir();

    // Full path
    const filePath = path.join(directory, finalFilename);

    // Decode base64 to buffer
    const imageBuffer = Buffer.from(input.imageData, 'base64');

    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Write file
    await fs.writeFile(filePath, imageBuffer);

    // Get file stats
    const stats = await fs.stat(filePath);

    return {
      success: true,
      path: filePath,
      metadata: {
        size: stats.size,
        savedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error saving image',
    };
  }
}

// Tool definition for MCP server
export const saveChartImageToolDefinition = {
  name: 'save_chart_image',
  description: `Saves a base64-encoded chart image to local disk for AI visual analysis.

**Purpose:**
This tool bridges the gap between chart generation and AI analysis. After generating a chart with \`storage: false\`, use this tool to save the base64 image data to a local file that AI models can read and analyze visually.

**Workflow:**
1. Generate chart with \`storage: false\` → Get base64 imageData
2. Use this tool to save imageData to disk → Get file path
3. Use Read tool on the file path → AI can analyze the chart visually

**Use Cases:**
- Read RSI values from indicator panels
- Identify MACD crossovers
- Analyze volume patterns
- Detect support/resistance levels
- Confirm price action signals
- Perform multi-timeframe technical analysis

**Input:**
- \`imageData\`: Base64-encoded image string from generate_chart_image
- \`filename\`: Optional custom filename (default: chart-{timestamp}.png)
- \`directory\`: Optional save directory (default: /tmp)

**Output:**
- \`success\`: Boolean indicating save success
- \`path\`: Absolute path to saved image file
- \`metadata\`: File size and save timestamp

**Example:**
\`\`\`javascript
// Step 1: Generate with base64
const chart = await generate_chart_image({
  config: {...},
  storage: false
});

// Step 2: Save to disk
const saved = await save_chart_image({
  imageData: chart.imageData,
  filename: "btc-1h-analysis.png"
});

// Step 3: Analyze
// Now AI can use Read tool on saved.path to analyze the chart
\`\`\`

**Note:** Images saved to /tmp are temporary and may be cleaned up by the system. For permanent storage, specify a different directory.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      imageData: {
        type: 'string' as const,
        description: 'Base64-encoded image data from generate_chart_image (with storage: false)',
      },
      filename: {
        type: 'string' as const,
        description: 'Optional filename (default: chart-{timestamp}.png)',
      },
      directory: {
        type: 'string' as const,
        description: 'Optional directory path (default: /tmp)',
      },
    },
    required: ['imageData'] as const,
  } as const,
};
