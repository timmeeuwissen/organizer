import type { AIAnalysisResult, AIIntegrationData } from '~/types/models/aiIntegration'

/**
 * Base interface for AI providers
 */
export interface AIProvider {
  /**
   * The integration data for this provider
   */
  integration: AIIntegrationData;
  
  /**
   * Test if the connection to the AI provider is working
   * @returns Promise that resolves to a boolean indicating if the connection was successful
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Analyze text to extract entities and generate a summary
   * @param text The text to analyze
   * @returns Promise that resolves to an AIAnalysisResult
   */
  analyzeText(text: string): Promise<AIAnalysisResult>;
  
  /**
   * Update the last used timestamp for this integration
   */
  updateLastUsed(): Promise<void>;
}
