import type { Team, Person, TeamMailMeta, Task } from '~/types/models'
import type { Email } from '~/stores/mail'
import {
  resolveEmailPersonId,
  emailAttentionWeight,
} from '~/stores/teams'

/** Unified Kanban item on the team attention board */
export type TeamBoardItem =
  | {
      kind: 'email'
      email: Email
      personId: string
      projectId: string | null
      weight: number
      assignment: 'auto' | 'manual'
    }
  | {
      kind: 'task'
      task: Task
      personId: string
      weight: number
    }

function emailInInbox(email: Email): boolean {
  return email.folder === 'inbox'
}

/**
 * Whether to surface this email on the board for the resolved person.
 * Manual assignment (teamMailMeta row): always in inbox. Auto (sender matches contact): unread only.
 */
export function shouldShowEmailOnBoard(
  email: Email,
  resolvedPersonId: string | null,
  meta: TeamMailMeta | undefined,
  memberIds: Set<string>,
): resolvedPersonId is string {
  if (!resolvedPersonId || !memberIds.has(resolvedPersonId)) return false
  if (!emailInInbox(email)) return false
  if (meta) return true
  return !email.read
}

/** Person whose column should show this task (assignee / assignedTo / delegated flow). */
export function taskColumnPersonId(task: Task): string | null {
  if (task.status === 'delegated' && task.delegatedTo) {
    return task.delegatedTo
  }
  return task.assignee || task.assignedTo || task.delegatedTo || null
}

export function taskPrimaryProjectId(task: Task): string | null {
  if (task.projectId) return task.projectId
  if (task.relatedProjects?.length) return task.relatedProjects[0]
  return null
}

const ACTIVE_TASK_STATUSES: Task['status'][] = ['todo', 'inProgress', 'delegated']

export function shouldShowTaskOnBoard(task: Task, memberIds: Set<string>): boolean {
  const pid = taskColumnPersonId(task)
  if (!pid || !memberIds.has(pid)) return false
  return ACTIVE_TASK_STATUSES.includes(task.status)
}

/**
 * Weighted attention for tasks (aligns with email weighting idea: urgency / overdue).
 * Supports string priorities and numeric priorities used by TaskForm (1–5, lower = higher).
 */
export function taskAttentionWeight(task: Task): number {
  let w = 1
  if (task.status === 'inProgress') w += 1
  const pr = task.priority as string | number | undefined
  if (pr === 'urgent' || pr === 1 || pr === 2) w += 2
  else if (pr === 'high' || pr === 3) w += 1
  const due = task.dueDate
  if (due) {
    const ms = due.getTime() - Date.now()
    if (ms < 0) w += 2
    else if (ms < 24 * 60 * 60 * 1000) w += 1
  }
  return w
}

function itemSortKey(item: TeamBoardItem): number {
  if (item.kind === 'email') {
    return item.email.date.getTime()
  }
  const t = item.task
  return (t.dueDate?.getTime() ?? t.updatedAt.getTime())
}

export function buildEmailBoardItems(
  team: Team,
  emails: Email[],
  mailMeta: TeamMailMeta[],
  memberPeople: Person[],
): TeamBoardItem[] {
  const memberIds = new Set(team.memberPersonIds)
  const metaByKey = new Map<string, TeamMailMeta>()
  for (const m of mailMeta) {
    metaByKey.set(`${m.accountId}::${m.emailId}`, m)
  }

  const items: TeamBoardItem[] = []

  for (const email of emails) {
    const acc = email.accountId || ''
    const meta = metaByKey.get(`${acc}::${email.id}`)
    const resolved = resolveEmailPersonId(
      email.from.email,
      memberPeople,
      meta?.personId,
    )
    if (!shouldShowEmailOnBoard(email, resolved, meta, memberIds)) continue

    const assignment: 'auto' | 'manual' = meta ? 'manual' : 'auto'
    const projectId = meta?.projectId ?? null

    items.push({
      kind: 'email',
      email,
      personId: resolved,
      projectId,
      weight: emailAttentionWeight(email),
      assignment,
    })
  }

  return items.sort((a, b) => itemSortKey(b) - itemSortKey(a))
}

export function buildTaskBoardItems(team: Team, tasks: Task[]): TeamBoardItem[] {
  const memberIds = new Set(team.memberPersonIds)
  const items: TeamBoardItem[] = []

  for (const task of tasks) {
    if (!shouldShowTaskOnBoard(task, memberIds)) continue
    const personId = taskColumnPersonId(task)
    if (!personId) continue
    items.push({
      kind: 'task',
      task,
      personId,
      weight: taskAttentionWeight(task),
    })
  }

  return items.sort((a, b) => itemSortKey(b) - itemSortKey(a))
}

/** All board items for a team (emails + tasks), sorted by recency / due. */
export function buildAllBoardItems(
  team: Team,
  emails: Email[],
  mailMeta: TeamMailMeta[],
  memberPeople: Person[],
  tasks: Task[],
): TeamBoardItem[] {
  const emailItems = buildEmailBoardItems(team, emails, mailMeta, memberPeople)
  const taskItems = buildTaskBoardItems(team, tasks)
  return [...emailItems, ...taskItems].sort((a, b) => itemSortKey(b) - itemSortKey(a))
}

/** @deprecated use buildEmailBoardItems */
export function buildBoardCards(
  team: Team,
  emails: Email[],
  mailMeta: TeamMailMeta[],
  memberPeople: Person[],
): TeamBoardItem[] {
  return buildEmailBoardItems(team, emails, mailMeta, memberPeople)
}

export function boardItemsByPersonId(items: TeamBoardItem[]): Record<string, TeamBoardItem[]> {
  const out: Record<string, TeamBoardItem[]> = {}
  for (const c of items) {
    if (!out[c.personId]) out[c.personId] = []
    out[c.personId].push(c)
  }
  return out
}

/** @deprecated use boardItemsByPersonId */
export function cardsByPersonId(items: TeamBoardItem[]): Record<string, TeamBoardItem[]> {
  return boardItemsByPersonId(items)
}

export function totalAttentionWeight(items: TeamBoardItem[]): number {
  return items.reduce((sum, c) => sum + c.weight, 0)
}

/** Column order: alphabetical by display name, or manual/drag = memberPersonIds order */
export function orderedTeamMembers(team: Team, peopleById: Map<string, Person>): Person[] {
  const members: Person[] = []
  for (const id of team.memberPersonIds) {
    const p = peopleById.get(id)
    if (p) members.push(p)
  }
  if (team.columnLayoutMode === 'alphabetical') {
    return [...members].sort((a, b) => {
      const na = `${a.firstName} ${a.lastName}`.trim().toLowerCase()
      const nb = `${b.firstName} ${b.lastName}`.trim().toLowerCase()
      return na.localeCompare(nb)
    })
  }
  return members
}

/** Emails in inbox that could be manually assigned (not yet shown on board) */
export function unassignedInboxEmails(
  emails: Email[],
  team: Team,
  mailMeta: TeamMailMeta[],
  memberPeople: Person[],
): Email[] {
  const memberIds = new Set(team.memberPersonIds)
  const metaByKey = new Map<string, TeamMailMeta>()
  for (const m of mailMeta) {
    metaByKey.set(`${m.accountId}::${m.emailId}`, m)
  }

  return emails.filter((email) => {
    if (!emailInInbox(email)) return false
    const acc = email.accountId || ''
    const meta = metaByKey.get(`${acc}::${email.id}`)
    const resolved = resolveEmailPersonId(email.from.email, memberPeople, meta?.personId)
    const shown =
      resolved &&
      memberIds.has(resolved) &&
      shouldShowEmailOnBoard(email, resolved, meta, memberIds)
    return !shown
  })
}
