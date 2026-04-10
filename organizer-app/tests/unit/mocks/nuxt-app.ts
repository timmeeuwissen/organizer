import { vi } from 'vitest'

/**
 * Minimal Nuxt app shim for Vitest when importing modules that call useNuxtApp().
 */
export function useNuxtApp () {
  return {
    $fetch: vi.fn().mockResolvedValue({
      accessToken: 'refreshed-token',
      expiresIn: 3600
    })
  }
}
