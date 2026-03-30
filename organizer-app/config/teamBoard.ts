/**
 * Team attention board: lane layout and limits (read from config, not hard-coded in pages).
 */

/** Max inbox messages shown in each member's "Recent mail" lane sub-card */
export const TEAM_LANE_RECENT_EMAIL_LIMIT = 10

/** localStorage key prefix; full key is `${prefix}:${teamId}` */
export const TEAM_BOARD_DISPLAY_STORAGE_PREFIX = 'organizer.teamBoard.display'

export type TeamBoardDensity = 'normal' | 'compact'

export interface TeamBoardDisplayOptions {
  density: TeamBoardDensity
  showRecentMail: boolean
  showTasks: boolean
}

export const DEFAULT_TEAM_BOARD_DISPLAY: TeamBoardDisplayOptions = {
  density: 'normal',
  showRecentMail: true,
  showTasks: true,
}

export function mergeTeamBoardDisplay(
  partial: Partial<TeamBoardDisplayOptions> | null | undefined,
): TeamBoardDisplayOptions {
  const d = partial?.density
  const density: TeamBoardDensity =
    d === 'compact' || d === 'normal' ? d : DEFAULT_TEAM_BOARD_DISPLAY.density
  return {
    density,
    showRecentMail:
      typeof partial?.showRecentMail === 'boolean'
        ? partial.showRecentMail
        : DEFAULT_TEAM_BOARD_DISPLAY.showRecentMail,
    showTasks:
      typeof partial?.showTasks === 'boolean'
        ? partial.showTasks
        : DEFAULT_TEAM_BOARD_DISPLAY.showTasks,
  }
}
