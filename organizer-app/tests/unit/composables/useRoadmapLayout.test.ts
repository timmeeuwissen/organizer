import { describe, it, expect } from 'vitest'
import {
  COLUMN_WIDTH,
  dateToColumn,
  columnToDate,
  durationInColumns,
  snapToGranularity,
  generateTimeUnits
} from '../../../composables/useRoadmapLayout'

const base = new Date('2026-01-01') // Thursday

describe('COLUMN_WIDTH', () => {
  it('returns pixel widths for each granularity', () => {
    expect(COLUMN_WIDTH.day).toBe(24)
    expect(COLUMN_WIDTH.week).toBe(80)
    expect(COLUMN_WIDTH.month).toBe(160)
    expect(COLUMN_WIDTH.quarter).toBe(200)
  })
})

describe('dateToColumn', () => {
  it('returns 0 for the base date with day granularity', () => {
    expect(dateToColumn(base, base, 'day')).toBe(0)
  })

  it('returns 7 for 7 days later with day granularity', () => {
    const d = new Date('2026-01-08')
    expect(dateToColumn(d, base, 'day')).toBe(7)
  })

  it('returns 1 for 7 days later with week granularity', () => {
    const d = new Date('2026-01-08')
    expect(dateToColumn(d, base, 'week')).toBe(1)
  })

  it('returns 1 for Feb 1 with month granularity starting Jan 1', () => {
    const d = new Date('2026-02-01')
    expect(dateToColumn(d, base, 'month')).toBe(1)
  })

  it('returns 1 for Apr 1 with quarter granularity starting Jan 1', () => {
    const d = new Date('2026-04-01')
    expect(dateToColumn(d, base, 'quarter')).toBe(1)
  })
})

describe('columnToDate', () => {
  it('round-trips with dateToColumn for day', () => {
    const d = new Date('2026-03-15')
    const col = dateToColumn(d, base, 'day')
    const result = columnToDate(col, base, 'day')
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-15')
  })

  it('round-trips with dateToColumn for month', () => {
    const d = new Date('2026-04-01')
    const col = dateToColumn(d, base, 'month')
    const result = columnToDate(col, base, 'month')
    expect(result.toISOString().slice(0, 10)).toBe('2026-04-01')
  })
})

describe('durationInColumns', () => {
  it('returns 0 for same start and end with day granularity', () => {
    expect(durationInColumns(base, base, 'day')).toBe(0)
  })

  it('returns 31 for Jan 1 to Feb 1 with day granularity', () => {
    expect(durationInColumns(base, new Date('2026-02-01'), 'day')).toBe(31)
  })

  it('returns 1 for Jan 1 to Feb 1 with month granularity', () => {
    expect(durationInColumns(base, new Date('2026-02-01'), 'month')).toBe(1)
  })
})

describe('snapToGranularity', () => {
  it('snaps to start of day', () => {
    const d = new Date('2026-03-15T14:35:00Z')
    const snapped = snapToGranularity(d, 'day')
    expect(snapped.getHours()).toBe(0)
    expect(snapped.getMinutes()).toBe(0)
    expect(snapped.getSeconds()).toBe(0)
  })

  it('snaps to start of the week (Monday)', () => {
    const d = new Date('2026-01-07') // Wednesday
    const snapped = snapToGranularity(d, 'week')
    expect(snapped.getDay()).toBe(1) // Monday
  })

  it('snaps to start of month', () => {
    const d = new Date('2026-03-17')
    expect(snapToGranularity(d, 'month').getDate()).toBe(1)
  })

  it('snaps to start of quarter', () => {
    const d = new Date('2026-05-10') // May → Q2 starts Apr 1
    const snapped = snapToGranularity(d, 'quarter')
    expect(snapped.toISOString().slice(0, 10)).toBe('2026-04-01')
  })
})

describe('generateTimeUnits', () => {
  it('generates correct number of months between Jan and Mar', () => {
    const units = generateTimeUnits(new Date('2026-01-01'), new Date('2026-03-31'), 'month')
    expect(units).toHaveLength(3)
    expect(units[0].label).toBe('Jan 2026')
    expect(units[2].label).toBe('Mar 2026')
  })

  it('generates week units with ISO week labels', () => {
    const units = generateTimeUnits(new Date('2026-01-05'), new Date('2026-01-18'), 'week')
    expect(units.length).toBeGreaterThanOrEqual(2)
    expect(units[0].label).toMatch(/W\d+/)
  })
})
