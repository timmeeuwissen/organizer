export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Behavior {
  id: string;
  userId: string;
  title: string;
  description: string;
  rationale: string;
  type: 'doWell' | 'wantToDoBetter' | 'needToImprove';
  examples: string[];
  actionPlans?: {
    description: string;
    tasks: string[]; // Task IDs
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  team?: string;
  notes?: string;
  tags?: string[];
  relatedProjects?: string[]; // Project IDs
  lastContacted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'notStarted' | 'inProgress' | 'onHold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  startDate?: Date;
  completedDate?: Date;
  teamMembers?: string[]; // Person IDs
  tasks?: string[]; // Task IDs
  progress: number; // 0-100
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'todo' | 'inProgress' | 'completed' | 'delegated' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  completedDate?: Date;
  assignee?: string; // Person ID
  delegatedTo?: string; // Person ID
  projectId?: string; // Project ID
  parent?: string; // Parent task ID
  subtasks?: string[]; // Task IDs
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Meeting {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  participants: string[]; // Person IDs
  summary?: string;
  tasks: string[]; // Task IDs
  relatedProjects?: string[]; // Project IDs
  category?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Statistics {
  id: string;
  userId: string;
  period: 'day' | 'week' | 'month' | 'year';
  date: Date;
  projectsStats: {
    projectId: string;
    timeSpent: number; // in minutes
    tasksCompleted: number;
  }[];
  behaviorsStats: {
    behaviorId: string;
    occurrences: number;
  }[];
  tasksStats: {
    completed: number;
    added: number;
    overdue: number;
  };
  meetingsStats: {
    total: number;
    timeSpent: number; // in minutes
  };
  createdAt: Date;
  updatedAt: Date;
}
