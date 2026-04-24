import type { AIAnalysisResult } from './aiIntegration'

export interface AICallMetadata {
  provider: string
  durationMs: number
  model?: string
  tokenUsage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export interface AIHistoryEntry {
  id?: string
  timestamp: Date
  inputText: string
  result: AIAnalysisResult
  metadata: AICallMetadata
  userId?: string
}
