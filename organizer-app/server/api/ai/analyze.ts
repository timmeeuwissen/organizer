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
      // But catch any updateLastUsed errors that occur due to missing Pinia store on server
      // We'll just skip the lastUsed update since it's not critical for the analysis
      let result;
      try {
        result = await provider.analyzeText(body.text)
      } catch (analysisError: any) {
        // Check if the error is related to Pinia/store access
        if (analysisError.message && 
            (analysisError.message.includes('no active Pinia') || 
             analysisError.message.includes('getActivePinia()'))) {
          
          console.warn('Pinia store not available in server context, skipping lastUsed update')
          
          // Instead of extending, let's create a modified copy of the provider
          // that doesn't rely on the Pinia store
          const providerCopy = { ...provider };
          
          // Override just the updateLastUsed method to be a no-op
          providerCopy.updateLastUsed = async () => {
            return Promise.resolve();
          };
          
          // Use the modified provider
          const serverProvider = providerCopy;
          
          // Try again with the modified provider
          result = await serverProvider.analyzeText(body.text)
        } else {
          // If it's not a Pinia error, rethrow
          throw analysisError
        }
      }
      
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
