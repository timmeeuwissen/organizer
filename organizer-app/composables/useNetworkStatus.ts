import { ref, onMounted, onUnmounted } from 'vue'

export function useNetworkStatus() {
  const isOnline = ref(true)
  const wasOffline = ref(false)
  
  // Update online status
  const updateOnlineStatus = () => {
    const previousStatus = isOnline.value
    isOnline.value = navigator.onLine
    
    // If we're coming back online after being offline
    if (isOnline.value && !previousStatus) {
      wasOffline.value = true
      // Reset wasOffline after 5 seconds
      setTimeout(() => {
        wasOffline.value = false
      }, 5000)
    }
  }
  
  onMounted(() => {
    // Set initial status
    isOnline.value = navigator.onLine
    
    // Listen for network status changes
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
  })
  
  onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  })
  
  return {
    isOnline,
    wasOffline
  }
}
