import { defineEventHandler, readBody } from 'h3'
import { $fetch } from 'ofetch'  // Using ofetch which is built into Nuxt

// API endpoint configurations
const OPENAI_API_URL = 'https://api.openai.com/v1/models'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const XAI_API_URL = 'https://api.x.ai/v1/models'

/**
 * Test an OpenAI API key by making a request to the models endpoint
 */
async function testOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await $fetch(OPENAI_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    return !!response
  } catch (error) {
    console.error('OpenAI key test failed:', error)
    return false
  }
}

/**
 * Test a Google Gemini API key by making a request to the models endpoint
 */
async function testGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await $fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'GET'
    })
    
    return !!response
  } catch (error) {
    console.error('Gemini key test failed:', error)
    return false
  }
}

/**
 * Test an XAI (Grok) API key by making a validation request
 */
async function testXAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await $fetch(XAI_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
    })
    
    return !!response
  } catch (error) {
    console.error('XAI key test failed:', error)
    return false
  }
}

/**
 * API endpoint to test an AI integration token
 * Tests if the provided API key works for the specified AI provider
 * Directly tests the connection without using a proxy
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

    let result = false
    
    // Test the API key directly with the appropriate provider
    switch (body.provider) {
      case 'openai':
        result = await testOpenAIKey(body.apiKey)
        break
      case 'gemini':
        result = await testGeminiKey(body.apiKey)
        break
      case 'xai':
        result = await testXAIKey(body.apiKey)
        break
      default:
        return {
          success: false,
          error: `Unsupported provider: ${body.provider}`
        }
    }
    
    return {
      success: result,
      error: result ? null : 'Could not connect with the provided API key'
    }
  } catch (error: any) {
    console.error('Error testing AI integration:', error)
    return {
      success: false,
      error: error.message || 'An error occurred while testing the integration'
    }
  }
})
