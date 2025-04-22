import type { AIAnalysisResult, AIIntegrationData } from '~/types/models/aiIntegration'
import type { AIProvider } from './AIProvider'
import { useAuthStore } from '~/stores/auth'

/**
 * Implementation of the Gemini provider
 */
export class GeminiProvider implements AIProvider {
  /**
   * Constructor
   * @param integration The integration data
   */
  constructor(public integration: AIIntegrationData) {
    if (integration.provider !== 'gemini') {
      throw new Error('Invalid provider type for GeminiProvider')
    }
  }
  
  /**
   * Test if the connection to Gemini is working
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`Testing Gemini connection with API key: ${this.integration.apiKey?.substring(0, 3)}...`)
      
      // This is a placeholder for actual API testing
      // In a real implementation, this would call the Gemini API with the apiKey
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
      
      // For demo purposes, we'll simulate a successful connection 70% of the time
      const success = Math.random() > 0.3
      
      return success
    } catch (error) {
      console.error('Gemini connection test failed:', error)
      return false
    }
  }
  
  /**
   * Analyze text using Gemini
   */
  async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      console.log(`Analyzing text with Gemini: ${text.substring(0, 50)}...`)
      
      // In a real implementation, this would call the Gemini API
      // For demo purposes, we'll return a mocked analysis result
      await new Promise(resolve => setTimeout(resolve, 2500)) // Simulate API delay
      
      // Another variation of mock results
      return {
        people: [
          {
            type: 'person',
            name: 'Maria Garcia',
            confidence: 0.91,
            details: {
              firstName: 'Maria',
              lastName: 'Garcia',
              email: 'maria.g@example.com',
              organization: 'Product Department',
              notes: 'Product manager'
            }
          }
        ],
        projects: [],
        tasks: [
          {
            type: 'task',
            name: 'Quarterly roadmap review',
            confidence: 0.79,
            details: {
              title: 'Quarterly roadmap review',
              description: 'Review and adjust Q3 roadmap',
              status: 'todo',
              priority: 'medium'
            }
          }
        ],
        behaviors: [
          {
            type: 'behavior',
            name: 'Strategic thinking',
            confidence: 0.68,
            details: {
              title: 'Strategic thinking',
              description: 'Incorporate more strategic thinking into product planning',
              type: 'wantToDoBetter'
            }
          }
        ],
        meetings: [
          {
            type: 'meeting',
            name: 'Stakeholder alignment',
            confidence: 0.85,
            details: {
              title: 'Stakeholder alignment',
              description: 'Align product roadmap with stakeholder expectations',
              location: 'Conference room B',
              startTime: new Date(Date.now() + 345600000) // 4 days from now
            }
          }
        ],
        summary: 'Email discussing product planning with Maria Garcia mentioned as the key product manager. References a quarterly roadmap review that needs to be done and an upcoming stakeholder alignment meeting.'
      }
    } catch (error) {
      console.error('Gemini analysis failed:', error)
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
