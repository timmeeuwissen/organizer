import { defineEventHandler, readBody } from 'h3'
import { $fetch } from 'ofetch'
import { requireAuth } from '~/server/utils/auth'
import { getFirestore } from 'firebase-admin/firestore'
import type { AIIntegrationData, AIProviderType, AIAnalysisResult } from '~/types/models/aiIntegration'

export default defineEventHandler(async (event) => {
  try {
    // Require authentication and get user data
    const user = await requireAuth(event)
    
    // Get request body
    const body = await readBody(event)
    const { providerId, text } = body
    
    if (!providerId) {
      return {
        statusCode: 400,
        message: 'No AI provider selected'
      }
    }
    
    if (!text) {
      return {
        statusCode: 400,
        message: 'No text to analyze'
      }
    }
    
    // Find the user's AI integration with the specified provider ID
    const integration = user.settings?.aiIntegrations?.find(
      (i) => i.provider === providerId
    )
    
    if (!integration || !integration.enabled) {
      return {
        statusCode: 400,
        message: 'AI provider not found or not enabled'
      }
    }
    
    if (!integration.apiKey) {
      return {
        statusCode: 400,
        message: 'API key not found for selected provider'
      }
    }
    
    // This is a server-side endpoint, so we directly call the AI provider APIs
    // rather than using the client-side provider code
    let result: AIAnalysisResult
    
    // Get the standard system prompt for text analysis
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
    `
    
    // Handle different provider types
    switch (providerId) {
      case 'openai':
        try {
          // Call OpenAI API directly
          const openAIData = await $fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: {
              model: 'gpt-4', // Use the latest model
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
              ],
              temperature: 0.0, // Low temperature for more deterministic outputs
              max_tokens: 2048, // Enough tokens for a detailed response
              response_format: { type: 'json_object' } // Request JSON format
            }
          })
          
          result = JSON.parse(openAIData.choices[0].message.content)
        } catch (error: any) {
          console.error('OpenAI API error:', error)
          throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`)
        }
        break
      
      case 'gemini':
        try {
          // Call Gemini API directly
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${integration.apiKey}`
          const geminiData = await $fetch(geminiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
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
                temperature: 0.0,
                topK: 1,
                topP: 1
              }
            }
          })
          
          const geminiText = geminiData.candidates[0].content.parts[0].text
          
          // Strip any markdown code block formatting if present
          const jsonText = geminiText.replace(/```json\n([\s\S]*)\n```/g, '$1')
                                    .replace(/```\n([\s\S]*)\n```/g, '$1')
                                    .trim()
          
          result = JSON.parse(jsonText)
        } catch (error: any) {
          console.error('Gemini API error:', error)
          throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`)
        }
        break
      
      case 'xai':
        try {
          // Call XAI API directly (using fictional endpoint for Grok/XAI)
          const xaiData = await $fetch('https://api.xai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: {
              model: 'grok-1',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
              ],
              temperature: 0.0
            }
          })
          
          result = JSON.parse(xaiData.choices[0].message.content)
        } catch (error: any) {
          console.error('XAI API error:', error)
          throw new Error(`XAI API error: ${error.message || 'Unknown error'}`)
        }
        break
        
      default:
        throw new Error(`Unsupported AI provider: ${providerId}`)
    }
    
    // Process and validate the result
    const processedResult: AIAnalysisResult = {
      people: Array.isArray(result.people) ? result.people : [],
      projects: Array.isArray(result.projects) ? result.projects : [],
      tasks: Array.isArray(result.tasks) ? result.tasks : [],
      behaviors: Array.isArray(result.behaviors) ? result.behaviors : [],
      meetings: Array.isArray(result.meetings) ? result.meetings : [],
      summary: result.summary || 'No summary available'
    }
    
    // Update the integration's last used timestamp
    const db = getFirestore()
    const userRef = db.collection('users').doc(user.id)
    
    // Find the index of the integration in the array
    const integrations = user.settings?.aiIntegrations || []
    const index = integrations.findIndex(i => i.provider === providerId)
    
    if (index >= 0) {
      // Create a copy of integrations
      const updatedIntegrations = [...integrations]
      
      // Update the lastUsed timestamp for the specified integration
      updatedIntegrations[index] = {
        ...updatedIntegrations[index],
        lastUsed: new Date()
      }
      
      // Update the user document
      await userRef.update({
        'settings.aiIntegrations': updatedIntegrations
      })
    }
    
    // Return the result
    return {
      statusCode: 200,
      result
    }
  } catch (error: any) {
    console.error('AI analysis error:', error)
    
    return {
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to analyze text'
    }
  }
})
