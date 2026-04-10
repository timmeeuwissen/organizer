import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { z } from 'zod'

const EmailPersonSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

const BodySchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().positive(),
  smtpEncryption: z.enum(['none', 'tls', 'starttls']),
  username: z.string().min(1),
  password: z.string().min(1),
  email: z.object({
    subject: z.string(),
    from: EmailPersonSchema,
    to: z.array(EmailPersonSchema),
    cc: z.array(EmailPersonSchema).optional(),
    body: z.string()
  })
})

/**
 * Send an email via SMTP (paired with an IMAP account)
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

  const { smtpHost, smtpPort, smtpEncryption, username, password, email } = parsed.data

  try {
    const nodemailer = await import('nodemailer')

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpEncryption === 'tls',
      auth: { user: username, pass: password },
      ...(smtpEncryption === 'starttls' ? { starttls: { required: true } } : {})
    } as any)

    await transporter.sendMail({
      from: `"${email.from.name}" <${email.from.email}>`,
      to: email.to.map(r => `"${r.name}" <${r.email}>`).join(', '),
      cc: email.cc?.map(r => `"${r.name}" <${r.email}>`).join(', '),
      subject: email.subject,
      text: email.body
    })

    return { success: true }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'SMTP send failed'
    })
  }
})
