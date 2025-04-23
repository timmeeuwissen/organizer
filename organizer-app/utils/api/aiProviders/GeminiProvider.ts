import type { AIAnalysisResult } from '~/types/models/aiIntegration'
import { BaseAIProvider } from './BaseAIProvider'

// Gemini API endpoints
// Use the server proxy for external APIs to avoid CORS issues
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_MODEL = 'models/gemini-pro' // Using Gemini Pro model
const GEMINI_GENERATE_CONTENT = `/${GEMINI_MODEL}:generateContent`

// Helper to get the API URL, either direct or through proxy
function getApiUrl(endpoint: string): string {
  return `${GEMINI_API_BASE_URL}${endpoint}`
}

/**
 * Implementation of the Gemini provider API
 */
export class GeminiProvider extends BaseAIProvider {
  constructor(integration: any) {
    super(integration);
    
    if (integration.provider !== 'gemini') {
      throw new Error('Invalid provider type for GeminiProvider');
    }
  }
  
  /**
   * Test if the connection to Gemini is working by validating the API key
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('Cannot test Gemini connection: No API key provided');
        return false;
      }
      
      // Send a simple request to verify the API key works
      const apiUrl = getApiUrl(`/${GEMINI_MODEL}`);
      const response = await fetch(`${apiUrl}?key=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini connection test failed with status:', response.status, errorData);
        return false;
      }
      
      // If we get here, we successfully accessed the API
      return true;
    } catch (error) {
      this.logError(error, 'Gemini connection test failed');
      return false;
    }
  }
  
  /**
   * Analyze text using Gemini API
   * @param text The text to analyze
   */
  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      if (!this.apiKey) {
        throw new Error('No API key provided for Gemini analysis');
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text provided for analysis');
      }
      
      // Get the system prompt from the base provider
      const systemPrompt = this.getAnalysisSystemPrompt();
      
      // Send request to Gemini API
      const apiUrl = getApiUrl(GEMINI_GENERATE_CONTENT);
      console.log(`Sending request to Gemini API: ${apiUrl}`);
      
      const response = await fetch(`${apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: text }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.0, // Low temperature for more deterministic outputs
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini analysis failed with status:', response.status, errorData);
        throw new Error(errorData.error?.message || `Gemini API error: ${response.statusText}`);
      }
      
      // Parse the Gemini API response
      const data = await response.json();
      
      // Extract the result from the Gemini response
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
        throw new Error('Unexpected response format from Gemini API');
      }
      
      // Get the text content
      const textContent = data.candidates[0].content.parts[0].text;
      
      // Find the JSON portion in the response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not find valid JSON in Gemini response');
      }
      
      // Parse the JSON content
      const jsonString = jsonMatch[0];
      const aiResult = JSON.parse(jsonString);
      
      // Process the result to ensure it matches our expected format
      return this.processAnalysisResult(aiResult);
    } catch (error) {
      this.logError(error, 'Gemini analysis failed');
      
      // Rethrow the error for the UI to handle
      throw error;
    } finally {
      // Update the last used timestamp
      await this.updateLastUsed();
    }
  }
  
}
