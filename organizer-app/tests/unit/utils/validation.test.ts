import { describe, expect, it } from 'vitest'
import { hasTrimmedText, requiredTrimmed } from '~/utils/validation'

describe('hasTrimmedText', () => {
  it('returns false for empty and whitespace strings', () => {
    expect(hasTrimmedText('')).toBe(false)
    expect(hasTrimmedText('   ')).toBe(false)
  })

  it('returns true for non-empty trimmed strings', () => {
    expect(hasTrimmedText('x')).toBe(true)
    expect(hasTrimmedText('  x  ')).toBe(true)
  })
})

describe('requiredTrimmed', () => {
  it('returns error message for blank values', () => {
    expect(requiredTrimmed('', 'required')).toBe('required')
    expect(requiredTrimmed('   ', 'required')).toBe('required')
  })

  it('returns true for valid text', () => {
    expect(requiredTrimmed('ok', 'required')).toBe(true)
  })
})
