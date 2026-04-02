/**
 * Tasks spec – page structure, tab navigation, "Add Task" dialog, and filters.
 *
 * Requires the app to be started with VITE_AUTH_BYPASS=true so that the auth
 * middleware lets every route through without a real Firebase session.
 *
 * Start the dev server as:
 *   VITE_AUTH_BYPASS=true npm run dev
 * Then run:
 *   npx cypress run --spec tests/e2e/specs/tasks.spec.js
 */
describe('Tasks page (demo mode)', () => {
  beforeEach(() => {
    // navigateTo uses cy.visit('/tasks') under the hood (see commands.js)
    cy.navigateTo('tasks')
    // Wait for Nuxt/Vuetify hydration – the h1 is a reliable marker
    cy.get('h1', { timeout: 15000 }).should('be.visible')
  })

  it('renders the Tasks page heading', () => {
    cy.get('h1').should('contain.text', 'Tasks')
  })

  it('shows the tab bar with status tabs', () => {
    // The page uses v-tabs with tabs for All, Todo, In Progress, Completed, Delegated
    cy.get('.v-tabs').should('exist')
    cy.get('.v-tab').should('have.length.at.least', 4)

    // Verify at least the "All" variant tab is present (text may be "All Tasks")
    cy.get('.v-tab').contains('All').should('exist')
  })

  it('shows the filter sidebar with a search field', () => {
    // FilterContainer renders a v-card whose title contains "Filters"
    cy.get('.v-card-title').contains('Filters').should('exist')

    // The search v-text-field inside the filter card
    cy.get('.v-card input[type="text"]').first().should('exist')
  })

  it('opens the "Add Task" dialog when the Add Task button is clicked', () => {
    // The Add Task button lives inside the main task card's title row
    cy.get('.v-card-title .v-btn').contains('Add Task').click()

    // A v-dialog should now be visible; TaskForm renders inside it
    cy.get('.v-dialog').should('be.visible')

    // The form should contain at minimum one text field
    cy.get('.v-dialog .v-text-field').should('exist')
  })

  it('closes the "Add Task" dialog on Escape', () => {
    cy.get('.v-card-title .v-btn').contains('Add Task').click()
    cy.get('.v-dialog').should('be.visible')

    // Vuetify dialogs close on Escape by default
    cy.get('body').type('{esc}')

    cy.get('.v-dialog').should('not.exist')
  })
})
