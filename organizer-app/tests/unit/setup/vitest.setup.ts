import { vi } from 'vitest'

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    currentUser: {
      id: 'u1',
      settings: { integrationAccounts: [] },
    },
    updateUserSettings: vi.fn(),
  })),
}))
