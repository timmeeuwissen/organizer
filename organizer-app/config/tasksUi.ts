/**
 * Tasks list UI: page sizes (read from config, not hard-coded in components).
 */

export const TASKS_PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 50, 100] as const

export type TasksPageSize = (typeof TASKS_PAGE_SIZE_OPTIONS)[number]

export function normalizeTasksPageSize(n: unknown): TasksPageSize {
  const num = typeof n === 'number' ? n : Number(n)
  if (Number.isFinite(num) && (TASKS_PAGE_SIZE_OPTIONS as readonly number[]).includes(num)) {
    return num as TasksPageSize
  }
  return 20
}

/** Max task IDs stored as expanded in user settings (Firestore size / UX guard). */
export const TASKS_UI_MAX_EXPANDED_IDS = 500

/** Persisted tasks list UI (page size lives here too via future merge; expanded nodes for hierarchy). */
export interface TasksUiSettings {
  /** Task IDs whose subtask rows are expanded in the overview (All tab). */
  expandedTaskIds?: string[]
}

export function pruneExpandedTaskIds(
  ids: string[] | undefined,
  validTaskIds: ReadonlySet<string>,
): string[] {
  if (!ids?.length) {
    return []
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (typeof id !== 'string' || !id || seen.has(id) || !validTaskIds.has(id)) {
      continue
    }
    seen.add(id)
    out.push(id)
    if (out.length >= TASKS_UI_MAX_EXPANDED_IDS) {
      break
    }
  }
  return out
}

export function mergeTasksUiSettings(
  saved: Partial<TasksUiSettings> | null | undefined,
): TasksUiSettings {
  const raw = Array.isArray(saved?.expandedTaskIds)
    ? saved.expandedTaskIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
  const seen = new Set<string>()
  const expanded: string[] = []
  for (const id of raw) {
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    expanded.push(id)
    if (expanded.length >= TASKS_UI_MAX_EXPANDED_IDS) {
      break
    }
  }
  return {
    expandedTaskIds: expanded,
  }
}
