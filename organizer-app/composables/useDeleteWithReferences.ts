import { computed } from 'vue'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useTasksStore } from '~/stores/tasks'
import { useMeetingsStore } from '~/stores/meetings'
import { useTeamsStore } from '~/stores/teams'

export interface ReferenceItem {
  module: string
  icon: string
  id: string
  label: string
}

/**
 * Returns all records that reference the given entity id.
 * Used to warn users before deleting a record that is linked elsewhere.
 */
export function useDeleteWithReferences () {
  const peopleStore = usePeopleStore()
  const projectsStore = useProjectsStore()
  const tasksStore = useTasksStore()
  const meetingsStore = useMeetingsStore()
  const teamsStore = useTeamsStore()

  function getReferences (entityType: 'person' | 'project' | 'team', entityId: string): ReferenceItem[] {
    const refs: ReferenceItem[] = []

    if (entityType === 'person') {
      // Projects that have this person as member/stakeholder
      projectsStore.projects.forEach((p) => {
        if (p.members?.includes(entityId) || p.stakeholders?.includes(entityId)) {
          refs.push({ module: 'projects', icon: 'mdi-folder-multiple', id: p.id, label: p.title })
        }
      })
      // Meetings with this participant
      meetingsStore.meetings.forEach((m) => {
        if (m.participants?.includes(entityId)) {
          refs.push({ module: 'meetings', icon: 'mdi-account-group-outline', id: m.id, label: m.subject })
        }
      })
      // Tasks assigned to this person
      tasksStore.tasks.forEach((t) => {
        if (t.assignedTo === entityId) {
          refs.push({ module: 'tasks', icon: 'mdi-checkbox-marked-outline', id: t.id, label: t.title })
        }
      })
      // Teams where this person is a member
      teamsStore.teams.forEach((t) => {
        if (t.members?.includes(entityId) || t.teamMembers?.includes(entityId)) {
          refs.push({ module: 'teams', icon: 'mdi-account-multiple-outline', id: t.id, label: t.name })
        }
      })
    }

    if (entityType === 'project') {
      // Tasks linked to this project
      tasksStore.tasks.forEach((t) => {
        if (t.relatedProjects?.includes(entityId)) {
          refs.push({ module: 'tasks', icon: 'mdi-checkbox-marked-outline', id: t.id, label: t.title })
        }
      })
      // People linked to this project
      peopleStore.people.forEach((p) => {
        if (p.relatedProjects?.includes(entityId)) {
          refs.push({ module: 'people', icon: 'mdi-account-group', id: p.id, label: `${p.firstName} ${p.lastName}` })
        }
      })
      // Meetings linked to this project
      meetingsStore.meetings.forEach((m) => {
        if (m.relatedProjects?.includes(entityId)) {
          refs.push({ module: 'meetings', icon: 'mdi-account-group-outline', id: m.id, label: m.subject })
        }
      })
    }

    if (entityType === 'team') {
      // People who belong to this team (by team name or id)
      const team = teamsStore.teams.find(t => t.id === entityId)
      if (team) {
        peopleStore.people.forEach((p) => {
          if (p.team === team.name || p.team === team.id) {
            refs.push({ module: 'people', icon: 'mdi-account-group', id: p.id, label: `${p.firstName} ${p.lastName}` })
          }
        })
      }
    }

    return refs
  }

  function referencesFor (entityType: 'person' | 'project' | 'team', entityId: string) {
    return computed(() => getReferences(entityType, entityId))
  }

  return { getReferences, referencesFor }
}
