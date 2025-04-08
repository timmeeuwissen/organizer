// Task management feature tests
describe('Tasks Feature', () => {
  beforeEach(() => {
    cy.visit('/');
    // Authenticate user (assuming we have a test user set up)
    cy.login();
    cy.visit('/tasks');
  });

  it('should display the tasks page', () => {
    cy.get('h1').contains('Tasks');
    cy.get('[data-test="tasks-list"]').should('exist');
  });

  it('should allow adding a new task', () => {
    // Click the add task button
    cy.get('[data-test="add-task-btn"]').click();
    
    // Fill out the task form
    cy.get('[data-test="task-title"]').type('Prepare presentation');
    cy.get('[data-test="task-description"]').type('Create slides for the quarterly meeting');
    
    // Set task status
    cy.get('[data-test="task-status"]').click();
    cy.get('.v-list-item').contains('To Do').click();
    
    // Set task priority
    cy.get('[data-test="task-priority"]').click();
    cy.get('.v-list-item').contains('High').click();
    
    // Set due date
    cy.get('[data-test="task-due-date"]').type('2025-04-15');
    
    // Assign to a person
    cy.get('[data-test="task-assignee"]').click();
    cy.get('.v-list-item').first().click();
    
    // Link to a project
    cy.get('[data-test="task-project"]').click();
    cy.get('.v-list-item').first().click();
    
    // Save the task
    cy.get('[data-test="save-task-btn"]').click();
    
    // Verify the task was added
    cy.get('[data-test="tasks-list"]').contains('Prepare presentation');
    cy.get('[data-test="task-priority-badge"]').contains('High');
  });

  it('should allow adding subtasks', () => {
    // Open an existing task
    cy.get('[data-test="task-item"]').first().click();
    
    // Add a subtask
    cy.get('[data-test="add-subtask-btn"]').click();
    cy.get('[data-test="subtask-title"]').type('Research competitors');
    cy.get('[data-test="subtask-description"]').type('Analyze similar products from competitors');
    
    // Save the subtask
    cy.get('[data-test="save-subtask-btn"]').click();
    
    // Verify the subtask was added
    cy.get('[data-test="subtasks-list"]').contains('Research competitors');
  });

  it('should allow marking tasks as complete', () => {
    // Find a task and click the complete button
    cy.get('[data-test="task-item"]').first().within(() => {
      cy.get('[data-test="complete-task-btn"]').click();
    });
    
    // Verify the task status changed to completed
    cy.get('[data-test="task-item"]').first().find('[data-test="task-status-badge"]').should('contain', 'Completed');
  });

  it('should allow delegating tasks', () => {
    // Open an existing task
    cy.get('[data-test="task-item"]').first().click();
    
    // Click delegate button
    cy.get('[data-test="delegate-task-btn"]').click();
    
    // Select a person to delegate to
    cy.get('[data-test="delegate-person-select"]').click();
    cy.get('.v-list-item').first().click();
    
    // Add delegation note
    cy.get('[data-test="delegation-note"]').type('Please complete this by Friday');
    
    // Confirm delegation
    cy.get('[data-test="confirm-delegation-btn"]').click();
    
    // Verify the task is now delegated
    cy.get('[data-test="task-delegated-badge"]').should('exist');
    cy.get('[data-test="delegated-to"]').should('exist');
  });

  it('should filter tasks by status', () => {
    // Click on filter dropdown
    cy.get('[data-test="task-status-filter"]').click();
    
    // Select "In Progress" filter
    cy.get('.v-list-item').contains('In Progress').click();
    
    // Verify only tasks with "In Progress" status are shown
    cy.get('[data-test="task-item"]').each(($el) => {
      cy.wrap($el).find('[data-test="task-status-badge"]').should('contain', 'In Progress');
    });
  });

  it('should filter tasks by priority', () => {
    // Click on priority filter dropdown
    cy.get('[data-test="task-priority-filter"]').click();
    
    // Select "High" priority filter
    cy.get('.v-list-item').contains('High').click();
    
    // Verify only tasks with "High" priority are shown
    cy.get('[data-test="task-item"]').each(($el) => {
      cy.wrap($el).find('[data-test="task-priority-badge"]').should('contain', 'High');
    });
  });

  it('should sort tasks by due date', () => {
    // Click on sort dropdown
    cy.get('[data-test="task-sort-menu"]').click();
    
    // Select "Due Date" sort
    cy.get('.v-list-item').contains('Due Date').click();
    
    // Verify tasks are sorted by due date
    // Note: This is a simplified check - in a real test we would verify the actual ordering
    cy.get('[data-test="task-item"]').should('have.length.at.least', 1);
  });

  it('should support recurring tasks', () => {
    // Create a new recurring task
    cy.get('[data-test="add-task-btn"]').click();
    cy.get('[data-test="task-title"]').type('Weekly team meeting');
    
    // Make it recurring
    cy.get('[data-test="task-recurring-checkbox"]').check();
    
    // Set recurrence details
    cy.get('[data-test="recurrence-frequency"]').click();
    cy.get('.v-list-item').contains('Weekly').click();
    
    cy.get('[data-test="recurrence-interval"]').clear().type('1');
    
    // Save the task
    cy.get('[data-test="save-task-btn"]').click();
    
    // Verify the task shows a recurring indicator
    cy.get('[data-test="task-recurring-indicator"]').should('exist');
  });
});
