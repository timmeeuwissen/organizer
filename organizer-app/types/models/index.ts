export interface IntegrationOAuthData {
  accessToken?: string; // OAuth access token
  refreshToken?: string; // OAuth refresh token
  tokenExpiry?: Date; // When the access token expires
  clientId?: string; // For storing app-specific client ID if needed
  clientSecret?: string; // For storing app-specific client secret if needed
  scope?: string; // OAuth scopes that were granted
  connected: boolean;
  lastSync?: Date;
  email: string; // Email from the provider
  name: string; // Account name from the provider
}

export interface IntegrationAccount {
  id: string;
  type: 'exchange' | 'google' | 'office365';
  color: string; // Color for visual identification in UI
  
  // Application-specific preferences
  syncCalendar: boolean;
  syncMail: boolean;
  syncTasks: boolean;
  syncContacts: boolean;
  showInCalendar: boolean;
  showInMail: boolean;
  showInTasks: boolean;
  showInContacts: boolean;
  
  // OAuth connection data stored separately
  oauthData: IntegrationOAuthData;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  defaultLanguage: string;
  darkMode: boolean;
  emailNotifications: boolean;
  calendarSync: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  integrationAccounts: IntegrationAccount[];
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  lastLogin?: Date;
  settings?: UserSettings;
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
  relatedMeetings?: string[]; // Meeting IDs
  relatedTasks?: string[]; // Task IDs
  lastContacted?: Date;
  // Provider information for integration with external contact systems
  providerId?: string; // ID of this contact in the external provider
  providerAccountId?: string; // ID of the integration account this contact belongs to
  providerUpdatedAt?: Date; // When this contact was last updated from the provider
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'notStarted' | 'inProgress' | 'onHold' | 'completed' | 'cancelled' | 'active' | 'planning';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  startDate?: Date;
  completedDate?: Date;
  teamMembers?: string[]; // Person IDs
  members: string[]; // Alias for teamMembers (for backward compatibility)
  tasks: string[]; // Task IDs
  meetings?: string[]; // Meeting IDs
  pages: string[]; // Page IDs (references to ProjectPage)
  progress: number; // 0-100
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPage {
  id: string;
  projectId: string;
  title: string;
  content: string;
  order: number;
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
  type?: 'personal' | 'work' | 'delegated' | 'recurring' | 'routine' | 'delegation' | 'followUp' | 'task';
  dueDate?: Date;
  completedDate?: Date;
  completedAt?: Date; // Alternative to completedDate for backward compatibility
  assignee?: string; // Person ID
  assignedTo?: string; // Alias for assignee (for backward compatibility)
  delegatedTo?: string; // Person ID
  projectId?: string; // Project ID
  parent?: string; // Parent task ID
  parentTask?: string; // Alias for parent (for backward compatibility)
  subtasks: string[]; // Task IDs
  relatedProjects: string[]; // Project IDs
  relatedMeetings: string[]; // Meeting IDs
  relatedBehaviors: string[]; // Behavior IDs
  comments: {
    id: string;
    userId: string;
    text: string;
    createdAt: Date;
  }[];
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  notes?: string;
  tags: string[];
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

export interface Comment {
  id: string;
  userId: string;
  content: string;
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

export interface Feedback {
  id: string;
  userId: string;
  message: string;
  screenshot: string; // Base64 encoded image
  consoleMessages: string;
  timestamp: Date;
  seen: boolean;
  userAction?: 'yes' | 'no';
  page: string; // The page where feedback was submitted
  improved?: boolean; // Marked when feedback is processed and fixed
  improvedAt?: Date; // When the improvement was marked
  archived?: boolean; // Whether this feedback is archived (preserves history)
  archivedAt?: Date; // When the feedback was archived
  processedByClaude?: boolean; // Whether this was sent to Claude
  processedAt?: Date; // When it was processed
  createdAt: Date;
  updatedAt: Date;
}
