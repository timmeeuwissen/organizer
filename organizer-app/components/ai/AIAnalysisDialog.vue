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

      v-btn(
        v-if="analysisResult"
        icon
        @click="showRawOutput = !showRawOutput"
        :title="showRawOutput ? $t('ai.hideRawOutput') : $t('ai.viewRawOutput')"
      )
        v-icon {{ showRawOutput ? 'mdi-eye-off' : 'mdi-eye' }}

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

    // Raw output section
    v-card-text(v-if="!isAnalyzing && analysisResult && showRawOutput" class="pa-4")
      .d-flex.align-center.mb-3
        v-chip(size="small" class="mr-2")
          v-icon(start size="small") mdi-robot
          | {{ lastCallMetadata?.provider || selectedIntegration?.provider || 'AI' }}
        v-chip(v-if="lastCallMetadata?.durationMs" size="small" class="mr-2")
          v-icon(start size="small") mdi-timer
          | {{ lastCallMetadata.durationMs }}ms
      pre.json-viewer(v-html="highlightedJson")

    v-card-actions(v-if="!isAnalyzing && analysisResult && showRawOutput")
      v-btn(variant="text" color="primary" @click="newAnalysis") {{ $t('ai.newAnalysis') }}
      v-spacer
      v-btn(variant="text" @click="close") {{ $t('common.close') }}

    // Results section
    template(v-if="!isAnalyzing && analysisResult && !showRawOutput")
      v-card-text
        // Summary and original text section
        text-summary(
          :summary="analysisResult.summary"
          :original-text="textToAnalyze"
        )

        // Tabs for different entity types
        entity-tabs(
          v-model="activeTab"
          :tabs="entityTabs"
          :invalid-items="invalidItems"
        )
          // People tab
          template(#people)
            entity-list(
              :entities="analysisResult.people"
              entity-type="person"
              entity-color="primary"
              entity-icon="mdi-account"
              :available-items="availablePeople"
              :empty-message="$t('ai.noPeopleFound')"
              :entity-actions="entityActions"
              :entity-relations="entityRelations"
              :invalids="invalidItems.people || []"
              @update:actions="(actions) => updateActions('people', actions)"
              @update:relations="(relations) => updateRelations('people', relations)"
              @edit="setupEditState"
            )
              template(#details-form="{ entity, onChange }")
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

          // Projects tab
          template(#projects)
            entity-list(
              :entities="analysisResult.projects"
              entity-type="project"
              entity-color="teal"
              entity-icon="mdi-folder-multiple"
              :available-items="availableProjects"
              item-title-prop="title"
              :empty-message="$t('ai.noProjectsFound')"
              :entity-actions="entityActions"
              :entity-relations="entityRelations"
              :invalids="invalidItems.projects || []"
              @update:actions="(actions) => updateActions('projects', actions)"
              @update:relations="(relations) => updateRelations('projects', relations)"
              @edit="setupEditState"
            )
              template(#details-form="{ entity, onChange }")
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

          // Tasks tab
          template(#tasks)
            entity-list(
              :entities="analysisResult.tasks"
              entity-type="task"
              entity-color="primary"
              entity-icon="mdi-checkbox-marked-outline"
              :available-items="availableTasks"
              item-title-prop="title"
              :empty-message="$t('ai.noTasksFound')"
              :entity-actions="entityActions"
              :entity-relations="entityRelations"
              :invalids="invalidItems.tasks || []"
              @update:actions="(actions) => updateActions('tasks', actions)"
              @update:relations="(relations) => updateRelations('tasks', relations)"
              @edit="setupEditState"
            )
              template(#details-form="{ entity, onChange }")
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

          // Behaviors tab
          template(#behaviors)
            entity-list(
              :entities="analysisResult.behaviors"
              entity-type="behavior"
              entity-color="indigo"
              entity-icon="mdi-account-cog"
              :available-items="availableBehaviors"
              item-title-prop="title"
              :empty-message="$t('ai.noBehaviorsFound')"
              :entity-actions="entityActions"
              :entity-relations="entityRelations"
              :invalids="invalidItems.behaviors || []"
              @update:actions="(actions) => updateActions('behaviors', actions)"
              @update:relations="(relations) => updateRelations('behaviors', relations)"
              @edit="setupEditState"
            )
              template(#details-form="{ entity, onChange }")
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

          // Meetings tab
          template(#meetings)
            entity-list(
              :entities="analysisResult.meetings"
              entity-type="meeting"
              entity-color="deep-purple"
              entity-icon="mdi-account-group"
              :available-items="availableMeetings"
              item-title-prop="title"
              :empty-message="$t('ai.noMeetingsFound')"
              :entity-actions="entityActions"
              :entity-relations="entityRelations"
              :invalids="invalidItems.meetings || []"
              @update:actions="(actions) => updateActions('meetings', actions)"
              @update:relations="(relations) => updateRelations('meetings', relations)"
              @edit="setupEditState"
            )
              template(#details-form="{ entity, onChange }")
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

      v-card-actions
        template(v-if="!isAnalyzing && analysisResult")
          v-btn(variant="text" color="primary" @click="newAnalysis") {{ $t('ai.newAnalysis') }}
          v-spacer
          v-btn(
            color="primary"
            variant="tonal"
            @click="saveResults"
            :disabled="!canSaveResults"
          )
            v-icon(start) mdi-content-save
            | {{ $t('common.save') }}
          v-btn(variant="text" @click="close") {{ $t('common.close') }}
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import TextSummary from './analysis/TextSummary.vue'
import EntityTabs from './analysis/EntityTabs.vue'
import EntityList from './analysis/EntityList.vue'
import { useAuthStore } from '~/stores/auth'
import { getProvider } from '~/utils/api/aiProviders'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useTasksStore } from '~/stores/tasks'
import { useBehaviorsStore } from '~/stores/behaviors'
import { useMeetingsStore } from '~/stores/meetings'
import { useAIHistoryStore } from '~/stores/aiHistory'
import { useNotificationStore } from '~/stores/notification'

// Import our custom components

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// Single source of truth with parent — avoids props ↔ local ref watch ping-pong (recursive updates).
const dialogVisible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})
const form = ref(null)
const isAnalyzing = ref(false)
const error = ref('')
const textToAnalyze = ref('')
const analysisResult = ref(null)
const activeTab = ref('people')
const selectedItemDetails = ref({ type: null, entity: null })

// Entity management state
const entityActions = ref({}) // Maps entity ID to action type ('ignore', 'relate', 'add')
const entityRelations = ref({}) // Maps entity ID to selected relation object
const invalidItems = ref({
  people: [],
  projects: [],
  tasks: [],
  behaviors: [],
  meetings: []
})

const showRawOutput = ref(false)
const lastCallMetadata = ref(null)

// Validation rules
const rules = {
  required: v => !!v || 'This field is required'
}

// Stores
const authStore = useAuthStore()
const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()
const tasksStore = useTasksStore()
const behaviorsStore = useBehaviorsStore()
const meetingsStore = useMeetingsStore()
const aiHistoryStore = useAIHistoryStore()
const notify = useNotificationStore()
const i18n = useI18n()

// Available entities from stores for relation selection
const availablePeople = computed(() => peopleStore.people || [])
const availableProjects = computed(() => projectsStore.projects || [])
const availableTasks = computed(() => tasksStore.tasks || [])
const availableBehaviors = computed(() => behaviorsStore.behaviors || [])
const availableMeetings = computed(() => meetingsStore.meetings || [])

// Entity tabs configuration
const entityTabs = computed(() => {
  if (!analysisResult.value) { return [] }

  return [
    {
      value: 'people',
      label: i18n.t('people.title'),
      icon: 'mdi-account',
      count: analysisResult.value.people.length
    },
    {
      value: 'projects',
      label: i18n.t('projects.title'),
      icon: 'mdi-folder-multiple',
      count: analysisResult.value.projects.length
    },
    {
      value: 'tasks',
      label: i18n.t('tasks.title'),
      icon: 'mdi-checkbox-marked-outline',
      count: analysisResult.value.tasks.length
    },
    {
      value: 'behaviors',
      label: i18n.t('behaviors.title'),
      icon: 'mdi-account-cog',
      count: analysisResult.value.behaviors.length
    },
    {
      value: 'meetings',
      label: i18n.t('meetings.title'),
      icon: 'mdi-account-group',
      count: analysisResult.value.meetings.length
    }
  ]
})

// Check if we can save results - requires every entity to have an action selected
// and all required fields to be filled
const canSaveResults = computed(() => {
  if (!analysisResult.value) { return false }

  const allEntities = getAllEntities()

  // Every entity must have an action selected
  const allHaveActions = allEntities.every((_, entityIndex) => entityActions.value[entityIndex] !== undefined)

  // No validation errors
  const noValidationErrors = Object.values(invalidItems.value).every(arr => arr.length === 0)

  return allHaveActions && noValidationErrors
})

// JSON syntax highlighter for raw output view
const highlightedJson = computed(() => {
  if (!analysisResult.value) { return '' }
  const data = { metadata: lastCallMetadata.value, result: analysisResult.value }
  let json = JSON.stringify(data, null, 2)
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string'
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean'
      } else if (/null/.test(match)) {
        cls = 'json-null'
      }
      return `<span class="${cls}">${match}</span>`
    }
  )
})

// Helper to get all entities across all tabs
function getAllEntities () {
  if (!analysisResult.value) { return [] }

  return [
    ...(analysisResult.value.people || []),
    ...(analysisResult.value.projects || []),
    ...(analysisResult.value.tasks || []),
    ...(analysisResult.value.behaviors || []),
    ...(analysisResult.value.meetings || [])
  ]
}

// Computed
const user = computed(() => authStore.currentUser)

// Get all available AI integrations (enabled ones only)
const availableIntegrations = computed(() => {
  if (!user.value?.settings?.aiIntegrations) { return [] }

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

// Syncs with header integration picker; inner v-select uses provider id (when multiple integrations).
const selectedProvider = computed({
  get: () => selectedIntegration.value?.provider ?? null,
  set: (provider) => {
    if (!provider) {
      return
    }
    const found = availableIntegrations.value.find(i => i.provider === provider)
    if (found) {
      selectedIntegration.value = found
    }
  }
})

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
function getProviderIcon (provider) {
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

// When dialog opens, default to first integration (header + analyze use selectedIntegration).
watch(
  () => props.modelValue,
  (open) => {
    if (open && availableIntegrations.value.length > 0) {
      selectedIntegration.value = availableIntegrations.value[0]
    }
  },
  { immediate: true }
)

watch(() => entityActions.value, validateRelationships, { deep: true })
watch(() => entityRelations.value, validateRelationships, { deep: true })

// Methods
async function analyzeText () {
  console.log('user asks to analyze the text')
  if (!textToAnalyze.value) {
    console.error('nothing to analyze')
    return
  }

  isAnalyzing.value = true
  error.value = ''
  entityActions.value = {} // Reset entity actions
  entityRelations.value = {} // Reset entity relations

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
          Authorization: `Bearer ${authStore.token}`
        },
        body: {
          integration, // Send the full integration object
          text: textToAnalyze.value
        }
      })

      // Update the analysis result
      analysisResult.value = response.result
      lastCallMetadata.value = response.metadata || { provider: integration.provider, durationMs: 0 }
      showRawOutput.value = false

      // Initialize actions as 'ignore' for all entities
      if (analysisResult.value) {
        const allEntities = getAllEntities()
        allEntities.forEach((entity, index) => {
          entityActions.value[index] = 'ignore'
        })

        // Persist to history (fire-and-forget, don't block UI)
        aiHistoryStore.addEntry(textToAnalyze.value, analysisResult.value, lastCallMetadata.value)
      }
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

// Entity action and relation management
function updateActions (entityType, actions) {
  // Update actions for the specific entity type
  entityActions.value = { ...entityActions.value, ...actions }
  validateRelationships()
}

function updateRelations (entityType, relations) {
  // Update relations for the specific entity type
  entityRelations.value = { ...entityRelations.value, ...relations }
  validateRelationships()
}

// Setup edit state for an entity and mark it as edited
function setupEditState (entity) {
  // Deep clone to avoid modifying original
  selectedItemDetails.value = {
    type: getEntityType(entity),
    entity: JSON.parse(JSON.stringify(entity))
  }
}

// Validate all relationships to ensure required relations are set
function validateRelationships () {
  // Reset invalid items
  const newInvalidItems = {
    people: [],
    projects: [],
    tasks: [],
    behaviors: [],
    meetings: []
  }

  // Check each entity with 'relate' action
  const allEntities = getAllEntities()

  allEntities.forEach((entity, index) => {
    const action = entityActions.value[index]
    const type = getEntityType(entity)
    const pluralType = type === 'person' ? 'people' : `${type}s`

    // If action is relate, check that a relation is selected
    if (action === 'relate') {
      const relation = entityRelations.value[index]

      if (!relation) {
        // Add to invalid items for this type
        newInvalidItems[pluralType].push(index)
      }
    }
  })

  // Update the invalid items ref
  invalidItems.value = newInvalidItems
}

// Save all results
async function saveResults () {
  if (!canSaveResults.value) { return }

  const allEntities = getAllEntities()
  const promises = []

  allEntities.forEach((entity, index) => {
    const action = entityActions.value[index]
    const entityType = getEntityType(entity)

    if (action === 'add') {
      promises.push(createNewEntity(entityType, entity))
    } else if (action === 'relate') {
      promises.push(relateToEntity(entityType, entity, entityRelations.value[index]))
    }
  })

  try {
    await Promise.all(promises)
    notify.success(i18n.t('ai.saveResultsSuccess'))
    close()
  } catch (err) {
    error.value = err.message || i18n.t('errors.generic')
  }
}

// Helper to determine entity type
function getEntityType (entity) {
  // Check which array the entity is in
  if (!analysisResult.value) { return null }

  if (analysisResult.value.people && analysisResult.value.people.includes(entity)) {
    return 'person'
  } else if (analysisResult.value.projects && analysisResult.value.projects.includes(entity)) {
    return 'project'
  } else if (analysisResult.value.tasks && analysisResult.value.tasks.includes(entity)) {
    return 'task'
  } else if (analysisResult.value.behaviors && analysisResult.value.behaviors.includes(entity)) {
    return 'behavior'
  } else if (analysisResult.value.meetings && analysisResult.value.meetings.includes(entity)) {
    return 'meeting'
  }
  return null
}

// Create a new entity in the appropriate store
async function createNewEntity (type, entity) {
  if (type === 'person') {
    await peopleStore.createPerson(entity.details)
  } else if (type === 'project') {
    await projectsStore.createProject(entity.details)
  } else if (type === 'task') {
    await tasksStore.createTask(entity.details)
  } else if (type === 'behavior') {
    await behaviorsStore.createBehavior(entity.details)
  } else if (type === 'meeting') {
    await meetingsStore.createMeeting(entity.details)
  }
}

// Relate to an existing entity — confirms the AI-extracted entity maps to an existing record.
// The full mapping is captured in AI history. Future: enrich the existing record with extracted details.
async function relateToEntity (type, entity, relatedEntity) {
  const name = relatedEntity?.name || relatedEntity?.title || relatedEntity?.id || ''
  notify.info(i18n.t('ai.entityRelated', { name }))
}

function close () {
  emit('update:modelValue', false)
  textToAnalyze.value = ''
  analysisResult.value = null
  selectedItemDetails.value = { type: null, entity: null }
  entityActions.value = {}
  entityRelations.value = {}
  invalidItems.value = {
    people: [],
    projects: [],
    tasks: [],
    behaviors: [],
    meetings: []
  }
  error.value = ''
  showRawOutput.value = false
  lastCallMetadata.value = null
}

function newAnalysis () {
  textToAnalyze.value = ''
  analysisResult.value = null
  selectedItemDetails.value = { type: null, entity: null }
  entityActions.value = {}
  entityRelations.value = {}
  invalidItems.value = {
    people: [],
    projects: [],
    tasks: [],
    behaviors: [],
    meetings: []
  }
  error.value = ''
  showRawOutput.value = false
  lastCallMetadata.value = null
}
</script>

<style scoped>
.max-width-200 {
  max-width: 200px;
}

.json-viewer {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 16px;
  border-radius: 8px;
  overflow: auto;
  max-height: 520px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre;
  width: 100%;
}

:deep(.json-key) { color: #89b4fa; }
:deep(.json-string) { color: #a6e3a1; }
:deep(.json-number) { color: #fab387; }
:deep(.json-boolean) { color: #89dceb; }
:deep(.json-null) { color: #f38ba8; }
</style>
