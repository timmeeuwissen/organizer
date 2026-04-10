import type { NodeType } from '~/types/models/network'

export const NODE_COLORS: Record<NodeType, string> = {
  person: '#89b4fa',
  project: '#a6e3a1',
  task: '#f38ba8',
  behavior: '#fab387',
  meeting: '#cba6f7',
  team: '#f9e2af',
  coaching: '#94e2d5',
  knowledge: '#eba0ac'
}

// Base size; actual rendered size also scales with node degree
export const NODE_BASE_SIZES: Record<NodeType, number> = {
  person: 6,
  project: 8,
  task: 4,
  behavior: 5,
  meeting: 5,
  team: 7,
  coaching: 5,
  knowledge: 5
}

export const GRAPH_DEFAULTS = {
  depth: 2,
  minCertainty: 0.6,
  maxContextTokens: 800,
  aiInsightCertainty: 0.7
} as const
