<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('projects.title') }}
      
  v-row
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title {{ $t('projects.status') }}
        v-card-text
          v-btn-group(
            divided
            rounded
            mandatory
            v-model="selectedStatus"
            class="d-flex flex-wrap"
          )
            v-btn(
              value="all"
              size="small"
              :color="selectedStatus === 'all' ? 'primary' : ''"
              variant="text"
            ) {{ $t('projects.allProjects') }}
            v-btn(
              value="planning"
              size="small"
              :color="selectedStatus === 'planning' ? 'info' : ''"
              variant="text"
            ) {{ $t('projects.planningProjects') }}
            v-btn(
              value="active"
              size="small"
              :color="selectedStatus === 'active' ? 'success' : ''"
              variant="text"
            ) {{ $t('projects.activeProjects') }}
            v-btn(
              value="onHold"
              size="small"
              :color="selectedStatus === 'onHold' ? 'warning' : ''"
              variant="text"
            ) {{ $t('projects.onHoldProjects') }}
            v-btn(
              value="completed"
              size="small"
              :color="selectedStatus === 'completed' ? 'primary' : ''"
              variant="text"
            ) {{ $t('projects.completedProjects') }}
            v-btn(
              value="cancelled"
              size="small"
              :color="selectedStatus === 'cancelled' ? 'error' : ''"
              variant="text"
            ) {{ $t('projects.cancelledProjects') }}
      
      v-card(class="mb-4")
        v-card-title {{ $t('common.search') }}
        v-card-text
          v-text-field(
            v-model="search"
            :label="$t('common.search')"
            prepend-inner-icon="mdi-magnify"
            hide-details
            variant="outlined"
            density="compact"
            clearable
          )
          
      v-card(v-if="tags.length > 0")
        v-card-title {{ $t('projects.tags') }}
        v-card-text
          v-chip(
            v-for="tag in tags"
            :key="tag"
            :class="{ 'ma-1': true, 'bg-primary text-white': selectedTags.includes(tag) }"
            size="small"
            @click="toggleTag(tag)"
          ) {{ tag }}
                
    v-col(cols="12" md="9")
      v-card
        v-card-title.d-flex
          span {{ getStatusLabel(selectedStatus) }}
          v-spacer
          v-btn(
            color="primary"
            prepend-icon="mdi-plus"
            @click="addDialog = true"
          ) {{ $t('projects.createProject') }}
          
        v-card-text
          v-row(v-if="loading")
            v-col(cols="12")
              v-skeleton-loader(type="card" v-for="i in 3" :key="i" class="mb-4")
          
          v-alert(v-else-if="filteredProjects.length === 0" type="info" variant="tonal") 
            | {{ $t('projects.noProjects') }}
          
          div.project-grid(v-else)
            project-card.project-card-item(
              v-for="project in filteredProjects" 
              :key="project.id"
              :project="project" 
              @navigate="navigateToProject"
              @edit="openEditDialog"
            )

  // Edit Dialog
  v-dialog(v-model="editDialog" max-width="800px")
    v-card(v-if="editDialog && selectedProject")
      v-card-title.d-flex.align-center
        v-icon(:color="selectedProject.color || getStatusColor(selectedProject.status)" class="mr-2") {{ selectedProject.icon || 'mdi-folder-outline' }}
        span {{ $t('projects.edit') }}: {{ selectedProject.title }}
      
      project-form(
        :project="selectedProject"
        :loading="formLoading"
        :error="formError"
        @submit="updateProject"
        @delete="deleteProject"
      )
  
  // Add Dialog
  v-dialog(v-model="addDialog" max-width="800px")
    project-form(
      v-if="addDialog"
      :loading="formLoading"
      :error="formError"
      @submit="createProject"
    )
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useProjectsStore } from '~/stores/projects'
import { usePeopleStore } from '~/stores/people'
import type { Project } from '~/types/models'
import ProjectForm from '~/components/projects/ProjectForm.vue'
import ProjectCard from '~/components/projects/ProjectCard.vue'

const projectsStore = useProjectsStore()
const peopleStore = usePeopleStore()

// UI state
const loading = ref(true)
const formLoading = ref(false)
const formError = ref('')
const editDialog = ref(false)
const addDialog = ref(false)
const selectedProject = ref<Project | null>(null)
const search = ref('')
const selectedStatus = ref('all')
const selectedTags = ref<string[]>([])

// Initialize data
onMounted(async () => {
  try {
    await projectsStore.fetchProjects()
    await peopleStore.fetchPeople()
  } catch (error: any) {
    formError.value = error.message || 'Failed to load projects'
  } finally {
    loading.value = false
  }
})

// Computed properties
const tags = computed(() => {
  return projectsStore.getTags
})

const filteredProjects = computed(() => {
  let result = [...projectsStore.projects]
  
  // Filter by status
  if (selectedStatus.value !== 'all') {
    result = result.filter(p => p.status === selectedStatus.value)
  }
  
  // Filter by tags
  if (selectedTags.value.length > 0) {
    result = result.filter(p => {
      return selectedTags.value.some(tag => p.tags.includes(tag))
    })
  }
  
  // Filter by search
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    result = result.filter(p => {
      return p.title.toLowerCase().includes(searchLower) || 
        (p.description && p.description.toLowerCase().includes(searchLower))
    })
  }
  
  // Sort by priority
  result.sort((a, b) => a.priority - b.priority)
  
  return result
})

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

const getAvatarColor = (index: number) => {
  const colors = ['primary', 'secondary', 'info', 'success', 'warning']
  return colors[index % colors.length]
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

// Helper to determine if a color is light (for text contrast)
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
  
  return lightColors.some(c => colorValue.includes(c));
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

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'all': return 'All Projects'
    case 'planning': return 'Planning Projects'
    case 'active': return 'Active Projects'
    case 'onHold': return 'On Hold Projects'
    case 'completed': return 'Completed Projects'
    case 'cancelled': return 'Cancelled Projects'
    default: return 'Projects'
  }
}

const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

// Import router
import { useRouter } from 'vue-router'

// Setup router
const router = useRouter()

// Dialog and navigation functions
const navigateToProject = (project: Project) => {
  // Navigate to the project detail page
  router.push(`/projects/${project.id}`)
}

const openEditDialog = (project: Project) => {
  selectedProject.value = project
  editDialog.value = true
}

// CRUD operations
const createProject = async (projectData: Partial<Project>) => {
  formLoading.value = true
  formError.value = ''
  
  try {
    await projectsStore.createProject(projectData)
    addDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to create project'
  } finally {
    formLoading.value = false
  }
}

const updateProject = async (projectData: Partial<Project>) => {
  if (!selectedProject.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await projectsStore.updateProject(selectedProject.value.id, projectData)
    editDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to update project'
  } finally {
    formLoading.value = false
  }
}

const deleteProject = async () => {
  if (!selectedProject.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await projectsStore.deleteProject(selectedProject.value.id)
    editDialog.value = false
    selectedProject.value = null
  } catch (error: any) {
    formError.value = error.message || 'Failed to delete project'
  } finally {
    formLoading.value = false
  }
}
</script>

<style scoped>
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.project-card-item {
  margin-bottom: 0;
}
</style>
