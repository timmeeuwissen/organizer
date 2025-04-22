import type { AIIntegrationData } from '~/types/models/aiIntegration'
import type { AIProvider } from './AIProvider'
import { XAIProvider } from './XAIProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { GeminiProvider } from './GeminiProvider'

/**
 * Factory function to get the appropriate AI provider implementation
 * @param integration The AI integration configuration
 * @returns Provider implementation for the specified AI integration
 */
export function getAIProvider(integration: AIIntegrationData): AIProvider {
  switch (integration.provider) {
    case 'xai':
      return new XAIProvider(integration)
    case 'openai':
      return new OpenAIProvider(integration)
    case 'gemini':
      return new GeminiProvider(integration)
    default:
      throw new Error(`Unsupported AI provider type: ${integration.provider}`)
  }
}

// Re-export the types and classes that might be needed
export type { AIProvider }
export { XAIProvider, OpenAIProvider, GeminiProvider }
