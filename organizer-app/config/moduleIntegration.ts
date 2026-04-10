/**
 * Whitelist: only these route segments support integration account filtering in the GUI.
 * See also config/modules.yaml (comment) and docs/product/modules.md.
 */
export const MODULE_INTEGRATION_SEGMENTS = ['mail', 'calendar', 'tasks', 'people', 'meetings'] as const

export type ModuleIntegrationSegment = (typeof MODULE_INTEGRATION_SEGMENTS)[number]

/** How integration accounts are narrowed for a module (may differ from route segment, e.g. people → contacts). */
export type ModuleIntegrationFilterKind =
  | 'mail'
  | 'calendar'
  | 'tasks'
  | 'contacts'
  | 'meetings'

export const MODULE_INTEGRATION_FILTER_KIND: Record<
  ModuleIntegrationSegment,
  ModuleIntegrationFilterKind
> = {
  mail: 'mail',
  calendar: 'calendar',
  tasks: 'tasks',
  people: 'contacts',
  meetings: 'meetings'
}
