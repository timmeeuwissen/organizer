import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { z } from 'zod'

const BodySchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  encryption: z.enum(['none', 'tls', 'starttls']),
  username: z.string().min(1),
  password: z.string().min(1),
  page: z.number().int().nonnegative().optional().default(0),
  pageSize: z.number().int().positive().optional().default(50)
})

/**
 * Fetch emails from a POP3 server (inbox only)
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

  const { host, port, encryption, username, password, page, pageSize } = parsed.data

  try {
    const POP3Client = (await import('node-pop3')).default
    const client = new POP3Client(port, host, {
      tlserrs: false,
      enabletls: encryption === 'tls',
      debug: false
    })

    const emails: any[] = await new Promise((resolve, reject) => {
      const collected: any[] = []

      client.on('connect', () => {
        client.login(username, password)
      })

      client.on('login', (status: boolean, count: number) => {
        if (!status) {
          reject(new Error('POP3 login failed'))
          return
        }
        if (count === 0) {
          client.quit()
          resolve([])
          return
        }
        // Fetch message list
        client.list()
      })

      client.on('list', (status: boolean, msgcount: number, msgnumber: number, data: string, rawdata: string) => {
        if (!status) {
          client.quit()
          resolve([])
          return
        }
        // Parse list: each line is "msgnum octets"
        const lines = rawdata.trim().split('\r\n').filter(Boolean)
        const total = lines.length
        const start = page * pageSize
        const slice = lines.slice(start, start + pageSize)

        if (slice.length === 0) {
          client.quit()
          resolve([])
          return
        }

        let fetched = 0
        for (const line of slice) {
          const msgNum = parseInt(line.split(' ')[0], 10)
          client.retr(msgNum)
        }

        client.on('retr', (status: boolean, msgnumber: number, data: string) => {
          if (status) {
            // Parse minimal headers from raw message
            const headerEnd = data.indexOf('\r\n\r\n')
            const headers = headerEnd > -1 ? data.substring(0, headerEnd) : data
            const subjectMatch = headers.match(/^Subject:\s*(.+)$/mi)
            const fromMatch = headers.match(/^From:\s*(.+)$/mi)
            const dateMatch = headers.match(/^Date:\s*(.+)$/mi)

            collected.push({
              id: `pop3-${msgnumber}-${Date.now()}`,
              subject: subjectMatch?.[1]?.trim() || '(no subject)',
              from: { name: fromMatch?.[1]?.trim() || '', email: '' },
              to: [],
              date: dateMatch ? new Date(dateMatch[1].trim()) : new Date(),
              read: false,
              folder: 'inbox',
              body: '',
              attachments: [],
              accountId: username
            })
          }
          fetched++
          if (fetched >= slice.length) {
            client.quit()
            resolve(collected)
          }
        })
      })

      client.on('error', reject)
    })

    return {
      emails,
      totalCount: emails.length,
      page,
      pageSize,
      hasMore: false // POP3 doesn't support server-side pagination reliably
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'POP3 fetch failed'
    })
  }
})
