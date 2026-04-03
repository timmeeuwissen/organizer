import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { z } from 'zod'

const BodySchema = z.object({
  protocol: z.enum(['imap', 'pop3']),
  host: z.string().min(1),
  port: z.number().int().positive(),
  encryption: z.enum(['none', 'tls', 'starttls']),
  username: z.string().min(1),
  password: z.string().min(1),
})

/**
 * Test IMAP or POP3 connection credentials
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

  const { protocol, host, port, encryption, username, password } = parsed.data

  try {
    if (protocol === 'imap') {
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
      await client.logout()
      return { success: true }
    } else {
      const POP3Client = (await import('node-pop3')).default
      const client = new POP3Client(port, host, {
        tlserrs: false,
        enabletls: encryption === 'tls',
        debug: false,
      })
      await new Promise<void>((resolve, reject) => {
        client.on('connect', () => {
          client.login(username, password)
        })
        client.on('login', (status: boolean) => {
          if (status) {
            client.quit()
            resolve()
          } else {
            reject(new Error('POP3 login failed'))
          }
        })
        client.on('error', reject)
      })
      return { success: true }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' }
  }
})
