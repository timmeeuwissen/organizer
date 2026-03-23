import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '~/stores/notification'

describe('notification store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('queues messages and shows FIFO head', () => {
    const s = useNotificationStore()
    s.success('first')
    s.info('second')
    expect(s.notifications).toHaveLength(2)
    expect(s.notifications[0].message).toBe('first')
    s.dismiss(s.notifications[0].id)
    expect(s.notifications[0].message).toBe('second')
  })

  it('pushSuccess maps to success type', () => {
    const s = useNotificationStore()
    s.pushSuccess('done')
    expect(s.notifications[0].type).toBe('success')
    expect(s.notifications[0].message).toBe('done')
  })

  it('push uses MessagePayload.text', () => {
    const s = useNotificationStore()
    s.push({ type: 'warning', text: 'careful' })
    expect(s.notifications[0].type).toBe('warning')
    expect(s.notifications[0].message).toBe('careful')
  })
})
