import { defineEventHandler, readBody } from 'h3'
import { getProvider } from '~/utils/api/aiProviders'

/**
 * API endpoint to test an AI integration token
 * Uses the provider implementation's testConnection method
 * to validate the API key for the specified provider
 */
export default defineEventHandler(async (event) => {
  try {
    // Get request body
    const body = await readBody(event)
    
    if (!body.provider || !body.apiKey) {
      return {
        success: false,
        error: 'Missing required fields: provider and apiKey'
      }
    }

    // Create a temporary integration object
    const testIntegration = {
      provider: body.provider,
      apiKey: body.apiKey,
      name: 'Test Integration',
      enabled: true,
      connected: false,
      createdAt: new Date()
    }
    
    try {
      // Get the provider implementation using the existing factory function
      const provider = getProvider(testIntegration)
      
      // Test connection using the provider's implementation
      const result = await provider.testConnection()
      
      return {
        success: result,
        error: result ? null : 'Could not connect with the provided API key'
      }
    } catch (err: any) {
      console.error('Provider test error:', err)
      return {
        success: false,
        error: err.message || `Error testing connection: ${body.provider}`
      }
    }
  } catch (error: any) {
    console.error('Error testing AI integration:', error)
    return {
      success: false,
      error: error.message || 'An error occurred while testing the integration'
    }
  }
})
