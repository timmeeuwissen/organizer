// Dashboard tests
describe('Dashboard', () => {
  beforeEach(() => {
    cy.visit('/');
    // Log in (mock)
    cy.login();
  });

  it('should display the dashboard page', () => {
    cy.url().should('include', '/dashboard');
    // Check for common elements
    cy.contains('h1', 'Dashboard').should('exist');
  });
  
  it('should show quick access widgets', () => {
    // Testing that the dashboard shows access to key features
    cy.contains('Recent Behaviors').should('exist');
    cy.contains('Upcoming Meetings').should('exist');
    cy.contains('Active Projects').should('exist');
    cy.contains('Important Tasks').should('exist');
  });
  
  it('should allow navigation to main features', () => {
    // Check that we can navigate to key features from dashboard
    cy.contains('Behaviors').click();
    cy.url().should('include', '/behaviors');
    
    cy.navigateTo('dashboard');
    
    cy.contains('Projects').click();
    cy.url().should('include', '/projects');
    
    cy.navigateTo('dashboard');
    
    cy.contains('Tasks').click();
    cy.url().should('include', '/tasks');
  });
});
