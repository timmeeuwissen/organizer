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
              v-btn(
                color="primary"
                size="small"
                prepend-icon="mdi-plus"
              ) {{ $t('projects.addTask') }}
            v-card-text
              // Task list would go here
              p {{ $t('projects.noTasks') }}
        
        v-window-item(value="notes")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex
              span {{ $t('projects.notes') }}
              v-spacer
              v-btn(
                color="primary"
                size="small"
                prepend-icon="mdi-plus"
              ) {{ $t('projects.addNote') }}
            v-card-text
              // Notes would go here
              p {{ $t('projects.noNotes') }}
        
        v-window-item(value="meetings")
          v-card(elevation="1" class="mt-4")
            v-card-title.d-flex
              span {{ $t('projects.meetings') }}
              v-spacer
              v-btn(
                color="primary"
                size="small"
                prepend-icon="mdi-plus"
              ) {{ $t('projects.addMeeting') }}
            v-card-text
              // Meetings would go here
              p {{ $t('projects.noMeetings') }}

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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '~/stores/projects'
import { usePeopleStore } from '~/stores/people'
import type { Project } from '~/types/models'
import ProjectForm from '~/components/projects/ProjectForm.vue'

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

// Navigation
const goToProjects = () => {
  router.push('/projects')
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
