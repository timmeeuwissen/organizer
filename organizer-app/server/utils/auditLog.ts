import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export interface AuditLinePayload {
  ts: string
  type: string
  text: string
  userId: string | null
}

/**
 * Append one JSON line to the audit log (parseable JSONL for gui-messaging).
 */
export async function appendAuditJsonLine(
  logPath: string,
  payload: AuditLinePayload
): Promise<void> {
  const abs = resolve(logPath)
  await mkdir(dirname(abs), { recursive: true })
  await appendFile(abs, `${JSON.stringify(payload)}\n`, 'utf8')
}
