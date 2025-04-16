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
import MeetingForm from '~/components/meetings/MeetingForm.vue'
import { useMeetingsStore } from '~/stores/meetings'
import { useMeetingCategoriesStore } from '~/stores/meetings/categories'

const route = useRoute()
const router = useRouter()
const meetingsStore = useMeetingsStore()
const categoriesStore = useMeetingCategoriesStore()

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
  if (!meeting.value) return null
  
  return {
    subject: meeting.value.title, // Form expects subject field
    summary: meeting.value.summary || '',
    category: meeting.value.category || '',
    plannedStatus: meeting.value.plannedStatus || 'held',
    date: meeting.value.startTime 
      ? new Date(meeting.value.startTime).toISOString().substr(0, 10) 
      : new Date().toISOString().substr(0, 10),
    time: meeting.value.startTime 
      ? new Date(meeting.value.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : '09:00',
    location: meeting.value.location || '',
    participants: [...(meeting.value.participants || [])],
    notes: meeting.value.notes || '',
    actionItems: meeting.value.actionItems || '',
    calendarEventId: meeting.value.calendarEventId || null,
  }
})

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = ''
  
  try {
    await meetingsStore.fetchMeeting(meetingId.value)
    await categoriesStore.fetchCategories()
  } catch (e: any) {
    error.value = e.message || 'Failed to load meeting'
    console.error('Error loading meeting:', e)
  } finally {
    loading.value = false
  }
}

// Handle form submission
const handleSubmit = async (formData: any) => {
  if (!meeting.value) return
  
  formLoading.value = true
  formError.value = ''
  
  try {
    // Prepare meeting data
    const updateData: any = { 
      ...formData,
      title: formData.subject // Map subject to title field
    }
    
    // Set startTime and endTime if this is not a "to be planned" meeting
    if (formData.date && formData.time && formData.plannedStatus !== 'to_be_planned') {
      updateData.startTime = new Date(`${formData.date}T${formData.time}`)
      // Default meeting duration is 1 hour
      updateData.endTime = new Date(updateData.startTime.getTime() + 60 * 60 * 1000)
    }
    
    await meetingsStore.updateMeeting(meetingId.value, updateData)
    
    // Redirect back to meeting view
    router.push(`/meetings/${meetingId.value}`)
  } catch (error: any) {
    formError.value = error.message || 'Error updating meeting'
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
