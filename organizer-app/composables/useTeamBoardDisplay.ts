import { ref, watch, type Ref } from 'vue'
import {
  DEFAULT_TEAM_BOARD_DISPLAY,
  mergeTeamBoardDisplay,
  type TeamBoardDisplayOptions,
  TEAM_BOARD_DISPLAY_STORAGE_PREFIX,
} from '~/config/teamBoard'

function storageKey(teamId: string) {
  return `${TEAM_BOARD_DISPLAY_STORAGE_PREFIX}:${teamId}`
}

function parseStored(raw: string | null): Partial<TeamBoardDisplayOptions> | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    return o as Partial<TeamBoardDisplayOptions>
  } catch {
    return null
  }
}

/**
 * Per-team board UI preferences (density, visible sub-cards). Persisted in localStorage.
 */
export function useTeamBoardDisplay(teamIdRef: Ref<string>) {
  const display = ref<TeamBoardDisplayOptions>({ ...DEFAULT_TEAM_BOARD_DISPLAY })

  function load() {
    if (typeof localStorage === 'undefined') return
    const id = teamIdRef.value
    if (!id) return
    display.value = mergeTeamBoardDisplay(parseStored(localStorage.getItem(storageKey(id))))
  }

  function persist() {
    if (typeof localStorage === 'undefined') return
    const id = teamIdRef.value
    if (!id) return
    localStorage.setItem(storageKey(id), JSON.stringify(display.value))
  }

  watch(teamIdRef, () => load(), { immediate: true })
  watch(display, () => persist(), { deep: true })

  return { display }
}
