import { describe, it, expect, vi, beforeEach } from 'vitest'

import { setActivePinia, createPinia } from 'pinia'
import { useTasksStore } from '../../../stores/tasks'
import type { Task } from '~/types/models'

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
  getFirestore: vi.fn(() => ({})),
  Timestamp: { fromDate: vi.fn(d => d) }
}))

vi.mock('../../../stores/tasks/providerSync', () => ({
  filterTaskAccounts: vi.fn(a => a),
  fetchProviderTasksParallel: vi.fn(() => Promise.resolve({})),
  mergeProviderTasksIntoFirestore: vi.fn(() => Promise.resolve()),
  createTaskViaProvider: vi.fn(),
  updateTaskViaProvider: vi.fn(),
  deleteTaskViaProvider: vi.fn(),
  completeTaskViaProvider: vi.fn()
}))

const now = new Date()
const yesterday = new Date(now.getTime() - 86_400_000)
const tomorrow = new Date(now.getTime() + 86_400_000)

function makeTask (overrides: Partial<Task>): Task {
  return {
    id: 'task1',
    userId: 'test-user-id',
    title: 'Test Task',
    status: 'todo',
    priority: 'medium',
    tags: [],
    subtasks: [],
    relatedProjects: [],
    relatedMeetings: [],
    relatedBehaviors: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('Tasks Store – getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with empty tasks', () => {
    expect(useTasksStore().tasks).toEqual([])
  })

  it('todoTasks returns only todo-status tasks', () => {
    const store = useTasksStore()
    store.tasks = [
      makeTask({ id: 't1', status: 'todo' }),
      makeTask({ id: 't2', status: 'inProgress' }),
      makeTask({ id: 't3', status: 'completed' })
    ]
    expect(store.todoTasks).toHaveLength(1)
    expect(store.todoTasks[0].id).toBe('t1')
  })

  it('completedTasks returns only completed-status tasks', () => {
    const store = useTasksStore()
    store.tasks = [
      makeTask({ id: 't1', status: 'todo' }),
      makeTask({ id: 't2', status: 'completed' }),
      makeTask({ id: 't3', status: 'completed' })
    ]
    expect(store.completedTasks).toHaveLength(2)
    expect(store.completedTasks.every(t => t.status === 'completed')).toBe(true)
  })

  it('upcomingTasks returns active tasks with future due dates, sorted ascending', () => {
    const store = useTasksStore()
    const future1 = new Date(now.getTime() + 86_400_000)
    const future2 = new Date(now.getTime() + 172_800_000)
    store.tasks = [
      makeTask({ id: 't1', status: 'todo', dueDate: future2 }),
      makeTask({ id: 't2', status: 'inProgress', dueDate: future1 }),
      makeTask({ id: 't3', status: 'todo', dueDate: yesterday }),
      makeTask({ id: 't4', status: 'completed', dueDate: future1 })
    ]
    const result = store.upcomingTasks
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('t2')
    expect(result[1].id).toBe('t1')
  })

  it('overdueTasks returns active tasks with past due dates, sorted ascending', () => {
    const store = useTasksStore()
    const past1 = new Date(now.getTime() - 172_800_000)
    const past2 = new Date(now.getTime() - 86_400_000)
    store.tasks = [
      makeTask({ id: 't1', status: 'todo', dueDate: past2 }),
      makeTask({ id: 't2', status: 'inProgress', dueDate: past1 }),
      makeTask({ id: 't3', status: 'todo', dueDate: tomorrow }),
      makeTask({ id: 't4', status: 'completed', dueDate: past1 })
    ]
    const result = store.overdueTasks
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('t2')
    expect(result[1].id).toBe('t1')
  })

  it('getTags returns deduplicated tags across all tasks', () => {
    const store = useTasksStore()
    store.tasks = [
      makeTask({ id: 't1', tags: ['alpha', 'beta'] }),
      makeTask({ id: 't2', tags: ['beta', 'gamma'] })
    ]
    const tags = store.getTags
    expect(tags).toHaveLength(3)
    expect(tags).toContain('alpha')
    expect(tags).toContain('beta')
    expect(tags).toContain('gamma')
  })

  it('getById returns the matching task or null', () => {
    const store = useTasksStore()
    store.tasks = [makeTask({ id: 'abc' })]
    expect(store.getById('abc')?.id).toBe('abc')
    expect(store.getById('missing')).toBeNull()
  })
})
