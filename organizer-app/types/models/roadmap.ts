export interface RoadmapPhase {
  id: string;
  title: string;
  color: string; // Vuetify color name e.g. 'amber', 'blue-lighten-2'
  startDate: Date;
  endDate: Date;
  order: number;
}

export interface RoadmapActivityLink {
  module: 'tasks' | 'meetings' | 'notes';
  id: string;
  title: string;
}

export interface RoadmapActivity {
  id: string;
  title: string;
  color: string;
  startDate: Date;
  endDate: Date;
  order: number; // row position, 0-based
  phaseId?: string;
  links: RoadmapActivityLink[];
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  description?: string; // shown in v-tooltip
  date: Date;
  color: string;
  activityId?: string; // omitted → rendered in dedicated "Milestones" row below activity rows
}

export type RoadmapGranularity = 'day' | 'week' | 'month' | 'quarter'

export interface Roadmap {
  id: string;
  projectId: string;
  userId: string;
  granularity: RoadmapGranularity;
  phases: RoadmapPhase[];
  activities: RoadmapActivity[];
  milestones: RoadmapMilestone[];
  createdAt: Date;
  updatedAt: Date;
}
