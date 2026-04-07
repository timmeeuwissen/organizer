// stores/knowledge.ts
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useNotificationStore } from './notification'
import type { KnowledgeNode, NodeType, EdgeType } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'

export const useKnowledgeStore = defineStore('knowledge', {
  persist: true,

  state: () => ({
    nodes: [] as KnowledgeNode[],
    edges: [] as KnowledgeEdge[],
    loading: false,
    bootstrapped: false,
  }),

  getters: {
    connectionsForEntity: (state) => (entityType: NodeType, entityId: string) => {
      const linked = state.edges.filter(
        e => e.entityType === entityType && e.entityId === entityId
      )
      return linked
        .map(edge => {
          const knowledge = state.nodes.find(n => n.id === edge.knowledgeNodeId)
          return knowledge ? { knowledge, edge } : null
        })
        .filter((c): c is { knowledge: KnowledgeNode; edge: KnowledgeEdge } => c !== null)
    },

    otherConnectionsForKnowledge: (state) => (knowledgeNodeId: string, excludeEdgeId: string) => {
      return state.edges.filter(
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
        const [nodeSnap, edgeSnap] = await Promise.all([
          getDocs(query(collection(db, 'knowledgeNodes'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'knowledgeEdges'), where('userId', '==', userId))),
        ])
        this.nodes = nodeSnap.docs.map(d => ({
          ...(d.data() as Omit<KnowledgeNode, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
          certaintyDate: d.data().certaintyDate?.toDate?.() ?? new Date(),
        }))
        this.edges = edgeSnap.docs.map(d => ({
          ...(d.data() as Omit<KnowledgeEdge, 'id'>),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() ?? new Date(),
        }))
        this.bootstrapped = true
      } catch (err) {
        useNotificationStore().error('knowledge.loadError')
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

      const ref = await addDoc(collection(db, 'knowledgeNodes'), {
        userId,
        type: 'knowledge' as const,
        entityId: null,
        ...partial,
        label: partial.content.slice(0, 60),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      const node: KnowledgeNode = {
        id: ref.id,
        userId,
        type: 'knowledge',
        entityId: null,
        label: partial.content.slice(0, 60),
        ...partial,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      this.nodes.push(node)
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
      await updateDoc(doc(db, 'knowledgeNodes', id), updateData)
      const idx = this.nodes.findIndex(n => n.id === id)
      if (idx !== -1) {
        Object.assign(this.nodes[idx], {
          ...partial,
          ...(partial.content ? { label: partial.content.slice(0, 60) } : {}),
          updatedAt: new Date(),
        })
      }
    },

    async delete(id: string) {
      const { doc, deleteDoc, collection, query, where, getDocs, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const edgeSnap = await getDocs(
        query(collection(db, 'knowledgeEdges'), where('knowledgeNodeId', '==', id))
      )
      await Promise.all(edgeSnap.docs.map(d => deleteDoc(doc(db, 'knowledgeEdges', d.id))))
      await deleteDoc(doc(db, 'knowledgeNodes', id))
      this.edges = this.edges.filter(e => e.knowledgeNodeId !== id)
      this.nodes = this.nodes.filter(n => n.id !== id)
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

      const ref = await addDoc(collection(db, 'knowledgeEdges'), data)
      const edge: KnowledgeEdge = {
        id: ref.id, userId, knowledgeNodeId, entityType, entityId, relationType,
        ...(label !== undefined ? { label } : {}),
        createdAt: new Date(), updatedAt: new Date(),
      }
      this.edges.push(edge)
      return edge
    },

    async disconnect(edgeId: string) {
      const { doc, deleteDoc, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      await deleteDoc(doc(db, 'knowledgeEdges', edgeId))
      this.edges = this.edges.filter(e => e.id !== edgeId)
    },

    async updateConnection(edgeId: string, relationType: EdgeType, label?: string) {
      const { doc, updateDoc, serverTimestamp, getFirestore } = await import('firebase/firestore')
      const db = getFirestore()
      const data: Record<string, unknown> = { relationType, updatedAt: serverTimestamp() }
      if (label !== undefined) data.label = label
      await updateDoc(doc(db, 'knowledgeEdges', edgeId), data)
      const idx = this.edges.findIndex(e => e.id === edgeId)
      if (idx !== -1) {
        Object.assign(this.edges[idx], {
          relationType,
          ...(label !== undefined ? { label } : {}),
          updatedAt: new Date(),
        })
      }
    },
  },
})
