import { describe, it, expect, vi, beforeEach } from 'vitest'

import { setActivePinia, createPinia } from 'pinia'
import { useProjectsStore } from '../../../stores/projects'
import type { Project } from '~/types/models'

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'test-user-id' } }))
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  getFirestore: vi.fn(() => ({}))
}))

const now = new Date()

function makeProject (overrides: Partial<Project>): Project {
  return {
    id: 'proj1',
    userId: 'test-user-id',
    title: 'Test Project',
    description: '',
    status: 'active',
    priority: 'medium',
    members: [],
    tasks: [],
    pages: [],
    progress: 0,
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('Projects Store – getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with empty projects', () => {
    expect(useProjectsStore().projects).toEqual([])
  })

  it('activeProjects returns only active-status projects', () => {
    const store = useProjectsStore()
    store.projects = [
      makeProject({ id: 'p1', status: 'active' }),
      makeProject({ id: 'p2', status: 'completed' }),
      makeProject({ id: 'p3', status: 'active' })
    ]
    expect(store.activeProjects).toHaveLength(2)
    expect(store.activeProjects.every(p => p.status === 'active')).toBe(true)
  })

  it('completedProjects returns only completed-status projects', () => {
    const store = useProjectsStore()
    store.projects = [
      makeProject({ id: 'p1', status: 'active' }),
      makeProject({ id: 'p2', status: 'completed' }),
      makeProject({ id: 'p3', status: 'onHold' })
    ]
    expect(store.completedProjects).toHaveLength(1)
    expect(store.completedProjects[0].id).toBe('p2')
  })

  it('getByTag returns projects that include the tag', () => {
    const store = useProjectsStore()
    store.projects = [
      makeProject({ id: 'p1', tags: ['frontend', 'urgent'] }),
      makeProject({ id: 'p2', tags: ['backend'] }),
      makeProject({ id: 'p3', tags: ['frontend'] })
    ]
    const result = store.getByTag('frontend')
    expect(result).toHaveLength(2)
    expect(result.map(p => p.id)).toContain('p1')
    expect(result.map(p => p.id)).toContain('p3')
  })

  it('getByTag returns empty array when no match', () => {
    const store = useProjectsStore()
    store.projects = [makeProject({ id: 'p1', tags: ['alpha'] })]
    expect(store.getByTag('nonexistent')).toHaveLength(0)
  })

  it('getById returns the matching project or null', () => {
    const store = useProjectsStore()
    store.projects = [makeProject({ id: 'xyz' })]
    expect(store.getById('xyz')?.id).toBe('xyz')
    expect(store.getById('missing')).toBeNull()
  })

  it('getPriorityValue converts string priorities to expected labels', () => {
    const store = useProjectsStore()
    expect(store.getPriorityValue('low')).toBe('low')
    expect(store.getPriorityValue('medium')).toBe('medium')
    expect(store.getPriorityValue('high')).toBe('high')
    expect(store.getPriorityValue('urgent')).toBe('urgent')
  })

  it('getPriorityValue converts legacy numeric priorities', () => {
    const store = useProjectsStore()
    expect(store.getPriorityValue(2)).toBe('low')
    expect(store.getPriorityValue(5)).toBe('medium')
    expect(store.getPriorityValue(7)).toBe('high')
    expect(store.getPriorityValue(9)).toBe('urgent')
  })

  it('getPriorityValue returns medium for unknown values', () => {
    const store = useProjectsStore()
    expect(store.getPriorityValue('unknown')).toBe('medium')
  })
})
