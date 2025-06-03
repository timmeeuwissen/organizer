export interface KnowledgeDocument {
  id: string
  userId: string
  title: string
  description?: string
  tags: string[]
  content: string
  createdAt: Date
  updatedAt: Date
}
