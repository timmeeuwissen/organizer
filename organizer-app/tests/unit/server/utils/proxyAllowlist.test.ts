import { describe, it, expect } from 'vitest'
import { isAllowedProxyUrl } from '~/server/utils/proxyAllowlist'

describe('isAllowedProxyUrl', () => {
  it('allows Google Tasks API', () => {
    expect(
      isAllowedProxyUrl('https://tasks.googleapis.com/tasks/v1/users/@me/lists')
    ).toBe(true)
  })

  it('allows Microsoft Graph', () => {
    expect(
      isAllowedProxyUrl('https://graph.microsoft.com/v1.0/me/todo/lists')
    ).toBe(true)
  })

  it('rejects non-HTTPS', () => {
    expect(isAllowedProxyUrl('http://tasks.googleapis.com/x')).toBe(false)
  })

  it('rejects arbitrary hosts', () => {
    expect(isAllowedProxyUrl('https://evil.example.com/steal')).toBe(false)
  })
})
