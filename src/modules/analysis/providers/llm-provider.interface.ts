/**
 * LLM Provider Interface
 *
 * Defines the contract for LLM providers that can analyze chart images.
 * Implementations include OpenAI Vision, Claude Vision, Gemini Pro Vision, etc.
 *
 * @module analysis/providers
 */

/**
 * Options for image analysis
 */
export interface AnalysisOptions {
  /**
   * Model to use for analysis (e.g., "gpt-4o-mini", "gpt-4o")
   */
  model?: string;

  /**
   * Maximum tokens in the response
   */
  maxTokens?: number;

  /**
   * Temperature for response randomness (0-1)
   */
  temperature?: number;

  /**
   * Image detail level for vision models ("low", "high", "auto")
   */
  detail?: 'low' | 'high' | 'auto';

  /**
   * System prompt to prepend to the analysis request
   */
  systemPrompt?: string;
}

/**
 * Image input for analysis
 */
export interface ImageInput {
  /**
   * Image URL (must be publicly accessible)
   */
  url?: string;

  /**
   * Base64-encoded image data
   */
  base64?: string;

  /**
   * Local file path (will be read and converted to base64)
   */
  filePath?: string;
}

/**
 * LLM Provider Interface
 *
 * All LLM providers must implement this interface to ensure compatibility
 * with the analysis service layer.
 */
export interface ILLMProvider {
  /**
   * Analyze a chart image using the LLM's vision capabilities
   *
   * @param imageInput - Image to analyze (URL, base64, or file path)
   * @param prompt - Analysis prompt/instructions
   * @param options - Optional configuration for the analysis
   * @returns Analysis result as text
   * @throws Error if analysis fails
   */
  analyzeImage(
    imageInput: ImageInput,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<string>;

  /**
   * Get the provider name (e.g., "OpenAI", "Anthropic", "Google")
   */
  getName(): string;

  /**
   * Get the current model being used
   */
  getModel(): string;

  /**
   * Check if the provider is available (API key configured, etc.)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get supported models for this provider
   */
  getSupportedModels(): string[];

  /**
   * Set the model to use (must be in supported models list)
   */
  setModel(model: string): void;
}
