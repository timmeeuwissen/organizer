// tests/unit/composables/useDeleteWithReferences.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ---------------------------------------------------------------------------
// Mutable store state – each test resets these to empty and can push records.
// ---------------------------------------------------------------------------
let mockPeople: any[] = []
let mockProjects: any[] = []
let mockTasks: any[] = []
let mockMeetings: any[] = []
let mockTeams: any[] = []

vi.mock('~/stores/people', () => ({
  usePeopleStore: () => ({ get people () { return mockPeople } })
}))
vi.mock('~/stores/projects', () => ({
  useProjectsStore: () => ({ get projects () { return mockProjects } })
}))
vi.mock('~/stores/tasks', () => ({
  useTasksStore: () => ({ get tasks () { return mockTasks } })
}))
vi.mock('~/stores/meetings', () => ({
  useMeetingsStore: () => ({ get meetings () { return mockMeetings } })
}))
vi.mock('~/stores/teams', () => ({
  useTeamsStore: () => ({ get teams () { return mockTeams } })
}))

describe('useDeleteWithReferences', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPeople = []
    mockProjects = []
    mockTasks = []
    mockMeetings = []
    mockTeams = []
  })

  // -------------------------------------------------------------------------
  // person references
  // -------------------------------------------------------------------------

  it('getReferences("person") returns meetings where person is a participant', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    mockMeetings.push({ id: 'm1', subject: 'Standup', participants: ['person-1', 'person-2'] })
    mockMeetings.push({ id: 'm2', subject: 'Retro', participants: ['person-2'] })

    const refs = getReferences('person', 'person-1')

    const meetingRefs = refs.filter(r => r.module === 'meetings')
    expect(meetingRefs).toHaveLength(1)
    expect(meetingRefs[0].id).toBe('m1')
    expect(meetingRefs[0].label).toBe('Standup')
    expect(meetingRefs[0].icon).toBe('mdi-account-group-outline')
  })

  it('getReferences("person") returns tasks where person is assignedTo', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    mockTasks.push({ id: 't1', title: 'Write tests', assignedTo: 'person-1' })
    mockTasks.push({ id: 't2', title: 'Deploy', assignedTo: 'person-2' })

    const refs = getReferences('person', 'person-1')

    const taskRefs = refs.filter(r => r.module === 'tasks')
    expect(taskRefs).toHaveLength(1)
    expect(taskRefs[0].id).toBe('t1')
    expect(taskRefs[0].label).toBe('Write tests')
    expect(taskRefs[0].icon).toBe('mdi-checkbox-marked-outline')
  })

  it('getReferences("person") returns empty array when there are no references', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    // Stores are all empty (reset in beforeEach)
    const refs = getReferences('person', 'person-99')

    expect(refs).toEqual([])
  })

  it('getReferences("person") returns projects where person is a member', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    mockProjects.push({ id: 'proj1', title: 'Alpha', members: ['person-1'], stakeholders: [] })
    mockProjects.push({ id: 'proj2', title: 'Beta', members: ['person-2'], stakeholders: [] })

    const refs = getReferences('person', 'person-1')

    const projectRefs = refs.filter(r => r.module === 'projects')
    expect(projectRefs).toHaveLength(1)
    expect(projectRefs[0].id).toBe('proj1')
  })

  it('getReferences("person") returns projects where person is a stakeholder', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    mockProjects.push({ id: 'proj1', title: 'Alpha', members: [], stakeholders: ['person-1'] })

    const refs = getReferences('person', 'person-1')

    const projectRefs = refs.filter(r => r.module === 'projects')
    expect(projectRefs).toHaveLength(1)
    expect(projectRefs[0].id).toBe('proj1')
  })

  it('getReferences("person") returns teams where person is a member', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    mockTeams.push({ id: 'team1', name: 'Engineering', members: ['person-1'] })

    const refs = getReferences('person', 'person-1')

    const teamRefs = refs.filter(r => r.module === 'teams')
    expect(teamRefs).toHaveLength(1)
    expect(teamRefs[0].id).toBe('team1')
    expect(teamRefs[0].icon).toBe('mdi-account-multiple-outline')
  })

  // -------------------------------------------------------------------------
  // project references
  // -------------------------------------------------------------------------

  it('getReferences("project") returns tasks with relatedProjects including that id', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    mockTasks.push({ id: 't1', title: 'Build feature', relatedProjects: ['proj-1', 'proj-2'] })
    mockTasks.push({ id: 't2', title: 'Fix bug', relatedProjects: ['proj-2'] })

    const refs = getReferences('project', 'proj-1')

    const taskRefs = refs.filter(r => r.module === 'tasks')
    expect(taskRefs).toHaveLength(1)
    expect(taskRefs[0].id).toBe('t1')
    expect(taskRefs[0].label).toBe('Build feature')
  })

  it('getReferences("project") returns people linked to the project', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    mockPeople.push({ id: 'p1', firstName: 'Alice', lastName: 'Smith', relatedProjects: ['proj-1'] })
    mockPeople.push({ id: 'p2', firstName: 'Bob', lastName: 'Jones', relatedProjects: [] })

    const refs = getReferences('project', 'proj-1')

    const peopleRefs = refs.filter(r => r.module === 'people')
    expect(peopleRefs).toHaveLength(1)
    expect(peopleRefs[0].id).toBe('p1')
    expect(peopleRefs[0].label).toBe('Alice Smith')
    expect(peopleRefs[0].icon).toBe('mdi-account-group')
  })

  it('getReferences("project") returns meetings linked to the project', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { getReferences } = useDeleteWithReferences()

    mockMeetings.push({ id: 'm1', subject: 'Kickoff', relatedProjects: ['proj-1'] })
    mockMeetings.push({ id: 'm2', subject: 'Review', relatedProjects: [] })

    const refs = getReferences('project', 'proj-1')

    const meetingRefs = refs.filter(r => r.module === 'meetings')
    expect(meetingRefs).toHaveLength(1)
    expect(meetingRefs[0].id).toBe('m1')
  })

  // -------------------------------------------------------------------------
  // referencesFor computed
  // -------------------------------------------------------------------------

  it('referencesFor returns a computed ref with the same data as getReferences', async () => {
    const { useDeleteWithReferences } = await import('~/composables/useDeleteWithReferences')
    const { referencesFor } = useDeleteWithReferences()

    mockTasks.push({ id: 't1', title: 'Task A', assignedTo: 'person-1' })

    const computed = referencesFor('person', 'person-1')

    expect(computed.value).toHaveLength(1)
    expect(computed.value[0].id).toBe('t1')
  })
})
