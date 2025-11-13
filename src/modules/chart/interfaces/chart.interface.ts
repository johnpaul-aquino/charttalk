/**
 * Chart Module Interfaces
 *
 * Defines contracts for chart generation, configuration, and validation services
 */

export interface ChartConfig {
  symbol: string;
  interval: string;
  range?: string;
  theme?: 'light' | 'dark';
  style?: 'candle' | 'line' | 'bar' | 'area' | 'heikinAshi' | 'hollowCandle' | 'baseline' | 'hiLo' | 'column';
  width?: number;
  height?: number;
  studies?: ChartStudy[];
  drawings?: ChartDrawing[];
}

export interface ChartStudy {
  name: string;
  input?: Record<string, any>;
  override?: Record<string, any>;
}

export interface ChartDrawing {
  name: string;
  input: Record<string, any>;
  override?: Record<string, any>;
}

export interface ChartMetadata {
  format: string;
  resolution: string;
  generatedAt: string;
  expiresAt?: string;
}

export interface ChartGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageData?: string;
  localPath?: string;
  metadata: ChartMetadata;
  apiResponse: {
    statusCode: number;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
  };
  error?: string;
}

export interface ChartConfigConstructionResult {
  success: boolean;
  config: ChartConfig;
  reasoning: string;
  warnings: string[];
}

export interface ChartValidationResult {
  valid: boolean;
  errors: ValidationError[];
  suggestions: string[];
  rateLimitCheck: RateLimitCheck;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface RateLimitCheck {
  withinLimits: boolean;
  checks: {
    resolution?: { pass: boolean; message: string };
    studyCount?: { pass: boolean; message: string };
    drawingCount?: { pass: boolean; message: string };
  };
}

// Service Interfaces

export interface IChartGenerationService {
  generateChart(
    config: ChartConfig,
    storage?: boolean,
    format?: 'png' | 'jpeg'
  ): Promise<ChartGenerationResult>;

  generateChartToFile(
    config: ChartConfig,
    filePath: string,
    format?: 'png' | 'jpeg'
  ): Promise<ChartGenerationResult>;
}

export interface IChartConfigService {
  constructFromNaturalLanguage(
    naturalLanguage: string,
    preferences?: {
      symbol?: string;
      exchange?: string;
      interval?: string;
      range?: string;
      theme?: 'light' | 'dark';
      resolution?: string;
    }
  ): Promise<ChartConfigConstructionResult>;

  detectSymbol(text: string, preferredExchange?: string): { symbol: string; exchange: string; fullSymbol: string } | null;
  detectTimeRange(text: string): string;
  detectInterval(text: string, range: string): string;
  detectTheme(text: string): 'light' | 'dark';
  detectChartStyle(text: string): ChartConfig['style'];
  detectIndicators(text: string, availableIndicators: any[]): ChartStudy[];
  detectDrawings(text: string): Promise<ChartDrawing[]>;
  parseResolution(resolution: string): { width: number; height: number };
}

export interface IChartValidationService {
  validate(
    config: ChartConfig,
    planLevel?: string
  ): Promise<ChartValidationResult>;

  validateResolution(width: number, height: number, planLevel: string): ValidationError | null;
  validateStudyCount(studyCount: number, planLevel: string): ValidationError | null;
  validateDrawingCount(drawingCount: number, planLevel: string): ValidationError | null;
}
