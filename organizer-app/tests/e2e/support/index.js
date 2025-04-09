// Import commands.js - contains custom commands for Cypress
import './commands'

// Configure Cypress behavior
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent Cypress from failing the test when an uncaught exception occurs
  // Useful when testing applications that might have uncaught exceptions in third-party code
  return false
})

// Set a longer default timeout for all tests (milliseconds)
// This is helpful for slower operations like Firebase authentication
Cypress.config('defaultCommandTimeout', 10000)

// Allow XHR request failures without failing the test
// Sometimes we might expect certain APIs to fail during testing
Cypress.on('fail', (error, runnable) => {
  // Don't fail the test if we're checking for a negative condition
  if (error.name === 'AssertionError' && error.message.includes('expected to fail')) {
    return false
  }
  throw error
})

// Log test name at the start of each test for easier debugging
beforeEach(() => {
  const testTitle = Cypress.currentTest.title
  cy.log(`**Test: ${testTitle}**`)
})
