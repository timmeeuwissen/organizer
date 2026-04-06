<template lang="pug">
v-navigation-drawer(permanent, width="280")
  v-list(density="compact")

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
          @update:model-value="$emit('toggle-type', nodeType.value)"
        )

    v-divider.my-2

    //- Depth Slider
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
  pinnedNodes: GraphNode[]
  pathFrom: GraphNode | null
  pathTo: string | null
  allNodes: GraphNode[]
  timeRange: string
}

const props = defineProps<Props>()

defineEmits<{
  'toggle-type': [type: NodeType]
  'update:depth': [value: number]
  'unpin': [nodeId: string]
  'update:pathTo': [nodeId: string | null]
  'find-path': []
  'update:timeRange': [value: string]
}>()

const nodeTypes: { value: NodeType; icon: string }[] = [
  { value: 'person',    icon: 'mdi-account' },
  { value: 'project',  icon: 'mdi-folder-multiple' },
  { value: 'task',     icon: 'mdi-checkbox-marked-outline' },
  { value: 'behavior', icon: 'mdi-account-cog' },
  { value: 'meeting',  icon: 'mdi-account-group-outline' },
  { value: 'team',     icon: 'mdi-account-multiple-outline' },
  { value: 'coaching', icon: 'mdi-account-heart' },
  { value: 'knowledge',icon: 'mdi-lightbulb-outline' },
]

const { t } = useI18n()

const timeRangeItems = computed(() => [
  { title: t('network.timeRange.all'), value: 'all' },
  { title: t('network.timeRange.30d'), value: '30d' },
  { title: t('network.timeRange.90d'), value: '90d' },
])

const pathTargetOptions = computed(() =>
  props.allNodes.filter(n => n.id !== props.pathFrom?.id)
)
</script>

<style lang="sass">
.node-type-dot
  width: 12px
  height: 12px
  border-radius: 50%
  flex-shrink: 0
</style>
