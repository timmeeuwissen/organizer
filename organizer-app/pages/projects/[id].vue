<template lang="pug">
v-container
  v-row
    v-col(cols="12")
      v-btn(
        color="primary"
        prepend-icon="mdi-arrow-left"
        :to="`/projects`"
        class="mb-4"
      ) {{ $t('common.back') }}

      v-card(v-if="project" :color="project.color || getStatusColor(project.status)")
        v-card-item
          v-card-title.d-flex.align-center
            v-icon(:color="isLightColor(project.color) ? 'black' : 'white'" size="large" class="mr-2") {{ project.icon || 'mdi-folder-outline' }}
            span {{ project.title }}
            v-spacer
            v-btn(
              color="white"
              variant="tonal"
              icon
              @click="showEditDialog"
            )
              v-icon mdi-pencil
        
        v-card-text
          v-row
            v-col(cols="12" md="8")
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.details') }}
                v-card-text
                  p.text-body-1.mb-4 
                    span.font-weight-bold {{ $t('projects.description') }}: 
                    span {{ project.description || $t('projects.none') }}
                  
                  v-chip(:color="getStatusColorLight(project.status)" class="mr-2 mb-2")
                    v-icon(start) {{ getStatusIcon(project.status) }}
                    | {{ getStatusText(project.status) }}
                  
                  v-chip(:color="getPriorityColor(project.priority)" class="mr-2 mb-2")
                    v-icon(start) mdi-flag
                    | {{ getPriorityText(project.priority) }}
                  
                  div.mt-4(v-if="project.dueDate")
                    v-icon(class="mr-1") mdi-calendar
                    | {{ formatDate(project.dueDate) }}
              
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.progress') }}
                v-card-text
                  v-progress-linear(
                    :model-value="project.progress" 
                    height="24" 
                    color="primary"
                    bg-color="grey-lighten-3"
                    rounded
                  )
                    template(v-slot:default="{ value }")
                      strong {{ Math.round(value) }}%
            
            v-col(cols="12" md="4")
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.team') }}
                v-card-text
                  div(v-if="project.members.length === 0") {{ $t('projects.noMembers') }}
                  
                  div.d-flex.flex-wrap.align-center(v-for="memberId in project.members" :key="memberId" class="mb-2")
                    v-avatar(:color="getAvatarColor(memberId)" size="32" class="mr-2") {{ getPersonInitials(memberId) }}
                    span {{ getPersonName(memberId) }}
              
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.stakeholders') }}
                v-card-text
                  div(v-if="!project.stakeholders || project.stakeholders.length === 0") {{ $t('projects.noStakeholders') }}
                  
                  div.d-flex.flex-wrap.align-center(v-for="stakeholderId in project.stakeholders || []" :key="stakeholderId" class="mb-2")
                    v-avatar(:color="getAvatarColor(stakeholderId)" size="32" class="mr-2") {{ getPersonInitials(stakeholderId) }}
                    span {{ getPersonName(stakeholderId) }}
              
              v-card(elevation="1" class="mb-4")
                v-card-title {{ $t('projects.tags') }}
                v-card-text
                  div(v-if="project.tags.length === 0") {{ $t('projects.noTags') }}
                  v-chip(
                    v-for="tag in project.tags" 
                    :key="tag"
                    color="primary-lighten-4"
                    class="mr-1 mb-1"
                  ) {{ tag }}
      
      v-card(v-else-if="loading")
        v-card-text
          v-skeleton-loader(type="card" :loading="loading")
      
      v-alert(
        v-else-if="error"
        type="error"
        class="mb-4"
      ) {{ error }}
      
      v-alert(
        v-else
        type="warning"
        class="mb-4"
      ) {{ $t('projects.projectNotFound') }}
  
  v-row
    v-col(cols="12")
      v-tabs(v-model="activeTab")
        v-tab(value="tasks") {{ $t('projects.tasks') }}
        v-tab(value="notes") {{ $t('projects.notes') }}
        v-tab(value="meetings") {{ $t('projects.meetings') }}
      
      v-window(v-model="activeTab")
        v-window-item(value="tasks")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex
              span {{ $t('projects.tasks') }}
              v-spacer
              add-button(:items="taskItems")
            v-card-text
              // Task list would go here
              p {{ $t('projects.noTasks') }}
        
        v-window-item(value="notes")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex
              span {{ $t('projects.notes') }}
              v-spacer
              add-button(:items="noteItems")
            v-card-text
              // Notes would go here
              p {{ $t('projects.noNotes') }}
        
        v-window-item(value="meetings")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex
              span {{ $t('projects.meetings') }}
              v-spacer
              add-button(:items="meetingItems")
            v-card-text
              // Meetings would go here
              p {{ $t('projects.noMeetings') }}

  // Project edit dialog
  v-dialog(v-model="editDialog" max-width="800px")
    v-card(v-if="editDialog && project")
      v-card-title.d-flex.align-center
        v-icon(:color="project.color || getStatusColor(project.status)" class="mr-2") {{ project.icon || 'mdi-folder-outline' }}
        span {{ $t('projects.edit') }}: {{ project.title }}
      
      project-form(
        :project="project"
        :loading="formLoading"
        :error="formError"
        @submit="updateProject"
        @delete="deleteProject"
      )
  
  // Task dialog
  v-dialog(v-model="taskDialog" max-width="800px")
    v-card(v-if="taskDialog")
      task-form(
        :loading="taskLoading"
        :error="taskError"
        :task="taskDefaults"
        @submit="createTask"
      )
  
  // Note dialog
  v-dialog(v-model="noteDialog" max-width="800px")
    v-card(v-if="noteDialog")
      v-card-title {{ $t('projects.addNote') }}
      v-card-text
        v-form(@submit.prevent="createNote")
          v-text-field(
            v-model="noteTitle"
            :label="$t('common.title')"
            required
          )
          
          v-textarea(
            v-model="noteContent"
            :label="$t('common.content')"
            rows="5"
            required
          )
      
      v-card-actions
        v-spacer
        v-btn(
          color="primary"
          :loading="noteLoading"
          :disabled="!noteTitle || !noteContent || noteLoading"
          @click="createNote"
        ) {{ $t('common.save') }}
  
  // Meeting dialog
  v-dialog(v-model="meetingDialog" max-width="800px")
    v-card(v-if="meetingDialog")
      meeting-form(
        :loading="meetingLoading"
        :error="meetingError"
        :meeting="meetingDefaults"
        @submit="createMeeting"
      )
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '~/stores/projects'
import { usePeopleStore } from '~/stores/people'
import { useTasksStore } from '~/stores/tasks'
import { useMeetingsStore } from '~/stores/meetings'
import type { Project, Task, Meeting } from '~/types/models'
import ProjectForm from '~/components/projects/ProjectForm.vue'
import TaskForm from '~/components/tasks/TaskForm.vue'
import MeetingForm from '~/components/meetings/MeetingForm.vue'
import AddButton from '~/components/common/AddButton.vue'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const peopleStore = usePeopleStore()

// State
const loading = ref(false)
const error = ref('')
const activeTab = ref('tasks')
const editDialog = ref(false)
const formLoading = ref(false)
const formError = ref('')

// Task dialog
const taskDialog = ref(false)
const taskLoading = ref(false)
const taskError = ref('')
const tasksStore = useTasksStore()
const taskDefaults = ref({
  title: '',
  description: '',
  status: 'todo',
  priority: 3,
  dueDate: null
})

// Note dialog
const noteDialog = ref(false)
const noteTitle = ref('')
const noteContent = ref('')
const noteLoading = ref(false)
const noteError = ref('')

// Meeting dialog
const meetingDialog = ref(false)
const meetingLoading = ref(false)
const meetingError = ref('')
const meetingsStore = useMeetingsStore()
const meetingDefaults = ref({
  subject: '',
  summary: '',
  category: '',
  plannedStatus: 'to_be_planned',
  date: new Date().toISOString().substr(0, 10),
  time: '09:00',
  location: '',
  participants: []
})

// Get project ID from route
const projectId = computed(() => route.params.id as string)

// Fetch project
const fetchProject = async () => {
  if (!projectId.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    await projectsStore.fetchProject(projectId.value)
  } catch (err: any) {
    error.value = err.message || 'Failed to load project'
  } finally {
    loading.value = false
  }
}

// Watch for changes to project ID
watch(projectId, fetchProject, { immediate: true })

// Get current project
const project = computed(() => projectsStore.currentProject)

// AddButton menu items
const taskItems = computed(() => [
  {
    title: 'Add Task',
    icon: 'mdi-checkbox-marked-circle-outline',
    color: 'primary',
    action: openTaskDialog
  }
])

const noteItems = computed(() => [
  {
    title: 'Add Note',
    icon: 'mdi-note-outline',
    color: 'info',
    action: openNoteDialog
  }
])

const meetingItems = computed(() => [
  {
    title: 'Add Meeting',
    icon: 'mdi-account-group',
    color: 'success',
    action: openMeetingDialog
  }
])

// Navigation
const goToProjects = () => {
  router.push('/projects')
}

// Task methods
const openTaskDialog = () => {
  // Reset task form data and set defaults
  taskDefaults.value = {
    title: '',
    description: '',
    status: 'todo',
    priority: 3,
    dueDate: null
  }
  taskDialog.value = true
}

const createTask = async (taskData: Partial<Task>) => {
  if (!project.value) return
  
  taskLoading.value = true
  taskError.value = ''
  
  try {
    // Add the project ID to the related projects array
    const updatedTaskData = {
      ...taskData,
      relatedProjects: [project.value.id]
    }
    
    // Create the task
    const taskId = await tasksStore.createTask(updatedTaskData)
    taskDialog.value = false
    
    // Reset form data
    taskError.value = ''
  } catch (error: any) {
    taskError.value = error.message || 'Failed to create task'
  } finally {
    taskLoading.value = false
  }
}

// Note methods
const openNoteDialog = () => {
  noteTitle.value = ''
  noteContent.value = ''
  noteDialog.value = true
}

const createNote = async () => {
  if (!project.value || !noteTitle.value || !noteContent.value) return
  
  noteLoading.value = true
  noteError.value = ''
  
  try {
    // Currently there's no dedicated notes store, so we'll create a project page instead
    await projectsStore.createProjectPage(project.value.id, {
      title: noteTitle.value,
      content: noteContent.value,
      order: 0, // Set a default order for the page
      tags: []
    })
    
    noteDialog.value = false
    noteTitle.value = ''
    noteContent.value = ''
  } catch (error: any) {
    noteError.value = error.message || 'Failed to create note'
  } finally {
    noteLoading.value = false
  }
}

// Meeting methods
const openMeetingDialog = () => {
  // Reset meeting form data and set defaults
  meetingDefaults.value = {
    subject: '',
    summary: '',
    category: '',
    plannedStatus: 'to_be_planned',
    date: new Date().toISOString().substr(0, 10),
    time: '09:00',
    location: '',
    participants: []
  }
  meetingDialog.value = true
}

const createMeeting = async (meetingData: Partial<Meeting>) => {
  if (!project.value) return
  
  meetingLoading.value = true
  meetingError.value = ''
  
  try {
    // Add the project ID to the related projects array
    const updatedMeetingData = {
      ...meetingData,
      relatedProjects: [project.value.id]
    }
    
    // Create the meeting
    const meetingId = await meetingsStore.createMeeting(updatedMeetingData)
    meetingDialog.value = false
    
    // Reset form data
    meetingError.value = ''
  } catch (error: any) {
    meetingError.value = error.message || 'Failed to create meeting'
  } finally {
    meetingLoading.value = false
  }
}

// Helper functions
const formatDate = (date: Date | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const getPersonInitials = (id: string) => {
  const person = peopleStore.getById(id)
  if (!person) return '?'
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`
}

const getPersonName = (id: string) => {
  const person = peopleStore.getById(id)
  if (!person) return 'Unknown'
  return `${person.firstName} ${person.lastName}`
}

const getAvatarColor = (id: string) => {
  const colors = ['primary', 'secondary', 'info', 'success', 'warning']
  return colors[id.charCodeAt(0) % colors.length]
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'planning': return 'info'
    case 'active': return 'success'
    case 'onHold': return 'warning'
    case 'completed': return 'primary'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

const isLightColor = (colorValue: string) => {
  if (!colorValue) return false;
  
  // These colors are known to be light
  const lightColors = [
    'light-blue', 
    'light-green', 
    'amber', 
    'yellow', 
    'lime', 
    'grey-lighten-3', 
    'grey-lighten-4',
    'grey-lighten-5'
  ];
  
  return lightColors.some(c => colorValue?.includes(c));
}

const getStatusColorLight = (status: string) => {
  switch (status) {
    case 'planning': return 'info-lighten-3'
    case 'active': return 'success-lighten-3'
    case 'onHold': return 'warning-lighten-3'
    case 'completed': return 'primary-lighten-3'
    case 'cancelled': return 'error-lighten-3'
    default: return 'grey-lighten-3'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'planning': return 'Planning'
    case 'active': return 'Active'
    case 'onHold': return 'On Hold'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'planning': return 'mdi-pencil'
    case 'active': return 'mdi-play'
    case 'onHold': return 'mdi-pause'
    case 'completed': return 'mdi-check'
    case 'cancelled': return 'mdi-close'
    default: return 'mdi-help'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low': return 'success'
    case 'medium': return 'info'
    case 'high': return 'warning'
    case 'urgent': return 'error'
    default: return 'grey'
  }
}

const getPriorityText = (priority: string) => {
  switch (priority) {
    case 'low': return 'Low'
    case 'medium': return 'Medium'
    case 'high': return 'High'
    case 'urgent': return 'Urgent'
    default: return priority
  }
}

// Edit functions
const showEditDialog = () => {
  editDialog.value = true
}

const updateProject = async (projectData: Partial<Project>) => {
  if (!project.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await projectsStore.updateProject(project.value.id, projectData)
    editDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to update project'
  } finally {
    formLoading.value = false
  }
}

const deleteProject = async () => {
  if (!project.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await projectsStore.deleteProject(project.value.id)
    editDialog.value = false
    router.push('/projects')
  } catch (error: any) {
    formError.value = error.message || 'Failed to delete project'
  } finally {
    formLoading.value = false
  }
}

// Load people data if needed
onMounted(async () => {
  if (peopleStore.people.length === 0) {
    await peopleStore.fetchPeople()
  }
})
</script>
