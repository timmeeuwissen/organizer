import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TEAM_BOARD_DISPLAY,
  mergeTeamBoardDisplay
} from '~/config/teamBoard'

describe('mergeTeamBoardDisplay', () => {
  it('returns defaults for null', () => {
    expect(mergeTeamBoardDisplay(null)).toEqual(DEFAULT_TEAM_BOARD_DISPLAY)
  })

  it('merges partial fields', () => {
    expect(
      mergeTeamBoardDisplay({
        density: 'compact',
        showRecentMail: false
      })
    ).toEqual({
      density: 'compact',
      showRecentMail: false,
      showTasks: true
    })
  })

  it('ignores invalid density', () => {
    expect(
      mergeTeamBoardDisplay({ density: 'huge' as 'normal' })
    ).toEqual(DEFAULT_TEAM_BOARD_DISPLAY)
  })
})
