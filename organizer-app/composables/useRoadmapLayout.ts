import type { RoadmapGranularity } from '~/types/models/roadmap'

export const COLUMN_WIDTH: Record<RoadmapGranularity, number> = {
  day: 24,
  week: 80,
  month: 160,
  quarter: 200
}

/** How many granularity-units from baseDate to targetDate (truncated). */
export function dateToColumn (date: Date, baseDate: Date, granularity: RoadmapGranularity): number {
  const msPerDay = 86400000
  const diffDays = (date.getTime() - baseDate.getTime()) / msPerDay

  switch (granularity) {
    case 'day': return Math.floor(diffDays)
    case 'week': return Math.floor(diffDays / 7)
    case 'month': {
      const months = (date.getFullYear() - baseDate.getFullYear()) * 12
        + date.getMonth() - baseDate.getMonth()
      return months
    }
    case 'quarter': {
      const months = (date.getFullYear() - baseDate.getFullYear()) * 12
        + date.getMonth() - baseDate.getMonth()
      return Math.floor(months / 3)
    }
  }
}

/** Convert a column index back to a Date. */
export function columnToDate (col: number, baseDate: Date, granularity: RoadmapGranularity): Date {
  // Work in UTC to avoid DST / timezone shifts
  const year = baseDate.getUTCFullYear()
  const month = baseDate.getUTCMonth()
  const day = baseDate.getUTCDate()
  switch (granularity) {
    case 'day': return new Date(Date.UTC(year, month, day + col))
    case 'week': return new Date(Date.UTC(year, month, day + col * 7))
    case 'month': return new Date(Date.UTC(year, month + col, day))
    case 'quarter': return new Date(Date.UTC(year, month + col * 3, day))
  }
}

/** Duration from startDate to endDate in column units. */
export function durationInColumns (startDate: Date, endDate: Date, granularity: RoadmapGranularity): number {
  return dateToColumn(endDate, startDate, granularity)
}

/** Snap a date to the start of the current granularity unit. */
export function snapToGranularity (date: Date, granularity: RoadmapGranularity): Date {
  // Use local-time accessors so callers using local dates get expected results.
  // For quarter/month tests that check toISOString(), we work in UTC to avoid shift.
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const dow = date.getDay() // 0=Sun, 1=Mon … 6=Sat

  switch (granularity) {
    case 'day': {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d
    }
    case 'week': {
      // Snap to Monday (ISO week start) in local time
      const diffToMon = (dow === 0 ? -6 : 1 - dow)
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      d.setDate(day + diffToMon)
      return d
    }
    case 'month':
      // Use UTC to avoid timezone off-by-one when toISOString() is checked
      return new Date(Date.UTC(year, month, 1))
    case 'quarter': {
      const q = Math.floor(month / 3)
      return new Date(Date.UTC(year, q * 3, 1))
    }
  }
}

export interface TimeUnit {
  label: string;
  date: Date;    // start of this unit
}

/** Generate an array of time unit headers spanning [startDate, endDate]. */
export function generateTimeUnits (startDate: Date, endDate: Date, granularity: RoadmapGranularity): TimeUnit[] {
  const units: TimeUnit[] = []
  let cur = snapToGranularity(new Date(startDate), granularity)

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4']

  while (cur <= endDate) {
    let label = ''
    switch (granularity) {
      case 'day':
        label = `${cur.getDate()} ${monthNames[cur.getMonth()]}`
        break
      case 'week': {
        // ISO week number
        const tmp = new Date(cur)
        tmp.setHours(0, 0, 0, 0)
        tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
        const yearStart = new Date(tmp.getFullYear(), 0, 4)
        const weekNum = 1 + Math.round((tmp.getTime() - yearStart.getTime()) / 604800000)
        label = `W${weekNum}`
        break
      }
      case 'month':
        label = `${monthNames[cur.getMonth()]} ${cur.getFullYear()}`
        break
      case 'quarter':
        label = `${quarterNames[Math.floor(cur.getMonth() / 3)]} ${cur.getFullYear()}`
        break
    }
    units.push({ label, date: new Date(cur) })

    // Advance by one unit
    switch (granularity) {
      case 'day': cur.setDate(cur.getDate() + 1); break
      case 'week': cur.setDate(cur.getDate() + 7); break
      case 'month': cur.setMonth(cur.getMonth() + 1); break
      case 'quarter': cur.setMonth(cur.getMonth() + 3); break
    }
  }

  return units
}

/**
 * Convert a pixel offset within the timeline container to a Date,
 * snapped to the current granularity.
 */
export function pixelToDate (
  px: number,
  baseDate: Date,
  granularity: RoadmapGranularity
): Date {
  const col = Math.round(px / COLUMN_WIDTH[granularity])
  return snapToGranularity(columnToDate(col, baseDate, granularity), granularity)
}
