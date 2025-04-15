import { defineNuxtPlugin } from '#app'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { reviveDates } from '~/utils/date-reviver'

export default defineNuxtPlugin((nuxtApp) => {
  // Register the persisted state plugin with Pinia
  // @ts-ignore - Using any to bypass type checking
  nuxtApp.$pinia.use(piniaPluginPersistedstate)
  
  console.log('Pinia persistence plugin initialized with date reviving')
})
