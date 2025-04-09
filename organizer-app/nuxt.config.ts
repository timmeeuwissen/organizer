// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  css: [
    'vuetify/lib/styles/main.sass',
    '@mdi/font/css/materialdesignicons.min.css',
    '~/assets/scss/main.scss',
  ],

  build: {
    transpile: ['vuetify', 'vue-i18n'],
  },

  modules: [
    '@pinia/nuxt',
  ],
  
  plugins: [
    '~/plugins/vuetify', 
    '~/plugins/firebase',
    '~/plugins/theme'
  ],

  runtimeConfig: {
    public: {
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_APP_ID || '',
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
      },
      xaiApiKey: process.env.XAI_API_KEY || '',
    }
  },

  typescript: {
    strict: true
  },

  // Since we're using Firebase auth, we'll disable SSR
  ssr: false,

  app: {
    head: {
      title: 'Organizer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { key: 'description', name: 'description', content: 'A comprehensive personal organizer application' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  compatibilityDate: '2025-04-07'
})
