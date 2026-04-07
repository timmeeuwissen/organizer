<template lang="pug">
.d-flex(style="height:100%;overflow:hidden")

  //- Left sidebar
  NetworkSidebar(
    v-if="leftOpen"
    :visible-types="visibleTypes"
    :depth="depth"
    :pinned-nodes="pinnedGraphNodes"
    :path-from="selectedNode"
    :path-to="pathToId"
    :all-nodes="networkStore.nodes"
    :time-range="timeRange"
    :hide-orphans="hideOrphans"
    :loading="networkStore.loading"
    :sync-progress="networkStore.syncProgress"
    @toggle-type="toggleType"
    @update:depth="depth = $event"
    @unpin="unpinNode"
    @update:path-to="pathToId = $event"
    @find-path="findPath"
    @update:time-range="timeRange = $event"
    @update:hide-orphans="hideOrphans = $event"
    @sync="handleSync"
    @close="leftOpen = false"
  )

  //- Left reopen strip
  .d-flex.flex-column.align-center.pt-2(
    v-else
    style="width:32px;flex-shrink:0;background:rgb(var(--v-theme-surface));border-right:1px solid rgba(var(--v-border-color),var(--v-border-opacity))"
  )
    v-btn(icon size="x-small" variant="text" @click="leftOpen = true")
      v-icon mdi-chevron-right

  //- Graph area
  .flex-grow-1(style="position:relative;min-width:0")
    NetworkGraph3D(
      :nodes="filteredNodes"
      :edges="filteredEdges"
      :selected-node-id="selectedNode?.id ?? null"
      :pinned-node-ids="pinnedNodeIds"
      :loading="networkStore.loading"
      @node-click="selectNode"
      @node-ctrl-click="togglePin"
      @node-dblclick="navigateToRecord"
      @node-rightclick="openContextMenu"
    )

    v-chip(
      v-if="pathNodes.length"
      style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%)"
      color="success"
      prepend-icon="mdi-vector-line"
      closable
      @click:close="clearPath"
    ) {{ $t('network.pathLength', { n: pathNodes.length - 1 }) }}

  //- Right detail panel
  transition(name="slide-detail")
    .network-detail-panel(v-if="selectedNode")
      .d-flex.align-center.justify-space-between.pa-2.pb-0
        span.text-subtitle-2 {{ $t('network.details') }}
        v-btn(icon size="x-small" variant="text" @click="selectedNode = null")
          v-icon mdi-close
      NetworkNodeDetail(
        :node="selectedNode"
        :knowledge="selectedNodeKnowledge"
        :is-pinned="pinnedNodeIds.includes(selectedNode?.id ?? '')"
        @toggle-pin="togglePin"
        @add-knowledge="openAddKnowledge"
      )

  //- Right reopen hint when nothing selected
  .d-flex.flex-column.align-center.pt-2(
    v-if="!selectedNode"
    style="width:32px;flex-shrink:0;background:rgb(var(--v-theme-surface));border-left:1px solid rgba(var(--v-border-color),var(--v-border-opacity))"
  )
    v-tooltip(:text="$t('network.selectNode')" location="left")
      template(#activator="{ props: tp }")
        v-icon(v-bind="tp" size="20" color="disabled") mdi-cursor-default-click-outline
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNetworkStore } from '~/stores/network'
import { useNotificationStore } from '~/stores/notification'
import type { GraphNode, KnowledgeNode, NodeType } from '~/types/models/network'
import { GRAPH_DEFAULTS } from '~/config/network'

definePageMeta({ middleware: 'auth' })

const router = useRouter()
const networkStore = useNetworkStore()
const { t } = useI18n()

// UI state
const leftOpen = ref(true)
const selectedNode = ref<GraphNode | null>(null)
const pinnedNodeIds = ref<string[]>([])
const depth = ref(GRAPH_DEFAULTS.depth)
const pathToId = ref<string | null>(null)
const pathNodes = ref<GraphNode[]>([])
const timeRange = ref('all')
const hideOrphans = ref(true)
const visibleTypes = ref<NodeType[]>([
  'person', 'project', 'task', 'behavior', 'meeting', 'team', 'coaching', 'knowledge',
])

// Derived
const pinnedGraphNodes = computed(() =>
  pinnedNodeIds.value
    .map(id => networkStore.getNode(id))
    .filter((n): n is GraphNode => !!n)
)

// Step 1: filter by type, pins, time range
const visibleNodes = computed(() => {
  let nodes = networkStore.nodes.filter(n => visibleTypes.value.includes(n.type))

  if (pinnedNodeIds.value.length > 0) {
    const reachable = new Set<string>(pinnedNodeIds.value)
    for (const id of pinnedNodeIds.value) {
      networkStore.getNeighbours(id, depth.value).forEach(n => reachable.add(n.id))
    }
    nodes = nodes.filter(n => reachable.has(n.id))
  }

  if (timeRange.value !== 'all') {
    const days = timeRange.value === '30d' ? 30 : 90
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    nodes = nodes.filter(n => new Date(n.createdAt) >= cutoff)
  }

  return nodes
})

// Step 2: edges between visible nodes
const visibleNodeIds = computed(() => new Set(visibleNodes.value.map(n => n.id)))

const filteredEdges = computed(() =>
  networkStore.edges.filter(
    e => visibleNodeIds.value.has(e.sourceId) && visibleNodeIds.value.has(e.targetId)
  )
)

// Step 3: optionally hide orphans (nodes with no edges in the current view)
const filteredNodes = computed(() => {
  if (!hideOrphans.value) return visibleNodes.value
  const connectedIds = new Set<string>()
  for (const e of filteredEdges.value) {
    connectedIds.add(e.sourceId)
    connectedIds.add(e.targetId)
  }
  return visibleNodes.value.filter(n => connectedIds.has(n.id))
})

const selectedNodeKnowledge = computed((): KnowledgeNode[] => {
  if (!selectedNode.value) return []
  return networkStore.knowledgeFor(selectedNode.value.id, GRAPH_DEFAULTS.minCertainty)
})

// Handlers
function selectNode(node: GraphNode) {
  selectedNode.value = node
  pathNodes.value = []
}

function togglePin(node: GraphNode | string) {
  const id = typeof node === 'string' ? node : node.id
  const idx = pinnedNodeIds.value.indexOf(id)
  if (idx >= 0) {
    pinnedNodeIds.value.splice(idx, 1)
  } else {
    pinnedNodeIds.value.push(id)
  }
}

function unpinNode(nodeId: string) {
  pinnedNodeIds.value = pinnedNodeIds.value.filter(id => id !== nodeId)
}

function toggleType(type: NodeType, visible: boolean) {
  if (visible) {
    if (!visibleTypes.value.includes(type)) visibleTypes.value.push(type)
  } else {
    visibleTypes.value = visibleTypes.value.filter(t => t !== type)
  }
}

function navigateToRecord(node: GraphNode) {
  if (!node.entityId) return
  const routes: Record<string, string> = {
    person: '/people', project: '/projects', task: '/tasks',
    behavior: '/behaviors', meeting: '/meetings', team: '/teams', coaching: '/coaching',
  }
  const base = routes[node.type]
  if (base) router.push(`${base}/${node.entityId}`)
}

function openContextMenu(_node: GraphNode, _event: MouseEvent) {
  // Placeholder — context menu added in Plan 2
}

function openAddKnowledge(_node: GraphNode) {
  // Placeholder — KnowledgeNodeForm added in Plan 2
}

function findPath() {
  if (!selectedNode.value || !pathToId.value) return
  pathNodes.value = networkStore.shortestPath(selectedNode.value.id, pathToId.value)
  if (pathNodes.value.length === 0) {
    useNotificationStore().info('network.noPath')
  }
}

function clearPath() {
  pathNodes.value = []
  pathToId.value = null
}

async function handleSync() {
  try {
    const stats = await networkStore.syncFromStores()
    if (!stats) return

    const totalNodes = Object.values(stats.nodesAdded).reduce((s, n) => s + n, 0)

    if (totalNodes === 0 && stats.edgesAdded === 0) {
      useNotificationStore().info(t('network.syncNoChanges'))
      return
    }

    const parts: string[] = []
    if (totalNodes > 0) {
      const typeList = (Object.entries(stats.nodesAdded) as Array<[NodeType, number]>)
        .filter(([, n]) => n > 0)
        .map(([type, n]) => `${n} ${t(`network.nodeType.${type}`).toLowerCase()}`)
        .join(', ')
      parts.push(t('network.syncAddedNodes', { count: totalNodes, types: typeList }))
    }
    if (stats.edgesAdded > 0) {
      parts.push(t('network.syncAddedEdges', { count: stats.edgesAdded }))
    }
    useNotificationStore().success(parts.join(' · '), { timeout: 8000 })
  } catch {
    // error notification already shown by store
  }
}

onMounted(async () => {
  try { await networkStore.load() } catch { /* error notified in store */ }
  if (!networkStore.bootstrapped) {
    try { await networkStore.syncFromStores() } catch { /* error notified in store */ }
  }
})
</script>

<style lang="sass" scoped>
.network-detail-panel
  width: 260px
  flex-shrink: 0
  overflow-y: auto
  background: rgb(var(--v-theme-surface))
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))

.slide-detail-enter-active,
.slide-detail-leave-active
  transition: width 0.2s ease, opacity 0.2s ease

.slide-detail-enter-from,
.slide-detail-leave-to
  width: 0
  opacity: 0

.slide-detail-enter-to,
.slide-detail-leave-from
  width: 260px
  opacity: 1
</style>
