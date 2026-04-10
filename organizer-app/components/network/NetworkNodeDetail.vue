<template lang="pug">
v-card(
  v-if="node"
  flat
  color="transparent"
)
  v-card-title
    .d-flex.align-center.ga-2
      span.node-type-dot(:style="{ backgroundColor: nodeColor }")
      span {{ node.label }}
      v-spacer
      v-chip(
        v-if="isPinned"
        color="warning"
        prepend-icon="mdi-pin"
        size="x-small"
      ) {{ $t('network.pinned') }}

  v-card-subtitle {{ $t(`network.nodeType.${node.type}`) }}

  v-card-actions
    v-btn(
      v-if="entityRoute"
      variant="tonal"
      size="small"
      prepend-icon="mdi-open-in-new"
      :to="entityRoute"
    ) {{ $t('network.openRecord') }}
    v-btn(
      variant="tonal"
      size="small"
      :prepend-icon="isPinned ? 'mdi-pin' : 'mdi-pin-outline'"
      @click="emit('toggle-pin', node.id)"
    ) {{ $t(isPinned ? 'network.unpin' : 'network.pin') }}

  v-divider

  //- Direct connections
  v-card-text(v-if="connections.length > 0")
    .text-overline.mb-1 {{ $t('network.connections') }} ({{ connections.length }})
    v-list(density="compact" nav)
      v-list-item(
        v-for="c in connections"
        :key="c.node.id"
        rounded="lg"
        class="px-2"
        @click="emit('select-node', c.node)"
      )
        template(#prepend)
          .node-type-dot.mr-2(:style="{ backgroundColor: NODE_COLORS[c.node.type] ?? '#888' }")
        template(#title)
          span {{ c.node.label }}
        template(#subtitle)
          span.text-caption
            span.text-medium-emphasis {{ $t(`network.nodeType.${c.node.type}`) }}
            span.mx-1 ·
            span.text-primary {{ c.edgeLabel ?? c.edgeType }}

  v-divider(v-if="connections.length > 0")

  v-card-text(v-if="knowledge.length > 0")
    .text-overline.mb-2 {{ $t('network.knowledge') }} ({{ knowledge.length }})
    v-list(density="compact")
      v-list-item(
        v-for="k in knowledge"
        :key="k.id"
      )
        template(#prepend)
          v-icon(size="small" color="secondary") mdi-lightbulb-outline
        v-list-item-title
          .text-caption.text-wrap {{ k.content }}
        v-list-item-subtitle
          v-chip(
            :color="certaintyColor(k.certainty)"
            size="x-small"
          ) {{ Math.round(k.certainty * 100) }}%
          span.text-caption  {{ k.subtype }} · {{ formatDate(k.certaintyDate) }}
    v-btn(
      block
      variant="text"
      size="small"
      prepend-icon="mdi-plus"
      @click="node && emit('add-knowledge', node)"
    ) {{ $t('network.addKnowledge') }}

  v-card-text(v-else)
    v-btn(
      block
      variant="text"
      size="small"
      prepend-icon="mdi-plus"
      @click="node && emit('add-knowledge', node)"
    ) {{ $t('network.addKnowledge') }}
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GraphNode, KnowledgeNode } from '~/types/models/network'
import { NODE_COLORS } from '~/config/network'

const { locale } = useI18n()

const props = defineProps<{
  node: GraphNode | null
  knowledge: KnowledgeNode[]
  connections: Array<{ node: GraphNode; edgeType: string; edgeLabel?: string }>
  isPinned: boolean
}>()

const emit = defineEmits<{
  'toggle-pin': [nodeId: string]
  'add-knowledge': [node: GraphNode]
  'select-node': [node: GraphNode]
}>()

const entityRoutes: Record<string, string> = {
  person: '/people',
  project: '/projects',
  task: '/tasks',
  behavior: '/behaviors',
  meeting: '/meetings',
  team: '/teams',
  coaching: '/coaching'
}

const entityRoute = computed(() => {
  if (!props.node?.entityId) { return null }
  const base = entityRoutes[props.node.type]
  return base ? `${base}/${props.node.entityId}` : null
})

const nodeColor = computed(() =>
  props.node ? NODE_COLORS[props.node.type] : ''
)

const nodeIcons: Record<string, string> = {
  person: 'mdi-account',
  project: 'mdi-folder-multiple',
  task: 'mdi-checkbox-marked-outline',
  behavior: 'mdi-account-cog',
  meeting: 'mdi-account-group-outline',
  team: 'mdi-account-multiple-outline',
  coaching: 'mdi-account-heart',
  knowledge: 'mdi-lightbulb-outline'
}

const nodeIcon = computed(() =>
  props.node ? nodeIcons[props.node.type] ?? 'mdi-circle' : ''
)

function certaintyColor (certainty: number): string {
  if (certainty >= 0.8) { return 'success' }
  if (certainty >= 0.6) { return 'warning' }
  return 'error'
}

function formatDate (date: Date): string {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(date))
}
</script>

<style lang="sass" scoped>
.node-type-dot
  display: inline-block
  width: 12px
  height: 12px
  border-radius: 50%
  flex-shrink: 0
</style>
