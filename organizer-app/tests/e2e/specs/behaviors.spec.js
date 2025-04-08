// Behavior management feature tests
describe('Behaviors Feature', () => {
  beforeEach(() => {
    cy.visit('/');
    // Authenticate user (assuming we have a test user set up)
    cy.login();
    cy.visit('/behaviors');
  });

  it('should display the behaviors page', () => {
    cy.get('h1').contains('Behaviors');
    cy.get('[data-test="behaviors-list"]').should('exist');
  });

  it('should allow adding a new behavior', () => {
    // Click the add behavior button
    cy.get('[data-test="add-behavior-btn"]').click();
    
    // Fill out the behavior form
    cy.get('[data-test="behavior-title"]').type('Active Listening');
    cy.get('[data-test="behavior-description"]').type('Fully concentrate, understand, respond, and then remember what is being said');
    cy.get('[data-test="behavior-rationale"]').type('Helps build trust and ensure clear communication in meetings');
    
    // Select behavior type
    cy.get('[data-test="behavior-type"]').click();
    cy.get('.v-list-item').contains('Want to do better').click();
    
    // Add an example
    cy.get('[data-test="add-example-btn"]').click();
    cy.get('[data-test="behavior-example-0"]').type('In the project planning meeting, I asked clarifying questions and summarized points made by team members');
    
    // Save the behavior
    cy.get('[data-test="save-behavior-btn"]').click();
    
    // Verify the behavior was added
    cy.get('[data-test="behaviors-list"]').contains('Active Listening');
    cy.get('[data-test="behavior-type-badge"]').contains('Want to do better');
  });

  it('should allow editing an existing behavior', () => {
    // Find and click edit on an existing behavior
    cy.get('[data-test="behavior-item"]').first().find('[data-test="edit-behavior-btn"]').click();
    
    // Update the behavior title
    cy.get('[data-test="behavior-title"]').clear().type('Updated Behavior Title');
    
    // Save the changes
    cy.get('[data-test="save-behavior-btn"]').click();
    
    // Verify the changes were saved
    cy.get('[data-test="behaviors-list"]').contains('Updated Behavior Title');
  });

  it('should filter behaviors by type', () => {
    // Click on filter dropdown
    cy.get('[data-test="behavior-filter"]').click();
    
    // Select "Do Well" filter
    cy.get('.v-list-item').contains('Do Well').click();
    
    // Verify only behaviors with "Do Well" type are shown
    cy.get('[data-test="behavior-item"]').each(($el) => {
      cy.wrap($el).find('[data-test="behavior-type-badge"]').should('contain', 'Do Well');
    });
  });

  it('should allow adding action plans to behaviors', () => {
    // Find and open a behavior
    cy.get('[data-test="behavior-item"]').first().click();
    
    // Add an action plan
    cy.get('[data-test="add-action-plan-btn"]').click();
    cy.get('[data-test="action-plan-description"]').type('Practice active listening in all meetings for the next month');
    
    // Add a task to the action plan
    cy.get('[data-test="add-task-to-plan-btn"]').click();
    cy.get('[data-test="select-task-dialog"]').should('be.visible');
    cy.get('[data-test="task-item"]').first().click();
    
    // Save the action plan
    cy.get('[data-test="save-action-plan-btn"]').click();
    
    // Verify the action plan was added
    cy.get('[data-test="action-plans-list"]').contains('Practice active listening');
    cy.get('[data-test="action-plan-tasks"]').should('have.length.at.least', 1);
  });

  it('should show behavior tracking during meetings', () => {
    // Navigate to a meeting detail page with notes
    cy.visit('/meetings');
    cy.get('[data-test="meeting-item"]').first().click();
    
    // Check that behavior tracking section exists
    cy.get('[data-test="behavior-tracking-section"]').should('exist');
    
    // Add a behavior observation
    cy.get('[data-test="add-behavior-observation-btn"]').click();
    cy.get('[data-test="select-behavior-dropdown"]').click();
    cy.get('.v-list-item').first().click();
    cy.get('[data-test="observation-notes"]').type('I demonstrated this behavior when...');
    cy.get('[data-test="save-observation-btn"]').click();
    
    // Verify observation was added
    cy.get('[data-test="behavior-observations-list"]').contains('I demonstrated this behavior when...');
  });
});
