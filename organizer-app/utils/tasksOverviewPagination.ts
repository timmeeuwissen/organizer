/**
 * Pure helpers for client-side task list pagination (overview table).
 */

export function clampTaskListPageIndex (
  currentPage: number,
  totalRows: number,
  pageSize: number
): number {
  if (totalRows <= 0 || pageSize <= 0) {
    return 0
  }
  const maxPage = Math.max(0, Math.ceil(totalRows / pageSize) - 1)
  return Math.min(Math.max(0, currentPage), maxPage)
}

export function taskListTotalPages (totalRows: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1
  }
  return Math.max(1, Math.ceil(totalRows / pageSize) || 1)
}

export function sliceTaskListPage<T> (
  items: readonly T[],
  currentPage: number,
  pageSize: number
): T[] {
  const clamped = clampTaskListPageIndex(currentPage, items.length, pageSize)
  const start = clamped * pageSize
  return items.slice(start, start + pageSize)
}
