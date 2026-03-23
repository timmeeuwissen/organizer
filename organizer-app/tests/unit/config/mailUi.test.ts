import { describe, expect, it } from 'vitest'
import { mergeMailColumnVisibility, normalizeMailPageSize } from '~/config/mailUi'

describe('mailUi config', () => {
  it('normalizeMailPageSize clamps to allowed list', () => {
    expect(normalizeMailPageSize(20)).toBe(20)
    expect(normalizeMailPageSize(99)).toBe(20)
    expect(normalizeMailPageSize('25')).toBe(25)
    expect(normalizeMailPageSize(25)).toBe(25)
  })

  it('mergeMailColumnVisibility overlays saved flags', () => {
    const m = mergeMailColumnVisibility({ subject: false, fromEmail: true })
    expect(m.subject).toBe(false)
    expect(m.fromEmail).toBe(true)
    expect(m.actions).toBe(true)
  })
})
