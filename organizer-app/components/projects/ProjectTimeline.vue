<template lang="pug">
v-card(elevation="1" class="mt-4")
  v-card-text
    div(v-if="loading")
      v-skeleton-loader(type="list-item-avatar-two-line" v-for="i in 5" :key="i" class="mb-2")

    v-alert(
      v-else-if="events.length === 0"
      type="info"
      variant="tonal"
      class="mt-2"
    ) {{ $t('projects.noTimeline') }}

    v-timeline(
      v-else
      side="end"
      density="compact"
      truncate-line="both"
    )
      v-timeline-item(
        v-for="event in events"
        :key="event.id"
        :dot-color="getDotColor(event.action)"
        size="x-small"
      )
        template(v-slot:icon)
          v-icon(size="x-small" color="white") {{ getIcon(event) }}
        .d-flex.justify-space-between.align-start
          div
            .text-body-2.font-weight-medium {{ getTitle(event) }}
            .text-caption.text-medium-emphasis {{ event.entityTitle }}
            .mt-1(v-if="event.changes && event.changes.length > 0")
              v-chip(
                v-for="change in event.changes"
                :key="change.field"
                size="x-small"
                class="mr-1"
              ) {{ change.field }}: {{ change.from }} → {{ change.to }}
          .text-caption.text-medium-emphasis.ml-4.flex-shrink-0(
            :title="formatFullDate(event.timestamp)"
          ) {{ formatRelativeTime(event.timestamp) }}
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectsStore } from '~/stores/projects'
import type { AuditEvent } from '~/types/models'

const props = defineProps<{ projectId: string }>()
const { t } = useI18n()
const projectsStore = useProjectsStore()

const loading = ref(false)
const events = ref<AuditEvent[]>([])

const load = async (id: string) => {
  loading.value = true
  events.value = await projectsStore.fetchAuditEvents(id)
  loading.value = false
}

watch(() => props.projectId, (id) => { if (id) { void load(id) } }, { immediate: true })

const getDotColor = (action: AuditEvent['action']): string => {
  switch (action) {
    case 'created': case 'completed': case 'linked': return 'success'
    case 'deleted': case 'unlinked': return 'error'
    case 'updated': return 'warning'
    case 'uncompleted': return 'info'
    default: return 'grey'
  }
}

const getIcon = (event: AuditEvent): string => {
  if (event.action === 'completed') { return 'mdi-checkbox-marked' }
  if (event.action === 'uncompleted') { return 'mdi-checkbox-blank-outline' }
  if (event.action === 'deleted') { return 'mdi-delete' }
  if (event.action === 'linked') { return 'mdi-link' }
  if (event.action === 'unlinked') { return 'mdi-link-off' }
  if (event.action === 'updated' && event.entity === 'project') { return 'mdi-folder-cog' }
  switch (event.entity) {
    case 'task': return 'mdi-plus-circle'
    case 'note': return 'mdi-note-plus'
    case 'file': return 'mdi-file-plus'
    case 'meeting': return 'mdi-calendar-plus'
    default: return 'mdi-information'
  }
}

const getTitle = (event: AuditEvent): string => {
  const map: Record<string, string> = {
    'task-created': t('timeline.taskAdded'),
    'task-deleted': t('timeline.taskDeleted'),
    'task-completed': t('timeline.taskCompleted'),
    'task-uncompleted': t('timeline.taskUncompleted'),
    'note-created': t('timeline.noteAdded'),
    'note-deleted': t('timeline.noteDeleted'),
    'meeting-linked': t('timeline.meetingLinked'),
    'meeting-unlinked': t('timeline.meetingUnlinked'),
    'file-created': t('timeline.fileUploaded'),
    'file-deleted': t('timeline.fileDeleted'),
    'mail-unlinked': t('timeline.mailUnlinked'),
    'project-updated': t('timeline.projectUpdated')
  }
  return map[`${event.entity}-${event.action}`] || `${event.entity} ${event.action}`
}

const formatRelativeTime = (date: Date): string => {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) { return t('timeline.justNow') }
  if (minutes < 60) { return t('timeline.minutesAgo', { n: minutes }) }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) { return t('timeline.hoursAgo', { n: hours }) }
  const days = Math.floor(hours / 24)
  if (days < 7) { return t('timeline.daysAgo', { n: days }) }
  return formatFullDate(date)
}

const formatFullDate = (date: Date): string => new Date(date).toLocaleString()
</script>
