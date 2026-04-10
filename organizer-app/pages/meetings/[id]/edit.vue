<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      v-card
        v-card-title.d-flex.align-center
          v-btn(icon variant="text" :to="`/meetings/${meetingId}`")
            v-icon mdi-arrow-left
          span.ml-2 {{ $t('meetings.edit') }}

        v-card-text(v-if="loading")
          v-progress-circular(indeterminate)

        v-card-text(v-else-if="error")
          v-alert(type="error") {{ error }}

        v-card-text(v-else)
          MeetingForm(
            :meeting="meetingFormData"
            :loading="formLoading"
            :error="formError"
            @submit="handleSubmit"
            :is-edit="true"
          )
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MeetingForm from '~/components/meetings/MeetingForm.vue'
import { useMeetingsStore } from '~/stores/meetings'
import { useMeetingCategoriesStore } from '~/stores/meetings/categories'
import { meetingFormToMeetingPayload, meetingToMeetingFormInput } from '~/utils/meetingsForm'

const route = useRoute()
const router = useRouter()
const meetingsStore = useMeetingsStore()
const categoriesStore = useMeetingCategoriesStore()
const { t } = useI18n()

// UI state
const loading = ref(true)
const error = ref('')
const formLoading = ref(false)
const formError = ref('')

// Get meeting ID from route
const meetingId = computed(() => route.params.id as string)

// Current meeting
const meeting = computed(() => meetingsStore.currentMeeting)

// Transform meeting to form data
const meetingFormData = computed(() => {
  if (!meeting.value) { return null }

  return meetingToMeetingFormInput(meeting.value)
})

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = ''

  try {
    await meetingsStore.fetchMeeting(meetingId.value)
    await categoriesStore.fetchCategories()
  } catch (e: any) {
    error.value = e.message || t('errors.generic')
    console.error('Error loading meeting:', e)
  } finally {
    loading.value = false
  }
}

// Handle form submission
const handleSubmit = async (formData: any) => {
  if (!meeting.value) { return }

  formLoading.value = true
  formError.value = ''

  try {
    const updateData = meetingFormToMeetingPayload(formData)

    await meetingsStore.updateMeeting(meetingId.value, updateData)

    // Redirect back to meeting view
    router.push(`/meetings/${meetingId.value}`)
  } catch (error: any) {
    formError.value = error.message || t('errors.generic')
    console.error('Error updating meeting:', error)
  } finally {
    formLoading.value = false
  }
}

// Watch for route changes
watch(() => route.params.id, () => {
  fetchData()
})

// Load data on mount
onMounted(fetchData)
</script>
