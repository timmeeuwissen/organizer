import type { Meeting } from '~/types/models'

export interface MeetingFormInput {
  subject: string
  summary?: string
  category?: string
  plannedStatus?: 'held' | 'to_be_planned'
  date?: string | Date | null
  time?: string
  location?: string
  participants?: string[]
  notes?: string
  actionItems?: string
  calendarEventId?: string | null
  relatedProjects?: string[]
}

function parseDateTime(dateInput?: string | Date | null, time?: string): Date | null {
  if (!dateInput || !time) {
    return null
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

export function meetingFormToMeetingPayload(input: MeetingFormInput): Partial<Meeting> {
  const plannedStatus = input.plannedStatus || 'held'
  const payload: Partial<Meeting> = {
    title: input.subject?.trim() || '',
    summary: input.summary || '',
    category: input.category || '',
    plannedStatus,
    location: input.location || '',
    participants: input.participants || [],
    notes: input.notes || '',
    relatedProjects: input.relatedProjects || [],
    calendarEventId: input.calendarEventId || undefined,
  }

  if (input.actionItems && input.actionItems.trim().length > 0) {
    ;(payload as Partial<Meeting> & { actionItems?: string }).actionItems = input.actionItems
  }

  if (plannedStatus !== 'to_be_planned') {
    const startTime = parseDateTime(input.date, input.time)
    if (startTime) {
      payload.startTime = startTime
      payload.endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
    }
  }

  return payload
}

export function meetingToMeetingFormInput(meeting: Meeting): MeetingFormInput {
  return {
    subject: meeting.title,
    summary: meeting.summary || '',
    category: meeting.category || '',
    plannedStatus: meeting.plannedStatus || 'held',
    date: meeting.startTime
      ? new Date(meeting.startTime).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    time: meeting.startTime
      ? new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : '09:00',
    location: meeting.location || '',
    participants: [...(meeting.participants || [])],
    notes: meeting.notes || '',
    actionItems: ((meeting as Meeting & { actionItems?: string }).actionItems || ''),
    calendarEventId: meeting.calendarEventId || null,
    relatedProjects: [...(meeting.relatedProjects || [])],
  }
}
