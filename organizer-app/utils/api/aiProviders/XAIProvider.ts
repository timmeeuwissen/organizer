import type { AIAnalysisResult, AIIntegrationData, AIAnalysisEntity } from '~/types/models/aiIntegration'
import type { AIProvider } from './AIProvider'
import { useAuthStore } from '~/stores/auth'

// XAI API endpoints
const XAI_API_BASE_URL = 'https://api.xai-service.com/v1'
const XAI_API_TEST_ENDPOINT = '/auth/test'
const XAI_API_ANALYZE_ENDPOINT = '/analyze'

// Type definitions for XAI API responses
interface XAIEntity {
  entity_type: string;
  name: string;
  confidence_score: number;
  properties: Record<string, any>;
}

interface XAIAnalysisResponse {
  request_id: string;
  status: 'success' | 'error';
  entities: XAIEntity[];
  summary: string;
  processing_time: number;
}

/**
 * Implementation of the XAI provider API
 */
export class XAIProvider implements AIProvider {
  private apiKey: string;
  
  /**
   * Constructor
   * @param integration The integration data
   */
  constructor(public integration: AIIntegrationData) {
    if (integration.provider !== 'xai') {
      throw new Error('Invalid provider type for XAIProvider')
    }
    
    this.apiKey = integration.apiKey || '';
    if (!this.apiKey) {
      console.warn('XAI initialized without an API key');
    }
  }
  
  /**
   * Test if the connection to XAI is working by validating the API key
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('Cannot test XAI connection: No API key provided');
        return false;
      }
      
      const response = await fetch(`${XAI_API_BASE_URL}${XAI_API_TEST_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timestamp: new Date().toISOString() })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('XAI connection test failed with status:', response.status, errorData);
        return false;
      }
      
      const data = await response.json();
      return data.authenticated === true;
    } catch (error) {
      console.error('XAI connection test failed:', error);
      return false;
    }
  }
  
  /**
   * Analyze text using XAI API
   * @param text The text to analyze
   */
  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      if (!this.apiKey) {
        throw new Error('No API key provided for XAI analysis');
      }
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text provided for analysis');
      }
      
      // Send request to XAI API
      const response = await fetch(`${XAI_API_BASE_URL}${XAI_API_ANALYZE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          options: {
            entities: true,
            summary: true,
            extract_people: true,
            extract_projects: true,
            extract_tasks: true,
            extract_behaviors: true,
            extract_meetings: true
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('XAI analysis failed with status:', response.status, errorData);
        throw new Error(errorData.message || `XAI API error: ${response.statusText}`);
      }
      
      // Parse the XAI API response
      const data: XAIAnalysisResponse = await response.json();
      
      // Convert XAI API response format to our internal format
      return this.convertXAIResponseToAnalysisResult(data);
    } catch (error) {
      console.error('XAI analysis failed:', error);
      throw error;
    } finally {
      // Update the last used timestamp
      await this.updateLastUsed();
    }
  }
  
  /**
   * Convert the XAI API response to our internal AIAnalysisResult format
   */
  private convertXAIResponseToAnalysisResult(response: XAIAnalysisResponse): AIAnalysisResult {
    const result: AIAnalysisResult = {
      people: [],
      projects: [],
      tasks: [],
      behaviors: [],
      meetings: [],
      summary: response.summary || 'No summary available'
    };
    
    // Process each entity from the API response
    response.entities.forEach(entity => {
      const baseEntity: AIAnalysisEntity = {
        type: this.mapEntityType(entity.entity_type),
        name: entity.name,
        confidence: entity.confidence_score,
        details: { ...entity.properties }
      };
      
      // Add entity to appropriate category
      switch (baseEntity.type) {
        case 'person':
          result.people.push(baseEntity);
          break;
        case 'project':
          result.projects.push(baseEntity);
          break;
        case 'task':
          result.tasks.push(baseEntity);
          break;
        case 'behavior':
          result.behaviors.push(baseEntity);
          break;
        case 'meeting':
          // Convert date strings to Date objects
          if (baseEntity.details.startTime && typeof baseEntity.details.startTime === 'string') {
            baseEntity.details.startTime = new Date(baseEntity.details.startTime);
          }
          if (baseEntity.details.endTime && typeof baseEntity.details.endTime === 'string') {
            baseEntity.details.endTime = new Date(baseEntity.details.endTime);
          }
          result.meetings.push(baseEntity);
          break;
      }
    });
    
    return result;
  }
  
  /**
   * Map XAI entity types to our internal types
   */
  private mapEntityType(xaiType: string): 'person' | 'project' | 'task' | 'behavior' | 'meeting' {
    const typeMap: Record<string, 'person' | 'project' | 'task' | 'behavior' | 'meeting'> = {
      'PERSON': 'person',
      'PROJECT': 'project',
      'TASK': 'task',
      'BEHAVIOR': 'behavior',
      'MEETING': 'meeting',
      'EVENT': 'meeting' // Map EVENT to meeting
    };
    
    return typeMap[xaiType.toUpperCase()] || 'task'; // Default to task if unknown
  }
  
  /**
   * Update the last used timestamp for this integration
   */
  async updateLastUsed(): Promise<void> {
    const authStore = useAuthStore()
    
    try {
      if (!authStore.currentUser?.settings?.aiIntegrations) return

      // Find the integration and update its lastUsed timestamp
      const integrations = [...authStore.currentUser.settings.aiIntegrations]
      const index = integrations.findIndex(i => i.provider === this.integration.provider)
      
      if (index >= 0) {
        integrations[index] = {
          ...integrations[index],
          lastUsed: new Date()
        }
        
        // Update user settings
        await authStore.updateUserSettings({
          aiIntegrations: integrations
        })
      }
    } catch (error) {
      console.error('Error updating lastUsed timestamp:', error)
    }
  }
}
