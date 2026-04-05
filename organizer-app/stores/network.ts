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
      const visited = new Set<string>([nodeId])
      const queue: Array<{ id: string; remaining: number }> = [{ id: nodeId, remaining: depth }]
      const result: GraphNode[] = []

      while (queue.length > 0) {
        const { id, remaining } = queue.shift()!
        const adjacent = state.edges.filter(e => e.sourceId === id || e.targetId === id)
        for (const edge of adjacent) {
          const neighbourId = edge.sourceId === id ? edge.targetId : edge.sourceId
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
      const visited = new Set<string>([fromId])
      const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }]

      while (queue.length > 0) {
        const { id, path } = queue.shift()!
        const adjacent = state.edges.filter(e => e.sourceId === id || e.targetId === id)
        for (const edge of adjacent) {
          const neighbourId = edge.sourceId === id ? edge.targetId : edge.sourceId
          if (neighbourId === toId) {
            const fullPath = [...path, toId]
            return fullPath.map(nId => state.nodes.find(n => n.id === nId)!).filter(Boolean)
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
        .filter((n): n is GraphNode => !!n && isKnowledgeNode(n))
        .filter(n => (n as KnowledgeNode).certainty >= minCertainty) as KnowledgeNode[]
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
