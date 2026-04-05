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
    async load() {
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      const { db } = await import('~/plugins/firebase')
      const authStore = useAuthStore()
      const userId = authStore.user?.uid
      if (!userId) return

      this.loading = true
      try {
        const [nodeSnap, edgeSnap] = await Promise.all([
          getDocs(query(collection(db, 'graphNodes'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'graphEdges'), where('userId', '==', userId))),
        ])
        this.nodes = nodeSnap.docs.map(d => ({
          ...(d.data() as Omit<GraphNode, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
        }))
        this.edges = edgeSnap.docs.map(d => ({
          ...(d.data() as Omit<GraphEdge, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
        }))
      } finally {
        this.loading = false
      }
    },

    async syncFromStores() {
      const { collection, query, where, getDocs, addDoc, serverTimestamp } =
        await import('firebase/firestore')
      const { db } = await import('~/plugins/firebase')
      const authStore = useAuthStore()
      const userId = authStore.user?.uid
      if (!userId) return

      const { usePeopleStore } = await import('~/stores/people')
      const { useProjectsStore } = await import('~/stores/projects')
      const { useTasksStore } = await import('~/stores/tasks')
      const { useBehaviorsStore } = await import('~/stores/behaviors')
      const { useMeetingsStore } = await import('~/stores/meetings')
      const { useTeamsStore } = await import('~/stores/teams')
      const { useCoachingStore } = await import('~/stores/coaching')

      const peopleStore = usePeopleStore()
      const projectsStore = useProjectsStore()
      const tasksStore = useTasksStore()
      const behaviorsStore = useBehaviorsStore()
      const meetingsStore = useMeetingsStore()
      const teamsStore = useTeamsStore()
      const coachingStore = useCoachingStore()

      // Fetch existing nodes to avoid duplicates (idempotent)
      const existingSnap = await getDocs(
        query(collection(db, 'graphNodes'), where('userId', '==', userId))
      )
      const existingByKey = new Map<string, string>() // "type:entityId" → graphNode id
      for (const d of existingSnap.docs) {
        const data = d.data()
        if (data.entityId) existingByKey.set(`${data.type}:${data.entityId}`, d.id)
      }

      const upsertNode = async (type: NodeType, entityId: string, label: string): Promise<string> => {
        const key = `${type}:${entityId}`
        if (existingByKey.has(key)) return existingByKey.get(key)!
        const ref = await addDoc(collection(db, 'graphNodes'), {
          userId, type, entityId, label,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        })
        existingByKey.set(key, ref.id)
        this.nodes.push({ id: ref.id, userId, type, entityId, label, createdAt: new Date(), updatedAt: new Date() })
        return ref.id
      }

      for (const p of peopleStore.people) await upsertNode('person', p.id, p.name)
      for (const proj of projectsStore.projects) await upsertNode('project', proj.id, proj.title)
      for (const t of tasksStore.tasks) await upsertNode('task', t.id, t.title)
      for (const b of behaviorsStore.behaviors) await upsertNode('behavior', b.id, b.title)
      for (const m of meetingsStore.meetings) await upsertNode('meeting', m.id, m.title)
      for (const team of teamsStore.teams) await upsertNode('team', team.id, team.name)
      for (const c of coachingStore.records) await upsertNode('coaching', c.id, c.title ?? `Coaching ${c.id}`)

      // Fetch existing edges
      const existingEdgeSnap = await getDocs(
        query(collection(db, 'graphEdges'), where('userId', '==', userId))
      )
      const existingEdgeKeys = new Set<string>()
      for (const d of existingEdgeSnap.docs) {
        const data = d.data()
        existingEdgeKeys.add(`${data.sourceId}:${data.targetId}:${data.type}`)
      }

      const upsertEdge = async (
        sourceType: NodeType, sourceEntityId: string,
        targetType: NodeType, targetEntityId: string,
        type: EdgeType, label?: string
      ) => {
        const sourceId = existingByKey.get(`${sourceType}:${sourceEntityId}`)
        const targetId = existingByKey.get(`${targetType}:${targetEntityId}`)
        if (!sourceId || !targetId) return
        const key = `${sourceId}:${targetId}:${type}`
        if (existingEdgeKeys.has(key)) return
        existingEdgeKeys.add(key)
        const ref = await addDoc(collection(db, 'graphEdges'), {
          userId, sourceId, targetId, type, label,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        })
        this.edges.push({ id: ref.id, userId, sourceId, targetId, type, label, createdAt: new Date(), updatedAt: new Date() })
      }

      for (const proj of projectsStore.projects) {
        for (const memberId of proj.members ?? []) await upsertEdge('person', memberId, 'project', proj.id, 'member')
        for (const sid of proj.stakeholders ?? []) await upsertEdge('person', sid, 'project', proj.id, 'stakeholder')
        for (const taskId of proj.tasks ?? []) await upsertEdge('project', proj.id, 'task', taskId, 'contains')
      }
      for (const t of tasksStore.tasks) {
        if (t.assignee) await upsertEdge('task', t.id, 'person', t.assignee, 'assignee')
        if (t.projectId) await upsertEdge('task', t.id, 'project', t.projectId, 'related')
        for (const sid of t.subtasks ?? []) await upsertEdge('task', t.id, 'task', sid, 'subtask')
      }
      for (const m of meetingsStore.meetings) {
        for (const pid of m.participants ?? []) await upsertEdge('person', pid, 'meeting', m.id, 'participant')
        for (const projId of m.relatedProjects ?? []) await upsertEdge('meeting', m.id, 'project', projId, 'related')
      }
      for (const b of behaviorsStore.behaviors) {
        for (const plan of b.actionPlans ?? []) {
          for (const taskId of plan.tasks ?? []) await upsertEdge('behavior', b.id, 'task', taskId, 'action-plan')
        }
      }
      for (const team of teamsStore.teams) {
        for (const mid of team.memberPersonIds ?? []) await upsertEdge('person', mid, 'team', team.id, 'member')
      }

      this.bootstrapped = true
    },

    async createEdge(partial: Omit<GraphEdge, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('~/plugins/firebase')
      const authStore = useAuthStore()
      const userId = authStore.user?.uid
      if (!userId) return
      const ref = await addDoc(collection(db, 'graphEdges'), {
        userId, ...partial,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      const edge: GraphEdge = { id: ref.id, userId, ...partial, createdAt: new Date(), updatedAt: new Date() }
      this.edges.push(edge)
      return edge
    },

    async deleteEdge(id: string) {
      const { doc, deleteDoc } = await import('firebase/firestore')
      const { db } = await import('~/plugins/firebase')
      await deleteDoc(doc(db, 'graphEdges', id))
      this.edges = this.edges.filter(e => e.id !== id)
    },
  },
})
