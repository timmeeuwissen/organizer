import { ref } from 'vue'

/** Shared flag for unsaved form state (GUI navigation guard). */
export const navigationDirty = ref(false)

export function useUnsavedChanges() {
  return {
    navigationDirty,
    setNavigationDirty(value: boolean) {
      navigationDirty.value = value
    },
  }
}
