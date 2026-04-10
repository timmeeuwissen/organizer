import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { z } from 'zod'

const BodySchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  encryption: z.enum(['none', 'tls', 'starttls']),
  username: z.string().min(1),
  password: z.string().min(1),
  folder: z.string().optional().default('INBOX'),
  page: z.number().int().nonnegative().optional().default(0),
  pageSize: z.number().int().positive().optional().default(50)
})

/**
 * Fetch emails from an IMAP server
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const raw = await readBody(event)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: parsed.error.flatten()
    })
  }

  const { host, port, encryption, username, password, folder, page, pageSize } = parsed.data

  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({
      host,
      port,
      secure: encryption === 'tls',
      auth: { user: username, pass: password },
      tls: encryption === 'starttls' ? { rejectUnauthorized: false } : undefined,
      logger: false
    })

    await client.connect()

    const mailbox = await client.mailboxOpen(folder)
    const totalCount = mailbox.exists

    const emails: any[] = []

    if (totalCount > 0) {
      // Fetch newest first: calculate sequence range for current page
      const start = Math.max(1, totalCount - (page + 1) * pageSize + 1)
      const end = Math.max(1, totalCount - page * pageSize)

      for await (const msg of client.fetch(`${start}:${end}`, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
        source: false
      })) {
        const env = msg.envelope
        emails.push({
          id: String(msg.uid),
          subject: env?.subject || '(no subject)',
          from: env?.from?.[0]
            ? { name: env.from[0].name || '', email: env.from[0].address || '' }
            : { name: '', email: '' },
          to: (env?.to || []).map((a: any) => ({ name: a.name || '', email: a.address || '' })),
          date: env?.date || new Date(),
          read: msg.flags.has('\\Seen'),
          folder,
          body: '',
          attachments: [],
          accountId: username
        })
      }
      // Return in reverse (newest first)
      emails.reverse()
    }

    await client.logout()

    return {
      emails,
      totalCount,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < totalCount
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'IMAP fetch failed'
    })
  }
})
