import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { z } from 'zod'

const BodySchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  encryption: z.enum(['none', 'tls', 'starttls']),
  username: z.string().min(1),
  password: z.string().min(1),
})

/**
 * List IMAP folders with message counts
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const raw = await readBody(event)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: parsed.error.flatten(),
    })
  }

  const { host, port, encryption, username, password } = parsed.data

  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({
      host,
      port,
      secure: encryption === 'tls',
      auth: { user: username, pass: password },
      tls: encryption === 'starttls' ? { rejectUnauthorized: false } : undefined,
      logger: false,
    })

    await client.connect()

    const list = await client.list()
    const counts: Record<string, number> = {}

    for (const mailbox of list) {
      try {
        const status = await client.status(mailbox.path, { messages: true })
        counts[mailbox.path] = status.messages ?? 0
      } catch {
        counts[mailbox.path] = 0
      }
    }

    await client.logout()

    return { folders: counts }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'IMAP folder listing failed',
    })
  }
})
