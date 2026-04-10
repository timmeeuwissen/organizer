import { describe, it, expect } from 'vitest'
import {
  normalizeProjectUrl,
  isValidHttpUrlForProject
} from '~/utils/normalizeProjectUrl'

describe('normalizeProjectUrl', () => {
  it('returns empty for blank input', () => {
    expect(normalizeProjectUrl('')).toBe('')
    expect(normalizeProjectUrl('   ')).toBe('')
  })

  it('adds https when scheme missing', () => {
    expect(normalizeProjectUrl('example.com/path')).toBe('https://example.com/path')
  })

  it('preserves existing http(s)', () => {
    expect(normalizeProjectUrl('https://a.b/c')).toBe('https://a.b/c')
    expect(normalizeProjectUrl('http://a.b/c')).toBe('http://a.b/c')
  })

  it('rejects invalid URLs', () => {
    expect(normalizeProjectUrl('not a url')).toBe('')
  })
})

describe('isValidHttpUrlForProject', () => {
  it('accepts normal https URLs', () => {
    expect(isValidHttpUrlForProject('https://example.com')).toBe(true)
  })

  it('rejects empty and invalid', () => {
    expect(isValidHttpUrlForProject('')).toBe(false)
    expect(isValidHttpUrlForProject('ftp://x')).toBe(false)
  })
})
