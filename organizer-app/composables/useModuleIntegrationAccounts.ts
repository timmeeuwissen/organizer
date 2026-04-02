import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import {
  MODULE_INTEGRATION_FILTER_KIND,
  type ModuleIntegrationSegment,
} from '~/config/moduleIntegration'
import { filterIntegrationAccountsByKind } from '~/utils/filterIntegrationAccountsByKind'

export function useModuleIntegrationAccounts(segment: ModuleIntegrationSegment) {
  const authStore = useAuthStore()
  const kind = MODULE_INTEGRATION_FILTER_KIND[segment]

  const accounts = computed(() =>
    filterIntegrationAccountsByKind(
      authStore.currentUser?.settings?.integrationAccounts,
      kind
    )
  )

  return { accounts }
}
