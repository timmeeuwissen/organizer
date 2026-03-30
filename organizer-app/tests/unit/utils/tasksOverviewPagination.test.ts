import { describe, it, expect } from 'vitest'
import {
  clampTaskListPageIndex,
  taskListTotalPages,
  sliceTaskListPage,
} from '~/utils/tasksOverviewPagination'

describe('clampTaskListPageIndex', () => {
  it('returns 0 for empty or invalid size', () => {
    expect(clampTaskListPageIndex(5, 0, 20)).toBe(0)
    expect(clampTaskListPageIndex(5, 10, 0)).toBe(0)
  })

  it('clamps high page down when list shrinks', () => {
    expect(clampTaskListPageIndex(4, 25, 10)).toBe(2) // pages 0,1,2
    expect(clampTaskListPageIndex(99, 25, 10)).toBe(2)
  })

  it('allows page 0 when one full page', () => {
    expect(clampTaskListPageIndex(0, 20, 20)).toBe(0)
  })

  it('clamps negative page to 0', () => {
    expect(clampTaskListPageIndex(-1, 100, 20)).toBe(0)
  })

  it('handles exact boundary (last page)', () => {
    expect(clampTaskListPageIndex(2, 25, 10)).toBe(2)
  })
})

describe('taskListTotalPages', () => {
  it('is at least 1 for any non-empty list', () => {
    expect(taskListTotalPages(0, 20)).toBe(1)
    expect(taskListTotalPages(1, 20)).toBe(1)
    expect(taskListTotalPages(20, 20)).toBe(1)
    expect(taskListTotalPages(21, 20)).toBe(2)
    expect(taskListTotalPages(25, 10)).toBe(3)
  })

  it('returns 1 when pageSize invalid', () => {
    expect(taskListTotalPages(100, 0)).toBe(1)
  })
})

describe('sliceTaskListPage', () => {
  const items = ['a', 'b', 'c', 'd', 'e']

  it('returns first page', () => {
    expect(sliceTaskListPage(items, 0, 2)).toEqual(['a', 'b'])
  })

  it('returns middle page', () => {
    expect(sliceTaskListPage(items, 1, 2)).toEqual(['c', 'd'])
  })

  it('returns partial last page', () => {
    expect(sliceTaskListPage(items, 2, 2)).toEqual(['e'])
  })

  it('clamps page when out of range', () => {
    expect(sliceTaskListPage(items, 99, 2)).toEqual(['e'])
  })

  it('returns empty for empty input', () => {
    expect(sliceTaskListPage([], 0, 10)).toEqual([])
  })
})
