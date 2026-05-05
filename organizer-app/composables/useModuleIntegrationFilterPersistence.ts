import { computed, getCurrentInstance, onUnmounted, type Ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { IntegrationAccount, ModuleIntegrationFiltersSettings } from '~/types/models'
import type { ModuleIntegrationSegment } from '~/config/moduleIntegration'

const PERSIST_DEBOUNCE_MS = 450

export function sanitizeSelectedAccountIds (
  selectedIds: readonly string[] | undefined,
  availableIds: ReadonlySet<string>
): string[] {
  if (!selectedIds?.length) {
    return []
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of selectedIds) {
    if (!id || seen.has(id) || !availableIds.has(id)) {
      continue
    }
    seen.add(id)
    out.push(id)
  }
  return out
}

export function resolveInitialSelection (
  savedIds: readonly string[] | undefined,
  availableIds: readonly string[]
): string[] {
  const valid = sanitizeSelectedAccountIds(savedIds, new Set(availableIds))
  if (availableIds.length === 0) {
    return []
  }
  return valid.length > 0 ? valid : [...availableIds]
}

export function buildModuleIntegrationFiltersPatch (
  current: ModuleIntegrationFiltersSettings | null | undefined,
  segment: ModuleIntegrationSegment,
  selectedAccountIds: string[]
): ModuleIntegrationFiltersSettings {
  return {
    ...(current || {}),
    [segment]: {
      selectedAccountIds
    }
  }
}

export function useModuleIntegrationFilterPersistence (
  segment: ModuleIntegrationSegment,
  selectedProviders: Ref<string[]>,
  connectedAccounts: Ref<IntegrationAccount[]>
) {
  const authStore = useAuthStore()
  let persistTimer: ReturnType<typeof setTimeout> | null = null

  const availableAccountIds = computed(() => connectedAccounts.value.map(account => account.id))
  const savedSelection = computed(
    () => authStore.currentUser?.settings?.moduleIntegrationFilters?.[segment]?.selectedAccountIds
  )

  function initializeSelection (): string[] {
    const next = resolveInitialSelection(savedSelection.value, availableAccountIds.value)
    selectedProviders.value = next
    return next
  }

  async function persistNow (selection = selectedProviders.value) {
    if (!authStore.currentUser) {
      return
    }
    const normalized = resolveInitialSelection(selection, availableAccountIds.value)
    const patch = buildModuleIntegrationFiltersPatch(
      authStore.currentUser.settings?.moduleIntegrationFilters,
      segment,
      normalized
    )
    await authStore.updateUserSettings({
      moduleIntegrationFilters: patch
    })
  }

  function schedulePersist (selection = selectedProviders.value) {
    if (!authStore.currentUser) {
      return
    }
    if (persistTimer) {
      clearTimeout(persistTimer)
    }
    const snapshot = [...selection]
    persistTimer = setTimeout(async () => {
      persistTimer = null
      try {
        await persistNow(snapshot)
      } catch (error) {
        console.error(`Failed to persist ${segment} integration filter selection`, error)
      }
    }, PERSIST_DEBOUNCE_MS)
  }

  function clearPersistTimer () {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      clearPersistTimer()
    })
  }

  return {
    availableAccountIds,
    initializeSelection,
    persistNow,
    schedulePersist,
    clearPersistTimer
  }
}
