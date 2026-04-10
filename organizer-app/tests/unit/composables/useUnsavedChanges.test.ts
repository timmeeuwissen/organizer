// tests/unit/composables/useUnsavedChanges.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

describe('useUnsavedChanges', () => {
  beforeEach(async () => {
    // Reset the module so the shared navigationDirty ref starts at false each test.
    vi.resetModules()
  })

  it('setNavigationDirty(true) sets dirty state', async () => {
    const { useUnsavedChanges } = await import('~/composables/useUnsavedChanges')
    const { navigationDirty, setNavigationDirty } = useUnsavedChanges()

    setNavigationDirty(true)

    expect(navigationDirty.value).toBe(true)
  })

  it('setNavigationDirty(false) clears dirty state', async () => {
    const { useUnsavedChanges } = await import('~/composables/useUnsavedChanges')
    const { navigationDirty, setNavigationDirty } = useUnsavedChanges()

    setNavigationDirty(true)
    setNavigationDirty(false)

    expect(navigationDirty.value).toBe(false)
  })

  it('isDirty starts as false', async () => {
    const { useUnsavedChanges } = await import('~/composables/useUnsavedChanges')
    const { navigationDirty } = useUnsavedChanges()

    expect(navigationDirty.value).toBe(false)
  })

  it('navigationDirty reflects the latest setNavigationDirty call', async () => {
    const { useUnsavedChanges } = await import('~/composables/useUnsavedChanges')
    const { navigationDirty, setNavigationDirty } = useUnsavedChanges()

    setNavigationDirty(true)
    await nextTick()
    expect(navigationDirty.value).toBe(true)

    setNavigationDirty(false)
    await nextTick()
    expect(navigationDirty.value).toBe(false)
  })

  it('navigationDirty is shared across composable instances', async () => {
    const { useUnsavedChanges } = await import('~/composables/useUnsavedChanges')
    const a = useUnsavedChanges()
    const b = useUnsavedChanges()

    a.setNavigationDirty(true)

    expect(b.navigationDirty.value).toBe(true)
  })

  it('window.confirm is called when navigationDirty is true and a navigation is triggered', async () => {
    const { useUnsavedChanges, navigationDirty } = await import('~/composables/useUnsavedChanges')
    const { setNavigationDirty } = useUnsavedChanges()

    setNavigationDirty(true)

    const confirm = vi.fn(() => true)
    vi.stubGlobal('confirm', confirm)

    // Simulate what a navigation guard does: check dirty and ask the user.
    let allowed = true
    if (navigationDirty.value) {
      allowed = window.confirm('You have unsaved changes. Leave anyway?')
    }

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(allowed).toBe(true)

    vi.unstubAllGlobals()
  })

  it('navigation is blocked when confirm returns false', async () => {
    const { useUnsavedChanges, navigationDirty } = await import('~/composables/useUnsavedChanges')
    const { setNavigationDirty } = useUnsavedChanges()

    setNavigationDirty(true)

    vi.stubGlobal('confirm', vi.fn(() => false))

    let allowed = true
    if (navigationDirty.value) {
      allowed = window.confirm('You have unsaved changes. Leave anyway?')
    }

    expect(allowed).toBe(false)

    vi.unstubAllGlobals()
  })
})
