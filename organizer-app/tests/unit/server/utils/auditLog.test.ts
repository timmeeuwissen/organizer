import { describe, expect, it } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { appendAuditJsonLine } from '~/server/utils/auditLog'

describe('appendAuditJsonLine', () => {
  it('writes one JSON line', async () => {
    const dir = join(tmpdir(), `audit-test-${Date.now()}`)
    const file = join(dir, 'audit.log')
    await appendAuditJsonLine(file, {
      ts: '2025-01-01T00:00:00.000Z',
      type: 'INFO',
      text: 'hello',
      userId: null,
    })
    const raw = await readFile(file, 'utf8')
    expect(raw.trim()).toBe(
      '{"ts":"2025-01-01T00:00:00.000Z","type":"INFO","text":"hello","userId":null}'
    )
    await rm(dir, { recursive: true })
  })
})
