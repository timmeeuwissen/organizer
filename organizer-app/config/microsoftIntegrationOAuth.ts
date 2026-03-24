/**
 * Delegated Microsoft Graph scopes for mail, calendar, contacts, and To Do.
 * Keep in sync with the authorize URL in `MicrosoftAuthButton.vue` and token exchange in `oidc-callback`.
 */
export const MICROSOFT_GRAPH_INTEGRATION_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'email',
  'User.Read',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'Calendars.ReadWrite',
  'Contacts.Read',
  'Tasks.ReadWrite',
].join(' ')
