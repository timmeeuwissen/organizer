import type { AIAnalysisResult } from '~/types/models/aiIntegration'
import { BaseAIProvider } from './BaseAIProvider'

// OpenAI API endpoints
// Use the server proxy for external APIs to avoid CORS issues
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'
const OPENAI_MODELS_ENDPOINT = '/models'
const OPENAI_CHAT_ENDPOINT = '/chat/completions'

// Helper to get the API URL, either direct or through proxy
function getApiUrl(endpoint: string): string {
  return `${OPENAI_API_BASE_URL}${endpoint}`
}

/**
 * Implementation of the OpenAI provider API
 */
export class OpenAIProvider extends BaseAIProvider {
  private model: string = 'gpt-4'; // Default to GPT-4
  
  constructor(integration: any) {
    super(integration);
    
    if (integration.provider !== 'openai') {
      throw new Error('Invalid provider type for OpenAIProvider');
    }
  }
  
  /**
   * Test if the connection to OpenAI is working by validating the API key
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('Cannot test OpenAI connection: No API key provided');
        return false;
      }
      
      // Simple test: List available models
      const response = await fetch(getApiUrl(OPENAI_MODELS_ENDPOINT), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI connection test failed with status:', response.status, errorData);
        return false;
      }
      
      // If we get here, we successfully accessed the API
      return true;
    } catch (error) {
      this.logError(error, 'OpenAI connection test failed');
      return false;
    }
  }
  
  /**
   * Analyze text using OpenAI API
   * @param text The text to analyze
   */
  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      if (!this.apiKey) {
        throw new Error('No API key provided for OpenAI analysis');
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text provided for analysis');
      }
      
      // Get the system prompt from the base provider
      const systemPrompt = this.getAnalysisSystemPrompt();
      
      // Send request to OpenAI API
      const response = await fetch(getApiUrl(OPENAI_CHAT_ENDPOINT), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.0, // Low temperature for more deterministic outputs
          max_tokens: 2048, // Enough tokens for a detailed response
          response_format: { type: 'json_object' } // Request JSON format
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI analysis failed with status:', response.status, errorData);
        throw new Error(errorData.message || `OpenAI API error: ${response.statusText}`);
      }
      
      // Parse the OpenAI API response
      const data = await response.json();
      
      // Extract the result from the OpenAI response
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Unexpected response format from OpenAI API');
      }
      
      // Parse the JSON content from the response
      const aiResult = JSON.parse(data.choices[0].message.content);
      
      // Process the result to ensure it matches our expected format
      return this.processAnalysisResult(aiResult);
    } catch (error) {
      this.logError(error, 'OpenAI analysis failed');
      
      // Rethrow the error for the UI to handle
      throw error;
    } finally {
      // Update the last used timestamp
      await this.updateLastUsed();
    }
  }
  
}
