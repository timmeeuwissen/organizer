import { vi } from 'vitest'

// Stub Nuxt's #app module so stores/plugins that import defineNuxtPlugin don't crash.
vi.mock('#app', () => ({
  defineNuxtPlugin: (plugin: unknown) => plugin,
  useRuntimeConfig: () => ({ public: {} }),
  useNuxtApp: () => ({
    $fetch: vi.fn().mockResolvedValue({ accessToken: 'refreshed-token', expiresIn: 3600 })
  })
}))

// Stub the i18n plugin so stores that import storeT from ~/plugins/i18n work in tests.
vi.mock('~/plugins/i18n', () => ({
  default: (plugin: unknown) => plugin,
  storeT: (key: string) => key,
  i18nInstance: { global: { t: (key: string) => key } }
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    currentUser: {
      id: 'u1',
      settings: { integrationAccounts: [] }
    },
    updateUserSettings: vi.fn()
  }))
}))
