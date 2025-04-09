import { ref, inject, onMounted } from 'vue'

// Dark mode management that safely works with Vuetify
export function useThemeMode() {
  // State
  const isDarkMode = ref(false)
  let vuetifyTheme = null
  
  onMounted(() => {
    // Try to get theme preference from localStorage first
    const storedTheme = localStorage.getItem('theme')
    if (storedTheme) {
      isDarkMode.value = storedTheme === 'dark'
    } else {
      // Otherwise use system preference
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    
    // Initial theme application
    applyTheme(isDarkMode.value)
  })
  
  // Apply the theme directly to document elements
  // This works as a fallback even if Vuetify isn't available
  const applyTheme = (dark: boolean) => {
    if (typeof document !== 'undefined') {
      const el = document.documentElement
      
      if (dark) {
        el.classList.add('v-theme--dark')
        el.classList.remove('v-theme--light')
      } else {
        el.classList.add('v-theme--light')
        el.classList.remove('v-theme--dark')
      }
    }
  }
  
  // Function to safely toggle theme across the app
  const toggleDarkMode = (value?: boolean) => {
    try {
      // Set dark mode based on provided value or toggle current
      isDarkMode.value = value !== undefined ? value : !isDarkMode.value
      
      // Store preference
      localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
      
      // Apply the theme
      applyTheme(isDarkMode.value)
      
      console.log(`Theme set to ${isDarkMode.value ? 'dark' : 'light'} mode`)
      return true
    } catch (err) {
      console.error('Error toggling theme mode:', err)
      return false
    }
  }
  
  return {
    isDarkMode,
    toggleDarkMode
  }
}
