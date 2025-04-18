import type { EmailPerson } from '~/stores/mail'

/**
 * Email utilities shared across different mail providers
 */

/**
 * Parses an email address string into name and email parts
 * @param addressString Email address string (e.g., "Name <email@example.com>")
 * @returns EmailPerson object with name and email
 */
export function parseEmailAddress(addressString: string): EmailPerson {
  if (!addressString) {
    return { name: 'Unknown', email: 'unknown@example.com' }
  }
  
  // Try to match "Name <email@example.com>" format
  const match = addressString.match(/^([^<]+)<([^>]+)>$/)
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim()
    }
  }
  
  // If no match, just use the whole string as both name and email
  return {
    name: addressString,
    email: addressString
  }
}

/**
 * Decodes base64url content to string
 * @param encoded Base64url encoded string
 * @returns Decoded string
 */
export function decodeBase64UrlContent(encoded: string): string {
  try {
    // Convert base64url to base64
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    
    // Add padding if needed
    const paddingLength = (4 - (base64.length % 4)) % 4
    const paddedBase64 = base64 + '='.repeat(paddingLength)
    
    // Decode and convert to UTF-8 string
    const rawData = atob(paddedBase64)
    return decodeURIComponent(
      Array.from(rawData)
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch (e) {
    console.error('Error decoding base64 content:', e)
    return '[Content could not be decoded]'
  }
}
