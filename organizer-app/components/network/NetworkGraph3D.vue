<template lang="pug">
div(ref="containerEl" style="width:100%;height:100%;position:relative")
  div.d-flex.align-center.justify-center(
    v-if="loading"
    style="position:absolute;inset:0"
  )
    v-progress-circular(indeterminate color="primary")
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import type { GraphNode, GraphEdge } from '~/types/models/network'
import { NODE_COLORS, NODE_BASE_SIZES } from '~/config/network'

const props = defineProps<{
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  pinnedNodeIds: string[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'node-click': [node: GraphNode]
  'node-ctrl-click': [node: GraphNode]
  'node-dblclick': [node: GraphNode]
  'node-rightclick': [node: GraphNode, event: MouseEvent]
}>()

const containerEl = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let graph: any = null
let lastClickTime = 0
let singleClickTimer: ReturnType<typeof setTimeout> | null = null
const DBL_CLICK_MS = 300

const graphData = computed(() => ({
  nodes: props.nodes.map(n => ({ ...n })),
  links: props.edges.map(e => ({
    ...e,
    source: e.sourceId,
    target: e.targetId,
  })),
}))

onMounted(async () => {
  if (!containerEl.value) return
  const { default: ForceGraph3D } = await import('3d-force-graph')

  graph = new ForceGraph3D(containerEl.value)
    .backgroundColor('#11111b')
    .nodeColor((n: any) => {
      if (props.selectedNodeId === n.id) return '#ffffff'
      return NODE_COLORS[n.type as GraphNode['type']] ?? '#888888'
    })
    .nodeVal((n: any) => {
      const base = NODE_BASE_SIZES[n.type as GraphNode['type']] ?? 4
      return base + (props.pinnedNodeIds.includes(n.id) ? 3 : 0)
    })
    .nodeLabel((n: any) => n.label)
    .linkColor(() => 'rgba(255,255,255,0.12)')
    .linkLabel((l: any) => l.label ?? l.type)
    .onNodeClick((n: any, event: MouseEvent) => {
      const now = Date.now()
      if (now - lastClickTime < DBL_CLICK_MS) {
        // Second click within window — cancel pending single-click and emit double-click
        if (singleClickTimer) { clearTimeout(singleClickTimer); singleClickTimer = null }
        emit('node-dblclick', n)
      } else if (event.ctrlKey || event.metaKey) {
        emit('node-ctrl-click', n)
      } else {
        // Defer single-click so a fast second click can cancel it
        singleClickTimer = setTimeout(() => {
          emit('node-click', n)
          singleClickTimer = null
        }, DBL_CLICK_MS)
      }
      lastClickTime = now
    })
    .onNodeRightClick((n: any, event: MouseEvent) => {
      event.preventDefault()
      emit('node-rightclick', n, event)
    })
    .graphData(graphData.value)
})

watch(graphData, (data) => {
  graph?.graphData(data)
})

watch([() => props.selectedNodeId, () => props.pinnedNodeIds], () => {
  if (!graph) return
  graph
    .nodeColor((n: any) => {
      if (props.selectedNodeId === n.id) return '#ffffff'
      return NODE_COLORS[n.type as GraphNode['type']] ?? '#888888'
    })
    .nodeVal((n: any) => {
      const base = NODE_BASE_SIZES[n.type as GraphNode['type']] ?? 4
      return base + (props.pinnedNodeIds.includes(n.id) ? 3 : 0)
    })
}, { deep: true })

onUnmounted(() => {
  if (singleClickTimer) clearTimeout(singleClickTimer)
  try { graph?._destructor?.() } catch { /* _destructor is an undocumented but widely-used teardown hook */ }
  graph = null
})
</script>
