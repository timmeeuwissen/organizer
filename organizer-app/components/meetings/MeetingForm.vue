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

      v-radio-group(
        v-model="plannedStatus"
        row
        @change="handlePlannedStatusChange"
      )
        v-radio(
          :label="$t('meetings.plannedStatus.held')"
          value="held"
        )
        v-radio(
          :label="$t('meetings.plannedStatus.to_be_planned')"
          value="to_be_planned"
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
                :required="plannedStatus !== 'to_be_planned'"
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
            :required="plannedStatus !== 'to_be_planned'"
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

      v-select(
        v-model="relatedProjects"
        :items="availableProjects"
        :label="$t('meetings.relatedProjects')"
        item-title="title"
        item-value="id"
        prepend-icon="mdi-folder"
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
        v-if="plannedStatus === 'to_be_planned' && valid && !isEdit"
        color="secondary"
        :loading="loading"
        :disabled="!valid || loading"
        @click="planMeeting"
      )
        v-icon(start) mdi-calendar-plus
        span {{ $t('meetings.planThisMeeting') }}
      v-btn(
        color="primary"
        :loading="loading"
        :disabled="!valid || loading"
        @click="submit"
      ) {{ isEdit ? $t('common.update') : $t('common.save') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import { useMeetingCategoriesStore } from '~/stores/meetings/categories'
import { useCalendarStore } from '~/stores/calendar'
import { useUnsavedChanges } from '~/composables/useUnsavedChanges'
import type { Meeting } from '~/types/models'
import { meetingToMeetingFormInput, type MeetingFormInput } from '~/utils/meetingsForm'
import { requiredTrimmed } from '~/utils/validation'

const props = defineProps({
  meeting: {
    type: Object as () => Meeting | MeetingFormInput | null,
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

const emit = defineEmits(['submit', 'delete', 'plan'])

const { setNavigationDirty } = useUnsavedChanges()

const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()
const categoriesStore = useMeetingCategoriesStore()
const calendarStore = useCalendarStore()
const { t } = useI18n()

const form = ref<{ validate:() => Promise<{ valid: boolean }> } | null>(null)
const valid = ref(false)
const dateMenu = ref(false)

// Form fields
const initialForm = props.meeting
  ? ('title' in props.meeting ? meetingToMeetingFormInput(props.meeting as Meeting) : props.meeting)
  : null
const subject = ref(initialForm?.subject || '')
const summary = ref(initialForm?.summary || '')
const category = ref(initialForm?.category || '')
const plannedStatus = ref(initialForm?.plannedStatus || 'held')
const date = ref((initialForm?.date as string) || new Date().toISOString().slice(0, 10))
const time = ref(initialForm?.time || '09:00')
const location = ref(initialForm?.location || '')
const participants = ref(initialForm?.participants || [])
const notes = ref(initialForm?.notes || '')
const actionItems = ref(initialForm?.actionItems || '')
const calendarEventId = ref(initialForm?.calendarEventId || null)
const relatedProjects = ref<string[]>(
  initialForm?.relatedProjects ? [...initialForm.relatedProjects] : []
)

watch(
  [subject, summary, category, plannedStatus, date, time, location, participants, notes, actionItems, relatedProjects],
  () => { setNavigationDirty(true) },
  { deep: true }
)

// Meeting categories from store
const meetingCategories = computed(() => categoriesStore.categories)

const availableProjects = computed(() =>
  projectsStore.projects.map(p => ({ id: p.id, title: p.title }))
)

// Validation rules
const rules = {
  required: (v: string) => requiredTrimmed(v, t('validation.required'))
}

// Handle planned status change
const handlePlannedStatusChange = () => {
  if (plannedStatus.value === 'to_be_planned') {
    // Reset validation errors if any
    if (form.value) {
      form.value.validate()
    }
  }
}

// Computed values
const isEdit = computed(() => !!props.meeting)

const dateFormatted = computed(() => {
  if (!date.value) { return '' }
  return new Date(date.value).toLocaleDateString()
})

const availablePeople = computed(() => {
  return peopleStore.people.map(person => ({
    id: person.id,
    name: `${person.firstName} ${person.lastName}`
  }))
})

// Submit function
const submit = async () => {
  const result = await form.value?.validate()
  if (!result?.valid) { return }

  const meetingData = {
    subject: subject.value.trim(),
    summary: summary.value,
    category: category.value,
    plannedStatus: plannedStatus.value,
    date: date.value ? new Date(date.value) : undefined,
    time: time.value,
    location: location.value,
    participants: participants.value,
    notes: notes.value,
    actionItems: actionItems.value,
    calendarEventId: calendarEventId.value,
    relatedProjects: relatedProjects.value
  }

  setNavigationDirty(false)
  emit('submit', meetingData)
}

// Plan meeting - create meeting and open calendar event dialog
const planMeeting = async () => {
  const result = await form.value?.validate()
  if (!result?.valid) { return }

  const meetingData = {
    subject: subject.value.trim(),
    summary: summary.value,
    category: category.value,
    plannedStatus: plannedStatus.value,
    date: date.value ? new Date(date.value) : undefined,
    time: time.value,
    location: location.value,
    participants: participants.value,
    notes: notes.value,
    actionItems: actionItems.value,
    relatedProjects: relatedProjects.value
  }

  emit('plan', meetingData)
}

// When meeting changes, update form values
onMounted(async () => {
  // Load people and categories for selects
  const loadPromises = []

  if (peopleStore.people.length === 0) {
    loadPromises.push(peopleStore.fetchPeople())
  }

  if (projectsStore.projects.length === 0) {
    loadPromises.push(projectsStore.fetchProjects())
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
    const mapped = 'title' in props.meeting
      ? meetingToMeetingFormInput(props.meeting as Meeting)
      : props.meeting
    subject.value = mapped.subject
    summary.value = mapped.summary || ''
    category.value = mapped.category || ''
    plannedStatus.value = mapped.plannedStatus || 'held'
    date.value = (mapped.date as string) || new Date().toISOString().slice(0, 10)
    time.value = mapped.time || '09:00'
    location.value = mapped.location || ''
    participants.value = [...(mapped.participants || [])]
    notes.value = mapped.notes || ''
    actionItems.value = mapped.actionItems || ''
    calendarEventId.value = mapped.calendarEventId || null
    relatedProjects.value = [...(mapped.relatedProjects || [])]
  }
})
</script>
