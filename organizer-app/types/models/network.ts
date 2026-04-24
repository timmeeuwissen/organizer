export type NodeType =
  | 'person' | 'project' | 'task' | 'behavior'
  | 'meeting' | 'team' | 'coaching' | 'knowledge'

export type EdgeType =
  | 'member' | 'assignee' | 'contains' | 'participant'
  | 'references' | 'related' | 'subtask' | 'stakeholder'
  | 'action-plan' | 'reason' | string

export type KnowledgeSubtype =
  | 'observation' | 'concept' | 'reason' | 'fact' | 'insight' | 'pattern' | 'decision'

export type KnowledgeSource = 'manual' | 'ai' | 'email' | 'note'

export interface GraphNode {
  id: string
  userId: string
  type: NodeType
  entityId: string | null // ID in source store; null for knowledge nodes
  label: string
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeNode extends GraphNode {
  type: 'knowledge'
  entityId: null
  content: string
  subtype: KnowledgeSubtype
  source: KnowledgeSource
  sourceRef?: string
  certainty: number // 0.0–1.0
  certaintyDate: Date
  tags: string[]
}

export interface GraphEdge {
  id: string
  userId: string
  sourceId: string
  targetId: string
  type: EdgeType
  label?: string
  createdAt: Date
  updatedAt: Date
}

export function isKnowledgeNode (node: GraphNode): node is KnowledgeNode {
  return node.type === 'knowledge'
}

export type { KnowledgeEdge } from '~/types/models/knowledge'
