#!/usr/bin/env node

/**
 * Google OAuth Setup Helper Script
 * 
 * This script guides users through the process of setting up OAuth
 * credentials for Gmail API integration.
 */

const { default: axios } = require('axios');
const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const open = require('open');
const { randomBytes } = require('crypto');
const readline = require('readline');

// Configuration constants
const PORT = 3333;
const OAUTH_CALLBACK_PATH = '/oauth2callback';
const CREDENTIALS_FILE = path.join(__dirname, '../.google-oauth-credentials.json');
const TOKENS_FILE = path.join(__dirname, '../.google-oauth-tokens.json');
const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',   // Read Gmail messages and settings
  'https://www.googleapis.com/auth/gmail.send',       // Send emails
  'https://www.googleapis.com/auth/gmail.labels',     // Manage labels
  'https://www.googleapis.com/auth/gmail.modify'      // Ability to modify Gmail
];

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Main function to guide the user through OAuth setup
 */
async function main() {
  console.log('\n\x1b[36m=== Google OAuth Setup for Organizer App ===\x1b[0m\n');
  console.log('This script will help you set up OAuth credentials for Gmail integration.');
  
  // Step 1: Check if we already have credentials
  let credentials = loadCredentials();
  if (!credentials) {
    console.log('\n\x1b[33m1. First, you need to create OAuth credentials in Google Cloud Console:\x1b[0m');
    console.log('   a) Go to https://console.cloud.google.com/');
    console.log('   b) Create a new project or select an existing one');
    console.log('   c) Go to APIs & Services > Library');
    console.log('   d) Search for and enable "Gmail API"');
    console.log('   e) Go to APIs & Services > Credentials');
    console.log('   f) Click Create Credentials > OAuth client ID');
    console.log('   g) Set Application Type to "Web application"');
    console.log('   h) Add "http://localhost:3333/oauth2callback" as an authorized redirect URI');
    console.log('   i) Create the credentials and download the JSON file');
    
    const credentialsPath = await askQuestion('\nEnter the path to your downloaded credentials JSON file: ');
    try {
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      // Save credentials to the app's directory
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
      console.log('\x1b[32mCredentials saved successfully!\x1b[0m');
    } catch (error) {
      console.error('\x1b[31mError loading credentials file:', error.message, '\x1b[0m');
      process.exit(1);
    }
  } else {
    console.log('\x1b[32mExisting OAuth credentials found.\x1b[0m');
  }
  
  // Step 2: Authorize with Google
  console.log('\n\x1b[33m2. Now we need to authorize the application to access your Gmail account\x1b[0m');
  const authorizationResult = await startOAuthFlow(credentials);
  
  // Step 3: Show how to use the tokens
  console.log('\n\x1b[33m3. Using the tokens in the application\x1b[0m');
  console.log('Your refresh token has been saved to:', TOKENS_FILE);
  console.log('\nTo use these credentials in the application:');
  console.log('1. Copy the client ID, client secret, and refresh token to your app configuration');
  console.log('2. Use these values when setting up a Gmail account in the app');
  console.log('\nRefresh Token:', authorizationResult.refresh_token);
  console.log('Access Token:', authorizationResult.access_token);
  console.log('(The access token is temporary and will expire, but the refresh token can be used long-term)');
  
  console.log('\n\x1b[32mSetup complete! You can now use Gmail integration in the Organizer App.\x1b[0m');
  rl.close();
}

/**
 * Load credentials from the saved file
 */
function loadCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading credentials file:', error.message);
  }
  return null;
}

/**
 * Start the OAuth flow with Google
 */
async function startOAuthFlow(credentials) {
  return new Promise((resolve, reject) => {
    const app = express();
    const server = http.createServer(app);
    
    // Generate a random state parameter to prevent CSRF attacks
    const state = randomBytes(16).toString('hex');
    
    // The credentials structure varies based on how they were created
    const clientId = credentials.installed?.client_id || credentials.web?.client_id;
    const clientSecret = credentials.installed?.client_secret || credentials.web?.client_secret;
    const redirectUri = `http://localhost:${PORT}${OAUTH_CALLBACK_PATH}`;
    
    if (!clientId || !clientSecret) {
      reject(new Error('Invalid credentials format. Ensure it contains client_id and client_secret.'));
      return;
    }
    
    // Create the authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', GOOGLE_OAUTH_SCOPES.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent'); // Force to show consent screen to get refresh token
    authUrl.searchParams.append('state', state);
    
    // Handle the OAuth callback
    app.get(OAUTH_CALLBACK_PATH, async (req, res) => {
      try {
        // Verify state parameter
        if (req.query.state !== state) {
          throw new Error('State mismatch. Possible CSRF attack.');
        }
        
        if (req.query.error) {
          throw new Error(`Authorization error: ${req.query.error}`);
        }
        
        // Exchange code for tokens
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          code: req.query.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        });
        
        // Save the tokens
        const tokens = tokenResponse.data;
        fs.writeFileSync(TOKENS_FILE, JSON.stringify({
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          expiry_date: Date.now() + (tokens.expires_in * 1000),
          token_type: tokens.token_type,
          scope: tokens.scope
        }, null, 2));
        
        // Show success page
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
                <p>Your Google account has been successfully authenticated.</p>
                <p>You can now close this window and return to the terminal.</p>
              </div>
            </body>
          </html>
        `);
        
        // Close the server and resolve the promise
        setTimeout(() => {
          server.close();
          resolve(tokens);
        }, 1000);
      } catch (error) {
        console.error('Error in OAuth callback:', error.message);
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
        `);
        reject(error);
      }
    });
    
    // Start the server
    server.listen(PORT, async () => {
      console.log(`OAuth server started on port ${PORT}...`);
      
      // Open the browser with the authorization URL
      console.log('Opening browser for authorization...');
      await open(authUrl.toString());
      console.log('Please complete the authorization in your browser.');
      console.log('If the browser does not open automatically, please go to:');
      console.log(authUrl.toString());
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error.message);
      reject(error);
    });
  });
}

/**
 * Promisified version of readline question
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the main function
main().catch(error => {
  console.error('\x1b[31mError:', error.message, '\x1b[0m');
  process.exit(1);
});
