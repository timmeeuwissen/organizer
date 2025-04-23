import type { AIAnalysisResult, AIIntegrationData, AIAnalysisEntity } from '~/types/models/aiIntegration'
import type { AIProvider } from './AIProvider'
import { useAuthStore } from '~/stores/auth'

/**
 * Base implementation for all AI Providers
 * Contains common functionality shared by all providers
 */
export abstract class BaseAIProvider implements AIProvider {
  protected apiKey: string;
  
  /**
   * Constructor
   * @param integration The integration data
   */
  constructor(public integration: AIIntegrationData) {
    this.apiKey = integration.apiKey || '';
    if (!this.apiKey) {
      console.warn(`${this.constructor.name} initialized without an API key`);
    }
  }
  
  /**
   * Get the standard system prompt for text analysis.
   * This is the default prompt used by all AI providers.
   */
  protected getAnalysisSystemPrompt(): string {
    return `
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
  }
  
  /**
   * Test if the connection to the AI provider is working by validating the API key
   * Each provider must implement this method
   */
  abstract testConnection(): Promise<boolean>;
  
  /**
   * Analyze text using the AI provider
   * Each provider must implement this method
   */
  abstract analyzeText(text: string): Promise<AIAnalysisResult>;
  
  /**
   * Validate an entity and ensure it conforms to our expected format
   * @param entity The entity to validate
   * @param type The type of entity
   */
  protected validateEntity(entity: any, type: 'person' | 'project' | 'task' | 'behavior' | 'meeting'): AIAnalysisEntity {
    return {
      type: type,
      name: entity.name || 'Unnamed ' + type,
      confidence: typeof entity.confidence === 'number' ? entity.confidence : 0.5,
      details: entity.details || {}
    };
  }
  
  /**
   * Process the AI response to ensure it matches our AIAnalysisResult format
   * @param result The raw result from the AI provider
   */
  protected processAnalysisResult(result: any): AIAnalysisResult {
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
            console.error('Error converting task dueDate to Date:', e);
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
            console.error('Error converting meeting startTime to Date:', e);
            delete validMeeting.details.startTime;
          }
        }
        
        if (validMeeting.details.endTime && typeof validMeeting.details.endTime === 'string') {
          try {
            validMeeting.details.endTime = new Date(validMeeting.details.endTime);
          } catch (e) {
            console.error('Error converting meeting endTime to Date:', e);
            delete validMeeting.details.endTime;
          }
        }
        
        return validMeeting;
      });
    }
    
    return processed;
  }
  
  /**
   * Update the last used timestamp for this integration
   * Safely handles both client and server contexts
   */
  async updateLastUsed(): Promise<void> {
    try {
      // First check if we can access Pinia - if not, we might be in a server context
      // This is a safety measure to prevent errors in SSR or API routes
      let isClientContext = false;
      try {
        // This will throw if we're not in a client context with Pinia available
        const { getActivePinia } = await import('pinia');
        isClientContext = !!getActivePinia();
      } catch (error) {
        console.warn('Pinia not available, skipping lastUsed update (probably server context)');
        return; // Exit early if we're in a server context
      }
      
      if (!isClientContext) return;
      
      // We're in a client context, proceed with store operations
      const authStore = useAuthStore();
      
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
      // Non-critical error, we can continue without updating the timestamp
    }
  }
  
  /**
   * Helper method to log detailed error information
   * @param error The error to log
   * @param context Additional context about the error
   */
  protected logError(error: any, context: string): void {
    console.error(`${context}:`, error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error(`Network error: Unable to reach API server. This could be due to network connectivity issues, CORS restrictions, or the API endpoint being unavailable.`);
    } else if (error instanceof SyntaxError) {
      console.error(`Parsing error: The API returned a response that could not be parsed as valid JSON.`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
    }
  }
}
