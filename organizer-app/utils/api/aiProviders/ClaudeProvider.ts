import type { AIAnalysisResult } from '~/types/models/aiIntegration'
import { BaseAIProvider } from './BaseAIProvider'

const CLAUDE_API_BASE_URL = 'https://api.anthropic.com/v1'
const CLAUDE_MESSAGES_ENDPOINT = '/messages'
const CLAUDE_MODELS_ENDPOINT = '/models'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

function getApiUrl(endpoint: string): string {
  return `${CLAUDE_API_BASE_URL}${endpoint}`
}

/**
 * Implementation of the Anthropic Claude provider API
 */
export class ClaudeProvider extends BaseAIProvider {
  constructor(integration: any) {
    super(integration)

    if (integration.provider !== 'claude') {
      throw new Error('Invalid provider type for ClaudeProvider')
    }
  }

  /**
   * Test if the connection to Claude is working by validating the API key
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('Cannot test Claude connection: No API key provided')
        return false
      }

      const response = await fetch(getApiUrl(CLAUDE_MODELS_ENDPOINT), {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Claude connection test failed with status:', response.status, errorData)
        return false
      }

      return true
    } catch (error) {
      this.logError(error, 'Claude connection test failed')
      return false
    }
  }

  /**
   * Analyze text using the Claude API
   * @param text The text to analyze
   */
  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      if (!this.apiKey) {
        throw new Error('No API key provided for Claude analysis')
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No text provided for analysis')
      }

      const systemPrompt = this.getAnalysisSystemPrompt()

      const response = await fetch(getApiUrl(CLAUDE_MESSAGES_ENDPOINT), {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: text }],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Claude analysis failed with status:', response.status, errorData)
        throw new Error(
          (errorData as any)?.error?.message || `Claude API error: ${response.statusText}`
        )
      }

      const data = await response.json()

      if (!data.content || !data.content[0] || data.content[0].type !== 'text') {
        throw new Error('Unexpected response format from Claude API')
      }

      const aiResult = JSON.parse(data.content[0].text)

      return this.processAnalysisResult(aiResult)
    } catch (error) {
      this.logError(error, 'Claude analysis failed')
      throw error
    } finally {
      await this.updateLastUsed()
    }
  }
}
