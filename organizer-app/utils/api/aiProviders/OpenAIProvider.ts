import type { AIAnalysisResult, AIIntegrationData } from '~/types/models/aiIntegration'
import type { AIProvider } from './AIProvider'
import { useAuthStore } from '~/stores/auth'

/**
 * Implementation of the OpenAI provider
 */
export class OpenAIProvider implements AIProvider {
  /**
   * Constructor
   * @param integration The integration data
   */
  constructor(public integration: AIIntegrationData) {
    if (integration.provider !== 'openai') {
      throw new Error('Invalid provider type for OpenAIProvider')
    }
  }
  
  /**
   * Test if the connection to OpenAI is working
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`Testing OpenAI connection with API key: ${this.integration.apiKey?.substring(0, 3)}...`)
      
      // This is a placeholder for actual API testing
      // In a real implementation, this would call the OpenAI API with the apiKey
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
      
      // For demo purposes, we'll simulate a successful connection 70% of the time
      const success = Math.random() > 0.3
      
      return success
    } catch (error) {
      console.error('OpenAI connection test failed:', error)
      return false
    }
  }
  
  /**
   * Analyze text using OpenAI
   */
  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      console.log(`Analyzing text with OpenAI: ${text.substring(0, 50)}...`)
      
      // In a real implementation, this would call the OpenAI API
      // For demo purposes, we'll return a mocked analysis result
      await new Promise(resolve => setTimeout(resolve, 3000)) // Simulate API delay
      
      // Similar mock result as XAI but with different entities
      return {
        people: [
          {
            type: 'person',
            name: 'Alex Wong',
            confidence: 0.89,
            details: {
              firstName: 'Alex',
              lastName: 'Wong',
              email: 'alex.wong@example.com',
              organization: 'Tech Solutions',
              notes: 'Developer mentioned in context'
            }
          }
        ],
        projects: [
          {
            type: 'project',
            name: 'Mobile App Launch',
            confidence: 0.94,
            details: {
              title: 'Mobile App Launch',
              description: 'Preparation for upcoming mobile app release',
              status: 'active',
              priority: 'urgent'
            }
          }
        ],
        tasks: [
          {
            type: 'task',
            name: 'Finalize user testing',
            confidence: 0.87,
            details: {
              title: 'Finalize user testing',
              description: 'Complete final round of user testing',
              status: 'inProgress',
              priority: 'high'
            }
          }
        ],
        behaviors: [],
        meetings: [
          {
            type: 'meeting',
            name: 'Launch planning',
            confidence: 0.82,
            details: {
              title: 'Launch planning',
              description: 'Discuss marketing strategy for app launch',
              location: 'Virtual meeting',
              startTime: new Date(Date.now() + 259200000) // 3 days from now
            }
          }
        ],
        summary: 'Discussion about the mobile app launch preparations, focusing on finalizing user testing. Alex Wong is handling development tasks. A launch planning meeting is scheduled to discuss marketing strategy.'
      }
    } catch (error) {
      console.error('OpenAI analysis failed:', error)
      throw error
    } finally {
      // Update the last used timestamp
      await this.updateLastUsed()
    }
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
