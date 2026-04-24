#!/usr/bin/env node

/**
 * Microsoft OAuth Setup Helper Script (ESM Version)
 *
 * Guides users through setting up OAuth credentials for Microsoft API integration
 * including Outlook mail, Calendar, Contacts, and To Do tasks.
 */

import fs from 'fs'
import http from 'http'
import path from 'path'
import { randomBytes } from 'crypto'
import readline from 'readline'
import { fileURLToPath } from 'url'
import open from 'open'
import express from 'express'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = 3333
const OAUTH_CALLBACK_PATH = '/auth/callback'
const CREDENTIALS_FILE = path.join(__dirname, '../.ms-oauth-credentials.json')
const TOKENS_FILE = path.join(__dirname, '../.ms-oauth-tokens.json')

const MICROSOFT_GRAPH_SCOPES = [
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
  'Tasks.ReadWrite'
]

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function main () {
  console.log('\n\x1B[36m=== Microsoft OAuth Setup for Organizer App ===\x1B[0m\n')
  console.log('This script will help you set up OAuth credentials for Microsoft API integration.')
  console.log('Includes access to: Outlook Mail, Microsoft Calendar, Contacts, and To Do Tasks')

  let credentials = loadCredentials()
  if (!credentials) {
    console.log('\n\x1B[33m1. First, create an App Registration in the Azure portal:\x1B[0m')
    console.log('   a) Go to https://portal.azure.com/')
    console.log('   b) Navigate to Azure Active Directory → App registrations')
    console.log('   c) Click "New registration"')
    console.log('   d) Fill in the registration form:')
    console.log('      - Name: "Organizer App" (or any recognizable name)')
    console.log('      - Supported account types: "Accounts in any organizational directory')
    console.log('        and personal Microsoft accounts" (for personal Outlook.com accounts)')
    console.log('      - Redirect URI: Select "Web" and enter:')
    console.log(`        http://localhost:${PORT}${OAUTH_CALLBACK_PATH}`)
    console.log('   e) Click "Register"')
    console.log('   f) On the app Overview page, note:')
    console.log('      - Application (client) ID')
    console.log('      - Directory (tenant) ID  (use "common" for personal accounts)')
    console.log('   g) Go to "Certificates & secrets" → "New client secret"')
    console.log('      - Add a description and choose an expiry')
    console.log('      - Copy the secret VALUE immediately (it is only shown once)')
    console.log('   h) Go to "API permissions" → "Add a permission" → "Microsoft Graph"')
    console.log('      → "Delegated permissions" and add:')
    MICROSOFT_GRAPH_SCOPES.filter(s => !['openid','profile','offline_access','email'].includes(s)).forEach(scope => {
      console.log(`      - ${scope}`)
    })
    console.log('   i) Click "Grant admin consent" if your account has admin privileges')
    console.log('      (If not, users will be prompted for consent on first login)')

    console.log('\n\x1B[33mEnter your Azure App Registration details:\x1B[0m')
    const clientId = await askQuestion('Application (client) ID: ')
    const clientSecret = await askQuestion('Client secret value: ')
    const tenantIdInput = await askQuestion('Directory (tenant) ID [press Enter for "common"]: ')
    const tenantId = tenantIdInput.trim() || 'common'

    if (!clientId.trim() || !clientSecret.trim()) {
      console.error('\x1B[31mClient ID and Client Secret are required.\x1B[0m')
      process.exit(1)
    }

    credentials = { clientId: clientId.trim(), clientSecret: clientSecret.trim(), tenantId }
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2))
    console.log('\x1B[32mCredentials saved successfully!\x1B[0m')
  } else {
    console.log('\x1B[32mExisting credentials found.\x1B[0m')
    console.log(`  Client ID: ${credentials.clientId}`)
    console.log(`  Tenant ID: ${credentials.tenantId}`)
    const reuse = await askQuestion('Use these credentials? [Y/n]: ')
    if (reuse.trim().toLowerCase() === 'n') {
      fs.unlinkSync(CREDENTIALS_FILE)
      rl.close()
      console.log('Credentials removed. Re-run the script to enter new credentials.')
      process.exit(0)
    }
  }

  console.log('\n\x1B[33m2. Authorizing with Microsoft...\x1B[0m')
  const tokens = await startOAuthFlow(credentials)

  console.log('\n\x1B[33m3. Using the tokens in the application\x1B[0m')
  console.log('Your credentials and tokens have been saved to:')
  console.log('  Credentials:', CREDENTIALS_FILE)
  console.log('  Tokens:     ', TOKENS_FILE)

  console.log('\n\x1B[33mInstructions for adding the integration in the Organizer App:\x1B[0m')
  console.log('1. Open the app and go to your Profile')
  console.log('2. Navigate to the Integrations tab')
  console.log('3. Click "Add Integration" and select "Microsoft / Office 365"')
  console.log('4. Enter the following details:')
  console.log('   - Account Name: Choose a recognizable name (e.g., "My Outlook Account")')
  console.log('   - Type: office365')
  console.log('   - Client ID:     ', credentials.clientId)
  console.log('   - Client Secret: ', credentials.clientSecret)
  console.log('   - Refresh Token: ', tokens.refresh_token)
  if (tokens.email) {
    console.log('   - Email:         ', tokens.email)
  }
  console.log('5. Select which services to synchronize (Mail, Calendar, Contacts, Tasks)')
  console.log('6. Click Save to complete the integration setup')

  console.log('\n\x1B[33mServer environment variables (add to your .env):\x1B[0m')
  console.log(`  MICROSOFT_CLIENT_ID=${credentials.clientId}`)
  console.log(`  MICROSOFT_CLIENT_SECRET=${credentials.clientSecret}`)
  if (credentials.tenantId !== 'common') {
    console.log(`  MICROSOFT_TENANT_ID=${credentials.tenantId}`)
  }

  console.log('\n\x1B[33mImportant Notes:\x1B[0m')
  console.log('- The access token is temporary; the refresh token is long-lived')
  console.log('- Keep your client secret and refresh token secure — treat them like passwords')
  console.log('- If the refresh token expires, re-run this script to generate a new one')
  console.log('- Client secrets expire based on the duration you chose in the Azure portal')
  console.log('- For shared/team use, consider using a service principal or managed identity')

  console.log('\n\x1B[32mSetup complete! You can now use Microsoft integrations in the Organizer App.\x1B[0m')
  rl.close()
}

function loadCredentials () {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('Error reading credentials file:', error.message)
  }
  return null
}

async function startOAuthFlow (credentials) {
  return new Promise((resolve, reject) => {
    const app = express()
    const server = http.createServer(app)

    const state = randomBytes(16).toString('hex')
    const { clientId, clientSecret, tenantId } = credentials
    const redirectUri = `http://localhost:${PORT}${OAUTH_CALLBACK_PATH}`

    const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`)
    authUrl.searchParams.append('client_id', clientId)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('redirect_uri', redirectUri)
    authUrl.searchParams.append('scope', MICROSOFT_GRAPH_SCOPES.join(' '))
    authUrl.searchParams.append('response_mode', 'query')
    authUrl.searchParams.append('prompt', 'consent')
    authUrl.searchParams.append('state', state)

    app.get(OAUTH_CALLBACK_PATH, async (req, res) => {
      try {
        if (req.query.state !== state) {
          throw new Error('State mismatch — possible CSRF attack.')
        }

        if (req.query.error) {
          throw new Error(`Authorization error: ${req.query.error} — ${req.query.error_description || ''}`)
        }

        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
        const params = new URLSearchParams()
        params.append('client_id', clientId)
        params.append('client_secret', clientSecret)
        params.append('code', req.query.code)
        params.append('redirect_uri', redirectUri)
        params.append('grant_type', 'authorization_code')
        params.append('scope', MICROSOFT_GRAPH_SCOPES.join(' '))

        const tokenResponse = await axios.post(tokenUrl, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })

        const tokens = tokenResponse.data

        // Decode email from id_token if present
        let email = null
        if (tokens.id_token) {
          try {
            const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString())
            email = payload.email || payload.preferred_username || null
          } catch {}
        }

        fs.writeFileSync(TOKENS_FILE, JSON.stringify({
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          expiry_date: Date.now() + (tokens.expires_in * 1000),
          token_type: tokens.token_type,
          scope: tokens.scope,
          email
        }, null, 2))

        res.send(`
          <html>
            <head>
              <title>OAuth Successful</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: green; }
                .container { max-width: 600px; margin: 0 auto; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="success">Authentication Successful!</h1>
                <p>Your Microsoft account has been successfully authenticated.</p>
                <p>You can now close this window and return to the terminal.</p>
              </div>
            </body>
          </html>
        `)

        setTimeout(() => {
          server.close()
          resolve({ ...tokens, email })
        }, 1000)
      } catch (error) {
        console.error('Error in OAuth callback:', error.message)
        res.status(500).send(`
          <html>
            <head>
              <title>OAuth Error</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: red; }
                .container { max-width: 600px; margin: 0 auto; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="error">Authentication Error</h1>
                <p>${error.message}</p>
                <p>Please close this window and try again.</p>
              </div>
            </body>
          </html>
        `)
        reject(error)
      }
    })

    server.listen(PORT, async () => {
      console.log(`OAuth server started on port ${PORT}...`)
      console.log('Opening browser for authorization...')
      await open(authUrl.toString())
      console.log('Please complete the authorization in your browser.')
      console.log('If the browser does not open automatically, go to:')
      console.log(authUrl.toString())
    })

    server.on('error', (error) => {
      console.error('Server error:', error.message)
      reject(error)
    })
  })
}

function askQuestion (question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

main().catch((error) => {
  console.error('\x1B[31mError:', error.message, '\x1B[0m')
  process.exit(1)
})
