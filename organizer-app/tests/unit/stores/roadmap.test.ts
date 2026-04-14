import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRoadmapStore } from '../../../stores/roadmap'
import type { Roadmap, RoadmapActivity, RoadmapPhase, RoadmapMilestone } from '../../../types/models/roadmap'

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'user-1' } }))
}))
vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({ error: vi.fn(), info: vi.fn() }))
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  getFirestore: vi.fn(() => ({}))
}))

const now = new Date('2026-01-01')

function makeRoadmap (overrides: Partial<Roadmap> = {}): Roadmap {
  return {
    id: 'default',
    projectId: 'proj-1',
    userId: 'user-1',
    granularity: 'month',
    phases: [],
    activities: [],
    milestones: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

function makeActivity (overrides: Partial<RoadmapActivity> = {}): RoadmapActivity {
  return {
    id: 'act-1',
    title: 'Test Activity',
    color: 'primary',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-03-01'),
    order: 0,
    links: [],
    ...overrides
  }
}

function makeMilestone (overrides: Partial<RoadmapMilestone> = {}): RoadmapMilestone {
  return {
    id: 'ms-1',
    title: 'Launch',
    date: new Date('2026-03-15'),
    color: 'amber',
    ...overrides
  }
}

describe('Roadmap Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with null roadmap', () => {
    expect(useRoadmapStore().roadmap).toBeNull()
  })

  it('upsertActivity adds a new activity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap()
    const act = makeActivity()
    store.upsertActivity('proj-1', act)
    expect(store.roadmap!.activities).toHaveLength(1)
    expect(store.roadmap!.activities[0].id).toBe('act-1')
  })

  it('upsertActivity updates an existing activity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({ activities: [makeActivity()] })
    store.upsertActivity('proj-1', makeActivity({ title: 'Updated' }))
    expect(store.roadmap!.activities).toHaveLength(1)
    expect(store.roadmap!.activities[0].title).toBe('Updated')
  })

  it('deleteActivity removes the activity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({ activities: [makeActivity()] })
    store.deleteActivity('proj-1', 'act-1')
    expect(store.roadmap!.activities).toHaveLength(0)
  })

  it('deleteActivity clears activityId from milestones on that activity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({
      activities: [makeActivity()],
      milestones: [makeMilestone({ activityId: 'act-1' })]
    })
    store.deleteActivity('proj-1', 'act-1')
    expect(store.roadmap!.milestones[0].activityId).toBeUndefined()
  })

  it('deletePhase clears phaseId from activities on that phase', () => {
    const store = useRoadmapStore()
    const phase: RoadmapPhase = { id: 'ph-1', title: 'Phase 1', color: 'blue', startDate: now, endDate: now, order: 0 }
    store.roadmap = makeRoadmap({
      phases: [phase],
      activities: [makeActivity({ phaseId: 'ph-1' })]
    })
    store.deletePhase('proj-1', 'ph-1')
    expect(store.roadmap!.phases).toHaveLength(0)
    expect(store.roadmap!.activities[0].phaseId).toBeUndefined()
  })

  it('shiftAll moves all dates by the given days', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({
      activities: [makeActivity({
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-03-01')
      })],
      milestones: [makeMilestone({ date: new Date('2026-03-15') })]
    })
    store.shiftAll('proj-1', 7)
    expect(store.roadmap!.activities[0].startDate.toISOString().slice(0, 10)).toBe('2026-02-08')
    expect(store.roadmap!.activities[0].endDate.toISOString().slice(0, 10)).toBe('2026-03-08')
    expect(store.roadmap!.milestones[0].date.toISOString().slice(0, 10)).toBe('2026-03-22')
  })

  it('shiftAll with negative days shifts earlier', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap({
      activities: [makeActivity({ startDate: new Date('2026-02-08'), endDate: new Date('2026-03-08') })]
    })
    store.shiftAll('proj-1', -7)
    expect(store.roadmap!.activities[0].startDate.toISOString().slice(0, 10)).toBe('2026-02-01')
  })

  it('setGranularity updates granularity', () => {
    const store = useRoadmapStore()
    store.roadmap = makeRoadmap()
    store.setGranularity('proj-1', 'week')
    expect(store.roadmap!.granularity).toBe('week')
  })
})
