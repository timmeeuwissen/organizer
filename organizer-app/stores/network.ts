import { defineStore } from 'pinia'
import type { GraphNode, GraphEdge, KnowledgeNode, NodeType } from '~/types/models/network'
import { isKnowledgeNode } from '~/types/models/network'
import { useAuthStore } from '~/stores/auth'
import type { EdgeType } from '~/types/models/network'

export const useNetworkStore = defineStore('network', {
  persist: true,

  state: () => ({
    nodes: [] as GraphNode[],
    edges: [] as GraphEdge[],
    loading: false,
    bootstrapped: false,
  }),

  getters: {
    getNode: (state) => (id: string) =>
      state.nodes.find(n => n.id === id),

    getByEntity: (state) => (type: NodeType, entityId: string) =>
      state.nodes.find(n => n.type === type && n.entityId === entityId),

    getNeighbours: (state) => (nodeId: string, depth = 2): GraphNode[] => {
      if (depth === 0) return []
      // Build adjacency map once for this traversal
      const adj = new Map<string, string[]>()
      for (const e of state.edges) {
        if (!adj.has(e.sourceId)) adj.set(e.sourceId, [])
        if (!adj.has(e.targetId)) adj.set(e.targetId, [])
        adj.get(e.sourceId)!.push(e.targetId)
        adj.get(e.targetId)!.push(e.sourceId)
      }
      // BFS using adj map
      const visited = new Set<string>([nodeId])
      const queue: Array<{ id: string; remaining: number }> = [{ id: nodeId, remaining: depth }]
      const result: GraphNode[] = []
      while (queue.length > 0) {
        const { id, remaining } = queue.shift()!
        for (const neighbourId of (adj.get(id) ?? [])) {
          if (!visited.has(neighbourId)) {
            visited.add(neighbourId)
            const node = state.nodes.find(n => n.id === neighbourId)
            if (node) {
              result.push(node)
              if (remaining > 1) queue.push({ id: neighbourId, remaining: remaining - 1 })
            }
          }
        }
      }
      return result
    },

    shortestPath: (state) => (fromId: string, toId: string): GraphNode[] => {
      if (fromId === toId) return []
      // Build adjacency map once for this traversal
      const adj = new Map<string, string[]>()
      for (const e of state.edges) {
        if (!adj.has(e.sourceId)) adj.set(e.sourceId, [])
        if (!adj.has(e.targetId)) adj.set(e.targetId, [])
        adj.get(e.sourceId)!.push(e.targetId)
        adj.get(e.targetId)!.push(e.sourceId)
      }
      const visited = new Set<string>([fromId])
      const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }]

      while (queue.length > 0) {
        const { id, path } = queue.shift()!
        for (const neighbourId of (adj.get(id) ?? [])) {
          if (neighbourId === toId) {
            const fullPath = [...path, toId]
            const pathNodes = fullPath.map(nId => state.nodes.find(n => n.id === nId))
            if (pathNodes.some(n => !n)) return []  // missing node — return empty rather than partial path
            return pathNodes as GraphNode[]
          }
          if (!visited.has(neighbourId)) {
            visited.add(neighbourId)
            queue.push({ id: neighbourId, path: [...path, neighbourId] })
          }
        }
      }
      return []
    },

    knowledgeFor: (state) => (nodeId: string, minCertainty = 0.6): KnowledgeNode[] => {
      const linkedEdges = state.edges.filter(
        e => (e.sourceId === nodeId || e.targetId === nodeId) && e.type === 'references'
      )
      return linkedEdges
        .map(e => {
          const otherId = e.sourceId === nodeId ? e.targetId : e.sourceId
          return state.nodes.find(n => n.id === otherId)
        })
        .filter((n): n is KnowledgeNode => {
          if (!n || !isKnowledgeNode(n)) return false
          return n.certainty >= minCertainty
        })
    },

    nodeDegree: (state) => (nodeId: string): number =>
      state.edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId).length,
  },

  actions: {
    // Placeholder actions — implemented in Task 3
    async load() {},
    async syncFromStores() {},
  },
})
