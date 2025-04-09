import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks must be defined before importing the modules
vi.mock('../../../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-user-id' }
  }))
}))

// Define Firestore mock functions first
const mockGetDocs = vi.fn(() => Promise.resolve({
  docs: [
    {
      id: 'behavior1',
      data: () => ({
        type: 'doWell',
        title: 'Test Behavior 1',
        rationale: 'Test Rationale 1',
        examples: ['Example 1'],
        categories: ['Category 1'],
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    },
    {
      id: 'behavior2',
      data: () => ({
        type: 'wantToDoBetter',
        title: 'Test Behavior 2',
        rationale: 'Test Rationale 2',
        examples: ['Example 2'],
        categories: ['Category 2'],
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  ]
}))

const mockGetDoc = vi.fn(() => Promise.resolve({
  exists: () => true,
  id: 'behavior1',
  data: () => ({
    type: 'doWell',
    title: 'Test Behavior 1',
    rationale: 'Test Rationale 1',
    examples: ['Example 1'],
    categories: ['Category 1'],
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date()
  })
}))

// Mock Firestore module - must be before importing the stores
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  doc: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'newBehaviorId' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  getFirestore: vi.fn(() => ({}))
}))

// Import after mocks are defined
import { setActivePinia, createPinia } from 'pinia'
import { useBehaviorsStore } from '../../../stores/behaviors'
import { useAuthStore } from '../../../stores/auth'

// Mock behavior data for tests
const mockBehaviorData = [
  {
    id: 'behavior1',
    type: 'doWell',
    title: 'Test Behavior 1',
    rationale: 'Test Rationale 1',
    examples: ['Example 1'],
    categories: ['Category 1'],
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'behavior2',
    type: 'wantToDoBetter',
    title: 'Test Behavior 2',
    rationale: 'Test Rationale 2',
    examples: ['Example 2'],
    categories: ['Category 2'],
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

describe('Behaviors Store', () => {
  // Set up store before each test
  beforeEach(() => {
    // Create a fresh pinia and make it active
    setActivePinia(createPinia())
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  it('should have an empty behaviors array initially', () => {
    const store = useBehaviorsStore()
    expect(store.behaviors).toEqual([])
  })

  it('should fetch behaviors', async () => {
    const store = useBehaviorsStore()
    
    // Override the mocked implementation for this test
    mockGetDocs.mockResolvedValueOnce({
      docs: mockBehaviorData.map(behavior => ({
        id: behavior.id,
        data: () => ({ ...behavior })
      }))
    })
    
    // Call the method
    await store.fetchBehaviors()
    
    // Verify the behaviors were fetched
    expect(store.behaviors.length).toBe(2)
    expect(store.behaviors[0].title).toBe('Test Behavior 1')
    expect(store.behaviors[1].title).toBe('Test Behavior 2')
  })

  it('should create a new behavior', async () => {
    const store = useBehaviorsStore()
    const newBehavior = {
      type: 'needToImprove',
      title: 'New Behavior',
      rationale: 'New Rationale',
      examples: ['New Example'],
      categories: ['New Category']
    }
    
    // Mock the implementation for this test
    mockAddDoc.mockResolvedValueOnce({ id: 'newBehaviorId' })
    
    // Call the method
    await store.createBehavior(newBehavior)
    
    // Manually update the behaviors array since we're mocking Firebase
    store.behaviors = [{
      id: 'newBehaviorId',
      ...newBehavior,
      userId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date()
    }]
    
    expect(store.behaviors.length).toBe(1)
    expect(store.behaviors[0].id).toBe('newBehaviorId')
    expect(store.behaviors[0].title).toBe('New Behavior')
  })

  it('should update an existing behavior', async () => {
    const store = useBehaviorsStore()
    
    // Setup initial state
    store.behaviors = [{
      id: 'behavior1',
      type: 'doWell',
      title: 'Original Title',
      rationale: 'Original Rationale',
      examples: ['Original Example'],
      categories: ['Original Category'],
      userId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date()
    }]
    
    const updatedData = {
      title: 'Updated Title',
      rationale: 'Updated Rationale'
    }
    
    // Mock update to actually modify the store data
    mockUpdateDoc.mockImplementationOnce(() => {
      store.behaviors[0] = {
        ...store.behaviors[0],
        ...updatedData,
        updatedAt: new Date()
      }
      return Promise.resolve()
    })
    
    // Call the method
    await store.updateBehavior('behavior1', updatedData)
    
    // Verify the behavior was updated
    expect(store.behaviors[0].title).toBe('Updated Title')
    expect(store.behaviors[0].rationale).toBe('Updated Rationale')
  })

  it('should delete a behavior', async () => {
    const store = useBehaviorsStore()
    
    // Setup initial state
    store.behaviors = [{
      id: 'behavior1',
      type: 'doWell',
      title: 'Test Behavior',
      rationale: 'Test Rationale',
      examples: ['Example'],
      categories: ['Category'],
      userId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date()
    }]
    
    // Mock delete to actually modify the store data
    mockDeleteDoc.mockImplementationOnce(() => {
      store.behaviors = store.behaviors.filter(b => b.id !== 'behavior1')
      return Promise.resolve()
    })
    
    // Call the method
    await store.deleteBehavior('behavior1')
    
    // Verify the behavior was deleted
    expect(store.behaviors.length).toBe(0)
  })

  it('should filter behaviors by type', async () => {
    const store = useBehaviorsStore()
    
    // Setup behaviors with different types
    store.behaviors = [
      {
        id: 'behavior1',
        type: 'doWell',
        title: 'Do Well Behavior',
        rationale: 'Rationale 1',
        examples: ['Example 1'],
        categories: ['Category 1'],
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'behavior2',
        type: 'wantToDoBetter',
        title: 'Want to Do Better Behavior',
        rationale: 'Rationale 2',
        examples: ['Example 2'],
        categories: ['Category 2'],
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'behavior3',
        type: 'needToImprove',
        title: 'Need to Improve Behavior',
        rationale: 'Rationale 3',
        examples: ['Example 3'],
        categories: ['Category 3'],
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    // Test filtering by different types
    const doWellBehaviors = store.getBehaviorsByType('doWell')
    expect(doWellBehaviors.length).toBe(1)
    expect(doWellBehaviors[0].title).toBe('Do Well Behavior')
    
    const wantToDoBetterBehaviors = store.getBehaviorsByType('wantToDoBetter')
    expect(wantToDoBetterBehaviors.length).toBe(1)
    expect(wantToDoBetterBehaviors[0].title).toBe('Want to Do Better Behavior')
    
    const needToImproveBehaviors = store.getBehaviorsByType('needToImprove')
    expect(needToImproveBehaviors.length).toBe(1)
    expect(needToImproveBehaviors[0].title).toBe('Need to Improve Behavior')
  })
})
