export default {
  common: {
    appName: 'Organizer',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    loading: 'Loading...',
    add: 'Add',
    back: 'Back',
    submit: 'Submit',
    select: 'Select',
    view: 'View',
    create: 'Create',
    update: 'Update',
    filters: 'Filters',
    clear: 'Clear',
    apply: 'Apply',
    close: 'Close',
    done: 'Done',
    description: 'Description',
    noDescription: 'No description provided',
    noNotes: 'No notes added yet',
    noSummary: 'No summary added yet',
    noActionItems: 'No action items added yet',
    noParticipants: 'No participants added yet',
    noTasks: 'No tasks associated with this meeting',
    noProjects: 'No projects connected to this meeting',
    addPerson: 'Add Person',
    addTask: 'Add Task',
    linkProject: 'Link Project',
    refreshData: 'Refresh Data',
    addNew: 'Add New',
    addItem: 'Add Item',
    editItem: 'Edit Item',
    storageLocation: 'Storage Location',
    organizerApplication: 'Organizer Application',
    selectProvider: 'Select Provider',
    noIntegrationsAvailable: 'No integrations available for this data type',
    offlineWarning: 'You are currently offline. Some features may not be available.',
    onlineNotification: 'You are back online. All features are now available.',
    or: 'or',
    period: 'Time Period',
    listView: 'List View',
    cardView: 'Card View',
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    forgotPasswordInstructions: 'Enter your email address and we will send you a link to reset your password.',
    sendResetLink: 'Send Reset Link',
    backToLogin: 'Back to Login',
    googleLogin: 'Login with Google',
    googleRegister: 'Register with Google',
    userProfile: 'User Profile',
    settings: 'Settings',
    rememberMe: 'Remember me',
    noAccount: 'Don\'t have an account?',
    haveAccount: 'Already have an account?',
  },
  settings: {
    darkMode: 'Dark Mode',
    language: 'Language',
    emailNotifications: 'Email Notifications',
    calendarSync: 'Calendar Synchronization',
    weekStartsOn: 'Week Starts On',
    profile: 'Profile',
    integrations: 'Integrations',
    exchange: 'Microsoft Exchange',
    google: 'Google',
    office365: 'Microsoft Office 365',
    integrationAccount: 'Integration Account',
    integrationEmail: 'Email',
    integrationServer: 'Server',
    integrationUsername: 'Username',
    integrationPassword: 'Password',
    addIntegration: 'Add Integration',
    removeIntegration: 'Remove Integration',
    connectAccount: 'Connect Account',
    disconnectAccount: 'Disconnect Account',
    editIntegration: 'Edit Integration',
    accountName: 'Account Name',
    accountType: 'Account Type',
    testConnection: 'Test Connection',
    lastSync: 'Last Synchronized',
    syncNow: 'Sync Now',
    connected: 'Connected',
    disconnected: 'Disconnected',
    connectionFailed: 'Connection Failed',
    connectionSuccessful: 'Connection Successful',
    syncSettings: 'Sync Settings',
    syncCalendar: 'Sync Calendar',
    syncMail: 'Sync Mail',
    syncTasks: 'Sync Tasks',
    syncContacts: 'Sync Contacts',
    showInCalendar: 'Show in Calendar',
    showInMail: 'Show in Mail',
    showInTasks: 'Show in Tasks', 
    showInContacts: 'Show in Contacts',
    accountColor: 'Account Color',
    noIntegrations: 'No integrations added yet',
    addYourFirstIntegration: 'Add your first integration account',
    // OAuth related translations
    useOAuth: 'Use OAuth Authentication',
    office365OAuthRecommended: 'OAuth is recommended for Office 365',
    oauthInstructions: 'OAuth Authentication Setup',
    runMakeCommand: 'Run this command in your terminal to set up OAuth credentials',
    oauthStep1: 'Run the command in your terminal to start the OAuth setup process',
    oauthStep2: 'Follow the instructions to create credentials in Google Cloud Console or Microsoft Azure Portal',
    oauthStep3: 'Authorize the access to your account in the browser that opens',
    oauthStep4: 'Copy the client ID, client secret, and refresh token from the output into the fields below',
    enterOAuthCredentials: 'Enter OAuth Credentials',
    oauthConfigured: 'OAuth Configured',
    googlePopupAuth: 'Use Google Popup Authentication',
    manualOAuth: 'Manual OAuth Setup',
    authOptions: 'Authentication Options',
    // New integration dialog translations
    connectIntegration: 'Connect Integration',
    selectAuthMethod: 'Select Authentication Method',
    connectGoogle: 'Connect Google',
    connectMicrosoft: 'Connect Microsoft',
    changeColor: 'Change Color',
    provider: {
      info: 'Provider Information'
    }
  },
  behaviors: {
    title: 'Behaviors',
    add: 'Add Behavior',
    edit: 'Edit Behavior',
    type: 'Behavior Type',
    doWell: 'What I do well',
    wantToDoBetter: 'Want to do better',
    needToImprove: 'Need to improve',
    rationale: 'Rationale',
    examples: 'Examples',
    category: 'Category',
    actionPlan: 'Action Plan',
    addActionPlan: 'Add Action Plan',
    noActionPlans: 'No action plans yet',
    noBehaviors: 'No behaviors yet',
    progress: 'Progress',
  },
  calendar: {
    title: 'Calendar',
    today: 'Today',
    week: 'Week',
    month: 'Month',
    day: 'Day',
    schedule: 'Schedule',
    event: 'Event',
    meeting: 'Meeting',
    task: 'Task',
    reminder: 'Reminder',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    allDay: 'All Day',
    recurring: 'Recurring',
    recurrenceType: 'Recurrence Type',
    recurrenceEnd: 'End Recurrence',
    description: 'Description',
    edit: 'Edit Event',
    noCalendarIntegrations: 'No calendar integrations connected',
    connectCalendarIntegration: 'To view your calendar events, connect a calendar integration in your profile settings.',
    goToProfile: 'Go to Profile',
    noEvents: 'No events for this day',
  },
  meetings: {
    add: 'Create a meeting',
    edit: 'Edit Meeting',
    meeting: 'Meeting',
    title: 'Meetings',
    plannedStatus: 'Status',
    'plannedStatus.to_be_planned': 'To be planned',
    'plannedStatus.held': 'Held',
    upcoming: 'Upcoming Meetings',
    past: 'Past Meetings',
    upcomingMeetings: 'Upcoming Meetings',
    pastMeetings: 'Past Meetings',
    newMeeting: 'New Meeting',
    summary: 'Summary',
    notes: 'Notes',
    participants: 'Participants',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    subject: 'Subject',
    action: 'Action Items',
    prepareFor: 'Prepare For',
    category: 'Category',
    categories: 'Categories',
    createSummary: 'Create Summary',
    connectTo: 'Connect To',
    totalCount: 'Total Meetings',
    byCategory: 'By Category',
    categoriesTitle: 'Meeting Categories',
    categoriesManage: 'Manage Categories',
    createCategory: 'Create Category',
    editCategory: 'Edit Category',
    deleteCategory: 'Delete Category',
    categoryName: 'Category Name',
    categoryColor: 'Category Color',
    categoryIcon: 'Category Icon',
    categoryDescription: 'Description',
    noCategoriesYet: 'No categories yet',
    meetingsInCategory: 'Meetings in this category',
    removeConfirmation: 'Remove Category Confirmation',
    removeWarning: 'All data connected with this category will be disconnected. All information about these connections will permanently be lost.',
    typeAgreed: 'Please type "agreed" to confirm',
    cancelRemove: 'Back to freedom',
    confirmRemove: 'Remove category',
  },
  people: {
    title: 'People',
    name: 'Name',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    organization: 'Organization',
    role: 'Role',
    team: 'Team',
    addPerson: 'Add Person',
    edit: 'Edit Person',
    recentlyContacted: 'Recently Contacted',
    contactFrequency: 'Contact Frequency',
    connections: 'Connections',
    notes: 'Notes',
    noPeople: 'No people yet',
    lastContacted: 'Last Contacted',
    filters: 'Filters',
    byOrganization: 'By Organization',
    byTeam: 'By Team',
    byRole: 'By Role',
    allPeople: 'All People',
  },
  projects: {
    title: 'Projects',
    description: 'Description',
    status: 'Status',
    priority: 'Priority',
    dueDate: 'Due Date',
    members: 'Members',
    stakeholders: 'Stakeholders',
    tags: 'Tags',
    tasks: 'Tasks',
    pages: 'Pages',
    progress: 'Progress',
    timeline: 'Timeline',
    createProject: 'Create Project',
    edit: 'Edit Project',
    activeProjects: 'Active Projects',
    completedProjects: 'Completed Projects',
    relativePriority: 'Relative Priority',
    noProjects: 'No projects yet',
    allProjects: 'All Projects',
    onHoldProjects: 'On Hold Projects',
    cancelledProjects: 'Cancelled Projects',
    planningProjects: 'Planning Projects',
    pageTitle: 'Page Title',
    pageContent: 'Page Content',
    addPage: 'Add Page',
    viewPages: 'View Pages',
    // Project detail page translations
    details: 'Project Details',
    team: 'Team Members',
    meetings: 'Meetings',
    notes: 'Notes',
    noMembers: 'No team members assigned yet',
    noStakeholders: 'No stakeholders assigned yet',
    noTags: 'No tags added yet',
    projectNotFound: 'Project not found',
    addTask: 'Add Task',
    addNote: 'Add Note',
    addMeeting: 'Add Meeting',
    noTasks: 'No tasks added yet',
    noNotes: 'No notes added yet',
    noMeetings: 'No meetings scheduled yet',
    editProject: 'Edit Project',
    deleteProject: 'Delete Project',
    newProject: 'New Project',
    none: 'None',
  },
  tasks: {
    title: 'Tasks',
    description: 'Description',
    status: 'Status',
    priority: 'Priority',
    dueDate: 'Due Date',
    assignedTo: 'Assigned To',
    tags: 'Tags',
    subtasks: 'Subtasks',
    comments: 'Comments',
    linked: 'Linked Items',
    addTask: 'Add Task',
    edit: 'Edit Task',
    markComplete: 'Mark Complete',
    delegated: 'Delegated',
    routine: 'Routine',
    type: 'Type',
    addComment: 'Add a comment',
    editComment: 'Edit comment',
    noSubtasks: 'No subtasks yet',
    addSubtask: 'Add subtask',
    noTasks: 'No tasks yet',
    todoTasks: 'To Do',
    inProgressTasks: 'In Progress',
    completedTasks: 'Completed',
    delegatedTasks: 'Delegated',
    cancelledTasks: 'Cancelled',
    upcomingTasks: 'Upcoming Tasks',
    overdueTasks: 'Overdue Tasks',
    filters: 'Filters',
    byTag: 'By Tag',
    byProject: 'By Project',
    byAssignee: 'By Assignee',
    allTasks: 'All Tasks',
  },
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome',
    summary: 'Summary',
    statistics: 'Statistics',
    recentActivity: 'Recent Activity',
    quickAccess: 'Quick Access',
    upcomingTasks: 'Upcoming Tasks',
    todaysMeetings: 'Today\'s Meetings',
    projectStatus: 'Project Status',
    viewMore: 'View More',
    noUpcomingTasks: 'No upcoming tasks',
    noMeetingsToday: 'No meetings today',
  },
  network: {
    title: 'Network',
    connections: 'Connections',
    view: 'View',
    filter: 'Filter',
    expand: 'Expand',
    collapse: 'Collapse',
    focus: 'Focus',
  },
  statistics: {
    title: 'Statistics',
    timeSpent: 'Time Spent',
    effortByProject: 'Effort by Project',
    effortByBehavior: 'Effort by Behavior',
    effortByPerson: 'Effort by Person',
    effortByTaskType: 'Effort by Task Type',
    weeklyBalance: 'Weekly Balance',
    projectCompletion: 'Project Completion',
    behaviorProgress: 'Behavior Progress',
  },
  mail: {
    title: 'Mail',
    inbox: 'Inbox',
    sent: 'Sent',
    drafts: 'Drafts',
    spam: 'Spam',
    trash: 'Trash',
    compose: 'Compose',
    to: 'To',
    cc: 'CC',
    bcc: 'BCC',
    subject: 'Subject',
    body: 'Body',
    attachments: 'Attachments',
    send: 'Send',
    reply: 'Reply',
    forward: 'Forward',
    connectToContact: 'Connect to Contact',
    connectToProject: 'Connect to Project',
    connectToTask: 'Connect to Task',
    folders: 'Folders',
    contacts: 'Contacts',
    accounts: 'Connected Accounts',
    noEvents: 'No events for this day',
    saveDraft: 'Save Draft',
    noEmailIntegrations: 'No email integrations connected',
    connectEmailIntegration: 'To view your emails, connect an email integration in your profile settings.',
    goToProfile: 'Go to Profile',
    attachmentsNotSupported: 'Attachments are not supported yet',
  },
  validation: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    minLength: 'Must be at least {min} characters',
    maxLength: 'Cannot exceed {max} characters',
    passwordMatch: 'Passwords do not match',
    invalidFormat: 'Invalid format',
    dateInPast: 'Date cannot be in the past',
  },
  errors: {
    generic: 'An error occurred. Please try again.',
    notFound: 'Not found',
    unauthorized: 'Unauthorized. Please log in.',
    forbidden: 'You do not have permission to access this resource.',
    serverError: 'Server error. Please try again later.',
    networkError: 'Network error. Please check your connection.',
    validationError: 'Please check your input and try again.',
  },
  feedback: {
    button: 'Send Feedback',
    title: 'Send Feedback',
    adminTitle: 'Feedback Management',
    adminDescription: 'View and manage user feedback submissions',
    detailTitle: 'Feedback Details',
    messageLabel: 'Feedback Message',
    messagePlaceholder: 'Describe the issue or suggestion...',
    messageRequired: 'Please enter your feedback',
    includeScreenshot: 'Include screenshot',
    includeConsoleLogs: 'Include console logs',
    screenshotPreview: 'Screenshot preview',
    submit: 'Submit Feedback',
    date: 'Date',
    page: 'Page',
    message: 'Message',
    actions: 'Actions',
    view: 'View',
    consoleLogs: 'Console Logs',
    screenshot: 'Screenshot',
    actionQuestion: 'Take action on this feedback?',
    actionYes: 'Yes, Take Action',
    actionNo: 'No, Ignore',
    markedForAction: 'Marked for Action',
    markedAsIgnored: 'Marked as Ignored',
    tabs: {
      new: 'Unseen',
      all: 'All Feedback',
      approved: 'Approved',
      improved: 'Improved',
      archived: 'History'
    },
    noFeedback: 'No feedback submissions yet',
    noUnseenFeedback: 'No unseen feedback',
    noApprovedFeedback: 'No approved feedback',
    noImprovedFeedback: 'No improved feedback',
    noArchivedFeedback: 'No archived feedback',
    improvedQuestion: 'Has this feedback been addressed?',
    markAsImproved: 'Mark as improved',
    markedAsImproved: 'Marked as improved',
    improvedAt: 'Improved at',
    archive: 'Archive',
    unarchive: 'Restore',
    archiveQuestion: 'Archive this feedback?',
    archivedAt: 'Archived at',
    history: 'Feedback History',
    processedByClaude: 'Processed by Claude',
    processedAt: 'Processed at'
  }
};
