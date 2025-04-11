<template>
  <v-alert
    v-if="isDev"
    density="compact"
    color="info"
    variant="outlined"
    class="my-2"
    border="start"
  >
    <div class="d-flex align-center">
      <div>
        <strong>Development Mode:</strong>
        {{ demoMode ? 'Using simulated data' : 'Using real authentication' }}
      </div>
      <v-spacer></v-spacer>
      <v-switch
        v-model="demoMode"
        color="success"
        hide-details
        label="Demo Mode"
        @change="toggleDemoMode"
      ></v-switch>
    </div>
  </v-alert>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isDev = ref(false)
const demoMode = ref(false)

onMounted(() => {
  // Check if we're in development mode
  isDev.value = import.meta.env.DEV

  // Get current demo mode setting from localStorage first
  const storedMode = localStorage.getItem('demoMode')
  if (storedMode !== null) {
    demoMode.value = storedMode === 'true'
    console.log('DemoModeToggle: Retrieved demo mode setting from localStorage:', demoMode.value)
  } else {
    // Fall back to env variable
    demoMode.value = import.meta.env.VITE_AUTH_BYPASS === 'true'
    console.log('DemoModeToggle: Using default demo mode setting from env:', demoMode.value)
  }
})

const toggleDemoMode = async () => {
  try {
    console.log('DemoModeToggle: Toggling demo mode to', demoMode.value)
    
    // Show confirmation based on new state
    const message = demoMode.value
      ? 'Switching to demo mode with simulated emails'
      : 'Switching to real authentication mode'
    console.log(message)

    // Use localStorage to persist the setting
    localStorage.setItem('demoMode', demoMode.value ? 'true' : 'false')
    
    // Show a confirmation that will disappear when page reloads
    alert(message + '. Page will reload to apply changes.')
    
    // Reload the page to apply the new setting
    window.location.reload()
  } catch (error) {
    console.error('Error toggling demo mode:', error)
  }
}
</script>
