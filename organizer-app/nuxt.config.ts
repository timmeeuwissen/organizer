// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  hooks: {
    /**
     * Pinia options stores use `state: () => ({...})`. Unimport's directory scan
     * incorrectly treats `state` as a named export, so `#imports` re-exports
     * `state` from `stores/auth.ts` and the app 500s ("does not provide an export named 'state'").
     */
    'imports:extend'(imports) {
      for (let i = imports.length - 1; i >= 0; i--) {
        const imp = imports[i]
        if (
          imp.name === 'state' &&
          typeof imp.from === 'string' &&
          /[/\\]stores[/\\]auth\.ts$/.test(imp.from.replace(/\\/g, '/'))
        ) {
          imports.splice(i, 1)
        }
      }
    },
  },

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
    '~/plugins/theme',
    '~/plugins/pinia-persistence',
    '~/plugins/oidc',
    '~/plugins/unsaved-navigation.client',
  ],

  runtimeConfig: {
    /** Server-only: JSONL audit log path (gui-messaging). Override with AUDIT_LOG_PATH. */
    auditLogPath: process.env.AUDIT_LOG_PATH || 'logs/audit.log',
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
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
      },
      // Debug options
      debugAuthRedirect: process.env.DEBUG_AUTH_REDIR || 'false'
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
