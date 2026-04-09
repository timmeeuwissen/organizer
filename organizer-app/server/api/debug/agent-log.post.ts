import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const body = await readBody<Record<string, unknown>>(event)
  const line = `${JSON.stringify({ ...body, timestamp: (body.timestamp as number) ?? Date.now() })}\n`
  const dir = join(process.cwd(), '.cursor')
  mkdirSync(dir, { recursive: true })
  appendFileSync(join(dir, 'debug-c78056.log'), line, 'utf8')
  return { ok: true }
})
