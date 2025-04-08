// Meeting management feature tests
describe('Meetings Feature', () => {
  beforeEach(() => {
    cy.visit('/');
    // Authenticate user (assuming we have a test user set up)
    cy.login();
    cy.visit('/meetings');
  });

  it('should display the meetings page', () => {
    cy.get('h1').contains('Meetings');
    cy.get('[data-test="meetings-list"]').should('exist');
  });

  it('should allow adding a new meeting', () => {
    // Click the add meeting button
    cy.get('[data-test="add-meeting-btn"]').click();
    
    // Fill out the meeting form
    cy.get('[data-test="meeting-title"]').type('Weekly Team Standup');
    cy.get('[data-test="meeting-description"]').type('Regular team status update');
    
    // Set meeting category
    cy.get('[data-test="meeting-category"]').click();
    cy.get('.v-list-item').contains('Standup').click();
    
    // Set meeting date and times
    cy.get('[data-test="meeting-start-time"]').type('2025-04-15T09:00');
    cy.get('[data-test="meeting-end-time"]').type('2025-04-15T09:30');
    
    // Set location
    cy.get('[data-test="meeting-location"]').type('Conference Room A');
    
    // Add participants
    cy.get('[data-test="add-participant-btn"]').click();
    cy.get('[data-test="participant-dialog"]').should('be.visible');
    cy.get('[data-test="person-item"]').first().click();
    cy.get('[data-test="person-item"]').eq(1).click();
    cy.get('[data-test="confirm-participants-btn"]').click();
    
    // Link to a project
    cy.get('[data-test="meeting-project"]').click();
    cy.get('.v-list-item').first().click();
    
    // Save the meeting
    cy.get('[data-test="save-meeting-btn"]').click();
    
    // Verify the meeting was added
    cy.get('[data-test="meetings-list"]').contains('Weekly Team Standup');
    cy.get('[data-test="meeting-category-badge"]').contains('Standup');
  });

  it('should allow creating meeting summaries', () => {
    // Open an existing meeting
    cy.get('[data-test="meeting-item"]').first().click();
    
    // Navigate to the summary tab
    cy.get('[data-test="meeting-summary-tab"]').click();
    
    // Add a summary
    cy.get('[data-test="create-summary-btn"]').click();
    cy.get('[data-test="summary-editor"]').type('# Discussion Points\n\n- Discussed project timeline\n- Assigned tasks to team members\n- Next steps identified');
    
    // Save the summary
    cy.get('[data-test="save-summary-btn"]').click();
    
    // Verify the summary was added
    cy.get('[data-test="meeting-summary"]').contains('Discussion Points');
  });

  it('should allow adding tasks from a meeting', () => {
    // Open an existing meeting
    cy.get('[data-test="meeting-item"]').first().click();
    
    // Navigate to the tasks tab
    cy.get('[data-test="meeting-tasks-tab"]').click();
    
    // Add a task
    cy.get('[data-test="add-meeting-task-btn"]').click();
    cy.get('[data-test="task-title"]').type('Follow up with client');
    cy.get('[data-test="task-description"]').type('Send the project proposal document');
    
    // Set task priority
    cy.get('[data-test="task-priority"]').click();
    cy.get('.v-list-item').contains('High').click();
    
    // Assign to a participant
    cy.get('[data-test="task-assignee"]').click();
    cy.get('.v-list-item').first().click();
    
    // Set due date
    cy.get('[data-test="task-due-date"]').type('2025-04-20');
    
    // Save the task
    cy.get('[data-test="save-task-btn"]').click();
    
    // Verify the task was added to the meeting
    cy.get('[data-test="meeting-tasks-list"]').contains('Follow up with client');
  });

  it('should filter meetings by category', () => {
    // Click on category filter
    cy.get('[data-test="meeting-category-filter"]').click();
    
    // Select a category
    cy.get('.v-list-item').contains('Planning').click();
    
    // Verify only meetings with the selected category are shown
    cy.get('[data-test="meeting-item"]').each(($el) => {
      cy.wrap($el).find('[data-test="meeting-category-badge"]').should('contain', 'Planning');
    });
  });

  it('should show meetings in calendar view', () => {
    // Navigate to calendar view
    cy.get('[data-test="calendar-view-btn"]').click();
    
    // Verify calendar view is displayed
    cy.get('[data-test="calendar-container"]').should('exist');
    
    // Check if meetings appear on the calendar
    cy.get('[data-test="calendar-event"]').should('have.length.at.least', 1);
    
    // Click on a meeting in the calendar
    cy.get('[data-test="calendar-event"]').first().click();
    
    // Verify meeting details are shown
    cy.get('[data-test="meeting-details-dialog"]').should('be.visible');
    cy.get('[data-test="meeting-details-title"]').should('exist');
  });

  it('should track behavior observations during meetings', () => {
    // Open an existing meeting
    cy.get('[data-test="meeting-item"]').first().click();
    
    // Navigate to the behaviors tab
    cy.get('[data-test="meeting-behaviors-tab"]').click();
    
    // Add a behavior observation
    cy.get('[data-test="add-behavior-observation-btn"]').click();
    
    // Select a behavior
    cy.get('[data-test="behavior-select"]').click();
    cy.get('.v-list-item').first().click();
    
    // Add notes about the behavior
    cy.get('[data-test="behavior-notes"]').type('Demonstrated active listening during the client presentation');
    
    // Save the observation
    cy.get('[data-test="save-observation-btn"]').click();
    
    // Verify the observation was added
    cy.get('[data-test="behavior-observations-list"]').contains('Demonstrated active listening');
  });

  it('should allow initiating a meeting from calendar', () => {
    // Visit calendar page
    cy.visit('/calendar');
    
    // Click on a date to create a new meeting
    cy.get('[data-test="calendar-day"]').first().click();
    
    // Click on create meeting option
    cy.get('[data-test="create-meeting-option"]').click();
    
    // Verify meeting creation form appears with the selected date
    cy.get('[data-test="meeting-form-dialog"]').should('be.visible');
    cy.get('[data-test="meeting-title"]').type('Impromptu Planning Session');
    
    // Save the meeting
    cy.get('[data-test="save-meeting-btn"]').click();
    
    // Verify the meeting appears in the calendar
    cy.get('[data-test="calendar-event"]').contains('Impromptu Planning Session');
  });
});
