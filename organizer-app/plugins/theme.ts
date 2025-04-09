import { defineNuxtPlugin } from '#app'
import { useTheme } from 'vuetify'

export default defineNuxtPlugin((nuxtApp) => {
  // Create global theme service
  const theme = {
    isDark: false,
    
    init() {
      // Try to get saved preference
      try {
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme) {
          this.isDark = savedTheme === 'dark'
        } else {
          // Check for system preference
          this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        }
        this.applyTheme()
      } catch (err) {
        console.error('Error initializing theme:', err)
      }
    },
    
    toggle(value?: boolean) {
      try {
        // Set the value or toggle current value
        this.isDark = value !== undefined ? value : !this.isDark
        
        // Save preference
        localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
        
        // Apply the theme
        this.applyTheme()
        return true
      } catch (err) {
        console.error('Failed to toggle theme:', err)
        return false
      }
    },
    
    applyTheme() {
      try {
        // Get Vuetify theme instance from current context
        const vuetifyTheme = useTheme()
        
        if (vuetifyTheme && vuetifyTheme.global) {
          // Apply through Vuetify API
          vuetifyTheme.global.name.value = this.isDark ? 'dark' : 'light'
        }
        
        // Also apply to document as fallback
        if (typeof document !== 'undefined') {
          if (this.isDark) {
            document.documentElement.classList.add('dark-theme')
            document.documentElement.classList.remove('light-theme')
          } else {
            document.documentElement.classList.add('light-theme')
            document.documentElement.classList.remove('dark-theme')
          }
        }
      } catch (err) {
        console.error('Error applying theme:', err)
      }
    }
  }
  
  // Initialize theme on client side
  if (process.client) {
    theme.init()
  }
  
  // Expose the theme service
  nuxtApp.provide('theme', theme)
})
