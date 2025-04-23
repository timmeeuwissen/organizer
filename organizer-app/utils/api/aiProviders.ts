/**
 * This file is kept for backward compatibility.
 * Please use the modular imports from './aiProviders/' directory instead.
 */

import type { AIIntegrationData } from '~/types/models/aiIntegration'
import type { AIProvider } from './aiProviders/AIProvider'
import { getProvider as getProviderFromIndex } from './aiProviders/index'
import { isValidAIIntegration } from './aiProviders/index'

// Important: We're not using export * to avoid circular dependency issues
// Instead, we're explicitly exporting functions needed by the application

/**
 * Factory function to get the appropriate AI provider implementation
 * @param integration The AI integration data
 * @returns Provider implementation for the account type
 */
export function getProvider(integration: AIIntegrationData): AIProvider {
  return getProviderFromIndex(integration)
}

/**
 * Check if an AI integration is valid and ready to use
 * @param integration The AI integration to check
 * @returns True if the integration is valid and can be used
 */
export function isValidIntegration(integration: AIIntegrationData): boolean {
  return isValidAIIntegration(integration)
}
