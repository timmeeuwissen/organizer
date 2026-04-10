import { createI18n } from 'vue-i18n'
import { defineNuxtPlugin } from '#app'
import en from '~/locales/en'
import nl from '~/locales/nl'

const i18nInstance = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  messages: { en, nl }
})

/** Use this in Pinia stores where useI18n() is unavailable */
export const storeT = i18nInstance.global.t.bind(i18nInstance.global)

export default defineNuxtPlugin({
  name: 'i18n',
  setup ({ vueApp }) {
    vueApp.use(i18nInstance)
  }
})
