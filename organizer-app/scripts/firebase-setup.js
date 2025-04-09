#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const log = {
  info: (msg) => console.log(`${GREEN}[INFO]${RESET} ${msg}`),
  warn: (msg) => console.log(`${YELLOW}[WARN]${RESET} ${msg}`),
  error: (msg) => console.log(`${RED}[ERROR]${RESET} ${msg}`),
};

async function main() {
  log.info('Starting Firebase setup process...');
  
  // Check if Firebase CLI is installed
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    log.info('Firebase CLI is installed ✓');
  } catch (error) {
    log.error('Firebase CLI is not installed. Please install it with: npm install -g firebase-tools');
    process.exit(1);
  }
  
  // Check if user is logged in to Firebase
  try {
    const loginOutput = execSync('firebase login:list').toString();
    if (!loginOutput.includes('│ ✔ ')) {
      log.warn('Not logged in to Firebase.');
      await ask('Please login with "firebase login" in another terminal, then press Enter to continue...');
    } else {
      log.info('Already logged in to Firebase ✓');
    }
  } catch (error) {
    log.warn('Could not check Firebase login status. You may need to login.');
    await ask('Run "firebase login" in another terminal if needed, then press Enter to continue...');
  }
  
  // Check if .firebaserc exists
  const hasFirebaserc = fs.existsSync(path.join(process.cwd(), '.firebaserc'));
  let projectId;
  
  if (hasFirebaserc) {
    try {
      const firebaserc = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.firebaserc'), 'utf8'));
      projectId = firebaserc.projects.default;
      log.info(`Found Firebase project: ${projectId} ✓`);
    } catch (error) {
      log.error('Could not parse .firebaserc file.');
    }
  }
  
  if (!projectId) {
    // Firebase project is not set up, run init
    log.info('No Firebase project found. Running Firebase init...');
    
    projectId = await ask('Enter your Firebase project ID (or press Enter to create a new project): ');
    
    if (projectId) {
      log.info(`Using existing project: ${projectId}`);
    } else {
      log.info('Creating new Firebase project...');
      try {
        // Create a new project and get its ID
        const projectName = await ask('Enter a name for your new Firebase project: ');
        
        log.info('Creating new Firebase project...');
        const createOutput = execSync(`firebase projects:create --display-name="${projectName}"`).toString();
        
        const match = createOutput.match(/Project ID: ([a-z0-9-]+)/);
        if (match) {
          projectId = match[1];
          log.info(`Created new Firebase project with ID: ${projectId}`);
        } else {
          log.error('Could not extract project ID from output. Please check Firebase console.');
          process.exit(1);
        }
      } catch (error) {
        log.error(`Failed to create Firebase project: ${error.message}`);
        process.exit(1);
      }
    }
    
    try {
      log.info('Running Firebase init for Authentication and Firestore...');
      execSync(`firebase init --project=${projectId} firestore auth`, { stdio: 'inherit' });
      log.info('Firebase init completed ✓');
    } catch (error) {
      log.error(`Failed to initialize Firebase: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Check for Firestore database
  try {
    execSync(`firebase --project=${projectId} firestore:indexes`, { stdio: 'ignore' });
    log.info('Firestore is set up ✓');
  } catch (error) {
    log.warn('Firestore might not be set up in this project.');
    const setupFirestore = await ask('Do you want to set up Firestore now? (y/n): ');
    
    if (setupFirestore.toLowerCase() === 'y') {
      try {
        log.info('Setting up Firestore...');
        execSync(`firebase --project=${projectId} init firestore`, { stdio: 'inherit' });
        log.info('Firestore setup completed ✓');
      } catch (error) {
        log.error(`Failed to set up Firestore: ${error.message}`);
      }
    }
  }
  
  // Get Firebase config for the web app
  let webAppConfig;
  try {
    log.info('Checking for existing web app...');
    const appsOutput = execSync(`firebase --project=${projectId} apps:list WEB`).toString();
    
    if (appsOutput.includes('No WEB apps found')) {
      log.info('No web app found. Creating a new one...');
      const appName = await ask('Enter a name for your web app (default: organizer-app): ') || 'organizer-app';
      
      const createAppOutput = execSync(`firebase --project=${projectId} apps:create WEB ${appName}`).toString();
      const appIdMatch = createAppOutput.match(/App ID: ([\w:]+)/);
      
      if (appIdMatch) {
        const appId = appIdMatch[1];
        log.info(`Created web app with ID: ${appId}`);
        
        const sdkConfigOutput = execSync(`firebase --project=${projectId} apps:sdkconfig WEB ${appId}`).toString();
        const configMatch = sdkConfigOutput.match(/var firebaseConfig = (\{[\s\S]*?\});/);
        
        if (configMatch) {
          try {
            webAppConfig = eval(`(${configMatch[1]})`);
            log.info('Retrieved Firebase config ✓');
          } catch (error) {
            log.error(`Failed to parse Firebase config: ${error.message}`);
          }
        }
      }
    } else {
      log.info('Web app found. Getting SDK config...');
      const appIdMatch = appsOutput.match(/│\s+([\w:]+)\s+│/);
      
      if (appIdMatch) {
        const appId = appIdMatch[1];
        const sdkConfigOutput = execSync(`firebase --project=${projectId} apps:sdkconfig WEB ${appId}`).toString();
        const configMatch = sdkConfigOutput.match(/var firebaseConfig = (\{[\s\S]*?\});/);
        
        if (configMatch) {
          try {
            webAppConfig = eval(`(${configMatch[1]})`);
            log.info('Retrieved Firebase config ✓');
          } catch (error) {
            log.error(`Failed to parse Firebase config: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    log.error(`Failed to get web app config: ${error.message}`);
  }
  
  // Update .env file with Firebase config
  if (webAppConfig) {
    try {
      log.info('Updating .env file with Firebase config...');
      
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Update Firebase config variables
      const configVars = {
        'FIREBASE_API_KEY': webAppConfig.apiKey,
        'FIREBASE_AUTH_DOMAIN': webAppConfig.authDomain,
        'FIREBASE_PROJECT_ID': webAppConfig.projectId,
        'FIREBASE_STORAGE_BUCKET': webAppConfig.storageBucket,
        'FIREBASE_MESSAGING_SENDER_ID': webAppConfig.messagingSenderId,
        'FIREBASE_APP_ID': webAppConfig.appId,
        'FIREBASE_MEASUREMENT_ID': webAppConfig.measurementId
      };
      
      for (const [key, value] of Object.entries(configVars)) {
        if (!value) continue;
        
        const regex = new RegExp(`^${key}=.*$`, 'm');
        
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      }
      
      fs.writeFileSync(envPath, envContent.trim() + '\n');
      log.info('Updated .env file with Firebase config ✓');
      
      // Also update the .env.example file if it exists
      const envExamplePath = path.join(process.cwd(), '.env.example');
      if (fs.existsSync(envExamplePath)) {
        let envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
        
        for (const key of Object.keys(configVars)) {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          if (regex.test(envExampleContent)) {
            envExampleContent = envExampleContent.replace(regex, `${key}=your_${key.toLowerCase()}_here`);
          } else {
            envExampleContent += `\n${key}=your_${key.toLowerCase()}_here`;
          }
        }
        
        fs.writeFileSync(envExamplePath, envExampleContent.trim() + '\n');
        log.info('Updated .env.example file ✓');
      }
    } catch (error) {
      log.error(`Failed to update .env file: ${error.message}`);
    }
  }
  
  log.info('Creating basic Firestore security rules...');
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  
  if (!fs.existsSync(rulesPath)) {
    const basicRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lock down by default
    match /{document=**} {
      allow read, write: if false;
    }
    
    // User profiles
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // Integrate validation for integration accounts
      match /settings/integrationAccounts {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`;
    
    fs.writeFileSync(rulesPath, basicRules);
    log.info('Created basic Firestore security rules ✓');
  }
  
  log.info('Deploying Firestore security rules...');
  try {
    execSync(`firebase --project=${projectId} deploy --only firestore:rules`, { stdio: 'inherit' });
    log.info('Deployed Firestore security rules ✓');
  } catch (error) {
    log.error(`Failed to deploy Firestore security rules: ${error.message}`);
  }
  
  log.info('Firebase setup completed successfully!');
  log.info('You may need to restart your development server to apply the new Firebase configuration.');
  
  rl.close();
}

main().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
