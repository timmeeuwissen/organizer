// AI Integration type definitions

/**
 * AI Integration Data
 * Represents configuration for an AI integration provider like XAI, OpenAI, or Gemini
 */
export interface AIIntegrationData {
  // Provider identifier
  provider: 'xai' | 'openai' | 'gemini';
  
  // Display name for the integration
  name: string;
  
  // API Key (not needed for XAI as it's internal)
  apiKey?: string;
  
  // Whether this integration is enabled
  enabled: boolean;
  
  // Whether this integration is connected successfully
  connected: boolean;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  lastUsed?: Date;
}

/**
 * AI Analysis Entity
 * Represents an entity recognized by AI in text analysis
 */
export interface AIAnalysisEntity {
  // Type of entity
  type: 'person' | 'project' | 'task' | 'behavior' | 'meeting';
  
  // Name or title of the entity
  name: string;
  
  // Confidence score (0-1) that this entity was correctly identified
  confidence: number;
  
  // Detailed properties for this entity
  details: {
    // Common fields
    title?: string;
    description?: string;
    
    // Person-specific fields
    firstName?: string;
    lastName?: string;
    email?: string;
    organization?: string;
    notes?: string;
    
    // Project-specific fields
    status?: string;
    priority?: string;
    
    // Task-specific fields
    dueDate?: Date;
    
    // Behavior-specific fields
    type?: string;
    
    // Meeting-specific fields
    location?: string;
    startTime?: Date;
    endTime?: Date;
    
    // Any other properties
    [key: string]: any;
  };
}

/**
 * AI Analysis Result
 * Complete result returned from an AI text analysis
 */
export interface AIAnalysisResult {
  // Identified entities by type
  people: AIAnalysisEntity[];
  projects: AIAnalysisEntity[];
  tasks: AIAnalysisEntity[];
  behaviors: AIAnalysisEntity[];
  meetings: AIAnalysisEntity[];
  
  // Overall text summary
  summary: string;
}
