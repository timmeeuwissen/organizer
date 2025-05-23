export interface CoachingHistoryLogEntry {
  date: Date
  intensity?: number
  status?: string
  progression?: number
  notes: string
}

export interface CoachingStrengthWeakness {
  id: string
  type: 'strength' | 'weakness'
  description: string
  intensity: number
  notes: string
  historyLog: CoachingHistoryLogEntry[]
  createdAt: Date
  updatedAt: Date
}

export interface CoachingGoal {
  id: string
  title: string
  description: string
  status: 'notStarted' | 'inProgress' | 'completed' | 'cancelled'
  progression: number
  targetDate?: Date | null
  completedDate?: Date | null
  historyLog: CoachingHistoryLogEntry[]
  createdAt: Date
  updatedAt: Date
}

export interface CoachingTimelineEntry {
  id: string
  date: Date
  notes: string
  relatedGoals: string[]
  relatedStrengthsWeaknesses: string[]
  createdAt: Date
  updatedAt: Date
}

export interface CoachingRecord {
  id: string
  userId: string
  personId: string
  title: string
  notes?: string
  icon: string
  color: string
  strengths: CoachingStrengthWeakness[]
  weaknesses: CoachingStrengthWeakness[]
  goals: CoachingGoal[]
  timeline: CoachingTimelineEntry[]
  relatedTasks: string[]
  createdAt: Date
  updatedAt: Date
}
