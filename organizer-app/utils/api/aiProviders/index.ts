import type { AIIntegrationData } from '~/types/models/aiIntegration'
import type { AIProvider } from './AIProvider'
import { XAIProvider } from './XAIProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { GeminiProvider } from './GeminiProvider'

/**
 * Factory function to get the appropriate AI provider implementation
 * @param integration The AI integration data
 * @returns Provider implementation for the account type
 */
export function getProvider(integration: AIIntegrationData): AIProvider {
  if (!integration || !integration.provider) {
    throw new Error('Invalid integration: missing provider type')
  }
  
  // Create the appropriate provider based on the type
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

/**
 * Check if an AI integration is valid and ready to use
 * @param integration The AI integration to check
 * @returns True if the integration is valid and can be used
 */
export function isValidAIIntegration(integration: AIIntegrationData): boolean {
  return (
    integration &&
    integration.enabled &&
    integration.connected &&
    !!integration.apiKey
  )
}

// Export all provider implementations
export { XAIProvider } from './XAIProvider'
export { OpenAIProvider } from './OpenAIProvider'
export { GeminiProvider } from './GeminiProvider'
