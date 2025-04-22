import type { AIAnalysisResult, AIIntegrationData, AIAnalysisEntity } from '~/types/models/aiIntegration'
import type { AIProvider } from './AIProvider'
import { useAuthStore } from '~/stores/auth'

// Gemini API endpoints
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_MODEL = 'models/gemini-pro' // Using Gemini Pro model
const GEMINI_GENERATE_CONTENT = `/${GEMINI_MODEL}:generateContent`

/**
 * Implementation of the Gemini provider API
 */
export class GeminiProvider implements AIProvider {
  private apiKey: string;
  
  /**
   * Constructor
   * @param integration The integration data
   */
  constructor(public integration: AIIntegrationData) {
    if (integration.provider !== 'gemini') {
      throw new Error('Invalid provider type for GeminiProvider');
    }
    
    this.apiKey = integration.apiKey || '';
    if (!this.apiKey) {
      console.warn('Gemini initialized without an API key');
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
      const response = await fetch(`${GEMINI_API_BASE_URL}/${GEMINI_MODEL}?key=${this.apiKey}`, {
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
      console.error('Gemini connection test failed:', error);
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
      
      // Prepare the system prompt that instructs Gemini how to analyze the text
      const systemPrompt = `
        You are an AI assistant that analyzes text and extracts structured information.
        Extract the following types of entities from the provided text:
        1. People: Identify individuals mentioned, with details like names, roles, and contact info.
        2. Projects: Identify projects mentioned, with details like title, status, and priority.
        3. Tasks: Identify tasks or action items, with details like title, status, and due dates.
        4. Behaviors: Identify behaviors or patterns mentioned, with details like type and description.
        5. Meetings: Identify meetings mentioned, with details like title, location, and time.
        
        Also provide a brief summary of the text.
        
        Format your response as a valid JSON object with the following structure:
        {
          "people": [{"name": "Person Name", "confidence": 0.95, "details": {"firstName": "...", "lastName": "...", "email": "...", "organization": "...", "notes": "..."}}],
          "projects": [{"name": "Project Name", "confidence": 0.9, "details": {"title": "...", "description": "...", "status": "...", "priority": "..."}}],
          "tasks": [{"name": "Task Name", "confidence": 0.85, "details": {"title": "...", "description": "...", "status": "...", "priority": "...", "dueDate": "..."}}],
          "behaviors": [{"name": "Behavior Name", "confidence": 0.8, "details": {"title": "...", "description": "...", "type": "..."}}],
          "meetings": [{"name": "Meeting Name", "confidence": 0.9, "details": {"title": "...", "description": "...", "location": "...", "startTime": "..."}}],
          "summary": "Brief summary of the text..."
        }
        
        For status and priority fields, use values like: 
        - Status: "notStarted", "inProgress", "onHold", "completed", "cancelled", "active", "planning"
        - Priority: "low", "medium", "high", "urgent"
        - Behavior types: "doWell", "wantToDoBetter", "needToImprove"
        
        Provide confidence scores between 0 and 1 indicating how confident you are in each entity extraction.
        If a field is not applicable or not mentioned, omit it from the details.
        Return only the JSON with no additional text.
      `;
      
      // Send request to Gemini API
      const response = await fetch(`${GEMINI_API_BASE_URL}${GEMINI_GENERATE_CONTENT}?key=${this.apiKey}`, {
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
      return this.processGeminiResult(aiResult);
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      throw error;
    } finally {
      // Update the last used timestamp
      await this.updateLastUsed();
    }
  }
  
  /**
   * Process the Gemini response to ensure it matches our AIAnalysisResult format
   */
  private processGeminiResult(result: any): AIAnalysisResult {
    // Create a default result structure
    const processed: AIAnalysisResult = {
      people: [],
      projects: [],
      tasks: [],
      behaviors: [],
      meetings: [],
      summary: result.summary || 'No summary available'
    };
    
    // Process people
    if (Array.isArray(result.people)) {
      processed.people = result.people.map((person: any) => this.validateEntity(person, 'person'));
    }
    
    // Process projects
    if (Array.isArray(result.projects)) {
      processed.projects = result.projects.map((project: any) => this.validateEntity(project, 'project'));
    }
    
    // Process tasks
    if (Array.isArray(result.tasks)) {
      processed.tasks = result.tasks.map((task: any) => {
        const validTask = this.validateEntity(task, 'task');
        
        // Convert date strings to Date objects for special fields
        if (validTask.details.dueDate && typeof validTask.details.dueDate === 'string') {
          try {
            validTask.details.dueDate = new Date(validTask.details.dueDate);
          } catch (e) {
            delete validTask.details.dueDate;
          }
        }
        
        return validTask;
      });
    }
    
    // Process behaviors
    if (Array.isArray(result.behaviors)) {
      processed.behaviors = result.behaviors.map((behavior: any) => this.validateEntity(behavior, 'behavior'));
    }
    
    // Process meetings
    if (Array.isArray(result.meetings)) {
      processed.meetings = result.meetings.map((meeting: any) => {
        const validMeeting = this.validateEntity(meeting, 'meeting');
        
        // Convert date strings to Date objects for special fields
        if (validMeeting.details.startTime && typeof validMeeting.details.startTime === 'string') {
          try {
            validMeeting.details.startTime = new Date(validMeeting.details.startTime);
          } catch (e) {
            delete validMeeting.details.startTime;
          }
        }
        
        if (validMeeting.details.endTime && typeof validMeeting.details.endTime === 'string') {
          try {
            validMeeting.details.endTime = new Date(validMeeting.details.endTime);
          } catch (e) {
            delete validMeeting.details.endTime;
          }
        }
        
        return validMeeting;
      });
    }
    
    return processed;
  }
  
  /**
   * Validate an entity and ensure it conforms to our expected format
   */
  private validateEntity(entity: any, type: 'person' | 'project' | 'task' | 'behavior' | 'meeting'): AIAnalysisEntity {
    return {
      type: type,
      name: entity.name || 'Unnamed ' + type,
      confidence: typeof entity.confidence === 'number' ? entity.confidence : 0.5,
      details: entity.details || {}
    };
  }
  
  /**
   * Update the last used timestamp for this integration
   */
  async updateLastUsed(): Promise<void> {
    const authStore = useAuthStore();
    
    try {
      if (!authStore.currentUser?.settings?.aiIntegrations) return;

      // Find the integration and update its lastUsed timestamp
      const integrations = [...authStore.currentUser.settings.aiIntegrations];
      const index = integrations.findIndex(i => i.provider === this.integration.provider);
      
      if (index >= 0) {
        integrations[index] = {
          ...integrations[index],
          lastUsed: new Date()
        };
        
        // Update user settings
        await authStore.updateUserSettings({
          aiIntegrations: integrations
        });
      }
    } catch (error) {
      console.error('Error updating lastUsed timestamp:', error);
    }
  }
}
