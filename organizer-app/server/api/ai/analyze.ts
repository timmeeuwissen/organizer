import { defineEventHandler, readBody } from 'h3'
import { getProvider } from '~/utils/api/aiProviders'
import type { AIIntegrationData } from '~/types/models/aiIntegration'

/**
 * API endpoint to analyze text using AI
 * Uses the provider implementation's analyzeText method
 * to process text for the specified provider
 */
export default defineEventHandler(async (event) => {
  try {
    // Get request body
    const body = await readBody(event)
    
    if (!body.integration || !body.text) {
      return {
        success: false,
        error: 'Missing required fields: integration and text'
      }
    }

    // Validate the integration object
    const integration: AIIntegrationData = body.integration
    
    if (!integration.provider || !integration.apiKey) {
      return {
        success: false,
        error: 'Invalid integration: missing provider or API key'
      }
    }
    
    try {
      // Get the provider implementation using the factory function
      const provider = getProvider(integration)
      
      // Call the analyzeText method on the provider
      const result = await provider.analyzeText(body.text)
      
      return {
        success: true,
        result: result
      }
    } catch (err: any) {
      console.error('Text analysis error:', err)
      return {
        success: false,
        error: err.message || `Error analyzing text with provider: ${integration.provider}`
      }
    }
  } catch (error: any) {
    console.error('Error in AI text analysis endpoint:', error)
    return {
      success: false,
      error: error.message || 'An error occurred during text analysis'
    }
  }
})
