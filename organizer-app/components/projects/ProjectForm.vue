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
      
      // Project title field
      v-text-field(
        v-model="title"
        :label="$t('projects.title')"
        :rules="[rules.required]"
        required
        :prepend-icon="icon"
        class="mb-4"
      )
      
      // Preview card (wrapped in a div to avoid recursive updates)
      div.preview-wrapper.mb-4
        v-card(:color="color" class="pa-2")
          v-card-title.d-flex.align-center
            v-icon(:color="shouldUseWhiteText ? 'white' : 'black'" size="large" class="mr-2") {{ icon }}
            span(:class="shouldUseWhiteText ? 'text-white' : 'text-black'") {{ previewTitle }}
      
      v-row
        v-col(cols="12" md="6")
          v-select(
            v-model="color"
            :items="colorOptions"
            :label="$t('common.color')"
            item-title="text"
            item-value="value"
            prepend-icon="mdi-palette"
          )
            template(v-slot:selection="{ item }")
              div
                v-avatar(:color="item.value" size="24" class="mr-2")
                span {{ item.text }}
            
            template(v-slot:item="{ item, props }")
              v-list-item(
                v-bind="props"
                :prepend-avatar="undefined"
              )
                template(v-slot:prepend)
                  v-avatar(:color="item.raw.value" size="24")
        
        v-col(cols="12" md="6")
          icon-selector(
            v-model="icon"
            :color="color"
            :label="$t('common.icon')"
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
      
      v-select(
        v-model="priority"
        :label="$t('projects.priority')"
        :items="priorityOptions"
        item-title="text"
        item-value="value"
        prepend-icon="mdi-arrow-up-down"
        :rules="[rules.required]"
        required
      )
        template(v-slot:selection="{ item }")
          v-chip(:color="getPriorityColor(item.value)" size="small")
            v-icon(start size="small") mdi-flag
            span {{ item.text }}
      
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
        
        v-col(cols="12")
          v-card(class="pa-3" elevation="1")
            v-card-title.px-0.d-flex.align-center
              v-icon(class="mr-2") mdi-chart-line
              span {{ $t('projects.progress') }}
            v-slider(
              v-model="progress"
              min="0"
              max="100"
              thumb-label
              prepend-icon="mdi-percent"
              color="primary"
              track-color="grey-lighten-3"
            )
            v-progress-linear(
              :model-value="progress" 
              height="22" 
              :color="color || 'primary'"
              bg-color="grey-lighten-4"
              rounded
              class="mt-2"
            )
              template(v-slot:default="{ value }")
                strong {{ Math.round(value) }}%
      
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
      
      v-select(
        v-model="stakeholders"
        :items="availablePeople"
        :label="$t('projects.stakeholders')"
        item-title="name"
        item-value="id"
        prepend-icon="mdi-account-star"
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
import { ref, computed, onMounted, watch } from 'vue'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import IconSelector from '~/components/common/IconSelector.vue'
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
// Handle priority - default to 'medium' if not defined
const priority = ref(props.project?.priority || 'medium')
const dueDate = ref(props.project?.dueDate ? new Date(props.project.dueDate).toISOString().substr(0, 10) : null)
const progress = ref(props.project?.progress || 0)
const icon = ref(props.project?.icon || 'mdi-folder-outline')
const color = ref(props.project?.color || 'primary')
const tags = ref(props.project?.tags || [])
const members = ref(props.project?.members || [])
const stakeholders = ref(props.project?.stakeholders || [])

// Status, priority and color options
const statusOptions = [
  { text: 'Planning', value: 'planning' },
  { text: 'Active', value: 'active' },
  { text: 'On Hold', value: 'onHold' },
  { text: 'Completed', value: 'completed' },
  { text: 'Cancelled', value: 'cancelled' }
]

const priorityOptions = [
  { text: 'Low', value: 'low' },
  { text: 'Medium', value: 'medium' },
  { text: 'High', value: 'high' },
  { text: 'Urgent', value: 'urgent' }
]

const colorOptions = [
  { text: 'Primary', value: 'primary' },
  { text: 'Secondary', value: 'secondary' },
  { text: 'Success', value: 'success' },
  { text: 'Info', value: 'info' },
  { text: 'Warning', value: 'warning' },
  { text: 'Error', value: 'error' },
  { text: 'Purple', value: 'purple' },
  { text: 'Indigo', value: 'indigo' },
  { text: 'Teal', value: 'teal' },
  { text: 'Orange', value: 'orange' },
  { text: 'Pink', value: 'pink' },
  { text: 'Deep Purple', value: 'deep-purple' },
  { text: 'Light Blue', value: 'light-blue' },
  { text: 'Green', value: 'green' },
  { text: 'Amber', value: 'amber' },
  { text: 'Deep Orange', value: 'deep-orange' },
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

const getPriorityColor = (priorityValue: string) => {
  switch (priorityValue) {
    case 'low': return 'success'
    case 'medium': return 'info'
    case 'high': return 'warning'
    case 'urgent': return 'error'
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

// Computed values to prevent recursive updates
const previewTitle = computed(() => title.value || 'New Project')

const shouldUseWhiteText = computed(() => {
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
  
  return !lightColors.some(c => color.value.includes(c));
})

// Submit function
const submit = () => {
  if (!valid.value) return
  
  // Create project data with null instead of undefined for dueDate
  const projectData: Partial<Project> = {
    title: title.value,
    description: description.value,
    status: status.value as 'planning' | 'active' | 'onHold' | 'completed' | 'cancelled',
    priority: priority.value as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: dueDate.value ? new Date(dueDate.value) : null,
    progress: progress.value,
    icon: icon.value,
    color: color.value,
    tags: tags.value,
    members: members.value,
    stakeholders: stakeholders.value
  }
  
  emit('submit', projectData)
}

// Load people and tags for selects
onMounted(async () => {
  if (peopleStore.people.length === 0) {
    await peopleStore.fetchPeople()
  }
})

// Watch for project changes to update form values
watch(() => props.project, (newProject) => {
  if (newProject) {
    title.value = newProject.title
    description.value = newProject.description || ''
    status.value = newProject.status
    priority.value = newProject.priority
    dueDate.value = newProject.dueDate 
      ? new Date(newProject.dueDate).toISOString().substr(0, 10) 
      : null
    progress.value = newProject.progress
    icon.value = newProject.icon || 'mdi-folder-outline'
    color.value = newProject.color || 'primary'
    tags.value = [...newProject.tags]
    members.value = [...newProject.members]
    stakeholders.value = [...(newProject.stakeholders || [])]
  }
}, { immediate: true })
</script>
