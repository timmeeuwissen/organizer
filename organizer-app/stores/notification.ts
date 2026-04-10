import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

export interface Notification {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  timeout?: number
  dismissible?: boolean
}

/** Payload aligned with gui-messaging.mdc (extensible). */
export interface MessagePayload {
  type: 'success' | 'error' | 'info' | 'warning'
  text: string
  userId?: string | null
  timestamp?: string
  timeout?: number
  dismissible?: boolean
}

function auditTypeUpper (t: Notification['type']): string {
  return t.toUpperCase()
}

async function postAuditLog (entry: {
  type: string
  text: string
  userId?: string | null
  timestamp?: string
}): Promise<void> {
  if (!import.meta.client) { return }
  try {
    const nuxt = useNuxtApp()
    await nuxt.$fetch('/api/system/audit', {
      method: 'POST',
      body: entry
    })
  } catch {
    // Non-blocking; UI still shows the snackbar
  }
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    /** FIFO queue; only the first item is shown in the snackbar at a time. */
    notifications: [] as Notification[],
    nextId: 1
  }),

  actions: {
    /**
     * Queue a notification (gui-messaging: one visible at a time).
     */
    add (notification: Partial<Notification>) {
      const id = `notification-${this.nextId++}`

      const newNotification: Notification = {
        id,
        message: notification.message || '',
        type: notification.type || 'info',
        timeout: notification.timeout === undefined ? 5000 : notification.timeout,
        dismissible:
          notification.dismissible === undefined ? true : notification.dismissible
      }

      this.notifications.push(newNotification)

      void postAuditLog({
        type: auditTypeUpper(newNotification.type),
        text: newNotification.message,
        userId: null,
        timestamp: new Date().toISOString()
      })

      return id
    },

    dismiss (id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index !== -1) {
        this.notifications.splice(index, 1)
      }
    },

    success (message: string, options: Partial<Notification> = {}) {
      return this.add({
        message,
        type: 'success',
        ...options
      })
    },

    info (message: string, options: Partial<Notification> = {}) {
      return this.add({
        message,
        type: 'info',
        ...options
      })
    },

    warning (message: string, options: Partial<Notification> = {}) {
      return this.add({
        message,
        type: 'warning',
        ...options
      })
    },

    error (message: string, options: Partial<Notification> = {}) {
      return this.add({
        message,
        type: 'error',
        ...options
      })
    },

    pushSuccess (text: string, options: Partial<Notification> = {}) {
      return this.success(text, options)
    },

    pushError (text: string, options: Partial<Notification> = {}) {
      return this.error(text, options)
    },

    pushInfo (text: string, options: Partial<Notification> = {}) {
      return this.info(text, options)
    },

    pushWarning (text: string, options: Partial<Notification> = {}) {
      return this.warning(text, options)
    },

    push (payload: MessagePayload) {
      const { text, type, userId: _userId, timestamp: _ts, ...rest } = payload
      return this.add({
        message: text,
        type,
        ...rest
      })
    },

    clear () {
      this.notifications = []
    }
  }
})
