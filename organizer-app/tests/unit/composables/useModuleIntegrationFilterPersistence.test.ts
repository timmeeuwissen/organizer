import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import {
  buildModuleIntegrationFiltersPatch,
  resolveInitialSelection,
  sanitizeSelectedAccountIds,
  useModuleIntegrationFilterPersistence
} from '~/composables/useModuleIntegrationFilterPersistence'

const mockUpdateUserSettings = vi.fn()
const mockAuthStore = {
  currentUser: {
    id: 'u-1',
    settings: {
      moduleIntegrationFilters: {
        mail: { selectedAccountIds: ['acc-2'] }
      }
    }
  },
  updateUserSettings: mockUpdateUserSettings
}

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

describe('module integration filter persistence helpers', () => {
  it('sanitizeSelectedAccountIds removes unknown ids and duplicates', () => {
    const sanitized = sanitizeSelectedAccountIds(['acc-2', 'acc-2', 'acc-x', 'acc-1'], new Set(['acc-1', 'acc-2']))
    expect(sanitized).toEqual(['acc-2', 'acc-1'])
  })

  it('resolveInitialSelection falls back to all available ids', () => {
    const next = resolveInitialSelection(['missing-only'], ['acc-1', 'acc-2'])
    expect(next).toEqual(['acc-1', 'acc-2'])
  })

  it('buildModuleIntegrationFiltersPatch merges segment payload', () => {
    const patch = buildModuleIntegrationFiltersPatch(
      { tasks: { selectedAccountIds: ['acc-task'] } },
      'mail',
      ['acc-1']
    )
    expect(patch).toEqual({
      tasks: { selectedAccountIds: ['acc-task'] },
      mail: { selectedAccountIds: ['acc-1'] }
    })
  })
})

describe('useModuleIntegrationFilterPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockAuthStore.currentUser.settings.moduleIntegrationFilters = {
      mail: { selectedAccountIds: ['acc-2'] }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restores saved mail selection when accounts are available', () => {
    const selectedProviders = ref<string[]>([])
    const connectedAccounts = computed(() => [
      { id: 'acc-1' },
      { id: 'acc-2' }
    ] as any[])

    const persistence = useModuleIntegrationFilterPersistence('mail', selectedProviders, connectedAccounts)
    const initial = persistence.initializeSelection()

    expect(initial).toEqual(['acc-2'])
    expect(selectedProviders.value).toEqual(['acc-2'])
  })

  it('debounces and persists normalized selection payload', async () => {
    const selectedProviders = ref<string[]>(['missing', 'acc-1'])
    const connectedAccounts = computed(() => [{ id: 'acc-1' }] as any[])

    const persistence = useModuleIntegrationFilterPersistence('mail', selectedProviders, connectedAccounts)
    persistence.schedulePersist(selectedProviders.value)

    await vi.advanceTimersByTimeAsync(460)

    expect(mockUpdateUserSettings).toHaveBeenCalledTimes(1)
    expect(mockUpdateUserSettings).toHaveBeenCalledWith({
      moduleIntegrationFilters: {
        mail: { selectedAccountIds: ['acc-1'] }
      }
    })
  })
})
