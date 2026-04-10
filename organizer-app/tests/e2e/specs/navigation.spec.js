/**
 * Navigation spec – sidebar nav links, app-bar title, and breadcrumbs.
 *
 * Requires the app to be started with VITE_AUTH_BYPASS=true so that
 * the auth middleware lets every route through without a real Firebase session.
 *
 * Start the dev server as:
 *   VITE_AUTH_BYPASS=true npm run dev
 * Then run:
 *   npx cypress run --spec tests/e2e/specs/navigation.spec.js
 */

/**
 * Helper: open the navigation drawer.
 * The drawer is toggled by the hamburger icon in the app bar.
 */
function openDrawer () {
  cy.get('.v-app-bar .v-app-bar-nav-icon').click()
  // Wait for the drawer to animate into view
  cy.get('.v-navigation-drawer').should('be.visible')
}

describe('Main navigation (demo mode)', () => {
  beforeEach(() => {
    // Start on the dashboard; VITE_AUTH_BYPASS=true bypasses Firebase auth
    cy.navigateTo('dashboard')
    cy.get('h1', { timeout: 15000 }).should('be.visible')
  })

  it('shows the app name in the navigation drawer header', () => {
    openDrawer()
    // The top v-list-item in the drawer links to /dashboard and shows the app name
    cy.get('.v-navigation-drawer .v-list-item').first()
      .should('contain.text', 'Organizer')
  })

  it('navigates to the Tasks page via the sidebar link', () => {
    openDrawer()
    cy.get('.v-navigation-drawer .v-list-item').contains('Tasks').click()
    cy.url().should('include', '/tasks')
    cy.get('h1').should('contain.text', 'Tasks')
  })

  it('navigates to the People page via the sidebar link', () => {
    openDrawer()
    cy.get('.v-navigation-drawer .v-list-item').contains('People').click()
    cy.url().should('include', '/people')
    cy.get('h1').should('contain.text', 'People')
  })

  it('navigates to the Meetings page via the sidebar link', () => {
    openDrawer()
    cy.get('.v-navigation-drawer .v-list-item').contains('Meetings').click()
    cy.url().should('include', '/meetings')
    // The page heading confirms navigation succeeded
    cy.get('h1').should('contain.text', 'Meetings')
  })

  it('shows breadcrumbs on a nested page (Tasks)', () => {
    cy.navigateTo('tasks')
    cy.get('h1', { timeout: 15000 }).should('be.visible')

    // AppBreadcrumbs renders a v-breadcrumbs element only when there are > 1 segments
    // On /tasks the breadcrumb trail should include at least one item
    cy.get('.v-breadcrumbs').should('exist')
    cy.get('.v-breadcrumbs-item').should('have.length.at.least', 1)
  })
})
