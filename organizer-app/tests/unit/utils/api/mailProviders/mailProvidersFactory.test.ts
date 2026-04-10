import { describe, it, expect } from 'vitest'
import {
  googleIntegrationAccount,
  office365IntegrationAccount,
  exchangeIntegrationAccount
} from '../../../helpers/mockIntegrationAccount'
import type { IntegrationAccount } from '~/types/models'
import { getMailProvider } from '~/utils/api/mailProviders'
import { GmailProvider } from '~/utils/api/mailProviders/GmailProvider'
import { Office365Provider } from '~/utils/api/mailProviders/Office365Provider'
import { ExchangeProvider } from '~/utils/api/mailProviders/ExchangeProvider'

describe('getMailProvider', () => {
  it('returns GmailProvider for google', () => {
    const p = getMailProvider(googleIntegrationAccount())
    expect(p).toBeInstanceOf(GmailProvider)
  })

  it('returns Office365Provider for office365', () => {
    const p = getMailProvider(office365IntegrationAccount())
    expect(p).toBeInstanceOf(Office365Provider)
  })

  it('returns ExchangeProvider for exchange', () => {
    const p = getMailProvider(exchangeIntegrationAccount())
    expect(p).toBeInstanceOf(ExchangeProvider)
  })

  it('throws for unsupported type', () => {
    const acc = {
      ...googleIntegrationAccount(),
      type: 'unknown'
    } as unknown as IntegrationAccount
    expect(() => getMailProvider(acc)).toThrow(/Unsupported account type/)
  })
})
