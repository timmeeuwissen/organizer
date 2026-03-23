/**
 * Theme service from plugins/theme.ts (nuxtApp.provide).
 * Nuxt exposes this as useNuxtApp().$theme, not Vue inject('theme').
 */
export interface ThemePluginService {
  isDark: boolean
  init(): void
  toggle(value?: boolean): boolean
  applyTheme(): void
}

/** Vuetify internal theme API from createVuetify() — safe to call outside setup. */
export interface VuetifyThemeEngine {
  change: (name: string) => void
}

declare module '#app' {
  interface NuxtApp {
    $theme: ThemePluginService
    $vuetifyThemeEngine: VuetifyThemeEngine
  }
}

export {}
