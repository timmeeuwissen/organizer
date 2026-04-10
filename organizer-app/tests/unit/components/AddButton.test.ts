import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import AddButton from '~/components/common/AddButton.vue'

const makeItems = (overrides = {}) => [
  {
    title: 'Add task',
    icon: 'mdi-check',
    color: 'primary',
    action: vi.fn(),
    ...overrides
  }
]

describe('AddButton', () => {
  function mount (items = makeItems()) {
    return shallowMount(AddButton, { props: { items } })
  }

  it('renders without error given required items prop', () => {
    const wrapper = mount()
    expect(wrapper.exists()).toBe(true)
  })

  it('renders a list item for each entry in the items prop', () => {
    const items = [
      { title: 'First', icon: 'mdi-one', action: vi.fn() },
      { title: 'Second', icon: 'mdi-two', action: vi.fn() }
    ]
    const wrapper = mount(items)
    expect(wrapper.findAll('v-list-item')).toHaveLength(2)
  })

  it('calls the item action when a list item is clicked', async () => {
    const action = vi.fn()
    const wrapper = mount(makeItems({ action }))

    await wrapper.find('v-list-item').trigger('click')

    expect(action).toHaveBeenCalledOnce()
  })

  it('displays the item title in the list', () => {
    const wrapper = mount(makeItems({ title: 'Create meeting' }))
    expect(wrapper.text()).toContain('Create meeting')
  })
})
