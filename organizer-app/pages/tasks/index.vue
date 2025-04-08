<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('tasks.title') }}
      
  v-row
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title.d-flex {{ $t('tasks.filters') }}
          v-spacer
          v-btn(
            icon
            variant="text"
            size="small"
            @click="clearFilters"
            v-if="hasFilters"
          )
            v-icon mdi-filter-remove
            
        v-card-text
          v-text-field(
            v-model="search"
            :label="$t('common.search')"
            prepend-inner-icon="mdi-magnify"
            hide-details
            variant="outlined"
            density="compact"
            class="mb-4"
            clearable
          )
          
          v-select(
            v-model="selectedStatus"
            :items="statusOptions"
            :label="$t('tasks.status')"
            multiple
            chips
            closable-chips
            hide-details
            class="mb-4"
          )
          
          v-select(
            v-model="selectedTypes"
            :items="typeOptions"
            :label="$t('tasks.type')"
            multiple
            chips
            closable-chips
            hide-details
            class="mb-4"
          )
          
          v-expansion-panels(variant="accordion")
            v-expansion-panel
              v-expansion-panel-title {{ $t('tasks.byTag') }}
              v-expansion-panel-text
                v-chip-group(v-model="selectedTags" multiple column)
                  v-chip(
                    v-for="tag in tags"
                    :key="tag"
                    filter
                    variant="outlined"
                  ) {{ tag }}
                    
            v-expansion-panel
              v-expansion-panel-title {{ $t('tasks.byProject') }}
              v-expansion-panel-text
                v-checkbox(
                  v-for="project in projects" 
                  :key="project.id"
                  v-model="selectedProjects"
                  :label="project.title"
                  :value="project.id"
                  density="compact"
                  hide-details
                )
                
            v-expansion-panel
              v-expansion-panel-title {{ $t('tasks.byAssignee') }}
              v-expansion-panel-text
                v-checkbox(
                  v-for="person in people" 
                  :key="person.id"
                  v-model="selectedAssignees"
                  :label="`${person.firstName} ${person.lastName}`"
                  :value="person.id"
                  density="compact"
                  hide-details
                )
      
      v-card(class="mb-4")
        v-card-title {{ $t('tasks.upcomingTasks') }}
        v-card-text(v-if="loading") 
          v-skeleton-loader(type="list-item-two-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="upcomingTasks.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('dashboard.noUpcomingTasks') }}
        v-list(v-else)
          v-list-item(
            v-for="task in upcomingTasks"
            :key="task.id"
            :title="task.title"
            :subtitle="formatDate(task.dueDate)"
            @click="openTask(task)"
            class="rounded mb-2"
            :active="false"
            :disabled="task.status === 'completed'"
          )
            template(v-slot:prepend)
              v-checkbox(
                v-model="task.completed"
                :value="task.status === 'completed'"
                color="success"
                @click.stop="toggleTaskStatus(task)"
                :disabled="task.status === 'completed'"
              )
            template(v-slot:append)
              v-btn(icon size="small" @click.stop="openTask(task)")
                v-icon mdi-pencil
      
      v-card
        v-card-title {{ $t('tasks.overdueTasks') }}
        v-card-text(v-if="loading") 
          v-skeleton-loader(type="list-item-two-line" v-for="i in 3" :key="i")
        v-card-text(v-else-if="overdueTasks.length === 0")
          v-alert(type="info" variant="tonal") {{ $t('tasks.noTasks') }}
        v-list(v-else)
          v-list-item(
            v-for="task in overdueTasks"
            :key="task.id"
            :title="task.title"
            :subtitle="formatDate(task.dueDate)"
            @click="openTask(task)"
            class="rounded mb-2"
            :active="false"
            density="compact"
            :disabled="task.status === 'completed'"
          )
            template(v-slot:prepend)
              v-checkbox(
                v-model="task.completed"
                :value="task.status === 'completed'"
                color="success"
                @click.stop="toggleTaskStatus(task)"
                :disabled="task.status === 'completed'"
              )
            template(v-slot:append)
              v-chip(
                size="small"
                color="error"
              ) {{ getDaysOverdue(task.dueDate) }}d
                
    v-col(cols="12" md="9")
      v-tabs(v-model="activeTab" grow)
        v-tab(:value="'all'") {{ $t('tasks.allTasks') }}
        v-tab(:value="'todo'") {{ $t('tasks.todoTasks') }}
        v-tab(:value="'inProgress'") {{ $t('tasks.inProgressTasks') }}
        v-tab(:value="'completed'") {{ $t('tasks.completedTasks') }}
        v-tab(:value="'delegated'") {{ $t('tasks.delegatedTasks') }}
      
      v-card(class="mt-4")
        v-card-title.d-flex
          span {{ getTabTitle() }}
          v-spacer
          v-btn(
            color="primary"
            prepend-icon="mdi-plus"
            @click="addDialog = true"
          ) {{ $t('tasks.addTask') }}
        
        v-card-text
          v-table(v-if="!loading && filteredTasks.length > 0")
            thead
              tr
                th
                th {{ $t('tasks.title') }}
                th(style="width: 120px") {{ $t('tasks.dueDate') }}
                th(style="width: 120px") {{ $t('tasks.priority') }}
                th(style="width: 120px") {{ $t('tasks.status') }}
                th(style="width: 120px") {{ $t('tasks.type') }}
                th
            tbody
              tr(
                v-for="task in filteredTasks" 
                :key="task.id"
                :class="{ 'text-decoration-line-through': task.status === 'completed' }"
                style="cursor: pointer"
                @click="openTask(task)"
              )
                td(style="width: 50px")
                  v-checkbox(
                    v-model="task.completed"
                    :value="task.status === 'completed'"
                    color="success"
                    @click.stop="toggleTaskStatus(task)"
                    :disabled="task.status === 'completed'"
                  )
                td {{ task.title }}
                td 
                  v-chip(
                    v-if="task.dueDate"
                    size="small"
                    :color="getDueDateColor(task.dueDate)"
                  ) {{ formatDate(task.dueDate) }}
                td
                  v-chip(
                    size="small"
                    :color="getPriorityColor(task.priority)"
                  ) {{ getPriorityText(task.priority) }}
                td
                  v-chip(
                    size="small"
                    :color="getStatusColor(task.status)"
                  ) 
                    v-icon(size="x-small" start) {{ getStatusIcon(task.status) }}
                    | {{ getStatusText(task.status) }}
                td
                  v-chip(
                    size="small"
                    :color="getTypeColor(task.type)"
                  ) {{ getTypeText(task.type) }}
                td(style="width: 100px")
                  v-btn(icon size="small" @click.stop="openTask(task)" color="primary")
                    v-icon mdi-pencil
                  v-btn(
                    v-if="task.status !== 'completed'"
                    icon
                    size="small"
                    @click.stop="toggleTaskStatus(task)"
                    color="success"
                  )
                    v-icon mdi-check
          
          template(v-else-if="loading")
            v-skeleton-loader(type="table")
          
          v-alert(v-else type="info" variant="tonal") {{ $t('tasks.noTasks') }}

  // View/Edit Dialog
  v-dialog(v-model="taskDialog" max-width="800px")
    task-form(
      v-if="taskDialog"
      :task="selectedTask"
      :loading="formLoading"
      :error="formError"
      @submit="updateTask"
      @delete="deleteTask"
      @complete="completeTask"
    )
  
  // Add Dialog
  v-dialog(v-model="addDialog" max-width="800px")
    task-form(
      v-if="addDialog"
      :loading="formLoading"
      :error="formError"
      @submit="createTask"
    )
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTasksStore } from '~/stores/tasks'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import type { Task } from '~/types/models'
import TaskForm from '~/components/tasks/TaskForm.vue'

const tasksStore = useTasksStore()
const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()

// UI state
const loading = ref(true)
const formLoading = ref(false)
const formError = ref('')
const taskDialog = ref(false)
const addDialog = ref(false)
const selectedTask = ref<Task | null>(null)
const search = ref('')
const activeTab = ref('all')

// Filters
const selectedStatus = ref<string[]>([])
const selectedTypes = ref<string[]>([])
const selectedTags = ref<string[]>([])
const selectedProjects = ref<string[]>([])
const selectedAssignees = ref<string[]>([])

// Status options
const statusOptions = [
  { title: 'To Do', value: 'todo' },
  { title: 'In Progress', value: 'inProgress' },
  { title: 'Completed', value: 'completed' },
  { title: 'Delegated', value: 'delegated' },
  { title: 'Cancelled', value: 'cancelled' }
]

// Type options
const typeOptions = [
  { title: 'Task', value: 'task' },
  { title: 'Routine', value: 'routine' },
  { title: 'Delegation', value: 'delegation' },
  { title: 'Follow-up', value: 'followUp' }
]

// Initialize data
onMounted(async () => {
  try {
    await tasksStore.fetchTasks()
    await peopleStore.fetchPeople()
    await projectsStore.fetchProjects()
  } catch (error: any) {
    formError.value = error.message || 'Failed to load tasks'
  } finally {
    loading.value = false
  }
})

// Computed properties
const tags = computed(() => {
  return tasksStore.getTags
})

const projects = computed(() => {
  return projectsStore.projects
})

const people = computed(() => {
  return peopleStore.people
})

const hasFilters = computed(() => {
  return selectedStatus.value.length > 0 ||
    selectedTypes.value.length > 0 ||
    selectedTags.value.length > 0 ||
    selectedProjects.value.length > 0 ||
    selectedAssignees.value.length > 0 ||
    search.value !== ''
})

const upcomingTasks = computed(() => {
  return tasksStore.upcomingTasks.slice(0, 5)
})

const overdueTasks = computed(() => {
  return tasksStore.overdueTasks.slice(0, 5)
})

const filteredTasks = computed(() => {
  let result = [] as Task[]
  
  // First filter by tab
  if (activeTab.value === 'all') {
    result = [...tasksStore.tasks]
  } else {
    result = tasksStore.tasks.filter(task => task.status === activeTab.value)
  }
  
  // Then apply additional filters
  
  // By status
  if (selectedStatus.value.length > 0) {
    result = result.filter(task => selectedStatus.value.includes(task.status))
  }
  
  // By type
  if (selectedTypes.value.length > 0) {
    result = result.filter(task => selectedTypes.value.includes(task.type))
  }
  
  // By tags
  if (selectedTags.value.length > 0) {
    result = result.filter(task => 
      selectedTags.value.some(tag => task.tags.includes(tag))
    )
  }
  
  // By projects
  if (selectedProjects.value.length > 0) {
    result = result.filter(task => 
      task.relatedProjects && selectedProjects.value.some(id => task.relatedProjects!.includes(id))
    )
  }
  
  // By assignee
  if (selectedAssignees.value.length > 0) {
    result = result.filter(task => 
      selectedAssignees.value.includes(task.assignedTo || '')
    )
  }
  
  // By search
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    result = result.filter(task => 
      task.title.toLowerCase().includes(searchLower) || 
      (task.description && task.description.toLowerCase().includes(searchLower))
    )
  }
  
  // Sort by due date and priority
  result.sort((a, b) => {
    // First by priority
    const priorityDiff = a.priority - b.priority
    if (priorityDiff !== 0) return priorityDiff
    
    // Then by due date
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.getTime() - b.dueDate.getTime()
  })
  
  return result
})

// Helper functions
const formatDate = (date: Date | null | undefined) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const getDaysOverdue = (date: Date | null | undefined) => {
  if (!date) return 0
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const getDueDateColor = (date: Date | null | undefined) => {
  if (!date) return 'grey'
  
  const now = new Date()
  const dueDate = new Date(date)
  
  if (dueDate < now) {
    return 'error'
  }
  
  const diff = dueDate.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (days <= 1) {
    return 'error'
  } else if (days <= 3) {
    return 'warning'
  } else {
    return 'success'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'todo': return 'To Do'
    case 'inProgress': return 'In Progress'
    case 'completed': return 'Completed'
    case 'delegated': return 'Delegated'
    case 'cancelled': return 'Cancelled'
    default: return status
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

const getTypeText = (type: string) => {
  switch (type) {
    case 'task': return 'Task'
    case 'routine': return 'Routine'
    case 'delegation': return 'Delegation'
    case 'followUp': return 'Follow-up'
    default: return type
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'task': return 'primary'
    case 'routine': return 'secondary'
    case 'delegation': return 'warning'
    case 'followUp': return 'info'
    default: return 'grey'
  }
}

const getPriorityText = (priority: number) => {
  switch (priority) {
    case 1: return 'Highest'
    case 2: return 'High'
    case 3: return 'Medium'
    case 4: return 'Low'
    case 5: return 'Lowest'
    default: return `P${priority}`
  }
}

const getPriorityColor = (priority: number) => {
  switch (priority) {
    case 1: return 'error'
    case 2: return 'error-lighten-1'
    case 3: return 'warning'
    case 4: return 'success-lighten-1'
    case 5: return 'success'
    default: return 'grey'
  }
}

const getTabTitle = () => {
  switch (activeTab.value) {
    case 'all': return 'All Tasks'
    case 'todo': return 'To Do'
    case 'inProgress': return 'In Progress'
    case 'completed': return 'Completed'
    case 'delegated': return 'Delegated'
    default: return 'Tasks'
  }
}

const clearFilters = () => {
  selectedStatus.value = []
  selectedTypes.value = []
  selectedTags.value = []
  selectedProjects.value = []
  selectedAssignees.value = []
  search.value = ''
}

// Dialog functions
const openTask = (task: Task) => {
  selectedTask.value = task
  taskDialog.value = true
}

// CRUD operations
const createTask = async (taskData: Partial<Task>) => {
  formLoading.value = true
  formError.value = ''
  
  try {
    await tasksStore.createTask(taskData)
    addDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to create task'
  } finally {
    formLoading.value = false
  }
}

const updateTask = async (taskData: Partial<Task>) => {
  if (!selectedTask.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await tasksStore.updateTask(selectedTask.value.id, taskData)
    taskDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to update task'
  } finally {
    formLoading.value = false
  }
}

const deleteTask = async () => {
  if (!selectedTask.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await tasksStore.deleteTask(selectedTask.value.id)
    taskDialog.value = false
    selectedTask.value = null
  } catch (error: any) {
    formError.value = error.message || 'Failed to delete task'
  } finally {
    formLoading.value = false
  }
}

const completeTask = async () => {
  if (!selectedTask.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    await tasksStore.markComplete(selectedTask.value.id)
    taskDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to complete task'
  } finally {
    formLoading.value = false
  }
}

const toggleTaskStatus = async (task: Task) => {
  if (task.status === 'completed') {
    await tasksStore.markInProgress(task.id)
  } else {
    await tasksStore.markComplete(task.id)
  }
}
</script>
