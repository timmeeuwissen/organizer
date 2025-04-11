import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to, from) => {
  // Skip on server-side as we're using SPA mode with Firebase auth
  if (process.server) return
  
  // Check if we're in development mode
  const isDev = import.meta.env.DEV
  
  // Check for localStorage demo mode setting first (takes precedence over env variable)
  let bypassAuth = false
  
  // Only run this code in browser environment
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const storedDemoMode = localStorage.getItem('demoMode')
    if (storedDemoMode !== null) {
      bypassAuth = storedDemoMode === 'true'
    } else {
      // Use env variable as fallback
      bypassAuth = isDev && import.meta.env.VITE_AUTH_BYPASS === 'true'
    }
  } else {
    // In SSR context, use env variable
    bypassAuth = isDev && import.meta.env.VITE_AUTH_BYPASS === 'true'
  }
  
  // If we're bypassing auth in development, allow all routes
  if (bypassAuth) {
    console.log('Auth middleware: Using demo mode, bypassing authentication')
    // If trying to access login pages in bypass mode, redirect to dashboard
    if (to.path.includes('/auth/login') || to.path.includes('/auth/register')) {
      return navigateTo('/dashboard')
    }
    return
  }
  
  const authStore = useAuthStore()
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password']
  const authRoutes = ['/auth/profile'] // Routes that require auth but are in the auth directory
  
  // If route requires auth and user is not authenticated
  if (!publicRoutes.includes(to.path) && (authRoutes.includes(to.path) || !to.path.startsWith('/auth/')) && !authStore.isAuthenticated) {
    // If the auth state is still being determined, we can wait for it
    if (authStore.loading) {
      // This will block navigation until auth store is initialized
      return new Promise<void>((resolve) => {
        const unwatch = watch(() => authStore.loading, (loading) => {
          if (!loading) {
            unwatch()
            // If still not authenticated after loading, redirect to login
            if (!authStore.isAuthenticated) {
              return navigateTo({
                path: '/auth/login',
                query: { redirect: to.fullPath }
              })
            }
            resolve()
          }
        })
      })
    }
    
    // Already loaded and not authenticated, redirect to login
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }
  
  // If user is authenticated and trying to access auth pages
  if (authStore.isAuthenticated && publicRoutes.includes(to.path)) {
    return navigateTo('/dashboard')
  }
})
