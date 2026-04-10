import { describe, expect, it, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '~/stores/notification'
import NotificationSnackbar from '~/components/common/NotificationSnackbar.vue'

describe('NotificationSnackbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mount (props = {}) {
    return shallowMount(NotificationSnackbar, { props })
  }

  it('renders the container element', () => {
    const wrapper = mount()
    expect(wrapper.find('.notification-container').exists()).toBe(true)
  })

  it('shows snackbar when notification store has a message', () => {
    const store = useNotificationStore()
    store.success('Hello from test')

    const wrapper = mount()
    expect(wrapper.find('v-snackbar').exists()).toBe(true)
  })

  it('does not render v-snackbar when there are no notifications', () => {
    const wrapper = mount()
    expect(wrapper.find('v-snackbar').exists()).toBe(false)
  })

  it('displays the notification message text', () => {
    const store = useNotificationStore()
    store.info('Check this message')

    const wrapper = mount()
    expect(wrapper.find('v-snackbar span').text()).toBe('Check this message')
  })

  it('exposes snackbarVisible as true when a notification is active', () => {
    const store = useNotificationStore()
    store.error('Something broke')

    const wrapper = mount()
    expect((wrapper.vm as any).snackbarVisible).toBe(true)
  })

  it('dismisses a notification when closeCurrent is called', async () => {
    const store = useNotificationStore()
    store.error('Something broke')
    expect(store.notifications).toHaveLength(1)

    const wrapper = mount()
    await (wrapper.vm as any).closeCurrent()
    expect(store.notifications).toHaveLength(0)
  })
})
