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
              template(v-for="(task, index) in processedTasks" :key="task.id")
                tr(
                  :class="getTaskRowClasses(task)"
                  :style="getTaskRowStyle(task)" 
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
                  td(class="d-flex align-center")
                    div(
                      v-if="task.level > 0"
                      :style="{ width: `${task.level * 20}px` }"
                    )
                    v-btn(
                      v-if="task.hasSubtasks"
                      icon="mdi-chevron-down"
                      size="x-small"
                      variant="text"
                      :class="{ 'rotate-icon': !isExpanded(task.id) }"
                      @click.stop="toggleExpand(task.id)"
                    )
                    v-icon(
                      v-else-if="task.level > 0"
                      size="x-small"
                      class="ms-6"
                    ) mdi-subdirectory-arrow-right
                    span {{ task.title }}
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
                    v-btn(
                      v-if="!task.hasSubtasks"
                      icon
                      size="small"
                      @click.stop="addSubtask(task)"
                      color="info"
                    )
                      v-icon mdi-plus-circle-outline
          
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
import { ref, computed, onMounted, reactive } from 'vue'
import { useTasksStore } from '~/stores/tasks'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useAuthStore } from '~/stores/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
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

// Connected accounts
const integrationAccounts = ref([])
const providerSyncEnabled = ref(false)
const syncLoading = ref(false)
const syncError = ref('')

// Initialize data
onMounted(async () => {
  loading.value = true

  try {
    // Get integration accounts
    const { $firebase } = useNuxtApp()
    const auth = useAuthStore()
    
    if (auth.user) {
      // Get user settings to find connected accounts with task sync enabled
      const db = getFirestore($firebase)
      const userRef = doc(db, 'users', auth.user.id)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists() && userSnap.data().settings?.integrationAccounts) {
        const accounts = userSnap.data().settings.integrationAccounts
        integrationAccounts.value = accounts.filter(a => a.syncTasks && a.oauthData.connected)
        providerSyncEnabled.value = integrationAccounts.value.length > 0
        
        // Set the accounts in the tasks store
        tasksStore.setIntegrationAccounts(integrationAccounts.value)
      }
    }
    
    // Fetch data
    await Promise.all([
      tasksStore.fetchTasks(),
      peopleStore.fetchPeople(),
      projectsStore.fetchProjects()
    ])
    
    // If providers are connected, sync tasks from them
    if (providerSyncEnabled.value) {
      await syncTasksFromProviders()
    }
  } catch (error: any) {
    formError.value = error.message || 'Failed to load tasks'
  } finally {
    loading.value = false
  }
})

// Sync tasks from providers
const syncTasksFromProviders = async () => {
  if (!providerSyncEnabled.value) return
  
  syncLoading.value = true
  syncError.value = ''
  
  try {
    await tasksStore.fetchTasksFromProviders()
  } catch (error: any) {
    syncError.value = error.message || 'Failed to sync tasks from providers'
    console.error('Error syncing tasks:', error)
  } finally {
    syncLoading.value = false
  }
}

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
    // Check if the task should be created with a provider
    if (taskData.storageProvider && taskData.storageProvider !== 'organizer') {
      // Find the provider account
      const account = integrationAccounts.value.find(a => a.id === taskData.storageProvider)
      
      if (account) {
        // Create in provider
        await tasksStore.createTaskWithProvider(taskData, account.id)
      } else {
        // Fallback to regular creation if the account isn't found
        await tasksStore.createTask(taskData)
      }
    } else {
      // Regular creation in Firestore
      await tasksStore.createTask(taskData)
    }
    
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
    // Check if this is a provider-synced task
    if (selectedTask.value.providerId && selectedTask.value.providerAccountId) {
      // Update with provider
      await tasksStore.updateTaskWithProvider(selectedTask.value.id, taskData)
    } else {
      // Regular update
      await tasksStore.updateTask(selectedTask.value.id, taskData)
    }
    
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
    // Check if this is a provider-synced task
    if (selectedTask.value.providerId && selectedTask.value.providerAccountId) {
      // Delete with provider
      await tasksStore.deleteTaskWithProvider(selectedTask.value.id)
    } else {
      // Regular delete
      await tasksStore.deleteTask(selectedTask.value.id)
    }
    
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
    // Check if this is a provider-synced task
    if (selectedTask.value.providerId && selectedTask.value.providerAccountId) {
      // Complete with provider
      await tasksStore.completeTaskWithProvider(selectedTask.value.id)
    } else {
      // Regular complete
      await tasksStore.markComplete(selectedTask.value.id)
    }
    
    taskDialog.value = false
  } catch (error: any) {
    formError.value = error.message || 'Failed to complete task'
  } finally {
    formLoading.value = false
  }
}

// Subtask and hierarchy management
const expandedTasks = reactive(new Set<string>())

// Check if a task is expanded
const isExpanded = (taskId: string): boolean => {
  return expandedTasks.has(taskId)
}

// Toggle task expansion
const toggleExpand = (taskId: string) => {
  if (expandedTasks.has(taskId)) {
    expandedTasks.delete(taskId)
  } else {
    expandedTasks.add(taskId)
  }
}

// Add a subtask to a parent task
const addSubtask = async (parentTask: Task) => {
  // Open a dialog that pre-fills the parent task
  selectedTask.value = null // Clear selected task to avoid confusion
  
  // Create a placeholder for the new subtask and set the parent
  const newSubtaskData: Partial<Task> = {
    title: '',
    status: 'todo',
    priority: parentTask.priority || 3,
    type: parentTask.type || 'task',
    parentTask: parentTask.id,
    tags: [...(parentTask.tags || [])],
    relatedProjects: [...(parentTask.relatedProjects || [])]
  }
  
  // Open the add dialog with the subtask data
  tasksStore.setSubtaskParent(parentTask)
  addDialog.value = true
}

// Initialize with parent tasks expanded by default
onMounted(() => {
  // Get parent tasks
  const parentTasks = tasksStore.tasks.filter(task => task.subtasks?.length > 0);
  parentTasks.forEach(task => {
    expandedTasks.add(task.id);
  });
});

// Process tasks into a hierarchical structure
const processedTasks = computed(() => {
  // Use filteredTasks as the source
  const tasks = filteredTasks.value
  
  // Create a map of parent IDs to child tasks
  const taskMap = new Map<string, Task[]>()
  
  // First, group all tasks by their parent ID
  // Handle both parentTask field and parent field from Google Tasks
  tasks.forEach(task => {
    // Check for parentTask (internal app field) or parent (Google Tasks field)
    const parentId = task.parentTask || task.parent;
    
    if (parentId) {
      if (!taskMap.has(parentId)) {
        taskMap.set(parentId, [])
      }
      taskMap.get(parentId)!.push(task)
    }
  })
  
  // Also index tasks by their ID for subtask lookup
  const taskById = new Map<string, Task>()
  tasks.forEach(task => {
    taskById.set(task.id, task)
  })
  
  // Function to check if a task has subtasks based on the subtasks array
  const hasSubtasks = (taskId: string): boolean => {
    const task = taskById.get(taskId)
    if (!task) return false
    
    // Check if this task has any subtasks defined
    return (task.subtasks && task.subtasks.length > 0) || 
      // Or if any task references this as parent
      (taskMap.has(taskId) && taskMap.get(taskId)!.length > 0)
  }
  
  // Function to recursively process tasks with their levels
  function processTasksRecursively(
    parentId: string | null, 
    level: number, 
    result: Array<Task & { level: number, hasSubtasks: boolean }>
  ) {
    // Get tasks for this level
    const levelTasks = parentId === null 
      ? tasks.filter(t => !t.parentTask) // Top-level tasks
      : taskMap.get(parentId) || [] // Child tasks
    
    // Process each task at this level
    levelTasks.forEach(task => {
      // Add the task with its level info
      const processedTask = {
        ...task,
        level,
        hasSubtasks: hasSubtasks(task.id)
      }
      
      result.push(processedTask)
      
      // If this task has children and is expanded, recursively process them
      if (hasSubtasks(task.id) && isExpanded(task.id)) {
        // Look for tasks that reference this as parent
        if (taskMap.has(task.id)) {
          processTasksRecursively(task.id, level + 1, result)
        }
        
        // Also look for tasks in the subtasks array that are in our index
        if (task.subtasks) {
          task.subtasks.forEach(subtaskId => {
            const subtask = taskById.get(subtaskId)
            if (subtask && !subtask.parentTask) {
              // Add this subtask
              const processedSubtask = {
                ...subtask,
                level: level + 1,
                parentTask: task.id, // Ensure parent is set
                hasSubtasks: hasSubtasks(subtask.id)
              }
              result.push(processedSubtask)
              
              // Process this subtask's children if expanded
              if (hasSubtasks(subtask.id) && isExpanded(subtask.id)) {
                processTasksRecursively(subtask.id, level + 2, result)
              }
            }
          })
        }
      }
    })
  }
  
  // Start with an empty result and process from top level (null parent, level 0)
  const result: Array<Task & { level: number, hasSubtasks: boolean }> = []
  // Only show hierarchical structure in All Tasks tab
  if (activeTab.value === 'all') {
    // In All Tasks tab, show proper hierarchy and filter out subtasks from root level
    processTasksRecursively(null, 0, result)
  } else {
    // In other tabs, just show flat list of tasks without hierarchy
    // Filter out subtasks that should be under parent tasks
    tasks.filter(t => !t.parentTask && !t.parent).forEach(task => {
      result.push({
        ...task,
        level: 0,
        hasSubtasks: hasSubtasks(task.id)
      })
    })
  }
  
  return result
})

// Helper functions for task row display
const getTaskRowClasses = (task: Task & { level: number, hasSubtasks: boolean }) => {
  return { 
    'text-decoration-line-through': task.status === 'completed',
    'task-parent': task.hasSubtasks,
    'task-child': task.level > 0
  }
}

const getTaskRowStyle = (task: Task & { level: number, hasSubtasks: boolean }) => {
  return { 
    cursor: 'pointer',
    backgroundColor: task.level > 0 ? `rgba(0, 0, 0, ${0.03 * task.level})` : ''
  }
}

const toggleTaskStatus = async (task: Task) => {
  try {
    if (task.status === 'completed') {
      // Check if this is a provider-synced task
      if (task.providerId && task.providerAccountId) {
        // Update with provider
        await tasksStore.updateTaskWithProvider(task.id, { status: 'inProgress' })
      } else {
        // Regular update
        await tasksStore.markInProgress(task.id)
      }
    } else {
      // Check if this is a provider-synced task
      if (task.providerId && task.providerAccountId) {
        // Complete with provider
        await tasksStore.completeTaskWithProvider(task.id)
      } else {
        // Regular complete
        await tasksStore.markComplete(task.id)
      }
    }
  } catch (error: any) {
    console.error('Error toggling task status:', error)
  }
}
</script>

<style scoped>
.rotate-icon {
  transform: rotate(-90deg);
  transition: transform 0.3s ease;
}

.task-parent {
  font-weight: 500;
}

.task-child {
  border-left: 2px solid rgba(0, 0, 0, 0.1);
}
</style>
