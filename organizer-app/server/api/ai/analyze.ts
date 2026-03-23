import {
  defineEventHandler,
  readBody,
  createError,
  setResponseHeader,
  isError,
} from 'h3'
import { z } from 'zod'
import { getProvider } from '~/utils/api/aiProviders'
import type { AIIntegrationData } from '~/types/models/aiIntegration'
import type { AIProvider } from '~/utils/api/aiProviders/AIProvider'

const IntegrationSchema = z
  .object({
    provider: z.enum(['openai', 'gemini', 'xai']),
    name: z.string().optional(),
    apiKey: z.string().min(1),
    enabled: z.boolean().optional(),
    connected: z.boolean().optional(),
  })
  .passthrough()

const BodySchema = z.object({
  integration: IntegrationSchema,
  text: z.string().min(1),
})

/**
 * API endpoint to analyze text using AI
 * Uses the provider implementation's analyzeText method
 * to process text for the specified provider
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

    const integration = parsed.data.integration as AIIntegrationData
    const text = parsed.data.text

    try {
      const provider = getProvider(integration)
      let result
      try {
        result = await provider.analyzeText(text)
      } catch (analysisError: unknown) {
        const msg =
          analysisError instanceof Error ? analysisError.message : String(analysisError)
        if (
          msg.includes('no active Pinia') ||
          msg.includes('getActivePinia()')
        ) {
          console.warn(
            'Pinia store not available in server context, skipping lastUsed update'
          )
          const p = provider as AIProvider & {
            updateLastUsed: () => Promise<void>
          }
          const prev = p.updateLastUsed
          p.updateLastUsed = async () => {}
          try {
            result = await p.analyzeText(text)
          } finally {
            p.updateLastUsed = prev
          }
        } else {
          throw analysisError
        }
      }

      return {
        success: true,
        result,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Text analysis error:', err)
      return {
        success: false,
        error:
          message ||
          `Error analyzing text with provider: ${integration.provider}`,
      }
    }
  } catch (error: unknown) {
    if (isError(error)) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error in AI text analysis endpoint:', error)
    return {
      success: false,
      error: message || 'An error occurred during text analysis',
    }
  }
})
