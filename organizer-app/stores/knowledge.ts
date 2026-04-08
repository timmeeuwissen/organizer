// stores/knowledge.ts
import { defineStore } from 'pinia'
import { storeT } from '~/plugins/i18n'
import { useAuthStore } from './auth'
import { useNotificationStore } from './notification'
import type { KnowledgeNode, NodeType, EdgeType } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'

export const useKnowledgeStore = defineStore('knowledge', {
  persist: true,

  state: () => ({
    nodes: [] as KnowledgeNode[],
    edges: [] as KnowledgeEdge[],
    nodeCollectionsById: {} as Record<string, 'knowledgeNodes' | 'graphNodes'>,
    edgeCollectionsById: {} as Record<string, 'knowledgeEdges' | 'graphEdges'>,
    loading: false,
    bootstrapped: false,
  }),

  getters: {
    connectionsForEntity: (storeState) => (entityType: NodeType, entityId: string) => {
      const linked = storeState.edges.filter(
        e => e.entityType === entityType && e.entityId === entityId
      )
      return linked
        .map(edge => {
          const knowledge = storeState.nodes.find(n => n.id === edge.knowledgeNodeId)
          return knowledge ? { knowledge, edge } : null
        })
        .filter((c): c is { knowledge: KnowledgeNode; edge: KnowledgeEdge } => c !== null)
    },

    otherConnectionsForKnowledge: (storeState) => (knowledgeNodeId: string, excludeEdgeId: string) => {
      return storeState.edges.filter(
        e => e.knowledgeNodeId === knowledgeNodeId && e.id !== excludeEdgeId
      )
    },
  },

  actions: {
    async load() {
      const { collection, query, where, getDocs, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return

      this.loading = true
      try {
        const readFirstAvailable = async (
          primary: 'knowledgeNodes' | 'knowledgeEdges',
          fallback: 'graphNodes' | 'graphEdges'
        ) => {
          try {
            const snap = await getDocs(query(collection(db, primary), where('userId', '==', userId)))
            return { snap, used: primary }
          } catch {
            const snap = await getDocs(query(collection(db, fallback), where('userId', '==', userId)))
            return { snap, used: fallback }
          }
        }

        const [nodesResult, edgesResult] = await Promise.all([
          readFirstAvailable('knowledgeNodes', 'graphNodes'),
          readFirstAvailable('knowledgeEdges', 'graphEdges'),
        ])
        this.nodes = nodesResult.snap.docs.map(d => ({
          ...(d.data() as Omit<KnowledgeNode, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
          certaintyDate: d.data().certaintyDate?.toDate?.() ?? new Date(),
        }))
        this.nodeCollectionsById = Object.fromEntries(
          this.nodes.map((n) => [n.id, nodesResult.used as 'knowledgeNodes' | 'graphNodes'])
        )

        this.edges = edgesResult.snap.docs.map(d => ({
          ...(d.data() as Omit<KnowledgeEdge, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
        }))
        this.edgeCollectionsById = Object.fromEntries(
          this.edges.map((e) => [e.id, edgesResult.used as 'knowledgeEdges' | 'graphEdges'])
        )
        this.bootstrapped = true
      } catch (err) {
        useNotificationStore().error(storeT('knowledge.loadError'))
        throw err
      } finally {
        this.loading = false
      }
    },

    async create(
      partial: Omit<KnowledgeNode, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'type' | 'entityId'>
    ): Promise<KnowledgeNode | undefined> {
      const { collection, addDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return undefined

      const payload = {
        userId,
        ...partial,
        type: 'knowledge' as const,
        entityId: null,
        label: partial.content.slice(0, 60),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      let ref: { id: string }
      let usedCollection: 'knowledgeNodes' | 'graphNodes' = 'knowledgeNodes'
      try {
        ref = await addDoc(collection(db, 'knowledgeNodes'), payload)
      } catch {
        ref = await addDoc(collection(db, 'graphNodes'), payload)
        usedCollection = 'graphNodes'
      }
      const node: KnowledgeNode = {
        ...partial,
        id: ref.id,
        userId,
        type: 'knowledge',
        entityId: null,
        label: partial.content.slice(0, 60),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      this.nodes.push(node)
      this.nodeCollectionsById[node.id] = usedCollection
      return node
    },

    async update(
      id: string,
      partial: Partial<Pick<KnowledgeNode, 'content' | 'subtype' | 'certainty' | 'certaintyDate' | 'tags' | 'label' | 'source' | 'sourceRef'>>
    ) {
      const { doc, updateDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const updateData: Record<string, unknown> = { ...partial, updatedAt: serverTimestamp() }
      if (partial.content) updateData.label = partial.content.slice(0, 60)
      const collectionName = this.nodeCollectionsById[id] || 'knowledgeNodes'
      await updateDoc(doc(db, collectionName, id), updateData)
      const idx = this.nodes.findIndex(n => n.id === id)
      if (idx !== -1) {
        const existing = this.nodes[idx]
        if (existing) {
          Object.assign(existing, {
            ...partial,
            ...(partial.content ? { label: partial.content.slice(0, 60) } : {}),
            updatedAt: new Date(),
          })
        }
      } else if (import.meta.env.DEV) {
        console.warn(`[knowledge] update: node ${id} not found in local state`)
      }
    },

    async delete(id: string) {
      const { doc, deleteDoc, collection, query, where, getDocs, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      try {
        const edgeCollection = this.nodeCollectionsById[id] === 'graphNodes' ? 'graphEdges' : 'knowledgeEdges'
        const nodeCollection = this.nodeCollectionsById[id] || 'knowledgeNodes'
        const edgeSnap = await getDocs(
          query(collection(db, edgeCollection), where('knowledgeNodeId', '==', id))
        )
        await Promise.all(edgeSnap.docs.map(d => deleteDoc(doc(db, edgeCollection, d.id))))
        await deleteDoc(doc(db, nodeCollection, id))
        // Only update local state after Firestore succeeds
        this.edges = this.edges.filter(e => e.knowledgeNodeId !== id)
        this.nodes = this.nodes.filter(n => n.id !== id)
      } catch (err) {
        useNotificationStore().error(storeT('knowledge.deleteError'))
        throw err
      }
    },

    async connect(
      knowledgeNodeId: string,
      entityType: NodeType,
      entityId: string,
      relationType: EdgeType,
      label?: string
    ): Promise<KnowledgeEdge | undefined> {
      const { collection, addDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const authStore = useAuthStore()
      const userId = authStore.user?.id
      if (!userId) return undefined

      const data: Record<string, unknown> = {
        userId, knowledgeNodeId, entityType, entityId, relationType,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }
      if (label !== undefined) data.label = label

      const preferred = this.nodeCollectionsById[knowledgeNodeId] === 'graphNodes' ? 'graphEdges' : 'knowledgeEdges'
      let ref: { id: string }
      let usedCollection: 'knowledgeEdges' | 'graphEdges' = preferred
      try {
        ref = await addDoc(collection(db, preferred), data)
      } catch {
        const fallback = preferred === 'knowledgeEdges' ? 'graphEdges' : 'knowledgeEdges'
        ref = await addDoc(collection(db, fallback), data)
        usedCollection = fallback
      }
      const edge: KnowledgeEdge = {
        id: ref.id, userId, knowledgeNodeId, entityType, entityId, relationType,
        ...(label !== undefined ? { label } : {}),
        createdAt: new Date(), updatedAt: new Date(),
      }
      this.edges.push(edge)
      this.edgeCollectionsById[edge.id] = usedCollection
      return edge
    },

    async disconnect(edgeId: string) {
      const { doc, deleteDoc, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      try {
        const collectionName = this.edgeCollectionsById[edgeId] || 'knowledgeEdges'
        await deleteDoc(doc(db, collectionName, edgeId))
        this.edges = this.edges.filter(e => e.id !== edgeId)
      } catch (err) {
        useNotificationStore().error(storeT('knowledge.deleteError'))
        throw err
      }
    },

    async updateConnection(edgeId: string, relationType: EdgeType, label?: string) {
      const { doc, updateDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const data: Record<string, unknown> = { relationType, updatedAt: serverTimestamp() }
      if (label !== undefined) data.label = label
      const collectionName = this.edgeCollectionsById[edgeId] || 'knowledgeEdges'
      await updateDoc(doc(db, collectionName, edgeId), data)
      const idx = this.edges.findIndex(e => e.id === edgeId)
      if (idx !== -1) {
        const existing = this.edges[idx]
        if (existing) {
          Object.assign(existing, {
            relationType,
            ...(label !== undefined ? { label } : {}),
            updatedAt: new Date(),
          })
        }
      } else if (import.meta.env.DEV) {
        console.warn(`[knowledge] updateConnection: edge ${edgeId} not found in local state`)
      }
    },
  },
})
