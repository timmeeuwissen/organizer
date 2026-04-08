import { describe, expect, it } from 'vitest'
import { meetingFormToMeetingPayload, meetingToMeetingFormInput } from '~/utils/meetingsForm'
import type { Meeting } from '~/types/models'

describe('meetingFormToMeetingPayload', () => {
  it('maps form fields to meeting payload with start and end time', () => {
    const payload = meetingFormToMeetingPayload({
      subject: 'Weekly sync',
      summary: 'status update',
      category: 'team',
      plannedStatus: 'held',
      date: '2026-04-08',
      time: '10:30',
      location: 'Room A',
      participants: ['p1'],
      notes: 'Bring metrics',
      actionItems: 'Follow up',
      relatedProjects: ['project-1'],
    })

    expect(payload.title).toBe('Weekly sync')
    expect(payload.startTime).toBeInstanceOf(Date)
    expect(payload.endTime).toBeInstanceOf(Date)
    expect(payload.relatedProjects).toEqual(['project-1'])
    expect((payload as Partial<Meeting> & { actionItems?: string }).actionItems).toBe('Follow up')
  })

  it('does not set start/end for to_be_planned meetings', () => {
    const payload = meetingFormToMeetingPayload({
      subject: 'Plan later',
      plannedStatus: 'to_be_planned',
      date: '2026-04-08',
      time: '10:30',
    })

    expect(payload.startTime).toBeUndefined()
    expect(payload.endTime).toBeUndefined()
  })
})

describe('meetingToMeetingFormInput', () => {
  it('maps meeting model to meeting form input', () => {
    const startTime = new Date('2026-04-08T14:00:00.000Z')
    const meeting = {
      id: 'm1',
      userId: 'u1',
      title: 'Retro',
      startTime,
      endTime: new Date('2026-04-08T15:00:00.000Z'),
      participants: ['p1'],
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: 'some notes',
      relatedProjects: ['project-1'],
    } as Meeting

    const mapped = meetingToMeetingFormInput(meeting)
    expect(mapped.subject).toBe('Retro')
    expect(mapped.date).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(mapped.time).toMatch(/\d{2}:\d{2}/)
    expect(mapped.relatedProjects).toEqual(['project-1'])
  })
})
