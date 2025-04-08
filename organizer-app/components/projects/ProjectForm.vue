<template lang="pug">
v-form(
  ref="form"
  v-model="valid"
  @submit.prevent="submit"
)
  v-card
    v-card-title {{ isEdit ? $t('projects.edit') : $t('projects.createProject') }}
    
    v-card-text
      v-alert(
        v-if="error"
        type="error"
        class="mb-4"
      ) {{ error }}
      
      v-text-field(
        v-model="title"
        :label="$t('projects.title')"
        :rules="[rules.required]"
        required
        prepend-icon="mdi-folder"
      )
      
      v-textarea(
        v-model="description"
        :label="$t('projects.description')"
        rows="3"
        prepend-icon="mdi-text-box"
      )
      
      v-select(
        v-model="status"
        :items="statusOptions"
        :label="$t('projects.status')"
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
      
      v-slider(
        v-model="priority"
        :label="$t('projects.priority')"
        :hint="$t('projects.relativePriority')"
        persistent-hint
        min="1"
        max="10"
        thumb-label
        prepend-icon="mdi-arrow-up-down"
      )
      
      v-row
        v-col(cols="12" md="6")
          v-menu(
            v-model="dueDateMenu"
            :close-on-content-click="false"
          )
            template(v-slot:activator="{ props }")
              v-text-field(
                v-model="dueDateFormatted"
                :label="$t('projects.dueDate')"
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
        
        v-col(cols="12" md="6")
          v-slider(
            v-model="progress"
            :label="$t('projects.progress')"
            min="0"
            max="100"
            thumb-label
            prepend-icon="mdi-percent"
          )
      
      v-combobox(
        v-model="tags"
        :label="$t('projects.tags')"
        :items="availableTags"
        multiple
        chips
        closable-chips
        prepend-icon="mdi-tag-multiple"
      )
      
      v-select(
        v-model="members"
        :items="availablePeople"
        :label="$t('projects.members')"
        item-title="name"
        item-value="id"
        prepend-icon="mdi-account-multiple"
        multiple
        chips
      )
    
    v-card-actions
      v-spacer
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
import { ref, computed, onMounted } from 'vue'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import type { Project } from '~/types/models'

const props = defineProps({
  project: {
    type: Object as () => Project | null,
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

const emit = defineEmits(['submit', 'delete'])

const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()

const form = ref(null)
const valid = ref(false)
const dueDateMenu = ref(false)

// Form fields
const title = ref(props.project?.title || '')
const description = ref(props.project?.description || '')
const status = ref(props.project?.status || 'planning')
const priority = ref(props.project?.priority || 5)
const dueDate = ref(props.project?.dueDate ? new Date(props.project.dueDate).toISOString().substr(0, 10) : null)
const progress = ref(props.project?.progress || 0)
const tags = ref(props.project?.tags || [])
const members = ref(props.project?.members || [])

// Status options
const statusOptions = [
  { text: 'Planning', value: 'planning' },
  { text: 'Active', value: 'active' },
  { text: 'On Hold', value: 'onHold' },
  { text: 'Completed', value: 'completed' },
  { text: 'Cancelled', value: 'cancelled' }
]

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required'
}

// Computed values
const isEdit = computed(() => !!props.project)

const dueDateFormatted = computed(() => {
  if (!dueDate.value) return ''
  return new Date(dueDate.value).toLocaleDateString()
})

const availableTags = computed(() => {
  return projectsStore.getTags
})

const availablePeople = computed(() => {
  return peopleStore.people.map(person => ({
    id: person.id,
    name: `${person.firstName} ${person.lastName}`
  }))
})

// Helper functions
const getStatusColor = (statusValue: string) => {
  switch (statusValue) {
    case 'planning': return 'info'
    case 'active': return 'success'
    case 'onHold': return 'warning'
    case 'completed': return 'primary'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

const getStatusIcon = (statusValue: string) => {
  switch (statusValue) {
    case 'planning': return 'mdi-pencil'
    case 'active': return 'mdi-play'
    case 'onHold': return 'mdi-pause'
    case 'completed': return 'mdi-check'
    case 'cancelled': return 'mdi-close'
    default: return 'mdi-help'
  }
}

// Submit function
const submit = () => {
  if (!valid.value) return
  
  const projectData: Partial<Project> = {
    title: title.value,
    description: description.value,
    status: status.value as 'planning' | 'active' | 'onHold' | 'completed' | 'cancelled',
    priority: priority.value,
    dueDate: dueDate.value ? new Date(dueDate.value) : undefined,
    progress: progress.value,
    tags: tags.value,
    members: members.value
  }
  
  emit('submit', projectData)
}

// When project changes, update form values
onMounted(async () => {
  // Load people and tags for selects
  if (peopleStore.people.length === 0) {
    await peopleStore.fetchPeople()
  }
  
  if (props.project) {
    title.value = props.project.title
    description.value = props.project.description || ''
    status.value = props.project.status
    priority.value = props.project.priority
    dueDate.value = props.project.dueDate 
      ? new Date(props.project.dueDate).toISOString().substr(0, 10) 
      : null
    progress.value = props.project.progress
    tags.value = [...props.project.tags]
    members.value = [...props.project.members]
  }
})
</script>
