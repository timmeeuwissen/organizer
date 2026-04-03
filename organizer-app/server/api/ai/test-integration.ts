import {
  defineEventHandler,
  readBody,
  createError,
  setResponseHeader,
  isError,
} from 'h3'
import { z } from 'zod'
import { getProvider } from '~/utils/api/aiProviders'

const BodySchema = z.object({
  provider: z.enum(['openai', 'gemini', 'xai', 'claude']),
  apiKey: z.string().min(1),
})

/**
 * API endpoint to test an AI integration token
 * Uses the provider implementation's testConnection method
 * to validate the API key for the specified provider
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  try {
    const raw = await readBody(event)
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
        data: parsed.error.flatten(),
      })
    }

    const body = parsed.data

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
  } catch (error: unknown) {
    if (isError(error)) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error testing AI integration:', error)
    return {
      success: false,
      error: message || 'An error occurred while testing the integration',
    }
  }
})
