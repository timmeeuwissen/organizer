import { navigationDirty } from '~/composables/useUnsavedChanges'

export default defineNuxtPlugin({
  name: 'unsaved-navigation',
  dependsOn: ['i18n'],
  setup(nuxtApp) {
    const router = useRouter()
    const gp = nuxtApp.vueApp.config.globalProperties

    router.beforeEach((_to, from) => {
      if (!navigationDirty.value || !from.fullPath) {
        return true
      }
      const msg =
        typeof gp.$t === 'function'
          ? String(gp.$t('common.unsavedNavigationWarning'))
          : 'You have unsaved changes. Leave this page?'
      const ok = window.confirm(msg)
      if (ok) {
        navigationDirty.value = false
        return true
      }
      return false
    })
  },
})
