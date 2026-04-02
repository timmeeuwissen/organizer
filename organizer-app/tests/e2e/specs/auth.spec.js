/**
 * Auth spec – login page UI, form validation, and navigation to register.
 *
 * These tests run against the real app WITHOUT demo mode (VITE_AUTH_BYPASS is
 * not set for these tests), so the auth middleware redirects unauthenticated
 * users to /auth/login. No actual Firebase credentials are used.
 */
describe('Auth – login page', () => {
  beforeEach(() => {
    // Visit the app root; the auth middleware will redirect to /auth/login
    // because there is no authenticated user.
    cy.visit('/')
  })

  it('redirects the root path to /auth/login when not authenticated', () => {
    cy.url().should('include', '/auth/login')
  })

  it('renders the login card with email and password fields', () => {
    cy.url().should('include', '/auth/login')

    // Vuetify toolbar title should say "Login"
    cy.get('.v-toolbar-title').should('contain.text', 'Login')

    // Email input – identified by its prepend mdi-email icon sibling
    cy.get('input[type="email"]').should('exist')

    // Password input
    cy.get('input[type="password"]').should('exist')

    // Login submit button
    cy.get('.v-card-actions .v-btn').first().should('contain.text', 'Login')
  })

  it('shows the "Login with Google" button', () => {
    cy.get('.v-card-text .v-btn').contains('Login with Google').should('exist')
  })

  it('navigates to /auth/register when the register link is clicked', () => {
    // The register button is a router-link pointing to /auth/register
    cy.get('.v-card-text .v-btn').contains('Register').click()
    cy.url().should('include', '/auth/register')

    // Confirm we landed on the registration form
    cy.get('.v-toolbar-title').should('contain.text', 'Register')
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('have.length.at.least', 2) // password + confirm
  })

  it('navigates to /auth/forgot-password when the forgot-password link is clicked', () => {
    cy.get('.v-card-text .v-btn').contains('Forgot Password').click()
    cy.url().should('include', '/auth/forgot-password')
  })
})
