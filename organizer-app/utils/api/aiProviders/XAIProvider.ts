import type { AIAnalysisResult } from '~/types/models/aiIntegration'
import { BaseAIProvider } from './BaseAIProvider'

// Grok API endpoints from xAI
// Use the server proxy for external APIs to avoid CORS issues
const GROK_API_BASE_URL = 'https://api.x.ai/v1'
const GROK_API_AUTH_ENDPOINT = '/models'
const GROK_API_COMPLETION_ENDPOINT = '/chat/completions'

// Helper to get the API URL, either direct or through proxy
function getApiUrl(endpoint: string): string {
  return `${GROK_API_BASE_URL}${endpoint}`
}

// Type definitions for Grok API responses
interface GrokEntity {
  type: string;
  name: string;
  confidence: number;
  attributes: Record<string, any>;
}

interface GrokAnalysisResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Implementation of the xAI Grok provider API
 */
export class XAIProvider extends BaseAIProvider {
  /**
   * Constructor
   * @param integration The integration data
   */
  constructor(integration: any) {
    super(integration);
    
    if (integration.provider !== 'xai') {
      throw new Error('Invalid provider type for XAIProvider')
    }
  }
  
  /**
   * Test if the connection to Grok API is working by validating the API key
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('Cannot test Grok API connection: No API key provided');
        return false;
      }
      
      const response = await fetch(getApiUrl(GROK_API_AUTH_ENDPOINT), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Grok API connection test failed with status:', response.status, errorData);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logError(error, 'Grok API connection test failed');
      return false;
    }
  }
  
  /**
   * Analyze text using Grok API
   * @param text The text to analyze
   */
  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      if (!this.apiKey) {
        throw new Error('No API key provided for Grok analysis');
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text provided for analysis');
      }
      
      const apiUrl = getApiUrl(GROK_API_COMPLETION_ENDPOINT);
      console.log(`Sending request to Grok API: ${apiUrl}`);
      
      // Get the system prompt from the base provider
      const systemPrompt = this.getAnalysisSystemPrompt();
      
      // Send request to Grok API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "grok-3-beta",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ],
          temperature: 0.0,
          response_format: { type: "json_object" }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Grok analysis failed with status:', response.status, errorData);
        throw new Error(errorData.error?.message || `Grok API error: ${response.statusText}`);
      }
      
      // Parse the Grok API response
      const data: GrokAnalysisResponse = await response.json();
      
      // Extract the JSON content from the response
      if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Unexpected response format from Grok API');
      }
      
      // Parse the JSON content from the response
      const content = data.choices[0].message.content;
      const analysisResult = JSON.parse(content);
      
      // Convert Grok API response format to our internal format
      return this.processAnalysisResult(analysisResult);
    } catch (error) {
      this.logError(error, 'Grok analysis failed');
      
      // Rethrow the error for the UI to handle
      throw error;
    } finally {
      // Update the last used timestamp
      await this.updateLastUsed();
    }
  }
}
