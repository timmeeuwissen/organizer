import { defineStore } from 'pinia'

export interface Notification {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  timeout?: number
  dismissible?: boolean
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [] as Notification[],
    nextId: 1
  }),
  
  actions: {
    /**
     * Add a notification to the store
     */
    add(notification: Partial<Notification>) {
      const id = `notification-${this.nextId++}`
      
      const newNotification: Notification = {
        id,
        message: notification.message || '',
        type: notification.type || 'info',
        timeout: notification.timeout === undefined ? 5000 : notification.timeout,
        dismissible: notification.dismissible === undefined ? true : notification.dismissible
      }
      
      this.notifications.push(newNotification)
      
      // Auto-dismiss if timeout is set
      if (newNotification.timeout && newNotification.timeout > 0) {
        setTimeout(() => {
          this.dismiss(id)
        }, newNotification.timeout)
      }
      
      return id
    },
    
    /**
     * Remove a notification by ID
     */
    dismiss(id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index !== -1) {
        this.notifications.splice(index, 1)
      }
    },
    
    /**
     * Add a success notification
     */
    success(message: string, options: Partial<Notification> = {}) {
      return this.add({
        message,
        type: 'success',
        ...options
      })
    },
    
    /**
     * Add an info notification
     */
    info(message: string, options: Partial<Notification> = {}) {
      return this.add({
        message,
        type: 'info',
        ...options
      })
    },
    
    /**
     * Add a warning notification
     */
    warning(message: string, options: Partial<Notification> = {}) {
      return this.add({
        message,
        type: 'warning',
        ...options
      })
    },
    
    /**
     * Add an error notification
     */
    error(message: string, options: Partial<Notification> = {}) {
      return this.add({
        message,
        type: 'error',
        ...options
      })
    },
    
    /**
     * Clear all notifications
     */
    clear() {
      this.notifications = []
    }
  }
})
