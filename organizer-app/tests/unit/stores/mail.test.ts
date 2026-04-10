import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => new Date('2026-01-01')),
  getFirestore: vi.fn(() => ({})),
  Timestamp: { fromDate: (d: Date) => d, now: () => new Date() }
}))

vi.mock('~/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'u1' },
    currentUser: { id: 'u1', settings: { integrationAccounts: [] } },
    updateUserSettings: vi.fn()
  }))
}))

vi.mock('~/stores/notification', () => ({
  useNotificationStore: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }))
}))

vi.mock('~/utils/api/emailUtils', () => ({
  hasValidOAuthTokens: vi.fn(() => true),
  refreshOAuthToken: vi.fn(() => Promise.resolve('new-token'))
}))

vi.mock('~/utils/api/mailProviders', () => ({
  getMailProvider: vi.fn(() => ({
    isAuthenticated: vi.fn(() => false),
    authenticate: vi.fn(() => Promise.resolve(false)),
    fetchEmails: vi.fn(() => Promise.resolve({ emails: [], totalCount: 0, page: 0, pageSize: 20, hasMore: false })),
    sendEmail: vi.fn(() => Promise.resolve(true)),
    getFolderCounts: vi.fn(() => Promise.resolve({})),
    countEmails: vi.fn(() => Promise.resolve(0))
  }))
}))

vi.mock('~/config/mailUi', () => ({
  normalizeMailPageSize: vi.fn((size: number) => size || 20)
}))

describe('useMailStore — initial state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with the correct default folders', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()

    expect(store.folders).toHaveLength(5)
    const folderIds = store.folders.map(f => f.id)
    expect(folderIds).toContain('inbox')
    expect(folderIds).toContain('sent')
    expect(folderIds).toContain('drafts')
    expect(folderIds).toContain('trash')
    expect(folderIds).toContain('spam')
  })

  it('initializes with empty emails array and currentFolder as inbox', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()

    expect(store.emails).toEqual([])
    expect(store.currentFolder).toBe('inbox')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('initializes pagination state to sensible defaults', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()

    expect(store.currentPage).toBe(0)
    expect(store.pageSize).toBe(20)
    expect(store.totalEmails).toBe(0)
    expect(store.hasMoreEmails).toBe(false)
  })
})

describe('useMailStore — pure state mutations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('markEmailAsRead updates the read flag in local state', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    store.emails = [
      {
        id: 'email-1',
        subject: 'Hello',
        from: { name: 'Alice', email: 'alice@example.com' },
        to: [],
        body: '',
        date: new Date(),
        read: false,
        folder: 'inbox'
      }
    ]

    store.markEmailAsRead('email-1', true)

    expect(store.emails[0].read).toBe(true)
  })

  it('markEmailAsRead with false marks email as unread', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    store.emails = [
      {
        id: 'email-1',
        subject: 'Hello',
        from: { name: 'Alice', email: 'alice@example.com' },
        to: [],
        body: '',
        date: new Date(),
        read: true,
        folder: 'inbox'
      }
    ]

    store.markEmailAsRead('email-1', false)

    expect(store.emails[0].read).toBe(false)
  })

  it('moveEmailToFolder updates the folder property', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    store.emails = [
      {
        id: 'email-1',
        subject: 'Hello',
        from: { name: 'Alice', email: 'alice@example.com' },
        to: [],
        body: '',
        date: new Date(),
        read: false,
        folder: 'inbox'
      }
    ]

    store.moveEmailToFolder('email-1', 'trash')

    expect(store.emails[0].folder).toBe('trash')
  })

  it('deleteEmail moves a non-trash email to trash', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    store.emails = [
      {
        id: 'email-1',
        subject: 'Hello',
        from: { name: 'Alice', email: 'alice@example.com' },
        to: [],
        body: '',
        date: new Date(),
        read: false,
        folder: 'inbox'
      }
    ]

    store.deleteEmail('email-1')

    expect(store.emails[0].folder).toBe('trash')
    expect(store.emails).toHaveLength(1)
  })

  it('deleteEmail permanently removes a trash email', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    store.emails = [
      {
        id: 'email-1',
        subject: 'Hello',
        from: { name: 'Alice', email: 'alice@example.com' },
        to: [],
        body: '',
        date: new Date(),
        read: false,
        folder: 'trash'
      }
    ]

    store.deleteEmail('email-1')

    expect(store.emails).toHaveLength(0)
  })
})

describe('useMailStore — fetchEmails with no connected accounts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('returns empty emails when no accounts are connected', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    await store.fetchEmails()

    expect(store.emails).toEqual([])
    expect(store.totalEmails).toBe(0)
    expect(store.hasMoreEmails).toBe(false)
    expect(store.loading).toBe(false)
  })
})

describe('useMailStore — getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('getEmailsByFolder filters emails to the requested folder', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    store.emails = [
      { id: 'e1', subject: 'A', from: { name: 'X', email: 'x@x.com' }, to: [], body: '', date: new Date(), read: true, folder: 'inbox' },
      { id: 'e2', subject: 'B', from: { name: 'Y', email: 'y@y.com' }, to: [], body: '', date: new Date(), read: false, folder: 'sent' }
    ]

    const inboxEmails = store.getEmailsByFolder('inbox')
    expect(inboxEmails).toHaveLength(1)
    expect(inboxEmails[0].id).toBe('e1')
  })

  it('getUnreadCountByFolder returns local unread count when no server counts', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    store.emails = [
      { id: 'e1', subject: 'A', from: { name: 'X', email: 'x@x.com' }, to: [], body: '', date: new Date(), read: false, folder: 'inbox' },
      { id: 'e2', subject: 'B', from: { name: 'Y', email: 'y@y.com' }, to: [], body: '', date: new Date(), read: true, folder: 'inbox' }
    ]

    expect(store.getUnreadCountByFolder('inbox')).toBe(1)
  })

  it('paginationInfo returns correct totalPages calculation', async () => {
    const { useMailStore } = await import('~/stores/mail')
    const store = useMailStore()
    store.totalEmails = 45
    store.pageSize = 20

    expect(store.paginationInfo.totalPages).toBe(3)
    expect(store.paginationInfo.totalEmails).toBe(45)
  })
})
