/**
 * AI Integration models and types
 */

/**
 * AI provider types supported by the application
 */
export type AIProviderType = 'openai' | 'gemini' | 'xai';

/**
 * Data about an AI integration - stored in user settings
 */
export interface AIIntegrationData {
  /** The provider type */
  provider: AIProviderType;
  /** Display name for the integration */
  name: string;
  /** API key for authentication */
  apiKey: string;
  /** Whether this integration is enabled */
  enabled: boolean;
  /** Whether this integration is successfully connected */
  connected: boolean;
  /** Last time this integration was used */
  lastUsed?: Date;
  /** When this integration was created */
  createdAt?: Date;
  /** When this integration was last updated */
  updatedAt?: Date;
}

/**
 * A single entity extracted by AI analysis
 */
export interface AIAnalysisEntity {
  /** The type of entity */
  type: 'person' | 'project' | 'task' | 'behavior' | 'meeting';
  /** The name of the entity */
  name: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Additional details about the entity */
  details: Record<string, any>;
}

/**
 * Result of AI analysis on text
 */
export interface AIAnalysisResult {
  /** People extracted from the text */
  people: AIAnalysisEntity[];
  /** Projects extracted from the text */
  projects: AIAnalysisEntity[];
  /** Tasks extracted from the text */
  tasks: AIAnalysisEntity[];
  /** Behaviors extracted from the text */
  behaviors: AIAnalysisEntity[];
  /** Meetings extracted from the text */
  meetings: AIAnalysisEntity[];
  /** Summary of the text */
  summary: string;
}
