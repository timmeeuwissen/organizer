import { ref, watch } from 'vue'

export function useCollapsible(options: { storageKey?: string; defaultOpen?: boolean } = {}) {
  const { storageKey, defaultOpen = true } = options
  const storedValue = storageKey ? localStorage.getItem(storageKey) : null
  const isOpen = ref(storedValue !== null ? storedValue === 'true' : defaultOpen)
  if (storageKey) {
    watch(isOpen, (val) => localStorage.setItem(storageKey, String(val)))
  }
  const toggle = () => { isOpen.value = !isOpen.value }
  return { isOpen, toggle }
}
