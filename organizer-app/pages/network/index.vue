<template lang="pug">
v-app-bar(flat)
  v-app-bar-nav-icon(@click="drawer = !drawer")
  v-toolbar-title
    span.text-disabled {{ $t('app.name') }} /&nbsp;
    v-icon(size="small" class="mr-1") mdi-graph
    | {{ $t('network.title') }}
  v-spacer
  v-btn(
    icon="mdi-lightbulb-plus-outline"
    variant="text"
    :title="$t('network.addKnowledge')"
  )
  v-btn(
    icon="mdi-refresh"
    variant="text"
    :loading="networkStore.loading"
    :title="$t('network.sync')"
    @click="handleSync"
  )

v-main
  .d-flex(style="height:calc(100vh - 64px)")
    NetworkSidebar(
      :visible-types="visibleTypes"
      :depth="depth"
      :pinned-nodes="pinnedGraphNodes"
      :path-from="selectedNode"
      :path-to="pathToId"
      :all-nodes="networkStore.nodes"
      :time-range="timeRange"
      @toggle-type="toggleType"
      @update:depth="depth = $event"
      @unpin="unpinNode"
      @update:path-to="pathToId = $event"
      @find-path="findPath"
      @update:time-range="timeRange = $event"
    )

    .flex-grow-1(style="position:relative")
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

    .pa-3(style="width:260px;overflow-y:auto;background:rgb(var(--v-theme-surface))")
      NetworkNodeDetail(
        v-if="selectedNode"
        :node="selectedNode"
        :knowledge="selectedNodeKnowledge"
        :is-pinned="pinnedNodeIds.includes(selectedNode?.id ?? '')"
        @toggle-pin="togglePin"
        @add-knowledge="openAddKnowledge"
      )
      .text-center.text-disabled.mt-8(v-else)
        v-icon(size="48") mdi-cursor-default-click-outline
        .mt-2 {{ $t('network.selectNode') }}
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useNetworkStore } from '~/stores/network'
import { useNotificationStore } from '~/stores/notification'
import type { GraphNode, KnowledgeNode, NodeType } from '~/types/models/network'
import { GRAPH_DEFAULTS } from '~/config/network'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const router = useRouter()
const networkStore = useNetworkStore()
const notifyStore = useNotificationStore()

// UI state
const drawer = ref(true) // toggles sidebar visibility — wired to v-navigation-drawer in Plan 2 layout
const selectedNode = ref<GraphNode | null>(null)
const pinnedNodeIds = ref<string[]>([])
const depth = ref(GRAPH_DEFAULTS.depth)
const pathToId = ref<string | null>(null)
const pathNodes = ref<GraphNode[]>([])
const timeRange = ref('all')
const visibleTypes = ref<NodeType[]>([
  'person', 'project', 'task', 'behavior', 'meeting', 'team', 'coaching', 'knowledge',
])

// Derived
const pinnedGraphNodes = computed(() =>
  pinnedNodeIds.value
    .map(id => networkStore.getNode(id))
    .filter((n): n is GraphNode => !!n)
)

const filteredNodes = computed(() => {
  let nodes = networkStore.nodes.filter(n => visibleTypes.value.includes(n.type))

  if (pinnedNodeIds.value.length > 0) {
    const reachable = new Set<string>(pinnedNodeIds.value)
    for (const id of pinnedNodeIds.value) {
      networkStore.getNeighbours(id, depth.value).forEach(n => reachable.add(n.id))
    }
    nodes = nodes.filter(n => reachable.has(n.id))
  } else if (selectedNode.value) {
    const reachable = new Set<string>([selectedNode.value.id])
    networkStore.getNeighbours(selectedNode.value.id, depth.value).forEach(n => reachable.add(n.id))
    nodes = nodes.filter(n => reachable.has(n.id))
  }

  if (timeRange.value !== 'all') {
    const days = timeRange.value === '30d' ? 30 : 90 // '90d' or any unknown value falls back to 90 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    nodes = nodes.filter(n => new Date(n.createdAt) >= cutoff)
  }

  return nodes
})

const filteredNodeIds = computed(() => new Set(filteredNodes.value.map(n => n.id)))

const filteredEdges = computed(() =>
  networkStore.edges.filter(
    e => filteredNodeIds.value.has(e.sourceId) && filteredNodeIds.value.has(e.targetId)
  )
)

const selectedNodeKnowledge = computed((): KnowledgeNode[] => {
  if (!selectedNode.value) return []
  return networkStore.knowledgeFor(selectedNode.value.id, GRAPH_DEFAULTS.minCertainty)
})

// Handlers
function selectNode(node: GraphNode) {
  selectedNode.value = node
  pathNodes.value = []
}

// Accepts GraphNode (from graph ctrl-click) or string id (from detail panel toggle-pin emit)
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
    notifyStore.info(t('network.noPath'))
  }
}

function clearPath() {
  pathNodes.value = []
  pathToId.value = null
}

async function handleSync() {
  await networkStore.syncFromStores()
  notifyStore.success(t('network.syncComplete'))
}

onMounted(async () => {
  await networkStore.load()
  if (!networkStore.bootstrapped) {
    await networkStore.syncFromStores()
  }
})
</script>
