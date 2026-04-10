import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { z } from 'zod'
import { appendAuditJsonLine } from '../../utils/auditLog'

const BodySchema = z.object({
  type: z.enum(['SUCCESS', 'ERROR', 'INFO', 'WARNING']),
  text: z.string().min(1).max(20_000),
  userId: z.string().nullable().optional(),
  timestamp: z.string().optional()
})

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const raw = await readBody(event)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid audit payload',
      data: parsed.error.flatten()
    })
  }

  const { auditLogPath } = useRuntimeConfig()
  const logPath = auditLogPath || 'logs/audit.log'

  const ts = parsed.data.timestamp || new Date().toISOString()
  await appendAuditJsonLine(logPath, {
    ts,
    type: parsed.data.type,
    text: parsed.data.text,
    userId: parsed.data.userId ?? null
  })

  return { ok: true }
})
