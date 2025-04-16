<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      v-card
        v-card-title.d-flex.align-center
          v-btn(icon variant="text" :to="`/meetings`")
            v-icon mdi-arrow-left
          span.ml-2 {{ meeting?.title || $t('meetings.meeting') }}
          v-spacer
          v-btn(color="primary" :to="`/meetings/${meeting?.id}/edit`" v-if="meeting")
            v-icon(start) mdi-pencil
            span {{ $t('common.edit') }}
        
        v-card-text(v-if="loading")
          v-progress-circular(indeterminate)
        
        v-card-text(v-else-if="error")
          v-alert(type="error") {{ error }}
        
        v-card-text(v-else-if="!meeting")
          v-alert(type="warning") {{ $t('errors.notFound') }}
        
        v-card-text(v-else)
          v-row
            v-col(cols="12" md="8")
              // Meeting details
              v-list
                v-list-item(v-if="meeting.startTime && meeting.plannedStatus !== 'to_be_planned'")
                  v-list-item-title {{ $t('meetings.date') }} & {{ $t('meetings.time') }}
                  v-list-item-subtitle {{ formatDateTime(meeting.startTime) }}
                
                v-list-item(v-else)
                  v-list-item-title {{ $t('meetings.plannedStatus') }}
                  v-list-item-subtitle {{ $t('meetings.plannedStatus.to_be_planned') }}
                
                v-list-item(v-if="meeting.location")
                  v-list-item-title {{ $t('meetings.location') }}
                  v-list-item-subtitle {{ meeting.location }}
                
                v-list-item(v-if="meeting.category")
                  v-list-item-title {{ $t('meetings.category') }}
                  v-list-item-subtitle
                    v-chip(
                      v-if="getCategoryById(meeting.category)"
                      :color="getCategoryById(meeting.category)?.color"
                      text-color="white"
                      size="small"
                    ) {{ getCategoryById(meeting.category)?.name }}
              
              // Description and notes
              h3.text-h6.mt-6 {{ $t('common.description') }}
              p.text-body-1.mt-2 {{ meeting.description || $t('common.noDescription') }}
              
              h3.text-h6.mt-6 {{ $t('meetings.notes') }}
              p.text-body-1.mt-2.white-space-pre-wrap {{ meeting.notes || $t('common.noNotes') }}
              
              h3.text-h6.mt-6 {{ $t('meetings.summary') }}
              p.text-body-1.mt-2.white-space-pre-wrap {{ meeting.summary || $t('common.noSummary') }}
              
              // Action items
              h3.text-h6.mt-6 {{ $t('meetings.action') }}
              p.text-body-1.mt-2.white-space-pre-wrap {{ meeting.actionItems || $t('common.noActionItems') }}
            
            v-col(cols="12" md="4")
              // Participants
              v-card(variant="outlined" class="mb-4")
                v-card-title {{ $t('meetings.participants') }}
                v-card-text
                  div(v-if="participantsList.length > 0")
                    v-list
                      v-list-item(
                        v-for="person in participantsList"
                        :key="person.id"
                        :to="`/people/${person.id}`"
                      )
                        template(v-slot:prepend)
                          v-avatar(:color="getRandomColor(person.id)")
                            span {{ getPersonInitials(person) }}
                        v-list-item-title {{ person.firstName }} {{ person.lastName }}
                  div(v-else)
                    p {{ $t('common.noParticipants') }}
                  
                  v-btn(
                    color="primary" 
                    variant="text" 
                    class="mt-2"
                    @click="showAddParticipantsDialog = true"
                  )
                    v-icon(start) mdi-account-plus
                    span {{ $t('common.addPerson') }}
              
              // Related tasks
              v-card(variant="outlined" class="mb-4")
                v-card-title {{ $t('tasks.title') }}
                v-card-text
                  div(v-if="tasksList.length > 0")
                    v-list
                      v-list-item(
                        v-for="task in tasksList"
                        :key="task.id"
                        :to="`/tasks/${task.id}`"
                      )
                        template(v-slot:prepend)
                          v-checkbox(
                            v-model="task.completed"
                            @change="toggleTaskComplete(task)"
                            :color="getTaskPriorityColor(task.priority)"
                          )
                        v-list-item-title {{ task.title }}
                  div(v-else)
                    p {{ $t('common.noTasks') }}
                  
                  v-btn(
                    color="primary" 
                    variant="text" 
                    class="mt-2"
                    @click="showAddTaskDialog = true"
                  )
                    v-icon(start) mdi-plus
                    span {{ $t('common.addTask') }}
              
              // Related projects
              v-card(variant="outlined")
                v-card-title {{ $t('projects.title') }}
                v-card-text
                  div(v-if="projectsList.length > 0")
                    v-list
                      v-list-item(
                        v-for="project in projectsList"
                        :key="project.id"
                        :to="`/projects/${project.id}`"
                      )
                        v-list-item-title {{ project.title }}
                  div(v-else)
                    p {{ $t('common.noProjects') }}
                  
                  v-btn(
                    color="primary" 
                    variant="text" 
                    class="mt-2"
                    @click="showLinkProjectDialog = true"
                  )
                    v-icon(start) mdi-link
                    span {{ $t('common.linkProject') }}
  
  // Dialogs for adding participants, tasks and linking to projects
  // (simplified, would normally be implemented)
  
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMeetingsStore } from '~/stores/meetings'
import { useMeetingCategoriesStore } from '~/stores/meetings/categories'
import { usePeopleStore } from '~/stores/people'
import { useTasksStore } from '~/stores/tasks'
import { useProjectsStore } from '~/stores/projects'
import type { Person, Task, Project } from '~/types/models'

const route = useRoute()
const meetingsStore = useMeetingsStore()
const categoriesStore = useMeetingCategoriesStore()
const peopleStore = usePeopleStore()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()

// UI state
const loading = ref(true)
const error = ref('')
const showAddParticipantsDialog = ref(false)
const showAddTaskDialog = ref(false)
const showLinkProjectDialog = ref(false)

// Get meeting ID from route
const meetingId = computed(() => route.params.id as string)

// Get current meeting
const meeting = computed(() => meetingsStore.currentMeeting)

// Get participants, tasks and projects
const participantsList = computed(() => {
  if (!meeting.value || !meeting.value.participants) return []
  
  return meeting.value.participants
    .map(id => peopleStore.getById(id))
    .filter(p => p !== null) as Person[]
})

const tasksList = computed(() => {
  if (!meeting.value || !meeting.value.tasks) return []
  
  return meeting.value.tasks
    .map(id => tasksStore.getById(id))
    .filter(t => t !== null) as Task[]
})

const projectsList = computed(() => {
  if (!meeting.value || !meeting.value.relatedProjects) return []
  
  return meeting.value.relatedProjects
    .map(id => projectsStore.getById(id))
    .filter(p => p !== null) as Project[]
})

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = ''
  
  try {
    await meetingsStore.fetchMeeting(meetingId.value)
    
    // Load related data
    await Promise.all([
      categoriesStore.fetchCategories(),
      peopleStore.fetchPeople(),
      tasksStore.fetchTasks(),
      projectsStore.fetchProjects()
    ])
  } catch (e: any) {
    error.value = e.message || 'Failed to load meeting'
    console.error('Error loading meeting:', e)
  } finally {
    loading.value = false
  }
}

// Watch for route changes
watch(() => route.params.id, () => {
  fetchData()
})

// Utility functions
const formatDateTime = (dateTime: Date) => {
  if (!dateTime) return ''
  
  const date = new Date(dateTime)
  return date.toLocaleString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCategoryById = (categoryId: string) => {
  return categoriesStore.getById(categoryId)
}

const getPersonInitials = (person: Person) => {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`
}

const getRandomColor = (id: string) => {
  // Generate deterministic color based on ID
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}

const getTaskPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'red'
    case 'medium': return 'orange'
    case 'low': return 'green'
    default: return 'blue'
  }
}

const toggleTaskComplete = async (task: Task) => {
  try {
    await tasksStore.updateTask(task.id, {
      status: task.completed ? 'completed' : 'todo',
      completedDate: task.completed ? new Date() : null
    })
  } catch (e) {
    console.error('Error updating task:', e)
  }
}

// Load data on mount
onMounted(fetchData)
</script>

<style scoped>
.white-space-pre-wrap {
  white-space: pre-wrap;
}
</style>
