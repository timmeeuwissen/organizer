/**
 * Teams module: independent groups of people (from People) with a Kanban-style
 * attention board (email v1). See docs/product/teams.md
 */

export type TeamColumnLayoutMode = 'alphabetical' | 'manual' | 'drag'

export interface Team {
  id: string
  userId: string
  name: string
  description?: string
  /** How column order is determined; manual and drag both persist order in memberPersonIds */
  columnLayoutMode: TeamColumnLayoutMode
  /** Person IDs in column order (when manual or drag); when alphabetical, display order is by name */
  memberPersonIds: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Manual column assignment + optional project link for an email on a team board.
 * Auto-matched emails (sender email === person email) do not require a row unless project is set.
 */
export interface TeamMailMeta {
  id: string
  userId: string
  teamId: string
  accountId: string
  emailId: string
  personId: string
  projectId?: string | null
  createdAt: Date
  updatedAt: Date
}
