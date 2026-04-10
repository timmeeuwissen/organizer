<template lang="pug">
div.network-sidebar
  v-list(density="compact")

    //- Header + collapse
    v-list-item
      template(#title)
        span.text-subtitle-2 {{ $t('network.title') }}
      template(#append)
        v-btn(icon size="x-small" variant="text" @click="$emit('close')")
          v-icon mdi-chevron-left

    //- Sync action
    v-list-item
      v-btn(
        block
        variant="tonal"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="$emit('sync')"
      ) {{ $t('network.sync') }}

    //- Sync progress
    v-list-item(v-if="syncProgress")
      .text-caption.text-medium-emphasis.mb-1 {{ $t(syncProgress.phase) }}
      v-progress-linear(
        :model-value="syncProgress.percent"
        color="primary"
        height="6"
        rounded
        striped
      )
      .text-caption.text-right.mt-1.text-medium-emphasis {{ syncProgress.percent }}%

    v-divider.my-2

    //- Display options
    v-list-subheader {{ $t('network.sidebar.displayOptions') }}
    v-list-item(density="compact")
      template(#title)
        span {{ $t('network.sidebar.hideOrphans') }}
      template(#append)
        v-switch(
          :model-value="hideOrphans"
          density="compact"
          hide-details
          @update:model-value="$emit('update:hideOrphans', !!$event)"
        )

    v-divider.my-2

    //- Node Types
    v-list-subheader {{ $t('network.sidebar.nodeTypes') }}
    v-list-item(
      v-for="nodeType in nodeTypes"
      :key="nodeType.value"
      density="compact"
    )
      template(#prepend)
        .node-type-dot(:style="{ backgroundColor: NODE_COLORS[nodeType.value] }")
      template(#title)
        span {{ $t(`network.nodeType.${nodeType.value}`) }}
      template(#append)
        v-switch(
          :model-value="visibleTypes.includes(nodeType.value)"
          density="compact"
          hide-details
          @update:model-value="(val) => $emit('toggle-type', nodeType.value, !!val)"
        )

    v-divider.my-2

    //- Label depth slider
    v-list-subheader {{ $t('network.sidebar.labelDepth') }}
    v-list-item
      v-slider(
        :model-value="labelDepth"
        min="0"
        max="100"
        step="5"
        thumb-label
        hide-details
        @update:model-value="$emit('update:labelDepth', $event)"
      )
        template(#thumb-label="{ modelValue }")
          span {{ modelValue === 0 ? 'off' : modelValue === 100 ? '∞' : modelValue }}

    v-divider.my-2

    //- Graph depth slider
    v-list-subheader {{ $t('network.sidebar.depth') }}
    v-list-item
      v-slider(
        :model-value="depth"
        min="1"
        max="5"
        step="1"
        thumb-label
        hide-details
        @update:model-value="$emit('update:depth', $event)"
      )
        template(#thumb-label="{ modelValue }")
          span {{ modelValue === 5 ? '∞' : modelValue }}

    v-divider.my-2

    //- Pinned Nodes
    v-list-subheader {{ $t('network.sidebar.pinnedNodes') }}
    v-list-item
      template(v-if="pinnedNodes.length")
        v-chip-group(column)
          v-chip(
            v-for="node in pinnedNodes"
            :key="node.id"
            size="small"
            closable
            @click:close="$emit('unpin', node.id)"
          ) {{ node.label }}
      template(v-else)
        .text-caption.text-disabled {{ $t('network.sidebar.noPins') }}

    v-divider.my-2

    //- Shortest Path
    v-list-subheader {{ $t('network.sidebar.shortestPath') }}
    v-list-item
      .text-caption.text-medium-emphasis.mb-1 {{ $t('network.sidebar.pathFrom') }}
      .text-body-2.mb-2 {{ pathFrom?.label ?? '—' }}
      .text-caption.text-medium-emphasis.mb-1 {{ $t('network.sidebar.pathTo') }}
      v-autocomplete(
        :model-value="pathTo"
        :items="pathTargetOptions"
        :placeholder="$t('network.sidebar.pickNode')"
        item-title="label"
        item-value="id"
        density="compact"
        variant="outlined"
        clearable
        hide-details
        class="mb-2"
        @update:model-value="$emit('update:pathTo', $event)"
      )
      v-btn(
        block
        variant="tonal"
        :disabled="!pathFrom || !pathTo"
        @click="$emit('find-path')"
      ) {{ $t('network.sidebar.showPath') }}

    v-divider.my-2

    //- Time Range
    v-list-subheader {{ $t('network.sidebar.timeRange') }}
    v-list-item
      v-select(
        :model-value="timeRange"
        :items="timeRangeItems"
        density="compact"
        variant="outlined"
        hide-details
        @update:model-value="$emit('update:timeRange', $event)"
      )
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NodeType, GraphNode } from '~/types/models/network'
import { NODE_COLORS } from '~/config/network'

interface Props {
  visibleTypes: NodeType[]
  depth: number
  labelDepth: number
  pinnedNodes: GraphNode[]
  pathFrom: GraphNode | null
  pathTo: string | null
  allNodes: GraphNode[]
  timeRange: string
  hideOrphans: boolean
  loading?: boolean
  syncProgress?: { percent: number; phase: string } | null
}

const props = defineProps<Props>()

defineEmits<{
  'toggle-type': [type: NodeType, visible: boolean]
  'update:depth': [value: number]
  'update:labelDepth': [value: number]
  'unpin': [nodeId: string]
  'update:pathTo': [nodeId: string | null]
  'find-path': []
  'update:timeRange': [value: string]
  'update:hideOrphans': [value: boolean]
  'sync': []
  'close': []
}>()

const nodeTypes: { value: NodeType; icon: string }[] = [
  { value: 'person', icon: 'mdi-account' },
  { value: 'project', icon: 'mdi-folder-multiple' },
  { value: 'task', icon: 'mdi-checkbox-marked-outline' },
  { value: 'behavior', icon: 'mdi-account-cog' },
  { value: 'meeting', icon: 'mdi-account-group-outline' },
  { value: 'team', icon: 'mdi-account-multiple-outline' },
  { value: 'coaching', icon: 'mdi-account-heart' },
  { value: 'knowledge', icon: 'mdi-lightbulb-outline' }
]

const { t } = useI18n()

const timeRangeItems = computed(() => [
  { title: t('network.timeRange.all'), value: 'all' },
  { title: t('network.timeRange.30d'), value: '30d' },
  { title: t('network.timeRange.90d'), value: '90d' }
])

const pathTargetOptions = computed(() =>
  props.allNodes.filter(n => n.id !== props.pathFrom?.id)
)
</script>

<style lang="sass" scoped>
.network-sidebar
  width: 280px
  height: 100%
  overflow-y: auto
  flex-shrink: 0
  background: rgb(var(--v-theme-surface))
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))

.node-type-dot
  width: 12px
  height: 12px
  border-radius: 50%
  flex-shrink: 0
</style>
