<template lang="pug">
div(style="width:100%;height:100%;position:relative")
  div(ref="containerEl" style="width:100%;height:100%")
  div.d-flex.align-center.justify-center(
    v-if="loading"
    style="position:absolute;inset:0;background:rgba(0,0,0,0.4);z-index:1"
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
  labelDepth: number // 0 = no labels, 100 = all labels fully opaque
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
let resizeObserver: ResizeObserver | null = null
let animFrameId: number | null = null
let lastClickTime = 0
let singleClickTimer: ReturnType<typeof setTimeout> | null = null
const DBL_CLICK_MS = 300

// Map<nodeId, SpriteMaterial> for per-frame opacity updates
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const labelSpriteMap = new Map<string, { sprite: any; material: any }>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLabelSprite (text: string, THREE: any): any {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffffff'
  const label = text.length > 22 ? text.slice(0, 20) + '…' : text
  ctx.fillText(label, 256, 32)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    opacity: 0
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(80, 16, 1)
  sprite.position.set(0, -20, 0) // below the node sphere
  return sprite
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function startLabelLoop (THREE: any) {
  const tmpVec = new THREE.Vector3()

  function tick () {
    animFrameId = requestAnimationFrame(tick)
    if (!graph || labelSpriteMap.size === 0) { return }

    if (props.labelDepth === 0) {
      labelSpriteMap.forEach(({ material }) => { material.opacity = 0 })
      return
    }
    if (props.labelDepth >= 100) {
      labelSpriteMap.forEach(({ material }) => { material.opacity = 1 })
      return
    }

    const camera = graph.camera?.()
    if (!camera) { return }

    // Collect distances from camera to each sprite world position
    const entries: Array<{ material: any; dist: number }> = []
    labelSpriteMap.forEach(({ sprite, material }) => {
      sprite.getWorldPosition(tmpVec)
      entries.push({ material, dist: camera.position.distanceTo(tmpVec) })
    })

    if (entries.length === 0) { return }

    let minDist = Infinity; let maxDist = 0
    for (const e of entries) {
      if (e.dist < minDist) { minDist = e.dist }
      if (e.dist > maxDist) { maxDist = e.dist }
    }
    const range = maxDist - minDist || 1

    // threshold: fraction of the distance range that gets full opacity
    const threshold = props.labelDepth / 100
    // fade width: 15% of the range
    const fadeWidth = 0.15

    for (const { material, dist } of entries) {
      const norm = (dist - minDist) / range // 0 = closest, 1 = farthest
      const opacity = Math.max(0, Math.min(1, (threshold - norm + fadeWidth) / fadeWidth))
      material.opacity = opacity
    }
  }
  tick()
}

const graphData = computed(() => ({
  nodes: props.nodes.map(n => ({ ...n })),
  links: props.edges.map(e => ({
    ...e,
    source: e.sourceId,
    target: e.targetId
  }))
}))

onMounted(async () => {
  if (!containerEl.value) { return }
  const { default: ForceGraph3D } = await import('3d-force-graph')
  const THREE = await import('three')

  graph = new ForceGraph3D(containerEl.value)
    .backgroundColor('#11111b')
    .nodeColor((n: any) => {
      if (props.selectedNodeId === n.id) { return '#ffffff' }
      return NODE_COLORS[n.type as GraphNode['type']] ?? '#888888'
    })
    .nodeVal((n: any) => {
      const base = NODE_BASE_SIZES[n.type as GraphNode['type']] ?? 4
      return base + (props.pinnedNodeIds.includes(n.id) ? 3 : 0)
    })
    .nodeLabel(() => '') // disable built-in hover label (we have sprites)
    .nodeThreeObjectExtend(true)
    .nodeThreeObject((n: any) => {
      const sprite = createLabelSprite(n.label, THREE)
      labelSpriteMap.set(n.id, { sprite, material: sprite.material })
      return sprite
    })
    .linkColor(() => 'rgba(255,255,255,0.55)')
    .linkWidth(2)
    .linkLabel((l: any) => l.label ?? l.type)
    .onNodeClick((n: any, event: MouseEvent) => {
      const now = Date.now()
      if (now - lastClickTime < DBL_CLICK_MS) {
        if (singleClickTimer) { clearTimeout(singleClickTimer); singleClickTimer = null }
        emit('node-dblclick', n)
      } else if (event.ctrlKey || event.metaKey) {
        emit('node-ctrl-click', n)
      } else {
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

  graph.d3Force('charge')?.strength(-180)
  graph.d3Force('link')?.distance(80)

  resizeObserver = new ResizeObserver(() => {
    if (!containerEl.value || !graph) { return }
    graph.width(containerEl.value.offsetWidth).height(containerEl.value.offsetHeight)
  })
  resizeObserver.observe(containerEl.value)

  startLabelLoop(THREE)
})

watch(graphData, (data) => {
  // Clear stale sprite refs before 3d-force-graph recreates node objects
  labelSpriteMap.clear()
  graph?.graphData(data)
})

watch([() => props.selectedNodeId, () => props.pinnedNodeIds], () => {
  if (!graph) { return }
  graph
    .nodeColor((n: any) => {
      if (props.selectedNodeId === n.id) { return '#ffffff' }
      return NODE_COLORS[n.type as GraphNode['type']] ?? '#888888'
    })
    .nodeVal((n: any) => {
      const base = NODE_BASE_SIZES[n.type as GraphNode['type']] ?? 4
      return base + (props.pinnedNodeIds.includes(n.id) ? 3 : 0)
    })
}, { deep: true })

onUnmounted(() => {
  if (animFrameId !== null) { cancelAnimationFrame(animFrameId); animFrameId = null }
  labelSpriteMap.clear()
  resizeObserver?.disconnect()
  resizeObserver = null
  if (singleClickTimer) { clearTimeout(singleClickTimer) }
  try { graph?._destructor?.() } catch { /* undocumented teardown hook */ }
  graph = null
})
</script>
