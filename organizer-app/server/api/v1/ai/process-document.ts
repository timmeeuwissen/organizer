import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { z } from 'zod'
import { getProvider } from '~/utils/api/aiProviders'
import { getAdminDb } from '~/server/utils/firebaseAdmin'
import type { AIIntegrationData } from '~/types/models/aiIntegration'

const IntegrationSchema = z.object({
  provider: z.enum(['openai', 'gemini', 'xai', 'claude']),
  apiKey: z.string().min(1)
}).passthrough()

const BodySchema = z.object({
  text: z.string().min(1),
  integration: IntegrationSchema,
  hints: z.object({
    modules: z.array(z.string()).optional()
  }).optional()
})

const ALL_MODULES = [
  { module: 'people', collection: 'people', nameFields: ['firstName', 'lastName'] },
  { module: 'projects', collection: 'projects', nameFields: ['title'] },
  { module: 'tasks', collection: 'tasks', nameFields: ['title'] },
  { module: 'meetings', collection: 'meetings', nameFields: ['title'] },
  { module: 'teams', collection: 'teams', nameFields: ['name'] }
] as const

/**
 * POST /api/v1/ai/process-document
 *
 * Analyzes a document (email, notes, etc.) and returns structured entities
 * across all organizer modules, with suggested actions.
 *
 * Authentication: Bearer API token (via apiAuth middleware)
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const uid = event.context.uid as string
  if (!uid) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized' }) }

  const raw = await readBody(event)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: parsed.error.flatten()
    })
  }

  const { text, integration, hints } = parsed.data
  const requestedModules = hints?.modules ?? ALL_MODULES.map(m => m.module)

  // Fetch existing data from Firestore for context
  const db = getAdminDb()
  const contextData: Record<string, Array<Record<string, unknown>>> = {}

  await Promise.all(
    ALL_MODULES
      .filter(m => requestedModules.includes(m.module))
      .map(async ({ module, collection }) => {
        const snap = await db
          .collection(collection)
          .where('userId', '==', uid)
          .limit(100)
          .get()
        contextData[module] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      })
  )

  // Build an enriched prompt for the AI
  const contextSummary = Object.entries(contextData)
    .map(([module, items]) => {
      if (items.length === 0) { return `${module}: (none)` }
      const names = items.slice(0, 20).map((item) => {
        const name = (item.firstName && item.lastName)
          ? `${item.firstName} ${item.lastName}`
          : (item.title || item.name || item.id)
        return `  - ${name} (id: ${item.id})`
      }).join('\n')
      return `${module}:\n${names}`
    })
    .join('\n\n')

  const prompt = `You are an assistant that analyzes documents and extracts structured information.

DOCUMENT TO ANALYZE:
---
${text}
---

EXISTING DATA IN THE ORGANIZER:
${contextSummary}

Extract the following from the document and return ONLY a JSON object with this exact structure:
{
  "summary": "<1-2 sentence summary of the document>",
  "entities": {
    "people": [{"name": "<full name>", "matchedId": "<id if matched or null>", "confidence": 0.0-1.0}],
    "tasks": [{"title": "<task title>", "dueDate": "<ISO date or null>", "assigneeId": "<person id or null>", "matchedId": "<id if matched or null>"}],
    "meetings": [{"title": "<meeting title>", "date": "<ISO date or null>", "participants": ["<name>"]}],
    "projects": [{"name": "<project name>", "matchedId": "<id if matched or null>"}]
  },
  "suggestedActions": [
    {"module": "<module name>", "action": "create|link|update", "payload": {<relevant fields>}, "reason": "<why>"}
  ]
}

Match entities against existing data where possible. Only include entities actually mentioned in the document.`

  try {
    const provider = getProvider(integration as AIIntegrationData)

    let rawResult: unknown
    try {
      rawResult = await provider.analyzeText(prompt)
    } catch (analysisError: unknown) {
      const msg = analysisError instanceof Error ? analysisError.message : String(analysisError)
      if (msg.includes('no active Pinia') || msg.includes('getActivePinia()')) {
        const p = provider as typeof provider & { updateLastUsed: () => Promise<void> }
        const prev = p.updateLastUsed
        p.updateLastUsed = async () => {}
        try {
          rawResult = await p.analyzeText(prompt)
        } finally {
          p.updateLastUsed = prev
        }
      } else {
        throw analysisError
      }
    }

    // The AI provider returns an AIAnalysisResult — extract the text content
    const resultText = typeof rawResult === 'object' && rawResult !== null
      ? ((rawResult as Record<string, unknown>).text || (rawResult as Record<string, unknown>).content || JSON.stringify(rawResult))
      : String(rawResult)

    // Parse the JSON from the AI response
    let structured: unknown
    try {
      const jsonMatch = String(resultText).match(/\{[\s\S]*\}/)
      structured = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: String(resultText), entities: {}, suggestedActions: [] }
    } catch {
      structured = { summary: String(resultText), entities: {}, suggestedActions: [] }
    }

    return { success: true, result: structured }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
})
