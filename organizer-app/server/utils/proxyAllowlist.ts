/**
 * SSRF protection: only allow proxying to known integration API hosts.
 */
const ALLOWED_PREFIXES = [
  'https://tasks.googleapis.com/',
  'https://www.googleapis.com/',
  'https://gmail.googleapis.com/',
  'https://people.googleapis.com/',
  'https://oauth2.googleapis.com/',
  'https://generativelanguage.googleapis.com/',
  'https://api.openai.com/',
  'https://api.x.ai/',
  'https://graph.microsoft.com/',
  'https://login.microsoftonline.com/',
]

export function isAllowedProxyUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      return false
    }
    const normalized = `${parsed.origin}${parsed.pathname}`
    return ALLOWED_PREFIXES.some((p) => url.startsWith(p) || normalized.startsWith(p))
  } catch {
    return false
  }
}
