import type { AIAnalysisResult, AIIntegrationData, AIAnalysisEntity } from '~/types/models/aiIntegration'
import type { AIProvider } from './AIProvider'
import { useAuthStore } from '~/stores/auth'

// OpenAI API endpoints
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'
const OPENAI_MODELS_ENDPOINT = '/models'
const OPENAI_CHAT_ENDPOINT = '/chat/completions'

/**
 * Implementation of the OpenAI provider API
 */
export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string = 'gpt-4'; // Default to GPT-4
  
  /**
   * Constructor
   * @param integration The integration data
   */
  constructor(public integration: AIIntegrationData) {
    if (integration.provider !== 'openai') {
      throw new Error('Invalid provider type for OpenAIProvider');
    }
    
    this.apiKey = integration.apiKey || '';
    if (!this.apiKey) {
      console.warn('OpenAI initialized without an API key');
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
      const response = await fetch(`${OPENAI_API_BASE_URL}${OPENAI_MODELS_ENDPOINT}`, {
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
      console.error('OpenAI connection test failed:', error);
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
      
      // Prepare the system message that instructs OpenAI how to analyze the text
      const systemMessage = `
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
      
      // Send request to OpenAI API
      const response = await fetch(`${OPENAI_API_BASE_URL}${OPENAI_CHAT_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemMessage },
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
      return this.processOpenAIResult(aiResult);
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      throw error;
    } finally {
      // Update the last used timestamp
      await this.updateLastUsed();
    }
  }
  
  /**
   * Process the OpenAI response to ensure it matches our AIAnalysisResult format
   */
  private processOpenAIResult(result: any): AIAnalysisResult {
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
