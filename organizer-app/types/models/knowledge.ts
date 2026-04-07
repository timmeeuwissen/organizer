import type { NodeType, EdgeType } from '~/types/models/network'

export interface KnowledgeEdge {
  id: string
  userId: string
  knowledgeNodeId: string
  entityType: NodeType
  entityId: string
  relationType: EdgeType
  label?: string
  createdAt: Date
  updatedAt: Date
}
