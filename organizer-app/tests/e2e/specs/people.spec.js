// People management feature tests
describe('People Feature', () => {
  beforeEach(() => {
    cy.visit('/');
    // Authenticate user (assuming we have a test user set up)
    cy.login();
    cy.visit('/people');
  });

  it('should display the people page', () => {
    cy.get('h1').contains('People');
    cy.get('[data-test="people-list"]').should('exist');
  });

  it('should allow adding a new person', () => {
    // Click the add person button
    cy.get('[data-test="add-person-btn"]').click();
    
    // Fill out the person form
    cy.get('[data-test="person-first-name"]').type('John');
    cy.get('[data-test="person-last-name"]').type('Smith');
    cy.get('[data-test="person-email"]').type('john.smith@example.com');
    cy.get('[data-test="person-phone"]').type('+1 555-123-4567');
    cy.get('[data-test="person-organization"]').type('Acme Inc.');
    cy.get('[data-test="person-role"]').type('Product Manager');
    cy.get('[data-test="person-notes"]').type('Met at the tech conference');
    
    // Add tags
    cy.get('[data-test="person-tag-input"]').type('client{enter}');
    cy.get('[data-test="person-tag-input"]').type('important{enter}');
    
    // Save the person
    cy.get('[data-test="save-person-btn"]').click();
    
    // Verify the person was added
    cy.get('[data-test="people-list"]').contains('John Smith');
    cy.get('[data-test="person-email"]').contains('john.smith@example.com');
  });

  it('should allow editing an existing person', () => {
    // Find and click edit on an existing person
    cy.get('[data-test="person-item"]').first().find('[data-test="edit-person-btn"]').click();
    
    // Update the person's information
    cy.get('[data-test="person-role"]').clear().type('Senior Product Manager');
    
    // Update last contacted date
    cy.get('[data-test="person-last-contacted"]').clear().type('2025-04-07');
    
    // Save the changes
    cy.get('[data-test="save-person-btn"]').click();
    
    // Verify the changes were saved
    cy.get('[data-test="people-list"]').contains('Senior Product Manager');
  });
  
  it('should filter people by tags', () => {
    // Click on tag filter
    cy.get('[data-test="person-tag-filter"]').click();
    
    // Select a tag to filter by
    cy.get('.v-list-item').contains('client').click();
    
    // Verify only people with the "client" tag are shown
    cy.get('[data-test="person-item"]').each(($el) => {
      cy.wrap($el).find('[data-test="person-tag-chip"]').contains('client').should('exist');
    });
  });

  it('should search for people', () => {
    // Type in search box
    cy.get('[data-test="person-search-input"]').type('John');
    
    // Verify search results
    cy.get('[data-test="person-item"]').each(($el) => {
      cy.wrap($el).should('contain', 'John');
    });
    
    // Clear search and try another term
    cy.get('[data-test="person-search-input"]').clear().type('Acme');
    
    // Verify new search results
    cy.get('[data-test="person-item"]').each(($el) => {
      cy.wrap($el).should('contain', 'Acme');
    });
  });

  it('should show related projects for a person', () => {
    // Open a person's details
    cy.get('[data-test="person-item"]').first().click();
    
    // Navigate to the projects tab
    cy.get('[data-test="person-projects-tab"]').click();
    
    // Verify projects section exists
    cy.get('[data-test="person-related-projects"]').should('exist');
    
    // Add a project relation
    cy.get('[data-test="add-related-project-btn"]').click();
    cy.get('[data-test="project-select-dialog"]').should('be.visible');
    cy.get('[data-test="project-option"]').first().click();
    
    // Verify the project was added to the person
    cy.get('[data-test="person-related-projects"]').find('[data-test="project-item"]').should('have.length.at.least', 1);
  });

  it('should show related tasks for a person', () => {
    // Open a person's details
    cy.get('[data-test="person-item"]').first().click();
    
    // Navigate to the tasks tab
    cy.get('[data-test="person-tasks-tab"]').click();
    
    // Verify tasks section exists
    cy.get('[data-test="person-related-tasks"]').should('exist');
    
    // Check if there are assigned tasks
    cy.get('[data-test="person-assigned-tasks"]').should('exist');
    
    // Check if there are delegated tasks
    cy.get('[data-test="person-delegated-tasks"]').should('exist');
  });

  it('should show related meetings for a person', () => {
    // Open a person's details
    cy.get('[data-test="person-item"]').first().click();
    
    // Navigate to the meetings tab
    cy.get('[data-test="person-meetings-tab"]').click();
    
    // Verify meetings section exists
    cy.get('[data-test="person-meetings-list"]').should('exist');
    
    // Schedule a new meeting with this person
    cy.get('[data-test="schedule-meeting-btn"]').click();
    
    // Fill meeting details
    cy.get('[data-test="meeting-title"]').type('Product Review');
    cy.get('[data-test="meeting-start-time"]').type('2025-04-15T10:00');
    cy.get('[data-test="meeting-end-time"]').type('2025-04-15T11:00');
    
    // Save meeting
    cy.get('[data-test="save-meeting-btn"]').click();
    
    // Verify meeting was added
    cy.get('[data-test="person-meetings-list"]').contains('Product Review');
  });

  it('should track last contact date', () => {
    // Open a person's details
    cy.get('[data-test="person-item"]').first().click();
    
    // Click 'log contact' button
    cy.get('[data-test="log-contact-btn"]').click();
    
    // Enter contact details
    cy.get('[data-test="contact-date"]').type('2025-04-07');
    cy.get('[data-test="contact-type"]').click();
    cy.get('.v-list-item').contains('Email').click();
    cy.get('[data-test="contact-notes"]').type('Discussed project timeline');
    
    // Save contact log
    cy.get('[data-test="save-contact-log-btn"]').click();
    
    // Verify last contacted date was updated
    cy.get('[data-test="last-contacted-date"]').contains('Apr 7, 2025');
  });
});
