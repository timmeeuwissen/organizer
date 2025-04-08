<template lang="pug">
v-container(fluid)
  v-row
    v-col(cols="12")
      h1.text-h4.mb-4 {{ $t('meetings.title') }}
  
  v-row
    v-col(cols="12" md="3")
      v-card(class="mb-4")
        v-card-title {{ $t('common.filters') }}
        v-card-text
          v-select(
            v-model="categoryFilter"
            :items="categoryOptions"
            :label="$t('meetings.category')"
            clearable
            variant="outlined"
            density="comfortable"
          )
          
          v-select(
            v-model="projectFilter"
            :items="projectOptions"
            :label="$t('projects.title')"
            clearable
            variant="outlined"
            density="comfortable"
          )
          
          v-select(
            v-model="personFilter"
            :items="personOptions"
            :label="$t('people.title')"
            clearable
            variant="outlined"
            density="comfortable"
          )
          
          v-select(
            v-model="periodFilter"
            :items="periodOptions"
            :label="$t('common.period')"
            variant="outlined"
            density="comfortable"
          )
      
      v-card
        v-card-title {{ $t('common.statistics') }}
        v-card-text
          p {{ $t('meetings.totalCount') }}: {{ filteredMeetings.length }}
          
          template(v-if="meetingCategories.length > 0")
            h3.text-subtitle-1.mt-4 {{ $t('meetings.byCategory') }}
            v-progress-linear(
              v-for="category in meetingCategories"
              :key="category.id"
              :model-value="getCategoryPercentage(category.id)"
              :color="category.color"
              height="20"
              rounded
              class="mb-2"
            )
              template(v-slot:default="{ value }")
                span.white--text {{ category.name }}: {{ value.toFixed(0) }}%
    
    v-col(cols="12" md="9")
      v-row
        v-col(cols="12")
          v-card(class="mb-4")
            v-card-title.d-flex
              span {{ $t('meetings.upcomingMeetings') }}
              v-spacer
              v-btn(color="primary" :to="`/meetings/new`")
                v-icon(start) mdi-plus
                span {{ $t('meetings.newMeeting') }}
            
            v-card-text
              v-data-table-virtual(
                :headers="headers"
                :items="upcomingMeetings"
                :sort-by="[{ key: 'startTime', order: 'asc' }]"
              )
                template(v-slot:item.startTime="{ item }")
                  span {{ formatDateTime(item.startTime) }}
                
                template(v-slot:item.title="{ item }")
                  router-link(:to="`/meetings/${item.id}`") {{ item.title }}
                
                template(v-slot:item.category="{ item }")
                  v-chip(
                    v-if="getCategoryById(item.category)"
                    :color="getCategoryById(item.category)?.color"
                    text-color="white"
                    size="small"
                  ) {{ getCategoryById(item.category)?.name }}
                  span(v-else) -
                
                template(v-slot:item.participants="{ item }")
                  v-avatar.mr-1(
                    v-for="participantId in item.participants.slice(0, 3)"
                    :key="participantId"
                    size="28"
                    :color="getRandomColor(participantId)"
                  )
                    span {{ getPersonInitials(participantId) }}
                  span(v-if="item.participants.length > 3") +{{ item.participants.length - 3 }}
                
                template(v-slot:item.actions="{ item }")
                  v-btn(icon variant="text" :to="`/meetings/${item.id}`")
                    v-icon(size="small") mdi-eye
                  v-btn(icon variant="text" :to="`/meetings/${item.id}/edit`")
                    v-icon(size="small") mdi-pencil
      
      v-row
        v-col(cols="12")
          v-card
            v-card-title.d-flex
              span {{ $t('meetings.pastMeetings') }}
              v-spacer
              v-btn-toggle(v-model="viewMode" mandatory rounded="md")
                v-btn(value="list" :aria-label="$t('common.listView')")
                  v-icon mdi-format-list-bulleted
                v-btn(value="card" :aria-label="$t('common.cardView')")
                  v-icon mdi-view-grid
            
            v-divider
            
            v-card-text
              // List view
              template(v-if="viewMode === 'list'")
                v-data-table-virtual(
                  :headers="headers"
                  :items="pastMeetings"
                  :sort-by="[{ key: 'startTime', order: 'desc' }]"
                )
                  template(v-slot:item.startTime="{ item }")
                    span {{ formatDateTime(item.startTime) }}
                  
                  template(v-slot:item.title="{ item }")
                    router-link(:to="`/meetings/${item.id}`") {{ item.title }}
                  
                  template(v-slot:item.category="{ item }")
                    v-chip(
                      v-if="getCategoryById(item.category)"
                      :color="getCategoryById(item.category)?.color"
                      text-color="white"
                      size="small"
                    ) {{ getCategoryById(item.category)?.name }}
                    span(v-else) -
                  
                  template(v-slot:item.participants="{ item }")
                    v-avatar.mr-1(
                      v-for="participantId in item.participants.slice(0, 3)"
                      :key="participantId"
                      size="28"
                      :color="getRandomColor(participantId)"
                    )
                      span {{ getPersonInitials(participantId) }}
                    span(v-if="item.participants.length > 3") +{{ item.participants.length - 3 }}
                  
                  template(v-slot:item.actions="{ item }")
                    v-btn(icon variant="text" :to="`/meetings/${item.id}`")
                      v-icon(size="small") mdi-eye
                    v-btn(icon variant="text" :to="`/meetings/${item.id}/edit`")
                      v-icon(size="small") mdi-pencil
              
              // Card view
              template(v-else)
                v-row
                  v-col(
                    v-for="meeting in pastMeetings"
                    :key="meeting.id"
                    cols="12"
                    md="6"
                    lg="4"
                  )
                    v-card(
                      variant="outlined"
                      class="h-100"
                      :to="`/meetings/${meeting.id}`"
                    )
                      v-card-item
                        v-card-title {{ meeting.title }}
                        template(v-slot:prepend)
                          v-avatar(
                            :color="getCategoryById(meeting.category)?.color || 'grey'"
                            size="40"
                          )
                            v-icon(
                              :icon="getCategoryById(meeting.category)?.icon || 'mdi-calendar'"
                              color="white"
                            )
                        
                        template(v-slot:append)
                          v-chip(
                            v-if="getCategoryById(meeting.category)"
                            :color="getCategoryById(meeting.category)?.color"
                            text-color="white"
                            size="small"
                          ) {{ getCategoryById(meeting.category)?.name }}
                      
                      v-card-text
                        p.text-subtitle-1 {{ formatDateTime(meeting.startTime) }}
                        p.text-body-2.mb-2(v-if="meeting.description") {{ meeting.description }}
                        
                        template(v-if="meeting.participants && meeting.participants.length > 0")
                          p.text-caption {{ $t('meetings.participants') }}:
                          v-avatar.mr-1(
                            v-for="participantId in meeting.participants.slice(0, 5)"
                            :key="participantId"
                            size="32"
                            :color="getRandomColor(participantId)"
                          )
                            span {{ getPersonInitials(participantId) }}
                          span(v-if="meeting.participants.length > 5") +{{ meeting.participants.length - 5 }}
                        
                        template(v-if="meeting.summary")
                          p.text-caption.mt-2 {{ $t('meetings.summary') }}:
                          p.text-body-2.meeting-summary {{ meeting.summary }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMeetingsStore } from '~/stores/meetings'
import { usePeopleStore } from '~/stores/people'
import { useProjectsStore } from '~/stores/projects'
import type { Meeting } from '~/types/models'

// Define stores
const meetingsStore = useMeetingsStore()
const peopleStore = usePeopleStore()
const projectsStore = useProjectsStore()

// UI state
const loading = ref(true)
const viewMode = ref('list')
const categoryFilter = ref(null)
const projectFilter = ref(null)
const personFilter = ref(null)
const periodFilter = ref('all')

// Meeting categories
const meetingCategories = ref([
  { id: 'standup', name: 'Standup', color: '#4CAF50', icon: 'mdi-account-group' },
  { id: 'planning', name: 'Planning', color: '#2196F3', icon: 'mdi-chart-timeline' },
  { id: 'review', name: 'Review', color: '#FF9800', icon: 'mdi-eye-check' },
  { id: 'retrospective', name: 'Retrospective', color: '#9C27B0', icon: 'mdi-reflection' },
  { id: 'one_on_one', name: 'One-on-One', color: '#607D8B', icon: 'mdi-account-voice' },
  { id: 'client_meeting', name: 'Client Meeting', color: '#F44336', icon: 'mdi-account-tie' },
  { id: 'workshop', name: 'Workshop', color: '#009688', icon: 'mdi-school' },
  { id: 'interview', name: 'Interview', color: '#795548', icon: 'mdi-account-question' },
  { id: 'demo', name: 'Demo', color: '#3F51B5', icon: 'mdi-presentation' },
  { id: 'brainstorming', name: 'Brainstorming', color: '#FF5722', icon: 'mdi-lightbulb-group' },
])

// Table headers
const headers = [
  { title: 'Date & Time', key: 'startTime', sortable: true },
  { title: 'Title', key: 'title', sortable: true },
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Participants', key: 'participants', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false },
]

// Filter options
const categoryOptions = computed(() => {
  return meetingCategories.value.map(cat => ({
    title: cat.name,
    value: cat.id
  }))
})

const projectOptions = computed(() => {
  return projectsStore.projects.map(project => ({
    title: project.title,
    value: project.id
  }))
})

const personOptions = computed(() => {
  return peopleStore.people.map(person => ({
    title: `${person.firstName} ${person.lastName}`,
    value: person.id
  }))
})

const periodOptions = [
  { title: 'All time', value: 'all' },
  { title: 'Last week', value: 'week' },
  { title: 'Last month', value: 'month' },
  { title: 'Last 3 months', value: 'quarter' },
  { title: 'This year', value: 'year' },
]

// Filtered meetings
const filteredMeetings = computed(() => {
  let meetings = meetingsStore.meetings

  // Apply category filter
  if (categoryFilter.value) {
    meetings = meetings.filter(m => m.category === categoryFilter.value)
  }

  // Apply project filter
  if (projectFilter.value) {
    meetings = meetings.filter(m => 
      m.relatedProjects && m.relatedProjects.includes(projectFilter.value)
    )
  }

  // Apply person filter
  if (personFilter.value) {
    meetings = meetings.filter(m => 
      m.participants && m.participants.includes(personFilter.value)
    )
  }

  // Apply period filter
  if (periodFilter.value !== 'all') {
    const now = new Date()
    let cutoffDate: Date

    switch (periodFilter.value) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case 'quarter':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case 'year':
        cutoffDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        cutoffDate = new Date(0) // beginning of time
    }

    meetings = meetings.filter(m => new Date(m.startTime) >= cutoffDate)
  }

  return meetings
})

// Upcoming and past meetings
const upcomingMeetings = computed(() => {
  const now = new Date()
  return filteredMeetings.value
    .filter(meeting => new Date(meeting.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
})

const pastMeetings = computed(() => {
  const now = new Date()
  return filteredMeetings.value
    .filter(meeting => new Date(meeting.startTime) <= now)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
})

// Category statistics
const getCategoryPercentage = (categoryId: string) => {
  const totalMeetings = filteredMeetings.value.length
  if (totalMeetings === 0) return 0
  
  const categoryMeetings = filteredMeetings.value.filter(m => m.category === categoryId).length
  return (categoryMeetings / totalMeetings) * 100
}

// Utility functions
const formatDateTime = (dateTime: Date) => {
  if (!dateTime) return ''
  
  const date = new Date(dateTime)
  return date.toLocaleString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCategoryById = (categoryId: string) => {
  return meetingCategories.value.find(c => c.id === categoryId)
}

const getPersonInitials = (personId: string) => {
  const person = peopleStore.getById(personId)
  if (!person) return '??'
  
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`
}

const getRandomColor = (id: string) => {
  // Generate deterministic color based on ID
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}

// Load data
onMounted(async () => {
  try {
    await Promise.all([
      meetingsStore.fetchMeetings(),
      peopleStore.fetchPeople(),
      projectsStore.fetchProjects(),
    ])
    
    // Try to load categories from YAML (if available)
    try {
      const { loadMeetingCategories } = await import('~/data/yamlLoader')
      const categoriesData = loadMeetingCategories()
      if (categoriesData && categoriesData.categories) {
        meetingCategories.value = categoriesData.categories
      }
    } catch (error) {
      console.warn('Unable to load meeting categories from YAML:', error)
      // Keep using the default categories defined above
    }
  } catch (error) {
    console.error('Error loading meetings data:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.meeting-summary {
  max-height: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
</style>
