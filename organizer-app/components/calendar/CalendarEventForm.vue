<template lang="pug">
v-form(
  ref="form"
  v-model="valid"
  @submit.prevent="submit"
)
  v-card
    v-card-title {{ isEdit ? $t('calendar.edit') : $t('calendar.event') }}
    
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
        :label="$t('calendar.title')"
        :rules="[rules.required]"
        required
        prepend-icon="mdi-text"
      )
      
      v-textarea(
        v-model="description"
        :label="$t('calendar.description')"
        rows="3"
        prepend-icon="mdi-text-box"
      )
      
      v-checkbox(
        v-model="allDay"
        :label="$t('calendar.allDay')"
      )
      
      v-row
        v-col(cols="12" md="6")
          v-menu(
            v-model="startDateMenu"
            :close-on-content-click="false"
          )
            template(v-slot:activator="{ props }")
              v-text-field(
                v-model="startDateFormatted"
                :label="$t('calendar.startTime')"
                prepend-icon="mdi-calendar-start"
                readonly
                v-bind="props"
                :rules="[rules.required]"
                required
              )
            v-date-picker(
              v-model="startDate"
              @update:model-value="startDateMenu = false"
            )
        
        v-col(cols="12" md="6" v-if="!allDay")
          v-text-field(
            v-model="startTime"
            :label="$t('calendar.time')"
            type="time"
            prepend-icon="mdi-clock-outline"
            :rules="[rules.required]"
            required
          )
      
      v-row
        v-col(cols="12" md="6")
          v-menu(
            v-model="endDateMenu"
            :close-on-content-click="false"
          )
            template(v-slot:activator="{ props }")
              v-text-field(
                v-model="endDateFormatted"
                :label="$t('calendar.endTime')"
                prepend-icon="mdi-calendar-end"
                readonly
                v-bind="props"
                :rules="[rules.required]"
                required
              )
            v-date-picker(
              v-model="endDate"
              @update:model-value="endDateMenu = false"
            )
        
        v-col(cols="12" md="6" v-if="!allDay")
          v-text-field(
            v-model="endTime"
            :label="$t('calendar.time')"
            type="time"
            prepend-icon="mdi-clock-outline"
            :rules="[rules.required]"
            required
          )
      
      v-text-field(
        v-model="location"
        :label="$t('meetings.location')"
        prepend-icon="mdi-map-marker"
      )
      
      v-checkbox(
        v-model="recurring"
        :label="$t('calendar.recurring')"
      )
      
      template(v-if="recurring")
        v-select(
          v-model="recurrenceType"
          :items="recurrenceTypeOptions"
          :label="$t('calendar.recurrenceType')"
          item-title="text"
          item-value="value"
          prepend-icon="mdi-repeat"
        )
        
        v-text-field(
          v-model="recurrenceEnd"
          :label="$t('calendar.recurrenceEnd')"
          type="date"
          prepend-icon="mdi-calendar-end"
        )
      
      v-select(
        v-model="participants"
        :items="availablePeople"
        :label="$t('meetings.participants')"
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
import { useIntegrationProviders } from '~/composables/useIntegrationProviders'

const props = defineProps({
  event: {
    type: Object,
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

const form = ref(null)
const valid = ref(false)
const startDateMenu = ref(false)
const endDateMenu = ref(false)

// Form fields
const storageProvider = ref(props.event?.storageProvider || 'organizer') // Default to storing in Organizer
const title = ref(props.event?.title || '')
const description = ref(props.event?.description || '')
const allDay = ref(props.event?.allDay || false)
const startDate = ref(props.event?.start ? new Date(props.event.start).toISOString().substr(0, 10) : new Date().toISOString().substr(0, 10))
const startTime = ref(props.event?.start && !props.event.allDay ? 
  new Date(props.event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
  '09:00')
const endDate = ref(props.event?.end ? new Date(props.event.end).toISOString().substr(0, 10) : new Date().toISOString().substr(0, 10))
const endTime = ref(props.event?.end && !props.event.allDay ? 
  new Date(props.event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 
  '10:00')
const location = ref(props.event?.location || '')
const recurring = ref(props.event?.recurring || false)
const recurrenceType = ref(props.event?.recurrenceType || 'daily')
const recurrenceEnd = ref(props.event?.recurrenceEnd || '')
const participants = ref(props.event?.participants || [])

// Get available storage providers
const { calendarProviders } = useIntegrationProviders()
const availableProviders = computed(() => calendarProviders.value)

// Recurrence options
const recurrenceTypeOptions = [
  { text: 'Daily', value: 'daily' },
  { text: 'Weekly', value: 'weekly' },
  { text: 'Monthly', value: 'monthly' },
  { text: 'Yearly', value: 'yearly' }
]

// Validation rules
const rules = {
  required: (v) => !!v || 'This field is required'
}

// Computed values
const isEdit = computed(() => !!props.event)

const startDateFormatted = computed(() => {
  if (!startDate.value) return ''
  return new Date(startDate.value).toLocaleDateString()
})

const endDateFormatted = computed(() => {
  if (!endDate.value) return ''
  return new Date(endDate.value).toLocaleDateString()
})

const availablePeople = computed(() => {
  return peopleStore.people.map(person => ({
    id: person.id,
    name: `${person.firstName} ${person.lastName}`
  }))
})

// Submit function
const submit = () => {
  if (!valid.value) return
  
  // Combine date and time
  let start, end
  
  if (allDay.value) {
    start = new Date(startDate.value)
    end = new Date(endDate.value)
  } else {
    const [startHours, startMinutes] = startTime.value.split(':').map(Number)
    const [endHours, endMinutes] = endTime.value.split(':').map(Number)
    
    start = new Date(startDate.value)
    start.setHours(startHours, startMinutes, 0)
    
    end = new Date(endDate.value)
    end.setHours(endHours, endMinutes, 0)
  }
  
  const eventData = {
    storageProvider: storageProvider.value,
    title: title.value,
    description: description.value,
    allDay: allDay.value,
    start,
    end,
    location: location.value,
    recurring: recurring.value,
    recurrenceType: recurring.value ? recurrenceType.value : undefined,
    recurrenceEnd: recurring.value && recurrenceEnd.value ? new Date(recurrenceEnd.value) : undefined,
    participants: participants.value
  }
  
  emit('submit', eventData)
}

// Load data
onMounted(async () => {
  // Load people for participants select
  if (peopleStore.people.length === 0) {
    await peopleStore.fetchPeople()
  }
})
</script>
