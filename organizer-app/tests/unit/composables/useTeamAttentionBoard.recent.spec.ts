import { describe, it, expect } from 'vitest'
import type { Person } from '~/types/models'
import type { Email } from '~/stores/mail'
import {
  emailInvolvesPerson,
  recentInboxEmailsForPerson,
  taskBoardItemsForPerson
} from '~/composables/useTeamAttentionBoard'
import type { TeamBoardItem } from '~/composables/useTeamAttentionBoard'

function em (partial: Partial<Email> & Pick<Email, 'id' | 'subject' | 'date'>): Email {
  return {
    from: { name: '', email: 'a@x.com' },
    to: [],
    body: '',
    read: true,
    folder: 'inbox',
    ...partial
  }
}

describe('emailInvolvesPerson', () => {
  const alice: Person = {
    id: 'p1',
    userId: 'u',
    firstName: 'A',
    lastName: 'L',
    email: 'alice@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('matches from address (case-insensitive)', () => {
    const e = em({
      id: '1',
      subject: 'Hi',
      date: new Date(),
      from: { name: 'A', email: 'Alice@Example.com' }
    })
    expect(emailInvolvesPerson(e, alice)).toBe(true)
  })

  it('matches to / cc', () => {
    const e = em({
      id: '2',
      subject: 'Hi',
      date: new Date(),
      from: { name: 'B', email: 'bob@example.com' },
      to: [{ name: 'A', email: 'alice@example.com' }]
    })
    expect(emailInvolvesPerson(e, alice)).toBe(true)
    const e2 = em({
      id: '3',
      subject: 'Hi',
      date: new Date(),
      from: { name: 'B', email: 'bob@example.com' },
      to: [],
      cc: [{ name: 'A', email: 'alice@example.com' }]
    })
    expect(emailInvolvesPerson(e2, alice)).toBe(true)
  })

  it('returns false when person has no email', () => {
    const p = { ...alice, email: '' }
    const e = em({ id: '4', subject: 'x', date: new Date() })
    expect(emailInvolvesPerson(e, p)).toBe(false)
  })
})

describe('recentInboxEmailsForPerson', () => {
  const bob: Person = {
    id: 'b',
    userId: 'u',
    firstName: 'B',
    lastName: 'B',
    email: 'bob@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('returns latest inbox threads involving person up to limit', () => {
    const older = new Date('2020-01-01')
    const newer = new Date('2024-06-01')
    const emails = [
      em({
        id: 'a',
        subject: 'old',
        date: older,
        folder: 'inbox',
        from: { name: 'B', email: 'bob@example.com' }
      }),
      em({
        id: 'b',
        subject: 'new',
        date: newer,
        folder: 'inbox',
        from: { name: 'X', email: 'x@y.com' },
        to: [{ name: 'B', email: 'bob@example.com' }]
      }),
      em({
        id: 'c',
        subject: 'sent',
        date: newer,
        folder: 'sent',
        from: { name: 'B', email: 'bob@example.com' }
      })
    ]
    const r = recentInboxEmailsForPerson(emails, bob, 10)
    expect(r.map(x => x.id)).toEqual(['b', 'a'])
  })

  it('respects limit', () => {
    const emails = [1, 2, 3, 4].map(n =>
      em({
        id: String(n),
        subject: `s${n}`,
        date: new Date(2024, 0, n),
        from: { name: 'B', email: 'bob@example.com' }
      })
    )
    const r = recentInboxEmailsForPerson(emails, bob, 2)
    expect(r).toHaveLength(2)
    expect(r[0].id).toBe('4')
    expect(r[1].id).toBe('3')
  })
})

describe('taskBoardItemsForPerson', () => {
  it('filters task items by personId', () => {
    const items = [
      { kind: 'task' as const, task: { id: 't1' } as any, personId: 'a', weight: 1 },
      { kind: 'task' as const, task: { id: 't2' } as any, personId: 'b', weight: 1 }
    ] as TeamBoardItem[]
    expect(taskBoardItemsForPerson(items, 'b')).toHaveLength(1)
    expect(taskBoardItemsForPerson(items, 'b')[0].kind).toBe('task')
  })
})
