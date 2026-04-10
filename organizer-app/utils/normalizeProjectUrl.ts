/**
 * Normalize user-entered URL for storage and opening (https default).
 */
export function normalizeProjectUrl (input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return ''
  }
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
      return ''
    }
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed)
      return u.toString()
    }
    const u = new URL(`https://${trimmed}`)
    return u.toString()
  } catch {
    return ''
  }
}

export function isValidHttpUrlForProject (input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) { return false }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return false
  }
  const normalized = normalizeProjectUrl(input)
  if (!normalized) { return false }
  try {
    const u = new URL(normalized)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
