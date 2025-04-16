<template lang="pug">
v-form(
  ref="form"
  v-model="valid"
  @submit.prevent="submit"
)
  v-card
    v-card-title {{ isEdit ? $t('meetings.edit') : $t('meetings.add') }}
    
    v-card-text
      v-alert(
        v-if="error"
        type="error"
        class="mb-4"
      ) {{ error }}
      
      v-text-field(
        v-model="subject"
        :label="$t('meetings.subject')"
        :rules="[rules.required]"
        required
        prepend-icon="mdi-text-subject"
      )
      
      v-textarea(
        v-model="summary"
        :label="$t('meetings.summary')"
        rows="3"
        prepend-icon="mdi-text-box"
      )
      
      v-select(
        v-model="category"
        :items="meetingCategories"
        :label="$t('meetings.category')"
        item-title="name"
        item-value="id"
        prepend-icon="mdi-shape"
        :rules="[rules.required]"
        required
      )
      
      v-row
        v-col(cols="12" md="6")
          v-menu(
            v-model="dateMenu"
            :close-on-content-click="false"
          )
            template(v-slot:activator="{ props }")
              v-text-field(
                v-model="dateFormatted"
                :label="$t('meetings.date')"
                prepend-icon="mdi-calendar"
                readonly
                v-bind="props"
                :rules="[rules.required]"
                required
              )
            v-date-picker(
              v-model="date"
              @update:model-value="dateMenu = false"
            )
        
        v-col(cols="12" md="6")
          v-text-field(
            v-model="time"
            :label="$t('meetings.time')"
            type="time"
            prepend-icon="mdi-clock"
            :rules="[rules.required]"
            required
          )
      
      v-text-field(
        v-model="location"
        :label="$t('meetings.location')"
        prepend-icon="mdi-map-marker"
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
      
      v-textarea(
        v-model="notes"
        :label="$t('meetings.notes')"
        rows="3"
        prepend-icon="mdi-note-text"
      )
      
      v-textarea(
        v-model="actionItems"
        :label="$t('meetings.action')"
        rows="3"
        prepend-icon="mdi-checkbox-marked-outline"
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
import { useMeetingCategoriesStore } from '~/stores/meetings/categories'
import type { Meeting } from '~/types/models'

const props = defineProps({
  meeting: {
    type: Object as () => Meeting | null,
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
const categoriesStore = useMeetingCategoriesStore()

const form = ref(null)
const valid = ref(false)
const dateMenu = ref(false)

// Form fields
const subject = ref(props.meeting?.subject || '')
const summary = ref(props.meeting?.summary || '')
const category = ref(props.meeting?.category || '')
const date = ref(props.meeting?.date ? new Date(props.meeting.date).toISOString().substr(0, 10) : new Date().toISOString().substr(0, 10))
const time = ref(props.meeting?.time || '09:00')
const location = ref(props.meeting?.location || '')
const participants = ref(props.meeting?.participants || [])
const notes = ref(props.meeting?.notes || '')
const actionItems = ref(props.meeting?.actionItems || '')

// Meeting categories from store
const meetingCategories = computed(() => categoriesStore.categories)

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required'
}

// Computed values
const isEdit = computed(() => !!props.meeting)

const dateFormatted = computed(() => {
  if (!date.value) return ''
  return new Date(date.value).toLocaleDateString()
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
  
  const meetingData = {
    subject: subject.value,
    summary: summary.value,
    category: category.value,
    date: date.value ? new Date(date.value) : undefined,
    time: time.value,
    location: location.value,
    participants: participants.value,
    notes: notes.value,
    actionItems: actionItems.value
  }
  
  emit('submit', meetingData)
}

// When meeting changes, update form values
onMounted(async () => {
  // Load people and categories for selects
  const loadPromises = []
  
  if (peopleStore.people.length === 0) {
    loadPromises.push(peopleStore.fetchPeople())
  }
  
  if (categoriesStore.categories.length === 0) {
    loadPromises.push(categoriesStore.fetchCategories())
    
    // Seed default categories if none exist after fetching
    if (categoriesStore.categories.length === 0) {
      loadPromises.push(categoriesStore.seedDefaultCategories())
    }
  }
  
  if (loadPromises.length > 0) {
    await Promise.all(loadPromises)
  }
  
  if (props.meeting) {
    subject.value = props.meeting.subject
    summary.value = props.meeting.summary || ''
    category.value = props.meeting.category
    date.value = props.meeting.date 
      ? new Date(props.meeting.date).toISOString().substr(0, 10) 
      : new Date().toISOString().substr(0, 10)
    time.value = props.meeting.time
    location.value = props.meeting.location || ''
    participants.value = [...props.meeting.participants]
    notes.value = props.meeting.notes || ''
    actionItems.value = props.meeting.actionItems || ''
  }
})
</script>
