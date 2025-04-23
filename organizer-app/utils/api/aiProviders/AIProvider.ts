import type { AIAnalysisResult, AIIntegrationData } from '~/types/models/aiIntegration'

/**
 * Interface for AI Providers (OpenAI, Gemini, Grok/XAI)
 * All AI provider implementations must implement this interface
 */
export interface AIProvider {
  /**
   * The integration data used to initialize this provider
   */
  integration: AIIntegrationData;
  
  /**
   * Test the connection to the AI provider
   * @returns Promise that resolves to true if connection is successful, false otherwise
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Analyze text using the AI provider
   * @param text The text to analyze
   * @returns Promise that resolves to the analysis result
   */
  analyzeText(text: string): Promise<AIAnalysisResult>;
  
  /**
   * Update the last used timestamp for this integration
   */
  updateLastUsed(): Promise<void>;
}
