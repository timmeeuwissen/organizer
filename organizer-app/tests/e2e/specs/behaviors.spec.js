// Behavior management feature tests
describe('Behaviors Feature', () => {
  beforeEach(() => {
    cy.visit('/');
    // Authenticate user (assuming we have a test user set up)
    cy.login();
    cy.visit('/behaviors');
  });

  it('should display the behaviors page', () => {
    cy.getByTest('behaviors-heading').should('exist');
    cy.getByTest('behaviors-list').should('exist');
  });

  it('should allow adding a new behavior', () => {
    // Click the add behavior button (we have multiple buttons, so use the first one)
    cy.getByTest('add-behavior-btn').first().click();
    
    // Verify the add dialog is displayed
    cy.getByTest('add-behavior-dialog').should('be.visible');
    cy.getByTest('behavior-form').should('be.visible');
    
    // Fill out the behavior form
    cy.getByTest('behavior-title').type('Active Listening');
    cy.getByTest('behavior-rationale').type('Helps build trust and ensure clear communication in meetings');
    
    // Select behavior type
    cy.getByTest('behavior-type').click();
    cy.get('.v-list-item').contains('Want to do better').click();
    
    // Add examples using the combobox
    cy.getByTest('behavior-examples').type('In the project planning meeting{enter}');
    cy.getByTest('behavior-examples').type('Asked clarifying questions{enter}');
    
    // Add categories
    cy.getByTest('behavior-categories').type('Communication{enter}');
    
    // Save the behavior
    cy.getByTest('save-behavior-btn').click();
    
    // Dialog should close
    cy.getByTest('add-behavior-dialog').should('not.exist');
    
    // Verify the behavior was added (a simple check for our new title)
    cy.contains('Active Listening').should('exist');
  });

  it('should allow editing an existing behavior', () => {
    // Create a mock behavior first
    cy.createTestData('behavior', {
      id: 'test-behavior-1',
      type: 'doWell',
      title: 'Original Title',
      rationale: 'Original rationale',
      examples: ['Example 1'],
      categories: ['Category 1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Refresh the page to see our mock behavior
    cy.reload();
    
    // Find and click on the behavior item to edit it
    cy.getByTest('behavior-item').contains('Original Title').click();
    
    // Verify the edit dialog is displayed
    cy.getByTest('behavior-dialog').should('be.visible');
    
    // Update the behavior title
    cy.getByTest('behavior-title').clear().type('Updated Behavior Title');
    
    // Save the changes
    cy.getByTest('save-behavior-btn').click();
    
    // Verify the changes were saved
    cy.contains('Updated Behavior Title').should('exist');
  });

  it('should allow adding action plans to behaviors', () => {
    // We need a behavior with action plans to test
    cy.createTestData('behavior', {
      id: 'test-behavior-2',
      type: 'wantToDoBetter',
      title: 'Test Behavior for Action Plans',
      rationale: 'Testing action plans',
      examples: ['Example 1'],
      categories: ['Category 1'],
      actionPlans: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Refresh the page to see our mock behavior
    cy.reload();
    
    // Find and click on the behavior
    cy.getByTest('behavior-item').contains('Test Behavior for Action Plans').click();
    
    // Wait for the action plans section to appear
    cy.getByTest('action-plans-section').should('exist');
    
    // Add an action plan
    cy.getByTest('add-action-plan-btn').click();
    
    // Note: Since we don't have the actual action plan form implemented yet, 
    // we can't fully test the create functionality. In the real implementation, 
    // we would continue with filling out the form and saving.
    
    // For now, we'll just verify the button exists and can be clicked
    cy.getByTest('add-action-plan-btn').should('exist');
  });
});
