// Integration features tests (Mail, Calendar, Network, Statistics)
describe('Integration Features', () => {
  beforeEach(() => {
    cy.visit('/');
    // Authenticate user (assuming we have a test user set up)
    cy.login();
  });

  describe('Mail Integration', () => {
    beforeEach(() => {
      cy.visit('/mail');
    });

    it('should display the mail page', () => {
      cy.get('h1').contains('Mail');
      cy.get('[data-test="mail-inbox"]').should('exist');
    });

    it('should allow composing a new email', () => {
      // Click the compose button
      cy.get('[data-test="compose-email-btn"]').click();
      
      // Fill out the email form
      cy.get('[data-test="email-to"]').type('john.smith@example.com');
      cy.get('[data-test="email-subject"]').type('Project Update');
      cy.get('[data-test="email-body"]').type('Here is the latest update on our project...');
      
      // Send the email
      cy.get('[data-test="send-email-btn"]').click();
      
      // Verify email was sent (appears in sent folder)
      cy.get('[data-test="mail-folder-sent"]').click();
      cy.get('[data-test="email-item"]').contains('Project Update');
    });

    it('should connect emails to contacts', () => {
      // Open an email
      cy.get('[data-test="email-item"]').first().click();
      
      // Connect sender to a contact
      cy.get('[data-test="connect-sender-btn"]').click();
      
      // Select a contact from the list or create new
      cy.get('[data-test="create-new-contact-option"]').click();
      
      // Verify contact creation form is pre-filled with email data
      cy.get('[data-test="person-email"]').should('have.value', cy.get('[data-test="email-sender"]').invoke('text'));
      
      // Save the contact
      cy.get('[data-test="save-person-btn"]').click();
      
      // Verify connection success message
      cy.get('[data-test="connection-success-message"]').should('exist');
    });
  });

  describe('Calendar Integration', () => {
    beforeEach(() => {
      cy.visit('/calendar');
    });

    it('should display the calendar page', () => {
      cy.get('h1').contains('Calendar');
      cy.get('[data-test="calendar-container"]').should('exist');
    });

    it('should show tasks with due dates on calendar', () => {
      // Create a task with due date first
      cy.visit('/tasks');
      cy.get('[data-test="add-task-btn"]').click();
      cy.get('[data-test="task-title"]').type('Calendar Task Test');
      cy.get('[data-test="task-due-date"]').type('2025-04-20');
      cy.get('[data-test="save-task-btn"]').click();
      
      // Navigate back to calendar
      cy.visit('/calendar');
      
      // Ensure tasks are shown in calendar
      cy.get('[data-test="calendar-event-task"]').contains('Calendar Task Test');
    });

    it('should allow changing calendar views', () => {
      // Test changing to weekly view
      cy.get('[data-test="calendar-view-week"]').click();
      cy.get('[data-test="week-view-container"]').should('be.visible');
      
      // Test changing to daily view
      cy.get('[data-test="calendar-view-day"]').click();
      cy.get('[data-test="day-view-container"]').should('be.visible');
      
      // Test changing to schedule view
      cy.get('[data-test="calendar-view-schedule"]').click();
      cy.get('[data-test="schedule-view-container"]').should('be.visible');
      
      // Back to monthly view
      cy.get('[data-test="calendar-view-month"]').click();
      cy.get('[data-test="month-view-container"]').should('be.visible');
    });

    it('should allow creating meeting summaries from calendar entries', () => {
      // Find a meeting in the calendar
      cy.get('[data-test="calendar-event-meeting"]').first().click();
      
      // View meeting details
      cy.get('[data-test="view-meeting-details"]').click();
      
      // Navigate to summary tab
      cy.get('[data-test="meeting-summary-tab"]').click();
      
      // Create summary
      cy.get('[data-test="create-summary-btn"]').click();
      cy.get('[data-test="summary-editor"]').type('Meeting summary created from calendar');
      cy.get('[data-test="save-summary-btn"]').click();
      
      // Verify summary was created
      cy.get('[data-test="meeting-summary"]').contains('Meeting summary created from calendar');
    });
  });

  describe('Network Graph', () => {
    beforeEach(() => {
      cy.visit('/network');
    });

    it('should display the network page', () => {
      cy.get('h1').contains('Network');
      cy.get('[data-test="network-graph-container"]').should('exist');
    });

    it('should filter network by entity types', () => {
      // Filter only for people and projects
      cy.get('[data-test="network-entity-filter"]').click();
      cy.get('[data-test="entity-checkbox-task"]').uncheck();
      cy.get('[data-test="entity-checkbox-behavior"]').uncheck();
      cy.get('[data-test="apply-filter-btn"]').click();
      
      // Verify only people and projects are shown
      cy.get('[data-test="network-legend"]').should('contain', 'People');
      cy.get('[data-test="network-legend"]').should('contain', 'Projects');
      cy.get('[data-test="network-legend"]').should('not.contain', 'Tasks');
    });

    it('should focus on a specific entity when clicked', () => {
      // Click on a node in the network
      cy.get('[data-test="network-node"]').first().click();
      
      // Verify focus panel shows details
      cy.get('[data-test="network-focus-panel"]').should('be.visible');
      cy.get('[data-test="focus-entity-name"]').should('exist');
      
      // Verify connections are highlighted
      cy.get('[data-test="network-edge-highlighted"]').should('exist');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      cy.visit('/statistics');
    });

    it('should display the statistics page', () => {
      cy.get('h1').contains('Statistics');
      cy.get('[data-test="statistics-dashboard"]').should('exist');
    });

    it('should filter statistics by time period', () => {
      // Filter for last month
      cy.get('[data-test="statistics-period-filter"]').click();
      cy.get('.v-list-item').contains('Last Month').click();
      
      // Verify chart updates
      cy.get('[data-test="statistics-chart-title"]').should('contain', 'Last Month');
    });

    it('should show project statistics', () => {
      // Navigate to project statistics
      cy.get('[data-test="statistics-projects-tab"]').click();
      
      // Verify project progress chart exists
      cy.get('[data-test="project-progress-chart"]').should('exist');
      
      // Click through to see details
      cy.get('[data-test="project-progress-bar"]').first().click();
      
      // Verify detailed stats are shown
      cy.get('[data-test="project-detail-stats"]').should('be.visible');
    });

    it('should show behavior statistics', () => {
      // Navigate to behavior statistics
      cy.get('[data-test="statistics-behaviors-tab"]').click();
      
      // Verify behavior tracking chart exists
      cy.get('[data-test="behavior-tracking-chart"]').should('exist');
      
      // Check behavior type distribution
      cy.get('[data-test="behavior-type-distribution"]').should('exist');
    });
  });

  describe('Authentication and Profile', () => {
    it('should allow logging in with Google', () => {
      // First logout
      cy.visit('/auth/logout');
      
      // Go to login page
      cy.visit('/auth/login');
      
      // Click Google login
      cy.get('[data-test="google-login-btn"]').click();
      
      // We can't fully test OAuth flow in E2E test, but we can verify redirect
      cy.url().should('include', 'google.com');
    });

    it('should display user profile', () => {
      cy.visit('/auth/profile');
      
      // Verify profile page loads
      cy.get('[data-test="user-profile"]').should('exist');
      cy.get('[data-test="user-email"]').should('exist');
      
      // Verify settings section
      cy.get('[data-test="profile-settings-section"]').should('exist');
    });

    it('should allow theme switching', () => {
      // Go to profile
      cy.visit('/auth/profile');
      
      // Toggle dark theme
      cy.get('[data-test="theme-switch"]').click();
      
      // Verify theme attributes changed
      cy.get('html').should('have.attr', 'data-theme', 'dark');
      
      // Toggle back to light
      cy.get('[data-test="theme-switch"]').click();
      cy.get('html').should('have.attr', 'data-theme', 'light');
    });

    it('should allow language switching', () => {
      // Go to profile
      cy.visit('/auth/profile');
      
      // Switch to Dutch
      cy.get('[data-test="language-select"]').click();
      cy.get('.v-list-item').contains('Nederlands').click();
      
      // Verify language changed
      cy.get('[data-test="language-label"]').should('contain', 'Taal');
      
      // Switch back to English
      cy.get('[data-test="language-select"]').click();
      cy.get('.v-list-item').contains('English').click();
      cy.get('[data-test="language-label"]').should('contain', 'Language');
    });

    it('should allow sharing access with another user', () => {
      // Go to profile
      cy.visit('/auth/profile');
      
      // Go to sharing tab
      cy.get('[data-test="sharing-tab"]').click();
      
      // Add a user to share with
      cy.get('[data-test="add-share-user-btn"]').click();
      cy.get('[data-test="share-email-input"]').type('colleague@example.com');
      
      // Set read-only permissions
      cy.get('[data-test="share-permission-read"]').check();
      
      // Save sharing settings
      cy.get('[data-test="save-sharing-btn"]').click();
      
      // Verify user appears in shared list
      cy.get('[data-test="shared-users-list"]').contains('colleague@example.com');
    });
  });
});
