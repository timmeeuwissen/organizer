// ***********************************************
// Custom commands for Cypress
// https://on.cypress.io/custom-commands
// ***********************************************

// Adds the 'cypress-file-upload' package
// import 'cypress-file-upload'

// Command for logging in to the application
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  // For testing purposes, we'll mock the Firebase auth
  // In a real project, this would interact with the actual auth UI
  cy.window().then((win) => {
    // Access the auth store and set a mock user
    if (win.__NUXT__) {
      const authStore = win.$nuxt.$pinia._s.get('auth')
      if (authStore) {
        authStore.setUser({
          id: 'test-user-id',
          email: email,
          displayName: 'Test User',
          photoURL: 'https://via.placeholder.com/150',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }
  })

  // Visit the dashboard page after login
  cy.visit('/dashboard')
  
  // Ensure we're logged in by checking for a common element
  cy.get('[data-test="user-avatar"]', { timeout: 10000 }).should('exist')
})

// Command for logging out
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    if (win.__NUXT__) {
      const authStore = win.$nuxt.$pinia._s.get('auth')
      if (authStore) {
        authStore.clearUser()
      }
    }
  })
  
  cy.visit('/auth/login')
  
  // Ensure we're logged out
  cy.get('[data-test="login-form"]', { timeout: 10000 }).should('exist')
})

// Command to create test data - useful for setting up state before tests
Cypress.Commands.add('createTestData', (dataType, data) => {
  cy.window().then((win) => {
    if (!win.__NUXT__) return
    
    const storeName = `${dataType}s` // e.g., behaviors, projects, tasks
    const store = win.$nuxt.$pinia._s.get(storeName)
    
    if (store && typeof store.add === 'function') {
      // Use the store's add method to create the item
      store.add(data)
    }
  })
})

// Command to get the data-test selector
// This makes tests more readable and centralizes the selector strategy
Cypress.Commands.add('getByTest', (selector) => {
  return cy.get(`[data-test="${selector}"]`)
})

// Command to select an item from a dropdown
Cypress.Commands.add('selectDropdownItem', (dropdownSelector, itemText) => {
  cy.getByTest(dropdownSelector).click()
  cy.get('.v-list-item').contains(itemText).click()
})

// Command to fill a form field by label
Cypress.Commands.add('fillFieldByLabel', (label, value) => {
  cy.contains('label', label)
    .parents('.v-input')
    .find('input')
    .type(value)
})

// Command to check if toast notification is displayed
Cypress.Commands.add('checkToastMessage', (message) => {
  cy.get('.v-snackbar').should('be.visible').contains(message)
})

// Command to wait for loading to complete
Cypress.Commands.add('waitForLoading', () => {
  // Wait for loading indicators to disappear
  cy.get('[data-test="loading-indicator"]', { timeout: 10000 }).should('not.exist')
})

// Command to navigate to a specific page in the app
Cypress.Commands.add('navigateTo', (pageName) => {
  const routes = {
    dashboard: '/dashboard',
    behaviors: '/behaviors',
    projects: '/projects',
    tasks: '/tasks',
    people: '/people',
    meetings: '/meetings',
    calendar: '/calendar',
    mail: '/mail',
    network: '/network',
    statistics: '/statistics'
  }
  
  if (!routes[pageName]) {
    throw new Error(`Unknown page: ${pageName}`)
  }
  
  cy.visit(routes[pageName])
})

// Command to check if a data-test element exists
Cypress.Commands.add('assertElementExists', (selector) => {
  cy.getByTest(selector).should('exist')
})

// Command to fake a current date for testing date-dependent features
Cypress.Commands.add('mockDate', (isoDate) => {
  const now = new Date(isoDate).getTime()
  
  cy.window().then((win) => {
    cy.stub(win.Date, 'now').returns(now)
  })
})
