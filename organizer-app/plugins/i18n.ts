import { createI18n } from 'vue-i18n'
import en from '~/locales/en'
import nl from '~/locales/nl'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(({ vueApp }) => {
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: 'en',
    messages: {
      en,
      nl
    }
  })

  vueApp.use(i18n)
})
