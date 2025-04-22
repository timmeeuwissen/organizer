// AI Integration plugin - Supports XAI, OpenAI, and Gemini
import { defineNuxtPlugin } from 'nuxt/app'
import { useAuthStore } from '~/stores/auth'
import type { AIAnalysisResult, AIIntegrationData } from '~/types/models/aiIntegration'

export default defineNuxtPlugin((nuxtApp) => {
  // Get auth store to access user settings
  const authStore = useAuthStore()

  // Main AI client with support for multiple providers
  const aiClient = {
    /**
     * Get all available AI integrations for the current user
     */
    getEnabledIntegrations(): AIIntegrationData[] {
      if (!authStore.currentUser?.settings?.aiIntegrations) return []
      return authStore.currentUser.settings.aiIntegrations.filter(ai => ai.enabled)
    },

    /**
     * Check if any AI integrations are enabled
     */
    hasEnabledIntegrations(): boolean {
      return this.getEnabledIntegrations().length > 0
    },

    /**
     * Get a specific AI integration by provider name
     */
    getIntegration(provider: string): AIIntegrationData | null {
      const integrations = this.getEnabledIntegrations()
      return integrations.find(i => i.provider === provider) || null
    },

    /**
     * Analyze text using the specified AI provider
     */
    async analyzeText(text: string, provider: string): Promise<AIAnalysisResult> {
      // Get the integration data for this provider
      const integration = this.getIntegration(provider)
      if (!integration) {
        throw new Error(`AI provider '${provider}' not found or not enabled`)
      }

      try {
        // Call the appropriate provider-specific analysis function
        let result: AIAnalysisResult
        switch (integration.provider) {
          case 'xai':
            result = await this.analyzeWithXAI(text, integration.apiKey || '')
            break
          case 'openai':
            result = await this.analyzeWithOpenAI(text, integration.apiKey || '')
            break
          case 'gemini':
            result = await this.analyzeWithGemini(text, integration.apiKey || '')
            break
          default:
            throw new Error(`Unsupported AI provider: ${integration.provider}`)
        }

        // Update the integration's last used timestamp
        // This is done as a side effect to help track usage
        this.updateLastUsed(integration.provider)

        return result
      } catch (error) {
        console.error(`Error analyzing text with ${provider}:`, error)
        throw error
      }
    },

    /**
     * Update the lastUsed timestamp for an integration
     */
    async updateLastUsed(provider: string): Promise<void> {
      try {
        if (!authStore.currentUser?.settings?.aiIntegrations) return

        // Find the integration and update its lastUsed timestamp
        const integrations = [...authStore.currentUser.settings.aiIntegrations]
        const index = integrations.findIndex(i => i.provider === provider)
        
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
        // We don't re-throw this error as it's not critical to the main function
      }
    },

    /**
     * XAI analysis implementation
     */
    async analyzeWithXAI(text: string, apiKey: string): Promise<AIAnalysisResult> {
      // In a real implementation, this would call the XAI API
      console.log('Analyzing with XAI:', { textLength: text.length, apiKey })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate a mock analysis result
      return {
        people: [
          {
            type: 'person',
            name: 'John Smith',
            confidence: 0.92,
            details: {
              firstName: 'John',
              lastName: 'Smith',
              email: 'john.smith@example.com',
              organization: 'Acme Corp',
              notes: 'Mentioned as the project leader'
            }
          },
          {
            type: 'person',
            name: 'Sarah Johnson',
            confidence: 0.85,
            details: {
              firstName: 'Sarah',
              lastName: 'Johnson',
              email: 'sarah.j@example.com',
              organization: 'Client Company',
              notes: 'Client representative'
            }
          }
        ],
        projects: [
          {
            type: 'project',
            name: 'Website Redesign',
            confidence: 0.88,
            details: {
              title: 'Website Redesign',
              description: 'Complete overhaul of company website',
              status: 'inProgress',
              priority: 'high'
            }
          }
        ],
        tasks: [
          {
            type: 'task',
            name: 'Update homepage mockups',
            confidence: 0.78,
            details: {
              title: 'Update homepage mockups',
              description: 'Incorporate feedback from last meeting',
              status: 'todo',
              priority: 'high',
              dueDate: new Date(Date.now() + 86400000) // tomorrow
            }
          },
          {
            type: 'task',
            name: 'Review content strategy',
            confidence: 0.65,
            details: {
              title: 'Review content strategy',
              description: 'Ensure alignment with brand guidelines',
              status: 'todo',
              priority: 'medium'
            }
          }
        ],
        behaviors: [
          {
            type: 'behavior',
            name: 'Active listening',
            confidence: 0.72,
            details: {
              title: 'Active listening',
              description: 'Practice active listening in client meetings',
              type: 'wantToDoBetter'
            }
          }
        ],
        meetings: [
          {
            type: 'meeting',
            name: 'Design review',
            confidence: 0.91,
            details: {
              title: 'Design review',
              description: 'Review latest design mockups with team',
              location: 'Conference Room A',
              startTime: new Date(Date.now() + 172800000) // day after tomorrow
            }
          }
        ],
        summary: 'This appears to be an email about the website redesign project. John Smith is leading the effort with Sarah Johnson as the client representative. Key tasks include updating homepage mockups and reviewing content strategy. A design review meeting is scheduled soon.'
      }
    },

    /**
     * OpenAI analysis implementation
     */
    async analyzeWithOpenAI(text: string, apiKey: string): Promise<AIAnalysisResult> {
      // In a real implementation, this would call the OpenAI API
      console.log('Analyzing with OpenAI:', { textLength: text.length, apiKey })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      
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
    },

    /**
     * Gemini analysis implementation
     */
    async analyzeWithGemini(text: string, apiKey: string): Promise<AIAnalysisResult> {
      // In a real implementation, this would call the Gemini API
      console.log('Analyzing with Gemini:', { textLength: text.length, apiKey })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2500))
      
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
    }
  }

  return {
    provide: {
      ai: aiClient
    }
  }
})
