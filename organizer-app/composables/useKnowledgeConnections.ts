// composables/useKnowledgeConnections.ts
import { computed, isRef } from 'vue'
import type { Ref } from 'vue'
import { useKnowledgeStore } from '~/stores/knowledge'
import type { KnowledgeNode, NodeType, EdgeType } from '~/types/models/network'
import type { KnowledgeEdge } from '~/types/models/knowledge'

export interface KnowledgeConnectionRow {
  knowledge: KnowledgeNode
  edge: KnowledgeEdge
  otherConnections: Array<{
    entityType: NodeType
    entityId: string
    relationType: EdgeType
    label?: string
    edgeId: string
  }>
}

export function useKnowledgeConnections(
  nodeType: NodeType,
  entityId: Ref<string> | string
) {
  const knowledgeStore = useKnowledgeStore()
  const id = computed(() => (isRef(entityId) ? entityId.value : entityId))

  const connections = computed((): KnowledgeConnectionRow[] => {
    return knowledgeStore
      .connectionsForEntity(nodeType, id.value)
      .map(({ knowledge, edge }) => ({
        knowledge,
        edge,
        otherConnections: knowledgeStore
          .otherConnectionsForKnowledge(knowledge.id, edge.id)
          .map(e => ({
            entityType: e.entityType,
            entityId: e.entityId,
            relationType: e.relationType,
            label: e.label,
            edgeId: e.id,
          })),
      }))
  })

  async function addKnowledge(
    nodeData: Omit<KnowledgeNode, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'type' | 'entityId'>,
    relationType: EdgeType,
    label?: string
  ): Promise<KnowledgeNode | undefined> {
    const node = await knowledgeStore.create(nodeData)
    if (!node) return undefined
    await knowledgeStore.connect(node.id, nodeType, id.value, relationType, label)
    return node
  }

  async function editKnowledge(
    knowledgeId: string,
    partial: Partial<Pick<KnowledgeNode, 'content' | 'subtype' | 'certainty' | 'certaintyDate' | 'tags' | 'label'>>
  ) {
    await knowledgeStore.update(knowledgeId, partial)
  }

  async function editRelation(edgeId: string, relationType: EdgeType, label?: string) {
    await knowledgeStore.updateConnection(edgeId, relationType, label)
  }

  async function disconnect(edgeId: string) {
    await knowledgeStore.disconnect(edgeId)
  }

  async function removeKnowledge(knowledgeId: string) {
    await knowledgeStore.delete(knowledgeId)
  }

  return { connections, addKnowledge, editKnowledge, editRelation, disconnect, removeKnowledge }
}
