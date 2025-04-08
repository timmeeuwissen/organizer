<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('dashboard.title') }}
      
  v-row
    v-col(cols="12" md="6" lg="3")
      v-card(class="mb-4")
        v-card-title
          v-icon(start color="primary") mdi-checkbox-marked-outline
          | {{ $t('tasks.upcomingTasks') }}
        v-card-text(v-if="loadingTasks") 
          v-skeleton-loader(type="list-item-two-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="upcomingTasks.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('dashboard.noUpcomingTasks') }}
        v-list(v-else)
          v-list-item(
            v-for="task in upcomingTasks"
            :key="task.id"
            :title="task.title"
            :subtitle="formatDate(task.dueDate)"
            :to="`/tasks?id=${task.id}`"
            class="rounded mb-2"
            :active="false"
            :disabled="task.status === 'completed'"
          )
            template(v-slot:prepend)
              v-icon(:color="getStatusColor(task.status)") {{ getStatusIcon(task.status) }}
        v-card-actions
          v-spacer
          v-btn(
            variant="text"
            color="primary"
            to="/tasks"
          ) {{ $t('dashboard.viewMore') }}
      
    v-col(cols="12" md="6" lg="3")
      v-card(class="mb-4")
        v-card-title
          v-icon(start color="primary") mdi-calendar
          | {{ $t('dashboard.todaysMeetings') }}
        v-card-text(v-if="loadingMeetings") 
          v-skeleton-loader(type="list-item-two-line" v-for="i in 3" :key="i")
        v-card-text(v-else)
          v-alert(type="info" variant="tonal") {{ $t('dashboard.noMeetingsToday') }}
        v-card-actions
          v-spacer
          v-btn(
            variant="text"
            color="primary"
            to="/meetings"
          ) {{ $t('dashboard.viewMore') }}
    
    v-col(cols="12" md="6" lg="3")
      v-card(class="mb-4")
        v-card-title
          v-icon(start color="primary") mdi-account-group
          | {{ $t('people.recentlyContacted') }}
        v-card-text(v-if="loadingPeople") 
          v-skeleton-loader(type="list-item-avatar-two-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="recentlyContacted.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('people.noPeople') }}
        v-list(v-else)
          v-list-item(
            v-for="person in recentlyContacted"
            :key="person.id"
            :title="`${person.firstName} ${person.lastName}`"
            :subtitle="person.organization || person.role || person.team"
            :to="`/people?id=${person.id}`"
          )
            template(v-slot:prepend)
              v-avatar(color="primary")
                span {{ getInitials(person) }}
            template(v-slot:append)
              v-chip(
                size="small"
                class="ml-2"
                color="info"
              ) {{ formatDateDistance(person.lastContacted) }}
        v-card-actions
          v-spacer
          v-btn(
            variant="text"
            color="primary"
            to="/people"
          ) {{ $t('dashboard.viewMore') }}
    
    v-col(cols="12" md="6" lg="3")
      v-card(class="mb-4")
        v-card-title
          v-icon(start color="primary") mdi-folder-multiple
          | {{ $t('dashboard.projectStatus') }}
        v-card-text(v-if="loadingProjects") 
          v-skeleton-loader(type="list-item-two-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="activeProjects.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('projects.noProjects') }}
        v-list(v-else)
          v-list-item(
            v-for="project in activeProjects"
            :key="project.id"
            :title="project.title"
            :subtitle="`${$t('projects.progress')}: ${project.progress}%`"
            :to="`/projects?id=${project.id}`"
          )
            template(v-slot:append)
              v-progress-circular(
                :model-value="project.progress"
                :color="getProgressColor(project.progress)"
                size="30"
              )
        v-card-actions
          v-spacer
          v-btn(
            variant="text"
            color="primary"
            to="/projects"
          ) {{ $t('dashboard.viewMore') }}
  
  v-row
    v-col(cols="12" md="6")
      v-card
        v-card-title {{ $t('behaviors.title') }}
        v-card-text(v-if="loadingBehaviors") 
          v-skeleton-loader(type="list-item-two-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="behaviors.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('behaviors.noBehaviors') }}
        v-list(v-else)
          v-list-item(
            v-for="behavior in behaviors.slice(0, 5)"
            :key="behavior.id"
            :title="behavior.title"
            :subtitle="getBehaviorTypeText(behavior.type)"
            :to="`/behaviors?id=${behavior.id}`"
          )
            template(v-slot:prepend)
              v-icon(:color="getBehaviorTypeColor(behavior.type)") {{ getBehaviorTypeIcon(behavior.type) }}
        v-card-actions
          v-spacer
          v-btn(
            variant="text"
            color="primary"
            to="/behaviors"
          ) {{ $t('dashboard.viewMore') }}
    
    v-col(cols="12" md="6")
      v-card
        v-card-title {{ $t('dashboard.recentActivity') }}
        v-card-text
          v-alert(type="info" variant="tonal") No recent activity yet
        v-card-actions
          v-spacer
          v-btn(
            variant="text"
            color="primary"
            disabled
          ) {{ $t('dashboard.viewMore') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTasksStore } from '~/stores/tasks'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useBehaviorsStore } from '~/stores/behaviors'
import type { Person, Project, Task, Behavior } from '~/types/models'

const tasksStore = useTasksStore()
const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()
const behaviorsStore = useBehaviorsStore()

// Loading states
const loadingTasks = ref(true)
const loadingPeople = ref(true)
const loadingProjects = ref(true)
const loadingMeetings = ref(true)
const loadingBehaviors = ref(true)

// Initialize data
onMounted(async () => {
  try {
    await tasksStore.fetchTasks()
  } catch (error) {
    console.error('Error loading tasks:', error)
  } finally {
    loadingTasks.value = false
  }
  
  try {
    await peopleStore.fetchPeople()
  } catch (error) {
    console.error('Error loading people:', error)
  } finally {
    loadingPeople.value = false
  }
  
  try {
    await projectsStore.fetchProjects()
  } catch (error) {
    console.error('Error loading projects:', error)
  } finally {
    loadingProjects.value = false
  }
  
  try {
    await behaviorsStore.fetchBehaviors()
  } catch (error) {
    console.error('Error loading behaviors:', error)
  } finally {
    loadingBehaviors.value = false
  }
  
  // For now, we don't have meetings implemented
  loadingMeetings.value = false
})

// Computed properties
const upcomingTasks = computed(() => {
  return tasksStore.upcomingTasks.slice(0, 5)
})

const recentlyContacted = computed(() => {
  return peopleStore.getRecentlyContacted(5)
})

const activeProjects = computed(() => {
  return projectsStore.activeProjects.slice(0, 5)
})

const behaviors = computed(() => {
  return behaviorsStore.behaviors
})

// Helper functions
const formatDate = (date: Date | null | undefined) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const formatDateDistance = (date: Date | null | undefined) => {
  if (!date) return ''
  
  const now = new Date()
  const diff = now.getTime() - (date as Date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

const getInitials = (person: Person) => {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo': return 'grey'
    case 'inProgress': return 'info'
    case 'completed': return 'success'
    case 'delegated': return 'warning'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'todo': return 'mdi-checkbox-blank-outline'
    case 'inProgress': return 'mdi-progress-check'
    case 'completed': return 'mdi-checkbox-marked'
    case 'delegated': return 'mdi-account-arrow-right'
    case 'cancelled': return 'mdi-cancel'
    default: return 'mdi-help'
  }
}

const getProgressColor = (progress: number) => {
  if (progress < 25) return 'error'
  if (progress < 50) return 'warning'
  if (progress < 75) return 'info'
  return 'success'
}

const getBehaviorTypeText = (type: string) => {
  switch (type) {
    case 'doWell': return 'What I do well'
    case 'wantToDoBetter': return 'Want to do better'
    case 'needToImprove': return 'Need to improve'
    default: return type
  }
}

const getBehaviorTypeColor = (type: string) => {
  switch (type) {
    case 'doWell': return 'success'
    case 'wantToDoBetter': return 'info'
    case 'needToImprove': return 'warning'
    default: return 'grey'
  }
}

const getBehaviorTypeIcon = (type: string) => {
  switch (type) {
    case 'doWell': return 'mdi-thumb-up'
    case 'wantToDoBetter': return 'mdi-trending-up'
    case 'needToImprove': return 'mdi-alert'
    default: return 'mdi-help'
  }
}
</script>
