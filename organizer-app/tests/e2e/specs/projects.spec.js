// Project management feature tests
describe('Projects Feature', () => {
  beforeEach(() => {
    cy.visit('/');
    // Authenticate user (assuming we have a test user set up)
    cy.login();
    cy.visit('/projects');
  });

  it('should display the projects page', () => {
    cy.get('h1').contains('Projects');
    cy.get('[data-test="projects-list"]').should('exist');
  });

  it('should allow adding a new project', () => {
    // Click the add project button
    cy.get('[data-test="add-project-btn"]').click();
    
    // Fill out the project form
    cy.get('[data-test="project-title"]').type('Website Redesign');
    cy.get('[data-test="project-description"]').type('Redesign the company website with a modern look and feel');
    
    // Set project status
    cy.get('[data-test="project-status"]').click();
    cy.get('.v-list-item').contains('In Progress').click();
    
    // Set project priority
    cy.get('[data-test="project-priority"]').click();
    cy.get('.v-list-item').contains('High').click();
    
    // Set dates
    cy.get('[data-test="project-start-date"]').type('2025-04-10');
    cy.get('[data-test="project-due-date"]').type('2025-06-30');
    
    // Add team members
    cy.get('[data-test="add-team-member-btn"]').click();
    cy.get('[data-test="team-member-dialog"]').should('be.visible');
    cy.get('[data-test="person-item"]').first().click();
    
    // Save the project
    cy.get('[data-test="save-project-btn"]').click();
    
    // Verify the project was added
    cy.get('[data-test="projects-list"]').contains('Website Redesign');
    cy.get('[data-test="project-priority-badge"]').contains('High');
  });

  it('should allow editing an existing project', () => {
    // Find and click edit on an existing project
    cy.get('[data-test="project-item"]').first().find('[data-test="edit-project-btn"]').click();
    
    // Update the project title
    cy.get('[data-test="project-title"]').clear().type('Updated Project Title');
    
    // Update progress
    cy.get('[data-test="project-progress"]').clear().type('75');
    
    // Save the changes
    cy.get('[data-test="save-project-btn"]').click();
    
    // Verify the changes were saved
    cy.get('[data-test="projects-list"]').contains('Updated Project Title');
    cy.get('[data-test="project-progress-indicator"]').contains('75%');
  });
  
  it('should filter projects by status', () => {
    // Click on filter dropdown
    cy.get('[data-test="project-status-filter"]').click();
    
    // Select "In Progress" filter
    cy.get('.v-list-item').contains('In Progress').click();
    
    // Verify only projects with "In Progress" status are shown
    cy.get('[data-test="project-item"]').each(($el) => {
      cy.wrap($el).find('[data-test="project-status-badge"]').should('contain', 'In Progress');
    });
  });

  it('should allow adding tasks to a project', () => {
    // Open a project
    cy.get('[data-test="project-item"]').first().click();
    
    // Add a task
    cy.get('[data-test="add-project-task-btn"]').click();
    cy.get('[data-test="task-title"]').type('Create wireframes');
    cy.get('[data-test="task-description"]').type('Create wireframes for all main pages');
    
    // Set task priority
    cy.get('[data-test="task-priority"]').click();
    cy.get('.v-list-item').contains('Medium').click();
    
    // Set due date
    cy.get('[data-test="task-due-date"]').type('2025-04-20');
    
    // Save the task
    cy.get('[data-test="save-task-btn"]').click();
    
    // Verify the task was added to the project
    cy.get('[data-test="project-tasks-list"]').contains('Create wireframes');
  });

  it('should allow adding pages to a project', () => {
    // Open a project
    cy.get('[data-test="project-item"]').first().click();
    
    // Navigate to pages tab
    cy.get('[data-test="project-pages-tab"]').click();
    
    // Add a page
    cy.get('[data-test="add-project-page-btn"]').click();
    cy.get('[data-test="page-title"]').type('Requirements Document');
    cy.get('[data-test="page-content-editor"]').type('# Project Requirements\n\n- Requirement 1\n- Requirement 2\n- Requirement 3');
    
    // Save the page
    cy.get('[data-test="save-page-btn"]').click();
    
    // Verify the page was added
    cy.get('[data-test="project-pages-list"]').contains('Requirements Document');
  });

  it('should show project statistics', () => {
    // Open a project
    cy.get('[data-test="project-item"]').first().click();
    
    // Navigate to statistics tab
    cy.get('[data-test="project-stats-tab"]').click();
    
    // Verify statistics components exist
    cy.get('[data-test="project-progress-chart"]').should('exist');
    cy.get('[data-test="project-tasks-chart"]').should('exist');
    cy.get('[data-test="project-time-tracking"]').should('exist');
  });
});
