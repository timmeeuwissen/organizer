import { defineStore } from 'pinia'
import type { GraphNode, GraphEdge, NodeType, EdgeType } from '~/types/models/network'
import { useAuthStore } from '~/stores/auth'
import { useNotificationStore } from '~/stores/notification'

export const useNetworkStore = defineStore('network', {
  state: () => ({
    nodes: [] as GraphNode[],
    edges: [] as GraphEdge[],
    loading: false,
    bootstrapped: false,
    syncProgress: null as { percent: number; phase: string } | null
  }),

  persist: true,

  getters: {
    getNode: storeState => (id: string) =>
      storeState.nodes.find(n => n.id === id),

    getByEntity: storeState => (type: NodeType, entityId: string) =>
      storeState.nodes.find(n => n.type === type && n.entityId === entityId),

    getNeighbours: storeState => (nodeId: string, depth = 2): GraphNode[] => {
      if (depth === 0) { return [] }
      // Build adjacency map once for this traversal
      const adj = new Map<string, string[]>()
      for (const e of storeState.edges) {
        if (!adj.has(e.sourceId)) { adj.set(e.sourceId, []) }
        if (!adj.has(e.targetId)) { adj.set(e.targetId, []) }
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
            const node = storeState.nodes.find(n => n.id === neighbourId)
            if (node) {
              result.push(node)
              if (remaining > 1) { queue.push({ id: neighbourId, remaining: remaining - 1 }) }
            }
          }
        }
      }
      return result
    },

    shortestPath: storeState => (fromId: string, toId: string): GraphNode[] => {
      if (fromId === toId) { return [] }
      // Build adjacency map once for this traversal
      const adj = new Map<string, string[]>()
      for (const e of storeState.edges) {
        if (!adj.has(e.sourceId)) { adj.set(e.sourceId, []) }
        if (!adj.has(e.targetId)) { adj.set(e.targetId, []) }
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
            const pathNodes = fullPath.map(nId => storeState.nodes.find(n => n.id === nId))
            if (pathNodes.some(n => !n)) { return [] } // missing node — return empty rather than partial path
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

    nodeDegree: storeState => (nodeId: string): number =>
      storeState.edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId).length
  },

  actions: {
    async load () {
      const { collection, query, where, getDocs, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) { return }

      this.loading = true
      try {
        const [nodeSnap, edgeSnap] = await Promise.all([
          getDocs(query(collection(db, 'graphNodes'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'graphEdges'), where('userId', '==', userId)))
        ])
        this.nodes = nodeSnap.docs.map(d => ({
          ...(d.data() as Omit<GraphNode, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date()
        }))
        this.edges = edgeSnap.docs.map(d => ({
          ...(d.data() as Omit<GraphEdge, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date()
        }))
      } catch (err) {
        useNotificationStore().error('network.loadError')
        throw err
      } finally {
        this.loading = false
      }
    },

    async syncFromStores (): Promise<{ nodesAdded: Partial<Record<NodeType, number>>; edgesAdded: number } | undefined> {
      const { collection, query, where, getDocs, addDoc, serverTimestamp, getFirestore } =
        await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) { return }

      const nodesAdded: Partial<Record<NodeType, number>> = {}
      let edgesAdded = 0
      const newNodes: GraphNode[] = []
      const newEdges: GraphEdge[] = []

      this.syncProgress = { percent: 0, phase: 'network.syncPhase.loadingStores' }

      try {
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

        // Ensure all domain stores are populated before reading from them
        this.syncProgress = { percent: 3, phase: 'network.syncPhase.loadingStores' }
        await Promise.all([
          peopleStore.fetchPeople(),
          projectsStore.fetchProjects(),
          tasksStore.fetchTasks(),
          behaviorsStore.fetchBehaviors(),
          meetingsStore.fetchMeetings(),
          teamsStore.fetchTeams(),
          coachingStore.fetchRecords()
        ])
        console.log('[network sync] stores loaded:', {
          people: peopleStore.people.length,
          projects: projectsStore.projects.length,
          tasks: tasksStore.tasks.length,
          behaviors: behaviorsStore.behaviors.length,
          meetings: meetingsStore.meetings.length,
          teams: teamsStore.teams.length,
          coaching: coachingStore.records.length,
          projectsError: projectsStore.error,
          tasksError: tasksStore.error,
          behaviorsError: behaviorsStore.error,
          meetingsError: meetingsStore.error,
          teamsError: teamsStore.error,
          coachingError: coachingStore.error
        })

        // Fetch existing nodes to avoid duplicates (idempotent)
        this.syncProgress = { percent: 20, phase: 'network.syncPhase.loading' }
        const existingSnap = await getDocs(
          query(collection(db, 'graphNodes'), where('userId', '==', userId))
        )
        const existingByKey = new Map<string, string>() // "type:entityId" → graphNode id
        for (const d of existingSnap.docs) {
          const data = d.data()
          if (data.entityId) { existingByKey.set(`${data.type}:${data.entityId}`, d.id) }
        }
        console.log('[network sync] existing nodes in Firestore:', existingSnap.size, '— keys sample:', [...existingByKey.keys()].slice(0, 5))

        const upsertNode = async (type: NodeType, entityId: string, label: string): Promise<string> => {
          const key = `${type}:${entityId}`
          if (existingByKey.has(key)) { return existingByKey.get(key)! }
          const ref = await addDoc(collection(db, 'graphNodes'), {
            userId,
            type,
            entityId,
            label,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingByKey.set(key, ref.id)
          newNodes.push({ id: ref.id, userId, type, entityId, label, createdAt: new Date(), updatedAt: new Date() })
          nodesAdded[type] = (nodesAdded[type] ?? 0) + 1
          return ref.id
        }

        this.syncProgress = { percent: 28, phase: 'network.syncPhase.person' }
        for (const p of peopleStore.people) { await upsertNode('person', p.id, `${p.firstName} ${p.lastName}`) }

        this.syncProgress = { percent: 35, phase: 'network.syncPhase.project' }
        for (const proj of projectsStore.projects) { await upsertNode('project', proj.id, proj.title) }

        this.syncProgress = { percent: 42, phase: 'network.syncPhase.task' }
        for (const t of tasksStore.tasks) { await upsertNode('task', t.id, t.title) }

        this.syncProgress = { percent: 49, phase: 'network.syncPhase.behavior' }
        for (const b of behaviorsStore.behaviors) { await upsertNode('behavior', b.id, b.title) }

        this.syncProgress = { percent: 55, phase: 'network.syncPhase.meeting' }
        for (const m of meetingsStore.meetings) { await upsertNode('meeting', m.id, m.title) }

        this.syncProgress = { percent: 61, phase: 'network.syncPhase.team' }
        for (const team of teamsStore.teams) { await upsertNode('team', team.id, team.name) }

        this.syncProgress = { percent: 67, phase: 'network.syncPhase.coaching' }
        for (const c of coachingStore.records) { await upsertNode('coaching', c.id, c.title ?? `Coaching ${c.id}`) }

        // Fetch existing edges
        this.syncProgress = { percent: 72, phase: 'network.syncPhase.edges' }
        const existingEdgeSnap = await getDocs(
          query(collection(db, 'graphEdges'), where('userId', '==', userId))
        )
        const existingEdgeKeys = new Set<string>()
        for (const d of existingEdgeSnap.docs) {
          const data = d.data()
          existingEdgeKeys.add(`${data.sourceId}:${data.targetId}:${data.type}`)
        }

        let edgeAttempts = 0
        let edgeSkips = 0
        let edgeErrors = 0

        const upsertEdge = async (
          sourceType: NodeType, sourceEntityId: string,
          targetType: NodeType, targetEntityId: string,
          type: EdgeType, label?: string
        ) => {
          edgeAttempts++
          const sourceId = existingByKey.get(`${sourceType}:${sourceEntityId}`)
          const targetId = existingByKey.get(`${targetType}:${targetEntityId}`)
          if (!sourceId || !targetId) {
            edgeSkips++
            if (import.meta.env.DEV) {
              console.warn(`[network] skipping edge ${sourceType}:${sourceEntityId} → ${targetType}:${targetEntityId} (${!sourceId ? 'source' : 'target'} node missing)`)
            }
            return
          }
          const key = `${sourceId}:${targetId}:${type}`
          if (existingEdgeKeys.has(key)) { return }
          existingEdgeKeys.add(key)
          try {
            const ref = await addDoc(collection(db, 'graphEdges'), {
              userId,
              sourceId,
              targetId,
              type,
              ...(label !== undefined ? { label } : {}),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
            newEdges.push({ id: ref.id, userId, sourceId, targetId, type, label, createdAt: new Date(), updatedAt: new Date() })
            edgesAdded++
          } catch (err) {
            edgeErrors++
            console.error(`[network] failed to create edge ${sourceType}→${targetType} (${type}):`, err)
          }
        }

        console.log('[network sync] starting edge phase — existingByKey size:', existingByKey.size)

        this.syncProgress = { percent: 78, phase: 'network.syncPhase.edges' }
        for (const proj of projectsStore.projects) {
          for (const memberId of proj.members ?? []) { await upsertEdge('person', memberId, 'project', proj.id, 'member') }
          for (const sid of proj.stakeholders ?? []) { await upsertEdge('person', sid, 'project', proj.id, 'stakeholder') }
          for (const taskId of proj.tasks ?? []) { await upsertEdge('project', proj.id, 'task', taskId, 'contains') }
        }

        this.syncProgress = { percent: 86, phase: 'network.syncPhase.edges' }
        for (const t of tasksStore.tasks) {
          if (t.assignee) { await upsertEdge('task', t.id, 'person', t.assignee, 'assignee') }
          if (t.projectId) { await upsertEdge('task', t.id, 'project', t.projectId, 'related') }
          for (const sid of t.subtasks ?? []) { await upsertEdge('task', t.id, 'task', sid, 'subtask') }
        }

        this.syncProgress = { percent: 91, phase: 'network.syncPhase.edges' }
        for (const m of meetingsStore.meetings) {
          for (const pid of m.participants ?? []) { await upsertEdge('person', pid, 'meeting', m.id, 'participant') }
          for (const projId of m.relatedProjects ?? []) { await upsertEdge('meeting', m.id, 'project', projId, 'related') }
        }

        this.syncProgress = { percent: 95, phase: 'network.syncPhase.edges' }
        for (const b of behaviorsStore.behaviors) {
          for (const plan of b.actionPlans ?? []) {
            for (const taskId of plan.tasks ?? []) { await upsertEdge('behavior', b.id, 'task', taskId, 'action-plan') }
          }
        }

        this.syncProgress = { percent: 98, phase: 'network.syncPhase.edges' }
        for (const team of teamsStore.teams) {
          for (const mid of team.memberPersonIds ?? []) { await upsertEdge('person', mid, 'team', team.id, 'member') }
        }

        console.log('[network sync] edge phase done — attempts:', edgeAttempts, 'skips:', edgeSkips, 'errors:', edgeErrors, 'created:', edgesAdded)

        this.syncProgress = { percent: 100, phase: 'network.syncPhase.done' }

        // Batch-apply new nodes and edges — single reactive update to avoid graph flickering
        if (newNodes.length > 0) { this.nodes = [...this.nodes, ...newNodes] }
        if (newEdges.length > 0) { this.edges = [...this.edges, ...newEdges] }

        this.bootstrapped = true

        console.log('[network sync] done — nodesAdded:', nodesAdded, 'edgesAdded:', edgesAdded, 'edgeAttempts:', edgeAttempts, 'edgeSkips:', edgeSkips, 'total nodes:', this.nodes.length, 'total edges:', this.edges.length)
        return { nodesAdded, edgesAdded }
      } catch (err) {
        useNotificationStore().error('network.syncError')
        throw err
      } finally {
        this.syncProgress = null
      }
    },

    async createEdge (partial: Omit<GraphEdge, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
      const { collection, addDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) { return }
      const ref = await addDoc(collection(db, 'graphEdges'), {
        userId,
        ...partial,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      const edge: GraphEdge = { id: ref.id, userId, ...partial, createdAt: new Date(), updatedAt: new Date() }
      this.edges.push(edge)
      return edge
    },

    async deleteEdge (id: string) {
      const { doc, deleteDoc, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      await deleteDoc(doc(db, 'graphEdges', id))
      this.edges = this.edges.filter(e => e.id !== id)
    },

    async updateEdge (id: string, partial: Partial<Pick<GraphEdge, 'type' | 'label'>>) {
      const { doc, updateDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      await updateDoc(doc(db, 'graphEdges', id), { ...partial, updatedAt: serverTimestamp() })
      const idx = this.edges.findIndex(e => e.id === id)
      if (idx !== -1) { Object.assign(this.edges[idx], { ...partial, updatedAt: new Date() }) }
    }
  }
})
