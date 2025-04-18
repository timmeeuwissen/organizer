<template lang="pug">
v-card(
  :color="project.color || getStatusColor(project.status)"
  class="mb-4 project-card"
  @click="$emit('navigate', project)"
  elevation="3"
)
  // Edit button overlay
  v-btn.edit-button(
    icon
    variant="tonal"
    size="small"
    @click.stop="$emit('edit', project)"
  )
    v-icon mdi-pencil
  v-card-item
    v-card-title.d-flex.align-center
      v-icon(:color="isLightColor(project.color) ? 'black' : 'white'" size="large" class="mr-2") {{ project.icon || 'mdi-folder-outline' }}
      span {{ project.title }}
    v-card-subtitle
      template(v-if="project.dueDate")
        v-icon(size="small" class="mr-1") mdi-calendar
        | {{ formatDate(project.dueDate) }}
  v-card-text
    div.mb-2(v-if="project.description" class="text-truncate") {{ project.description }}
    
    // Progress bar
    v-progress-linear(
      :model-value="project.progress" 
      height="20" 
      color="white"
      bg-color="rgba(255, 255, 255, 0.2)"
      rounded
      class="mb-2"
    )
      template(v-slot:default="{ value }")
        strong.text-white {{ Math.round(value) }}%
    
    div.d-flex.mt-3(v-if="project.tags.length > 0")
      v-chip(
        v-for="tag in project.tags.slice(0, 3)" 
        :key="tag"
        size="x-small"
        color="white"
        text-color="black"
        class="mr-1"
      ) {{ tag }}
      v-chip(
        v-if="project.tags.length > 3"
        size="x-small"
        color="white"
        text-color="black"
      ) +{{ project.tags.length - 3 }}
  
  v-card-actions
    v-avatar.ml-2(
      v-for="(memberId, index) in project.members.slice(0, 3)" 
      :key="memberId"
      :color="getAvatarColor(index)"
      size="30"
    ) {{ getPersonInitials(memberId) }}
    v-avatar(
      v-if="project.members.length > 3"
      color="grey"
      size="30"
    ) +{{ project.members.length - 3 }}
    v-spacer
    v-chip(
      :color="getStatusColorLight(project.status)"
      size="small"
    ) 
      v-icon(size="small" start) {{ getStatusIcon(project.status) }}
      | {{ getStatusText(project.status) }}
</template>

<script setup lang="ts">
import { usePeopleStore } from '~/stores/people'
import type { Project } from '~/types/models'

// Props
const props = defineProps({
  project: {
    type: Object as () => Project,
    required: true
  }
})

// Emits
const emit = defineEmits(['navigate', 'edit'])

// Stores
const peopleStore = usePeopleStore()

// Helper functions
const formatDate = (date: Date | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const getPersonInitials = (id: string) => {
  const person = peopleStore.getById(id)
  if (!person) return '?'
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`
}

const getAvatarColor = (index: number) => {
  const colors = ['primary', 'secondary', 'info', 'success', 'warning']
  return colors[index % colors.length]
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'planning': return 'info'
    case 'active': return 'success'
    case 'onHold': return 'warning'
    case 'completed': return 'primary'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

const getStatusColorLight = (status: string) => {
  switch (status) {
    case 'planning': return 'info-lighten-3'
    case 'active': return 'success-lighten-3'
    case 'onHold': return 'warning-lighten-3'
    case 'completed': return 'primary-lighten-3'
    case 'cancelled': return 'error-lighten-3'
    default: return 'grey-lighten-3'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'planning': return 'Planning'
    case 'active': return 'Active'
    case 'onHold': return 'On Hold'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'planning': return 'mdi-pencil'
    case 'active': return 'mdi-play'
    case 'onHold': return 'mdi-pause'
    case 'completed': return 'mdi-check'
    case 'cancelled': return 'mdi-close'
    default: return 'mdi-help'
  }
}

// Helper to determine if a color is light (for text contrast)
const isLightColor = (colorValue: string) => {
  if (!colorValue) return false;
  
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
  
  return lightColors.some(c => colorValue.includes(c));
}
</script>

<style scoped>
.project-card {
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.edit-button {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0.7;
  z-index: 1;
  background-color: rgba(255, 255, 255, 0.15);
}

.edit-button:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.3);
}

/* Use flexbox to push card actions to the bottom */
.v-card-text {
  flex: 1;
}
</style>
