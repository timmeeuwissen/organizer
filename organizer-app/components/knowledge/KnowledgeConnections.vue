<template lang="pug">
div
  .d-flex.align-center.mb-3
    .text-subtitle-1 {{ $t('knowledge.title') }}
    v-spacer
    v-btn(
      color="primary"
      variant="tonal"
      size="small"
      prepend-icon="mdi-plus"
      @click="openAdd"
    ) {{ $t('knowledge.addKnowledge') }}

  v-alert(
    v-if="connections.length === 0"
    type="info"
    variant="tonal"
    density="compact"
    class="mb-3"
  ) {{ $t('knowledge.emptyState') }}

  v-list(v-else density="compact")
    v-list-item(
      v-for="row in connections"
      :key="row.edge.id"
      rounded="lg"
      class="mb-2 border"
    )
      template(#prepend)
        v-icon(color="amber" size="small") mdi-lightbulb-outline

      template(#title)
        .text-body-2.text-wrap {{ row.knowledge.content }}

      template(#subtitle)
        .d-flex.flex-wrap.align-center.gap-1.mt-1
          v-chip(
            size="x-small"
            color="secondary"
            variant="tonal"
          ) {{ $t(`knowledge.subtypes.${row.knowledge.subtype}`) }}
          v-chip(
            size="x-small"
            :color="certaintyColor(row.knowledge.certainty)"
            variant="tonal"
          ) {{ Math.round(row.knowledge.certainty * 100) }}%
          v-chip(
            size="x-small"
            color="primary"
            variant="outlined"
          ) {{ row.edge.label || row.edge.relationType }}
          template(v-if="row.otherConnections.length > 0")
            span.text-caption.text-medium-emphasis.ml-1 {{ $t('knowledge.otherConnections') }}:
            v-chip(
              v-for="other in row.otherConnections"
              :key="other.edgeId"
              size="x-small"
              variant="text"
              color="primary"
              :to="entityRoute(other.entityType, other.entityId)"
            ) {{ $t(`network.nodeType.${other.entityType}`) }} #{{ other.entityId.slice(0, 6) }}

      template(#append)
        v-menu
          template(#activator="{ props }")
            v-btn(icon variant="text" size="small" v-bind="props")
              v-icon(size="small") mdi-dots-vertical
          v-list(density="compact")
            v-list-item(prepend-icon="mdi-pencil" @click="openEdit(row)") {{ $t('knowledge.editKnowledge') }}
            v-list-item(prepend-icon="mdi-link-variant-off" @click="handleDisconnect(row.edge.id)") {{ $t('knowledge.disconnect') }}
            v-list-item(prepend-icon="mdi-delete" base-color="error" @click="handleDelete(row)") {{ $t('knowledge.deleteKnowledge') }}

  KnowledgeNodeForm(
    v-model="formOpen"
    :knowledge="editingRow?.knowledge ?? null"
    :edge="editingRow?.edge ?? null"
    :locked-entity="lockedEntity"
    @submit="handleFormSubmit"
    @cancel="formOpen = false"
  )
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '~/stores/notification'
import { useKnowledgeConnections, type KnowledgeConnectionRow } from '~/composables/useKnowledgeConnections'
import type { NodeType, EdgeType } from '~/types/models/network'

const { t } = useI18n()

const props = defineProps<{
  nodeType: NodeType
  entityId: string
}>()

const { connections, addKnowledge, editKnowledge, editRelation, disconnect, removeKnowledge } =
  useKnowledgeConnections(props.nodeType, computed(() => props.entityId))

const lockedEntity = computed(() => ({ nodeType: props.nodeType, entityId: props.entityId }))

const formOpen = ref(false)
const editingRow = ref<KnowledgeConnectionRow | null>(null)

const entityRoutes: Record<string, string> = {
  person: '/people', project: '/projects', task: '/tasks',
  behavior: '/behaviors', meeting: '/meetings', team: '/teams', coaching: '/coaching',
}

function entityRoute(entityType: NodeType, entityId: string) {
  return `${entityRoutes[entityType] ?? '/'}/${entityId}`
}

function certaintyColor(certainty: number) {
  if (certainty >= 0.8) return 'success'
  if (certainty >= 0.6) return 'warning'
  return 'error'
}

function openAdd() {
  editingRow.value = null
  formOpen.value = true
}

function openEdit(row: KnowledgeConnectionRow) {
  editingRow.value = row
  formOpen.value = true
}

async function handleFormSubmit(data: {
  content: string
  subtype: any
  certainty: number
  certaintyDate: Date
  tags: string[]
  relationType: EdgeType
  relationLabel?: string
  entityType?: NodeType
  entityId?: string
}) {
  const notify = useNotificationStore()
  try {
    if (editingRow.value) {
      await editKnowledge(editingRow.value.knowledge.id, {
        content: data.content,
        subtype: data.subtype,
        certainty: data.certainty,
        certaintyDate: data.certaintyDate,
        tags: data.tags,
      })
      await editRelation(editingRow.value.edge.id, data.relationType, data.relationLabel)
    } else {
      await addKnowledge(
        { content: data.content, subtype: data.subtype, source: 'manual', certainty: data.certainty, certaintyDate: data.certaintyDate, tags: data.tags, label: data.content.slice(0, 60) },
        data.relationType,
        data.relationLabel
      )
      // Also connect to optional extra entity
      if (data.entityType && data.entityId) {
        const { useKnowledgeStore } = await import('~/stores/knowledge')
        const kStore = useKnowledgeStore()
        const lastNode = kStore.nodes[kStore.nodes.length - 1]
        if (lastNode) {
          await kStore.connect(lastNode.id, data.entityType, data.entityId, data.relationType, data.relationLabel)
        }
      }
    }
    formOpen.value = false
  } catch {
    notify.error('knowledge.saveError')
  }
}

async function handleDisconnect(edgeId: string) {
  const notify = useNotificationStore()
  try {
    await disconnect(edgeId)
  } catch {
    notify.error('knowledge.deleteError')
  }
}

async function handleDelete(row: KnowledgeConnectionRow) {
  const notify = useNotificationStore()
  const otherCount = row.otherConnections.length
  const msg = otherCount > 0
    ? t('knowledge.confirmDeleteWithConnections', { n: otherCount })
    : t('knowledge.confirmDelete')
  if (!confirm(msg)) return
  try {
    await removeKnowledge(row.knowledge.id)
  } catch {
    notify.error('knowledge.deleteError')
  }
}
</script>

<style lang="sass" scoped>
.border
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))
</style>
