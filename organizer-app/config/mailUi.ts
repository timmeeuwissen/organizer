/**
 * Mail module table UI: page sizes and column definitions (read from code, not hard-coded in components).
 */

export const MAIL_PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 50, 100] as const

export type MailPageSize = (typeof MAIL_PAGE_SIZE_OPTIONS)[number]

export type MailColumnKey =
  | 'read'
  | 'from'
  | 'fromEmail'
  | 'to'
  | 'subject'
  | 'date'
  | 'attachments'
  | 'account'
  | 'people'
  | 'actions'

export interface MailTableColumnDef {
  key: MailColumnKey
  /** i18n key under mail.columns.* */
  titleKey: string
  defaultVisible: boolean
  sortable?: boolean
  width?: string
  /** When false, column is always shown (not listed in the column picker). */
  optional?: boolean
}

export const MAIL_TABLE_COLUMNS: MailTableColumnDef[] = [
  { key: 'read', titleKey: 'mail.columns.read', defaultVisible: true, sortable: false, width: '44px', optional: true },
  { key: 'from', titleKey: 'mail.columns.from', defaultVisible: true, sortable: true, optional: true },
  { key: 'fromEmail', titleKey: 'mail.columns.fromEmail', defaultVisible: false, sortable: false, optional: true },
  { key: 'to', titleKey: 'mail.columns.to', defaultVisible: false, sortable: false, optional: true },
  { key: 'subject', titleKey: 'mail.columns.subject', defaultVisible: true, sortable: true, optional: true },
  { key: 'date', titleKey: 'mail.columns.date', defaultVisible: true, sortable: true, width: '150px', optional: true },
  {
    key: 'attachments',
    titleKey: 'mail.columns.attachments',
    defaultVisible: true,
    sortable: false,
    width: '48px',
    optional: true,
  },
  { key: 'account', titleKey: 'mail.columns.account', defaultVisible: true, sortable: false, width: '120px', optional: true },
  { key: 'people', titleKey: 'mail.columns.people', defaultVisible: true, sortable: false, width: '56px', optional: true },
  { key: 'actions', titleKey: 'mail.columns.actions', defaultVisible: true, sortable: false, width: '100px', optional: false },
]

export function defaultMailColumnVisibility(): Record<MailColumnKey, boolean> {
  const r = {} as Record<MailColumnKey, boolean>
  for (const c of MAIL_TABLE_COLUMNS) {
    r[c.key] = c.defaultVisible
  }
  return r
}

export function mergeMailColumnVisibility(
  saved?: Partial<Record<MailColumnKey, boolean>>
): Record<MailColumnKey, boolean> {
  const base = defaultMailColumnVisibility()
  if (!saved) {
    return base
  }
  for (const k of Object.keys(saved) as MailColumnKey[]) {
    if (k in base && typeof saved[k] === 'boolean') {
      base[k] = saved[k]!
    }
  }
  return base
}

export function normalizeMailPageSize(n: unknown): MailPageSize {
  const num = typeof n === 'number' ? n : Number(n)
  if (Number.isFinite(num) && (MAIL_PAGE_SIZE_OPTIONS as readonly number[]).includes(num)) {
    return num as MailPageSize
  }
  return 20
}

export const MAIL_COLUMNS_FOR_PICKER = MAIL_TABLE_COLUMNS.filter((c) => c.optional !== false)
