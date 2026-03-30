import { describe, it, expect } from 'vitest'
import {
  normalizeTasksPageSize,
  TASKS_PAGE_SIZE_OPTIONS,
  mergeTasksUiSettings,
  pruneExpandedTaskIds,
  TASKS_UI_MAX_EXPANDED_IDS,
} from '~/config/tasksUi'

describe('normalizeTasksPageSize', () => {
  it('returns default for invalid input', () => {
    expect(normalizeTasksPageSize(undefined)).toBe(20)
    expect(normalizeTasksPageSize('')).toBe(20)
    expect(normalizeTasksPageSize(7)).toBe(20)
  })

  it('accepts allowed sizes', () => {
    for (const n of TASKS_PAGE_SIZE_OPTIONS) {
      expect(normalizeTasksPageSize(n)).toBe(n)
      expect(normalizeTasksPageSize(String(n))).toBe(n)
    }
  })
})

describe('mergeTasksUiSettings', () => {
  it('returns empty expandedTaskIds when missing', () => {
    expect(mergeTasksUiSettings(null)).toEqual({ expandedTaskIds: [] })
    expect(mergeTasksUiSettings(undefined)).toEqual({ expandedTaskIds: [] })
  })

  it('dedupes and keeps order', () => {
    expect(
      mergeTasksUiSettings({
        expandedTaskIds: ['a', 'b', 'a', 'c'],
      }),
    ).toEqual({ expandedTaskIds: ['a', 'b', 'c'] })
  })

  it('drops invalid entries', () => {
    expect(
      mergeTasksUiSettings({
        expandedTaskIds: ['x', '', 3 as unknown as string, 'y'],
      }),
    ).toEqual({ expandedTaskIds: ['x', 'y'] })
  })
})

describe('pruneExpandedTaskIds', () => {
  const valid = new Set(['a', 'b', 'c'])

  it('filters to valid ids and dedupes', () => {
    expect(pruneExpandedTaskIds(['a', 'z', 'a', 'b'], valid)).toEqual(['a', 'b'])
  })

  it('respects max length', () => {
    const many = Array.from({ length: TASKS_UI_MAX_EXPANDED_IDS + 10 }, (_, i) => `id-${i}`)
    const validSet = new Set(many)
    expect(pruneExpandedTaskIds(many, validSet)).toHaveLength(TASKS_UI_MAX_EXPANDED_IDS)
  })
})

describe('mergeTasksUiSettings max cap', () => {
  it('truncates expandedTaskIds to TASKS_UI_MAX_EXPANDED_IDS', () => {
    const ids = Array.from({ length: TASKS_UI_MAX_EXPANDED_IDS + 5 }, (_, i) => `t-${i}`)
    const merged = mergeTasksUiSettings({ expandedTaskIds: ids })
    expect(merged.expandedTaskIds).toHaveLength(TASKS_UI_MAX_EXPANDED_IDS)
    expect(merged.expandedTaskIds![0]).toBe('t-0')
    expect(merged.expandedTaskIds![TASKS_UI_MAX_EXPANDED_IDS - 1]).toBe(
      `t-${TASKS_UI_MAX_EXPANDED_IDS - 1}`,
    )
  })
})
