import { nextTick, onMounted, ref, watch } from 'vue'

/** Minimum time the boot overlay stays visible (avoids a sub‑frame flash). */
const MIN_VISIBLE_MS = 320

/** Extra beat at 100% before the overlay is removed. */
const FULL_BAR_MS = 160

/** Failsafe if `page:finish` never runs (misconfigured page tree, etc.). */
const SAFETY_TIMEOUT_MS = 15_000

/**
 * Monotonic milestones (approximate). Not tied to byte counts—only lifecycle order.
 */
const P = {
  client: 12,
  mounted: 28,
  routerReady: 44,
  pageStart: 58,
  pageFinish: 72,
  fontsReady: 88,
  done: 100,
} as const

/**
 * Tracks the first paint of the Nuxt app after the initial route’s async work
 * (page Suspense resolve / chunk load). Use a fullscreen overlay until this is true.
 */
export function useAppInitialLoad() {
  const isBootComplete = ref(false)
  const bootProgress = ref(0)

  if (import.meta.server) {
    return { isBootComplete, bootProgress }
  }

  const nuxtApp = useNuxtApp()
  const router = useRouter()
  const startedAt = Date.now()
  let settled = false

  const bumpProgress = (next: number) => {
    if (next > bootProgress.value) {
      bootProgress.value = next
    }
  }

  bumpProgress(P.client)

  const reveal = () => {
    if (settled) return
    settled = true
    bumpProgress(P.done)
    const wait =
      Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt)) + FULL_BAR_MS
    window.setTimeout(() => {
      nextTick(() => {
        requestAnimationFrame(() => {
          isBootComplete.value = true
        })
      })
    }, wait)
  }

  const onPageReady = async () => {
    bumpProgress(P.pageFinish)
    try {
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready
      }
    } catch {
      // ignore
    }
    bumpProgress(P.fontsReady)
    reveal()
  }

  nuxtApp.hooks.hookOnce('page:start', () => bumpProgress(P.pageStart))
  nuxtApp.hooks.hookOnce('page:finish', onPageReady)
  nuxtApp.hooks.hookOnce('app:error', reveal)
  nuxtApp.hooks.hookOnce('app:chunkError', reveal)

  onMounted(() => {
    bumpProgress(P.mounted)
    router.isReady().then(() => bumpProgress(P.routerReady))

    const id = window.setTimeout(reveal, SAFETY_TIMEOUT_MS)
    watch(
      isBootComplete,
      (done) => {
        if (done) window.clearTimeout(id)
      },
      { immediate: true }
    )
  })

  return { isBootComplete, bootProgress }
}
