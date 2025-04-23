<template lang="pug">
v-dialog(
  v-model="dialogVisible"
  max-width="800px"
  persistent
)
  v-card
    v-card-title
      | {{ $t('ai.analyzeText') }}
      v-spacer
      
      // Display selected AI provider in top-right
      template(v-if="availableIntegrations.length > 0")
        v-select(
          v-if="availableIntegrations.length > 1"
          v-model="selectedIntegration"
          :items="availableIntegrations"
          item-title="name"
          item-value="id"
          return-object
          density="compact"
          variant="plain"
          hide-details
          class="max-width-200 mr-2"
        )
        v-chip(
          v-else
          color="primary"
          size="small"
          class="mr-2"
        ) 
          v-icon(start) {{ getProviderIcon(availableIntegrations[0].provider) }}
          | {{ availableIntegrations[0].name }}
      
      v-btn(icon @click="close")
        v-icon mdi-close
    
    v-alert(
      v-if="error" 
      type="error" 
      class="ma-4"
      closable
      @click:close="error = ''"
    ) {{ error }}
    
    // Input section
    v-card-text(v-if="!isAnalyzing && !analysisResult")
      v-form(ref="form" @submit.prevent="analyzeText")
        // Provider selection (only shown if multiple providers available)
        v-select(
          v-if="availableProviders.length > 1"
          v-model="selectedProvider"
          :items="availableProviders"
          :label="$t('ai.selectProvider')"
          item-title="text"
          item-value="value"
          variant="outlined"
          density="comfortable"
          class="mb-4"
          :rules="[rules.required]"
        )
        
        v-textarea(
          v-model="textToAnalyze"
          :label="$t('ai.textToAnalyze')"
          :placeholder="$t('ai.textToAnalyzePlaceholder')"
          :hint="$t('ai.textToAnalyzeHint')"
          rows="10"
          auto-grow
          variant="outlined"
          :rules="[rules.required]"
        )
      
      v-card-actions
        v-spacer
        v-btn(
          color="primary"
          @click="analyzeText"
          :loading="isAnalyzing"
          :disabled="!textToAnalyze || isAnalyzing"
        )
          v-icon(start) mdi-brain
          | {{ $t('ai.analyze') }}
    
    // Loading state
    v-card-text(v-if="isAnalyzing")
      v-row(align="center" justify="center" class="py-8")
        v-col(cols="12" class="text-center")
          v-progress-circular(
            indeterminate
            color="primary"
            size="64"
          )
          div.text-h6.mt-4 {{ $t('ai.analyzing') }}
          div.text-body-2.mt-2 {{ $t('ai.analyzingDescription') }}
    
    // Results section
    template(v-if="!isAnalyzing && analysisResult")
      v-card-text
        // Summary section
        v-card(variant="outlined" class="mb-4")
          v-card-title {{ $t('ai.summary') }}
          v-card-text {{ analysisResult.summary }}
        
        // Tabs for different entity types
        v-tabs(v-model="activeTab" color="primary")
          v-tab(value="people") 
            v-icon(start) mdi-account
            | {{ $t('people.title') }} ({{ analysisResult.people.length }})
          v-tab(value="projects") 
            v-icon(start) mdi-folder-multiple
            | {{ $t('projects.title') }} ({{ analysisResult.projects.length }})
          v-tab(value="tasks") 
            v-icon(start) mdi-checkbox-marked-outline
            | {{ $t('tasks.title') }} ({{ analysisResult.tasks.length }})
          v-tab(value="behaviors") 
            v-icon(start) mdi-account-cog
            | {{ $t('behaviors.title') }} ({{ analysisResult.behaviors.length }})
          v-tab(value="meetings") 
            v-icon(start) mdi-account-group
            | {{ $t('meetings.title') }} ({{ analysisResult.meetings.length }})
        
        v-window(v-model="activeTab")
          // People tab
          v-window-item(value="people")
            v-list(v-if="analysisResult.people.length > 0" variant="flat")
              v-list-item(
                v-for="(person, index) in analysisResult.people"
                :key="index"
                :title="person.name"
                :subtitle="`${$t('ai.confidence')}: ${Math.round(person.confidence * 100)}%`"
              )
                template(v-slot:prepend)
                  v-avatar(color="primary" size="36")
                    v-icon(color="white") mdi-account
                
                template(v-slot:append)
                  v-btn-group
                    v-btn(
                      variant="text"
                      color="primary"
                      @click="createEntity('person', person)"
                      :title="$t('ai.createNew')"
                    )
                      v-icon mdi-plus
                    
                    v-menu(location="bottom end")
                      template(v-slot:activator="{ props }")
                        v-btn(
                          variant="text"
                          color="primary"
                          v-bind="props"
                          :title="$t('ai.relateExisting')"
                        )
                          v-icon mdi-link
                      
                      v-list
                        v-list-item(
                          @click="relateToExisting('person', person)"
                        ) {{ $t('ai.selectExisting') }}
                    
                    v-btn(
                      variant="text"
                      color="error"
                      @click="ignoreEntity('person', index)"
                      :title="$t('ai.ignore')"
                    )
                      v-icon mdi-close
              
              v-sheet(v-if="selectedItemDetails.type === 'person'" class="mt-3 pa-3" color="background" rounded)
                v-row(align="center")
                  v-col(cols="12" lg="6")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.firstName"
                      :label="$t('people.firstName')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.lastName"
                      :label="$t('people.lastName')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.email"
                      :label="$t('people.email')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.organization"
                      :label="$t('people.organization')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12")
                    v-textarea(
                      v-model="selectedItemDetails.entity.details.notes"
                      :label="$t('common.notes')"
                      variant="outlined"
                      auto-grow
                      rows="2"
                    )
            
            v-alert(v-else type="info" variant="tonal") {{ $t('ai.noPeopleFound') }}
          
          // Projects tab
          v-window-item(value="projects")
            v-list(v-if="analysisResult.projects.length > 0" variant="flat")
              v-list-item(
                v-for="(project, index) in analysisResult.projects"
                :key="index"
                :title="project.name"
                :subtitle="`${$t('ai.confidence')}: ${Math.round(project.confidence * 100)}%`"
              )
                template(v-slot:prepend)
                  v-avatar(color="teal" size="36")
                    v-icon(color="white") mdi-folder-multiple
                
                template(v-slot:append)
                  v-btn-group
                    v-btn(
                      variant="text"
                      color="primary"
                      @click="createEntity('project', project)"
                      :title="$t('ai.createNew')"
                    )
                      v-icon mdi-plus
                    
                    v-menu(location="bottom end")
                      template(v-slot:activator="{ props }")
                        v-btn(
                          variant="text"
                          color="primary"
                          v-bind="props"
                          :title="$t('ai.relateExisting')"
                        )
                          v-icon mdi-link
                      
                      v-list
                        v-list-item(
                          @click="relateToExisting('project', project)"
                        ) {{ $t('ai.selectExisting') }}
                    
                    v-btn(
                      variant="text"
                      color="error"
                      @click="ignoreEntity('project', index)"
                      :title="$t('ai.ignore')"
                    )
                      v-icon mdi-close
              
              v-sheet(v-if="selectedItemDetails.type === 'project'" class="mt-3 pa-3" color="background" rounded)
                v-row(align="center")
                  v-col(cols="12")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.title"
                      :label="$t('projects.title')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-select(
                      v-model="selectedItemDetails.entity.details.status"
                      :items="projectStatusOptions"
                      :label="$t('projects.status')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-select(
                      v-model="selectedItemDetails.entity.details.priority"
                      :items="priorityOptions"
                      :label="$t('projects.priority')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12")
                    v-textarea(
                      v-model="selectedItemDetails.entity.details.description"
                      :label="$t('projects.description')"
                      variant="outlined"
                      auto-grow
                      rows="2"
                    )
            
            v-alert(v-else type="info" variant="tonal") {{ $t('ai.noProjectsFound') }}
          
          // Tasks tab
          v-window-item(value="tasks")
            v-list(v-if="analysisResult.tasks.length > 0" variant="flat")
              v-list-item(
                v-for="(task, index) in analysisResult.tasks"
                :key="index"
                :title="task.name"
                :subtitle="`${$t('ai.confidence')}: ${Math.round(task.confidence * 100)}%`"
              )
                template(v-slot:prepend)
                  v-avatar(color="primary" size="36")
                    v-icon(color="white") mdi-checkbox-marked-outline
                
                template(v-slot:append)
                  v-btn-group
                    v-btn(
                      variant="text"
                      color="primary"
                      @click="createEntity('task', task)"
                      :title="$t('ai.createNew')"
                    )
                      v-icon mdi-plus
                    
                    v-menu(location="bottom end")
                      template(v-slot:activator="{ props }")
                        v-btn(
                          variant="text"
                          color="primary"
                          v-bind="props"
                          :title="$t('ai.relateExisting')"
                        )
                          v-icon mdi-link
                      
                      v-list
                        v-list-item(
                          @click="relateToExisting('task', task)"
                        ) {{ $t('ai.selectExisting') }}
                    
                    v-btn(
                      variant="text"
                      color="error"
                      @click="ignoreEntity('task', index)"
                      :title="$t('ai.ignore')"
                    )
                      v-icon mdi-close
              
              v-sheet(v-if="selectedItemDetails.type === 'task'" class="mt-3 pa-3" color="background" rounded)
                v-row(align="center")
                  v-col(cols="12")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.title"
                      :label="$t('tasks.title')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-select(
                      v-model="selectedItemDetails.entity.details.status"
                      :items="taskStatusOptions"
                      :label="$t('tasks.status')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-select(
                      v-model="selectedItemDetails.entity.details.priority"
                      :items="priorityOptions"
                      :label="$t('tasks.priority')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12")
                    v-textarea(
                      v-model="selectedItemDetails.entity.details.description"
                      :label="$t('tasks.description')"
                      variant="outlined"
                      auto-grow
                      rows="2"
                    )
            
            v-alert(v-else type="info" variant="tonal") {{ $t('ai.noTasksFound') }}
          
          // Behaviors tab
          v-window-item(value="behaviors")
            v-list(v-if="analysisResult.behaviors.length > 0" variant="flat")
              v-list-item(
                v-for="(behavior, index) in analysisResult.behaviors"
                :key="index"
                :title="behavior.name"
                :subtitle="`${$t('ai.confidence')}: ${Math.round(behavior.confidence * 100)}%`"
              )
                template(v-slot:prepend)
                  v-avatar(color="indigo" size="36")
                    v-icon(color="white") mdi-account-cog
                
                template(v-slot:append)
                  v-btn-group
                    v-btn(
                      variant="text"
                      color="primary"
                      @click="createEntity('behavior', behavior)"
                      :title="$t('ai.createNew')"
                    )
                      v-icon mdi-plus
                    
                    v-menu(location="bottom end")
                      template(v-slot:activator="{ props }")
                        v-btn(
                          variant="text"
                          color="primary"
                          v-bind="props"
                          :title="$t('ai.relateExisting')"
                        )
                          v-icon mdi-link
                      
                      v-list
                        v-list-item(
                          @click="relateToExisting('behavior', behavior)"
                        ) {{ $t('ai.selectExisting') }}
                    
                    v-btn(
                      variant="text"
                      color="error"
                      @click="ignoreEntity('behavior', index)"
                      :title="$t('ai.ignore')"
                    )
                      v-icon mdi-close
              
              v-sheet(v-if="selectedItemDetails.type === 'behavior'" class="mt-3 pa-3" color="background" rounded)
                v-row(align="center")
                  v-col(cols="12")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.title"
                      :label="$t('behaviors.title')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-select(
                      v-model="selectedItemDetails.entity.details.type"
                      :items="behaviorTypeOptions"
                      :label="$t('behaviors.type')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12")
                    v-textarea(
                      v-model="selectedItemDetails.entity.details.description"
                      :label="$t('behaviors.description')"
                      variant="outlined"
                      auto-grow
                      rows="2"
                    )
            
            v-alert(v-else type="info" variant="tonal") {{ $t('ai.noBehaviorsFound') }}
          
          // Meetings tab
          v-window-item(value="meetings")
            v-list(v-if="analysisResult.meetings.length > 0" variant="flat")
              v-list-item(
                v-for="(meeting, index) in analysisResult.meetings"
                :key="index"
                :title="meeting.name"
                :subtitle="`${$t('ai.confidence')}: ${Math.round(meeting.confidence * 100)}%`"
              )
                template(v-slot:prepend)
                  v-avatar(color="deep-purple" size="36")
                    v-icon(color="white") mdi-account-group
                
                template(v-slot:append)
                  v-btn-group
                    v-btn(
                      variant="text"
                      color="primary"
                      @click="createEntity('meeting', meeting)"
                      :title="$t('ai.createNew')"
                    )
                      v-icon mdi-plus
                    
                    v-menu(location="bottom end")
                      template(v-slot:activator="{ props }")
                        v-btn(
                          variant="text"
                          color="primary"
                          v-bind="props"
                          :title="$t('ai.relateExisting')"
                        )
                          v-icon mdi-link
                      
                      v-list
                        v-list-item(
                          @click="relateToExisting('meeting', meeting)"
                        ) {{ $t('ai.selectExisting') }}
                    
                    v-btn(
                      variant="text"
                      color="error"
                      @click="ignoreEntity('meeting', index)"
                      :title="$t('ai.ignore')"
                    )
                      v-icon mdi-close
              
              v-sheet(v-if="selectedItemDetails.type === 'meeting'" class="mt-3 pa-3" color="background" rounded)
                v-row(align="center")
                  v-col(cols="12")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.title"
                      :label="$t('meetings.title')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12" lg="6")
                    v-text-field(
                      v-model="selectedItemDetails.entity.details.location"
                      :label="$t('meetings.location')"
                      variant="outlined"
                      dense
                    )
                  v-col(cols="12")
                    v-textarea(
                      v-model="selectedItemDetails.entity.details.description"
                      :label="$t('meetings.description')"
                      variant="outlined"
                      auto-grow
                      rows="2"
                    )
            
            v-alert(v-else type="info" variant="tonal") {{ $t('ai.noMeetingsFound') }}
      
      v-card-actions
        template(v-if="!isAnalyzing && analysisResult")
          v-btn(variant="text" color="primary" @click="newAnalysis") {{ $t('ai.newAnalysis') }}
          v-spacer
          v-btn(variant="text" @click="close") {{ $t('common.close') }}
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import { getProvider } from '~/utils/api/aiProviders'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useTasksStore } from '~/stores/tasks'
import { useBehaviorsStore } from '~/stores/behaviors'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// Component state
const dialogVisible = ref(false)
const form = ref(null)
const isAnalyzing = ref(false)
const error = ref('')
const textToAnalyze = ref('')
const analysisResult = ref(null)
const activeTab = ref('people')
const selectedItemDetails = ref({ type: null, entity: null })

// Validation rules
const rules = {
  required: (v) => !!v || 'This field is required'
}

// Stores
const authStore = useAuthStore()
const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const behaviorsStore = useBehaviorsStore()
const i18n = useI18n()

// Computed
const user = computed(() => authStore.currentUser)

// Get all available AI integrations (enabled ones only)
const availableIntegrations = computed(() => {
  if (!user.value?.settings?.aiIntegrations) return []
  
  return user.value.settings.aiIntegrations
    .filter(integration => integration.enabled && integration.apiKey)
})

// For backward compatibility with existing code
const availableProviders = computed(() => {
  return availableIntegrations.value.map(integration => ({
    text: integration.name,
    value: integration.provider
  }))
})

// Selected integration ref (the whole integration object)
const selectedIntegration = ref(null)

// Status and type options for entities
const projectStatusOptions = [
  'notStarted',
  'inProgress',
  'onHold',
  'completed',
  'cancelled',
  'active',
  'planning'
]

const taskStatusOptions = [
  'todo',
  'inProgress',
  'completed',
  'delegated',
  'cancelled'
]

const priorityOptions = [
  'low',
  'medium',
  'high',
  'urgent'
]

const behaviorTypeOptions = [
  'doWell',
  'wantToDoBetter',
  'needToImprove'
]

// Helper function to get provider icon
function getProviderIcon(provider) {
  switch (provider) {
    case 'openai':
      return 'mdi-brain'
    case 'gemini':
      return 'mdi-google'
    case 'xai':
      return 'mdi-robot'
    default:
      return 'mdi-api'
  }
}

// Watch for dialog visibility change
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
  
  // Initialize the selected integration when dialog opens
  if (newVal && availableIntegrations.value.length > 0) {
    selectedIntegration.value = availableIntegrations.value[0]
  }
})

watch(() => dialogVisible.value, (newVal) => {
  emit('update:modelValue', newVal)
})

// Methods
// Add CSS for max-width to style scope
const style = document.createElement('style')
style.textContent = `
.max-width-200 {
  max-width: 200px;
}
`
document.head.appendChild(style)

async function analyzeText() {
  console.log('user asks to analyze the text')
  if (!textToAnalyze.value) {
    console.error('nothing to analyze')
    return
  }
  
  isAnalyzing.value = true
  error.value = ''
  
  try {
    // Get the selected integration
    const integration = selectedIntegration.value
    
    if (!integration) {
      throw new Error('No AI integration selected')
    }
    
    // Use the API directly from the server rather than going through client-side providers
    try {
      console.log('requesting server to analyze')
      console.log('Selected integration:', integration.name)

      // Call the server-side API endpoint to analyze the text
      const response = await $fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        },
        body: {
          integration: integration, // Send the full integration object
          text: textToAnalyze.value
        }
      })
      
      // Update the analysis result
      analysisResult.value = response.result
      console.log('the server responded with the following message:' , response)
    } catch (fetchErr) {
      console.error('AI analysis fetch error:', fetchErr)
      throw new Error(fetchErr.message || 'Failed to analyze text')
    }
    
    // The lastUsed field will be updated automatically by the server when an integration is used
  } catch (err) {
    console.error('AI analysis error:', err)
    error.value = err.message || 'Failed to analyze text'
  } finally {
    isAnalyzing.value = false
  }
}

// Entity management methods
function createEntity(type, entity) {
  console.log('Creating entity:', { type, entity })
  
  // Set the selected item details for editing in the form
  selectedItemDetails.value = {
    type,
    entity: JSON.parse(JSON.stringify(entity)) // Deep clone to avoid modifying original
  }
  
  // TODO: In a real implementation, this would create the entity in the appropriate store
  // For example:
  // if (type === 'person') {
  //   peopleStore.createPerson({
  //     firstName: entity.details.firstName,
  //     lastName: entity.details.lastName,
  //     ...
  //   })
  // }
}

function relateToExisting(type, entity) {
  console.log('Relating to existing:', { type, entity })
  
  // TODO: In a real implementation, this would open a dialog to select an existing entity
  // and then create a relationship between them
}

function ignoreEntity(type, index) {
  console.log('Ignoring entity:', { type, index })
  
  // Remove the entity from the analysis results
  if (type === 'person') {
    analysisResult.value.people.splice(index, 1)
  } else if (type === 'project') {
    analysisResult.value.projects.splice(index, 1)
  } else if (type === 'task') {
    analysisResult.value.tasks.splice(index, 1)
  } else if (type === 'behavior') {
    analysisResult.value.behaviors.splice(index, 1)
  } else if (type === 'meeting') {
    analysisResult.value.meetings.splice(index, 1)
  }
  
  // Clear selected item if it was this one
  if (selectedItemDetails.value.type === type && 
      selectedItemDetails.value.entity === analysisResult.value[type + 's'][index]) {
    selectedItemDetails.value = { type: null, entity: null }
  }
}

function close() {
  // Reset state and close the dialog
  dialogVisible.value = false
  textToAnalyze.value = ''
  analysisResult.value = null
  selectedItemDetails.value = { type: null, entity: null }
  error.value = ''
}

function newAnalysis() {
  // Reset state but keep the dialog open
  textToAnalyze.value = ''
  analysisResult.value = null
  selectedItemDetails.value = { type: null, entity: null }
  error.value = ''
}
</script>
