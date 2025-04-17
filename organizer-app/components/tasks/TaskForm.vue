<template lang="pug">
v-form(
  ref="form"
  v-model="valid"
  @submit.prevent="submit"
)
  v-card
    v-card-title {{ isEdit ? $t('tasks.edit') : $t('tasks.addTask') }}
    
    v-card-text
      v-alert(
        v-if="error"
        type="error"
        class="mb-4"
      ) {{ error }}
      
      v-select(
        v-model="storageProvider"
        :items="availableProviders"
        :label="$t('common.storageLocation')"
        item-title="name"
        item-value="id"
        prepend-icon="mdi-server"
        :rules="[rules.required]"
        required
      )
      
      v-text-field(
        v-model="title"
        :label="$t('tasks.title')"
        :rules="[rules.required]"
        required
        prepend-icon="mdi-checkbox-marked-outline"
      )
      
      v-textarea(
        v-model="description"
        :label="$t('tasks.description')"
        rows="3"
        prepend-icon="mdi-text-box"
      )
      
      v-select(
        v-model="status"
        :items="statusOptions"
        :label="$t('tasks.status')"
        item-title="text"
        item-value="value"
        prepend-icon="mdi-check-circle"
        :rules="[rules.required]"
        required
      )
        template(v-slot:selection="{ item }")
          v-chip(:color="getStatusColor(item.value)" size="small")
            v-icon(start size="small") {{ getStatusIcon(item.value) }}
            span {{ item.text }}
      
      v-select(
        v-model="type"
        :items="typeOptions"
        :label="$t('tasks.type')"
        item-title="text"
        item-value="value"
        prepend-icon="mdi-shape"
        :rules="[rules.required]"
        required
      )

      v-select(
        v-model="priority"
        :items="priorityOptions"
        :label="$t('tasks.priority')"
        item-title="text"
        item-value="value"
        prepend-icon="mdi-flag"
      )
        template(v-slot:selection="{ item }")
          v-chip(:color="getPriorityColor(item.value)" size="small") {{ item.text }}
      
      v-menu(
        v-model="dueDateMenu"
        :close-on-content-click="false"
      )
        template(v-slot:activator="{ props }")
          v-text-field(
            v-model="dueDateFormatted"
            :label="$t('tasks.dueDate')"
            prepend-icon="mdi-calendar"
            readonly
            v-bind="props"
            clearable
            @click:clear="dueDate = null"
          )
        v-date-picker(
          v-model="dueDate"
          @update:model-value="dueDateMenu = false"
        )
      
      v-select(
        v-model="assignedTo"
        :items="availablePeople"
        :label="$t('tasks.assignedTo')"
        item-title="name"
        item-value="id"
        prepend-icon="mdi-account"
        clearable
      )
      
      v-combobox(
        v-model="tags"
        :label="$t('tasks.tags')"
        :items="availableTags"
        multiple
        chips
        closable-chips
        prepend-icon="mdi-tag-multiple"
      )
      
      v-select(
        v-model="relatedProjects"
        :items="availableProjects"
        :label="$t('projects.title')"
        item-title="title"
        item-value="id"
        prepend-icon="mdi-folder"
        multiple
        chips
      )

      // Connections to behaviors and meetings would go here
      
      v-expansion-panels(v-if="isEdit" variant="accordion")
        v-expansion-panel
          v-expansion-panel-title {{ $t('tasks.comments') }}
          v-expansion-panel-text
            template(v-if="comments.length > 0")
              v-card(
                v-for="comment in comments" 
                :key="comment.id"
                class="mb-2"
                variant="outlined"
              )
                v-card-text 
                  div.text-subtitle-2 {{ getCommentAuthor(comment) }}
                  div.text-caption.mb-2 {{ formatDate(comment.createdAt) }}
                  div {{ comment.content }}
                v-card-actions
                  v-spacer
                  v-btn(icon size="small" @click="startEditComment(comment)")
                    v-icon mdi-pencil
                  v-btn(icon size="small" @click="deleteComment(comment.id)")
                    v-icon mdi-delete
            
            v-textarea(
              v-if="!editingComment"
              v-model="newComment"
              :label="$t('tasks.addComment')"
              rows="2"
            )
            v-textarea(
              v-else
              v-model="editingCommentText"
              :label="$t('tasks.editComment')"
              rows="2"
            )
            
            v-btn(
              v-if="!editingComment"
              color="primary" 
              :disabled="!newComment"
              @click="addComment"
            ) {{ $t('common.add') }}
            v-btn(
              v-else
              color="primary" 
              :disabled="!editingCommentText"
              @click="saveEditComment"
            ) {{ $t('common.save') }}
            v-btn(
              v-if="editingComment"
              @click="cancelEditComment"
              text
            ) {{ $t('common.cancel') }}
        
        v-expansion-panel
          v-expansion-panel-title {{ $t('tasks.subtasks') }}
          v-expansion-panel-text
            v-list
              template(v-if="subtasks.length > 0")
                v-list-item(
                  v-for="subtask in subtasks" 
                  :key="subtask.id"
                  :title="subtask.title"
                  :subtitle="subtask.status"
                )
                  template(v-slot:prepend)
                    v-icon(
                      :color="getStatusColor(subtask.status)"
                    ) {{ getStatusIcon(subtask.status) }}
                  template(v-slot:append)
                    v-btn(icon size="small" @click="editSubtask(subtask.id)")
                      v-icon mdi-pencil
                    v-btn(icon size="small" @click="deleteSubtask(subtask.id)")
                      v-icon mdi-delete
              
              v-alert(v-else type="info" variant="tonal") {{ $t('tasks.noSubtasks') }}
            
            v-text-field(
              v-model="newSubtaskTitle"
              :label="$t('tasks.addSubtask')"
              hide-details
              class="mb-2"
            )
            v-btn(
              color="primary" 
              :disabled="!newSubtaskTitle"
              @click="addSubtask"
            ) {{ $t('common.add') }}
    
    v-card-actions
      v-spacer
      v-btn(
        v-if="isEdit && task?.status !== 'completed'"
        color="success"
        variant="text"
        :loading="loading"
        @click="$emit('complete')"
        class="mr-2"
      ) {{ $t('tasks.markComplete') }}
      v-btn(
        v-if="isEdit"
        color="error"
        variant="text"
        :loading="loading"
        @click="$emit('delete')"
      ) {{ $t('common.delete') }}
      v-btn(
        color="primary"
        :loading="loading"
        :disabled="!valid || loading"
        @click="submit"
      ) {{ isEdit ? $t('common.update') : $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTasksStore } from '~/stores/tasks'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useAuthStore } from '~/stores/auth'
import { useIntegrationProviders } from '~/composables/useIntegrationProviders'
import type { Task, Comment } from '~/types/models'

const props = defineProps({
  task: {
    type: Object as () => Task | null,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['submit', 'delete', 'complete'])

const tasksStore = useTasksStore()
const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const form = ref(null)
const valid = ref(false)
const dueDateMenu = ref(false)

// Form fields
const storageProvider = ref(props.task?.storageProvider || 'organizer') // Default to storing in Organizer
const title = ref(props.task?.title || '')
const description = ref(props.task?.description || '')
const status = ref(props.task?.status || 'todo')
const type = ref(props.task?.type || 'task')
const priority = ref(props.task?.priority !== undefined ? props.task.priority : 3)
const dueDate = ref(props.task?.dueDate ? new Date(props.task.dueDate).toISOString().substr(0, 10) : null)
const assignedTo = ref(props.task?.assignedTo || '')
const tags = ref(props.task?.tags || [])
const relatedProjects = ref(props.task?.relatedProjects || [])

// Get available storage providers
const { taskProviders } = useIntegrationProviders()
const availableProviders = computed(() => taskProviders.value)

// Comments section
const comments = ref(props.task?.comments || [])
const newComment = ref('')
const editingComment = ref<string | null>(null)
const editingCommentText = ref('')

// Subtasks section
const subtasks = ref<Task[]>([])
const newSubtaskTitle = ref('')

// Status options
const statusOptions = [
  { text: 'To Do', value: 'todo' },
  { text: 'In Progress', value: 'inProgress' },
  { text: 'Completed', value: 'completed' },
  { text: 'Delegated', value: 'delegated' },
  { text: 'Cancelled', value: 'cancelled' }
]

// Type options
const typeOptions = [
  { text: 'Task', value: 'task' },
  { text: 'Routine', value: 'routine' },
  { text: 'Delegation', value: 'delegation' },
  { text: 'Follow-up', value: 'followUp' }
]

// Priority options
const priorityOptions = [
  { text: 'Highest', value: 1 },
  { text: 'High', value: 2 },
  { text: 'Medium', value: 3 },
  { text: 'Low', value: 4 },
  { text: 'Lowest', value: 5 }
]

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required'
}

// Computed values
const isEdit = computed(() => !!props.task)

const dueDateFormatted = computed(() => {
  if (!dueDate.value) return ''
  return new Date(dueDate.value).toLocaleDateString()
})

const availableTags = computed(() => {
  return tasksStore.getTags
})

const availablePeople = computed(() => {
  return peopleStore.people.map(person => ({
    id: person.id,
    name: `${person.firstName} ${person.lastName}`
  }))
})

const availableProjects = computed(() => {
  return projectsStore.projects.map(project => ({
    id: project.id,
    title: project.title
  }))
})

// Helper functions
const formatDate = (date: Date) => {
  return date.toLocaleString()
}

const getStatusColor = (statusValue: string) => {
  switch (statusValue) {
    case 'todo': return 'grey'
    case 'inProgress': return 'info'
    case 'completed': return 'success'
    case 'delegated': return 'warning'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

const getStatusIcon = (statusValue: string) => {
  switch (statusValue) {
    case 'todo': return 'mdi-checkbox-blank-outline'
    case 'inProgress': return 'mdi-progress-check'
    case 'completed': return 'mdi-checkbox-marked'
    case 'delegated': return 'mdi-account-arrow-right'
    case 'cancelled': return 'mdi-cancel'
    default: return 'mdi-help'
  }
}

const getPriorityColor = (priorityValue: number) => {
  switch (priorityValue) {
    case 1: return 'error' // Highest
    case 2: return 'error-lighten-1' // High
    case 3: return 'warning' // Medium
    case 4: return 'success-lighten-1' // Low
    case 5: return 'success' // Lowest
    default: return 'grey'
  }
}

const getCommentAuthor = (comment: Comment) => {
  if (comment.userId === authStore.user?.id) {
    return 'You'
  }
  
  const person = peopleStore.getById(comment.userId)
  if (person) {
    return `${person.firstName} ${person.lastName}`
  }
  
  return 'Unknown user'
}

// Comment functions
const addComment = async () => {
  if (!props.task || !newComment.value) return
  
  try {
    await tasksStore.addComment(props.task.id, newComment.value)
    newComment.value = ''
    
    // Refresh comments
    if (props.task) {
      const task = tasksStore.getById(props.task.id)
      if (task) {
        comments.value = task.comments
      }
    }
  } catch (error) {
    console.error('Failed to add comment:', error)
  }
}

const startEditComment = (comment: Comment) => {
  editingComment.value = comment.id
  editingCommentText.value = comment.content
}

const saveEditComment = async () => {
  if (!props.task || !editingComment.value) return
  
  try {
    await tasksStore.updateComment(props.task.id, editingComment.value, editingCommentText.value)
    
    // Refresh comments
    if (props.task) {
      const task = tasksStore.getById(props.task.id)
      if (task) {
        comments.value = task.comments
      }
    }
    
    cancelEditComment()
  } catch (error) {
    console.error('Failed to update comment:', error)
  }
}

const cancelEditComment = () => {
  editingComment.value = null
  editingCommentText.value = ''
}

const deleteComment = async (commentId: string) => {
  if (!props.task) return
  
  try {
    await tasksStore.deleteComment(props.task.id, commentId)
    
    // Refresh comments
    if (props.task) {
      const task = tasksStore.getById(props.task.id)
      if (task) {
        comments.value = task.comments
      }
    }
  } catch (error) {
    console.error('Failed to delete comment:', error)
  }
}

// Subtask functions
const loadSubtasks = async () => {
  if (!props.task) return
  
  subtasks.value = props.task.subtasks
    .map(id => tasksStore.getById(id))
    .filter(task => task !== null) as Task[]
}

const addSubtask = async () => {
  if (!props.task || !newSubtaskTitle.value) return
  
  try {
    await tasksStore.addSubtask(props.task.id, {
      title: newSubtaskTitle.value,
      status: 'todo',
      priority: priority.value
    })
    newSubtaskTitle.value = ''
    
    // Reload the task to get updated subtasks
    await tasksStore.fetchTask(props.task.id)
    loadSubtasks()
  } catch (error) {
    console.error('Failed to add subtask:', error)
  }
}

const editSubtask = (subtaskId: string) => {
  // In a full implementation, this would open a dialog to edit the subtask
  console.log('Edit subtask:', subtaskId)
}

const deleteSubtask = async (subtaskId: string) => {
  try {
    await tasksStore.deleteTask(subtaskId)
    
    // Reload the task to get updated subtasks
    if (props.task) {
      await tasksStore.fetchTask(props.task.id)
      loadSubtasks()
    }
  } catch (error) {
    console.error('Failed to delete subtask:', error)
  }
}

// Submit function
const submit = () => {
  if (!valid.value) return
  
  const taskData: Partial<Task> = {
    title: title.value,
    description: description.value,
    status: status.value as 'todo' | 'inProgress' | 'completed' | 'delegated' | 'cancelled',
    type: type.value as 'task' | 'routine' | 'delegation' | 'followUp',
    priority: priority.value,
    dueDate: dueDate.value ? new Date(dueDate.value) : undefined,
    assignedTo: assignedTo.value || undefined,
    tags: tags.value,
    relatedProjects: relatedProjects.value,
    // Add provider information for non-organizer storage
    storageProvider: storageProvider.value
  }
  
  emit('submit', taskData)
}

// Load data
onMounted(async () => {
  // Load people and projects for selects
  if (peopleStore.people.length === 0) {
    await peopleStore.fetchPeople()
  }
  
  if (projectsStore.projects.length === 0) {
    await projectsStore.fetchProjects()
  }
  
  if (props.task) {
    title.value = props.task.title
    description.value = props.task.description || ''
    status.value = props.task.status
    type.value = props.task.type
    priority.value = props.task.priority
    dueDate.value = props.task.dueDate 
      ? new Date(props.task.dueDate).toISOString().substr(0, 10) 
      : null
    assignedTo.value = props.task.assignedTo || ''
    tags.value = [...props.task.tags]
    relatedProjects.value = [...(props.task.relatedProjects || [])]
    comments.value = [...props.task.comments]
    
    // Load subtasks
    loadSubtasks()
  }
})

// Watch for changes to the task and update form
watch(() => props.task, (newTask) => {
  if (newTask) {
    title.value = newTask.title
    description.value = newTask.description || ''
    status.value = newTask.status
    type.value = newTask.type
    priority.value = newTask.priority
    dueDate.value = newTask.dueDate 
      ? new Date(newTask.dueDate).toISOString().substr(0, 10) 
      : null
    assignedTo.value = newTask.assignedTo || ''
    tags.value = [...newTask.tags]
    relatedProjects.value = [...(newTask.relatedProjects || [])]
    comments.value = [...newTask.comments]
    loadSubtasks()
  }
}, { deep: true })
</script>
