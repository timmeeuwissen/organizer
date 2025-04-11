#!/usr/bin/env node

/**
 * Firebase Permission Fix Helper
 * 
 * This script helps troubleshoot and fix common Firebase permission issues
 * when deploying Firestore rules.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create an interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color formatting for console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Print a colored message
function print(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Run a command and return the result
function runCommand(command, silent = false) {
  try {
    if (!silent) {
      print(`Running: ${command}`, 'blue');
    }
    const output = execSync(command, { encoding: 'utf8' });
    if (!silent && output.trim()) {
      console.log(output);
    }
    return { success: true, output };
  } catch (error) {
    if (!silent) {
      print(`Error running command: ${command}`, 'red');
      console.error(error.message);
    }
    return { success: false, error: error.message };
  }
}

// Check if Firebase CLI is installed
function checkFirebaseCLI() {
  print('Checking Firebase CLI...', 'blue');
  const result = runCommand('firebase --version', true);
  
  if (!result.success) {
    print('Firebase CLI is not installed or not in your PATH', 'red');
    print('To install Firebase CLI, run:', 'yellow');
    print('npm install -g firebase-tools', 'cyan');
    return false;
  }
  
  print(`✅ Firebase CLI is installed (${result.output.trim()})`, 'green');
  return true;
}

// Check Firebase login status
function checkFirebaseLogin() {
  print('Checking Firebase login status...', 'blue');
  const result = runCommand('firebase login:list', true);
  
  if (!result.success || result.output.includes('No active credentials found')) {
    print('❌ You are not logged in to Firebase', 'red');
    return false;
  }
  
  print('✅ You are logged in to Firebase as:', 'green');
  console.log(result.output.trim());
  return true;
}

// Check .firebaserc file
function checkFirebaseConfig() {
  print('Checking Firebase project configuration...', 'blue');
  
  // Check .firebaserc file
  const firebaseRcPath = path.join(__dirname, '..', '.firebaserc');
  if (!fs.existsSync(firebaseRcPath)) {
    print('❌ .firebaserc file is missing', 'red');
    return { success: false, error: 'Missing .firebaserc file' };
  }
  
  try {
    const firebaseRc = JSON.parse(fs.readFileSync(firebaseRcPath, 'utf8'));
    if (!firebaseRc.projects || !firebaseRc.projects.default) {
      print('❌ .firebaserc is missing the default project', 'red');
      return { success: false, error: 'Invalid .firebaserc configuration' };
    }
    
    const projectId = firebaseRc.projects.default;
    print(`✅ Firebase project ID: ${projectId}`, 'green');
    
    // Check if project exists in Firebase
    const listResult = runCommand('firebase projects:list', true);
    if (listResult.success && listResult.output.includes(projectId)) {
      print(`✅ Project "${projectId}" exists in your Firebase account`, 'green');
      return { success: true, projectId };
    } else {
      print(`❌ Project "${projectId}" is not accessible with your Firebase account`, 'red');
      return { success: false, error: 'Project not accessible', projectId };
    }
  } catch (error) {
    print(`❌ Error parsing .firebaserc: ${error.message}`, 'red');
    return { success: false, error: 'Invalid .firebaserc file' };
  }
}

// Helper function to ask a yes/no question
function askYesNo(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Re-authenticate with Firebase
async function reAuthenticate() {
  if (await askYesNo('Would you like to re-authenticate with Firebase?')) {
    print('Logging out from Firebase...', 'blue');
    runCommand('firebase logout');
    
    print('Logging in to Firebase...', 'blue');
    const loginResult = runCommand('firebase login');
    
    if (loginResult.success) {
      print('✅ Successfully logged in to Firebase', 'green');
      return true;
    } else {
      print('❌ Failed to log in to Firebase', 'red');
      return false;
    }
  }
  return false;
}

// Generate a new Firebase token
async function generateToken() {
  if (await askYesNo('Would you like to generate a new Firebase token for CI/CD?')) {
    print('Generating new Firebase token...', 'blue');
    print('This will open a browser window to authenticate.', 'yellow');
    
    const tokenResult = runCommand('firebase login:ci');
    
    if (tokenResult.success) {
      print('✅ Successfully generated Firebase token', 'green');
      print('You can use this token for deployments:', 'yellow');
      print('firebase deploy --token "YOUR_TOKEN"', 'cyan');
      return true;
    } else {
      print('❌ Failed to generate Firebase token', 'red');
      return false;
    }
  }
  return false;
}

// Use local emulator instead of deployment
async function useEmulator() {
  if (await askYesNo('Would you like to use Firebase emulators instead of deploying rules?')) {
    print('Starting Firebase emulators...', 'blue');
    print('This will allow you to test your app locally without deploying rules.', 'yellow');
    
    const emulatorResult = runCommand('firebase emulators:start');
    
    if (emulatorResult.success) {
      print('✅ Firebase emulators started successfully', 'green');
      return true;
    } else {
      print('❌ Failed to start Firebase emulators', 'red');
      return false;
    }
  }
  return false;
}

// Start a new Firebase project
async function createNewProject() {
  if (await askYesNo('Would you like to create a new Firebase project?')) {
    const projectName = await new Promise((resolve) => {
      rl.question('Enter a unique project ID (e.g., organizer-app-123): ', (answer) => {
        resolve(answer.trim());
      });
    });
    
    if (!projectName) {
      print('❌ Invalid project name', 'red');
      return false;
    }
    
    print(`Creating new Firebase project: ${projectName}...`, 'blue');
    const createResult = runCommand(`firebase projects:create ${projectName}`);
    
    if (createResult.success) {
      print(`✅ Successfully created Firebase project: ${projectName}`, 'green');
      
      print('Setting as default project...', 'blue');
      runCommand(`firebase use ${projectName}`);
      
      print('Updating .firebaserc...', 'blue');
      const firebaseRcPath = path.join(__dirname, '..', '.firebaserc');
      const firebaseRc = {
        projects: {
          default: projectName
        }
      };
      fs.writeFileSync(firebaseRcPath, JSON.stringify(firebaseRc, null, 2));
      
      print('✅ Project configuration updated', 'green');
      return true;
    } else {
      print('❌ Failed to create Firebase project', 'red');
      return false;
    }
  }
  return false;
}

// Check Firestore Database existence
async function checkFirestoreDatabase() {
  print('Checking Firestore database...', 'blue');
  
  // We can't directly check if database exists through CLI, but we can check indirectly
  const result = runCommand('firebase firestore:indexes', true);
  
  if (result.success) {
    print('✅ Firestore database seems to be accessible', 'green');
    return true;
  } else {
    print('⚠️ Firestore database might not be set up yet', 'yellow');
    
    if (await askYesNo('Would you like to initialize Firestore database?')) {
      print('Please visit the Firebase Console to initialize Firestore:', 'blue');
      print('https://console.firebase.google.com/', 'cyan');
      print('1. Select your project', 'yellow');
      print('2. Click on "Firestore Database" in the left menu', 'yellow');
      print('3. Click "Create database"', 'yellow');
      print('4. Choose "Start in test mode" for development purposes', 'yellow');
      print('5. Select a location close to your users', 'yellow');
      
      await new Promise((resolve) => {
        rl.question('Press Enter when you have completed these steps...', () => {
          resolve();
        });
      });
    }
  }
  
  return false;
}

// Deploy just the Firestore rules with a token
async function deployWithToken() {
  const token = await new Promise((resolve) => {
    rl.question('Enter your Firebase token (from firebase login:ci) or press Enter to skip: ', (answer) => {
      resolve(answer.trim());
    });
  });
  
  if (token) {
    print('Deploying Firestore rules with token...', 'blue');
    const deployResult = runCommand(`firebase deploy --only firestore:rules --token "${token}"`);
    
    if (deployResult.success) {
      print('✅ Successfully deployed Firestore rules', 'green');
      return true;
    } else {
      print('❌ Failed to deploy Firestore rules with token', 'red');
      return false;
    }
  }
  
  return false;
}

// Main function
async function main() {
  print('🔧 Firebase Permission Fix Helper', 'cyan');
  print('===================================', 'cyan');
  print('This script will help diagnose and fix Firebase permission issues.', 'yellow');
  console.log();
  
  // Check Firebase CLI
  if (!checkFirebaseCLI()) {
    return;
  }
  
  // Check login status
  const isLoggedIn = checkFirebaseLogin();
  if (!isLoggedIn) {
    await reAuthenticate();
  }
  
  // Check project configuration
  const projectConfig = checkFirebaseConfig();
  
  // Suggest fixes based on the issues found
  if (!projectConfig.success) {
    print('\n🔍 Permission Issues Detected', 'yellow');
    print('Here are the recommended fixes:', 'yellow');
    
    if (projectConfig.error === 'Missing .firebaserc file' || 
        projectConfig.error === 'Invalid .firebaserc configuration') {
      print('1. Create a new Firebase project', 'cyan');
      await createNewProject();
    } else if (projectConfig.error === 'Project not accessible') {
      print(`1. The project "${projectConfig.projectId}" is not accessible with your current account.`, 'cyan');
      print('   Possible causes:', 'yellow');
      print('   - You are logged in with the wrong Google account', 'yellow');
      print('   - You do not have sufficient permissions on this project', 'yellow');
      print('   - The project has been deleted or its ID has changed', 'yellow');
      
      const reAuthResult = await reAuthenticate();
      if (!reAuthResult) {
        await createNewProject();
      }
    }
  } else {
    print('\n🔍 Authorization Check', 'yellow');
    await checkFirestoreDatabase();
    
    print('\n🔧 Troubleshooting Options', 'yellow');
    print('Choose one of the following options:', 'yellow');
    
    let fixed = false;
    
    // Try re-authenticating if not already done
    if (isLoggedIn && await askYesNo('Would you like to try re-authenticating?')) {
      fixed = await reAuthenticate();
    }
    
    // Try generating a new token
    if (!fixed && await askYesNo('Would you like to try using a CI token for deployment?')) {
      await generateToken();
      fixed = await deployWithToken();
    }
    
    // Suggest using emulator
    if (!fixed) {
      await useEmulator();
    }
    
    // Create a new project as last resort
    if (!fixed && await askYesNo('Would you like to try creating a new project?')) {
      fixed = await createNewProject();
      
      if (fixed) {
        print('Now trying to deploy Firestore rules to the new project...', 'blue');
        const deployResult = runCommand('firebase deploy --only firestore:rules');
        
        if (deployResult.success) {
          print('✅ Successfully deployed Firestore rules to the new project', 'green');
        } else {
          print('❌ Failed to deploy Firestore rules to the new project', 'red');
        }
      }
    }
  }
  
  print('\n🔑 Final instructions:', 'yellow');
  print('1. Make sure your Google account has Owner or Editor role in Firebase project settings', 'cyan');
  print('2. Check if your Firebase project requires a billing account', 'cyan');
  print('3. For local testing, use Firebase emulators instead of deploying rules', 'cyan');
  print('   Run: firebase emulators:start', 'blue');
  print('4. Create a dedicated service account with specific permissions for CI/CD deployments', 'cyan');
  print('   Visit: https://console.cloud.google.com/iam-admin/serviceaccounts', 'blue');
  
  rl.close();
}

// Run the main function
main().catch(error => {
  print(`Unexpected error: ${error.message}`, 'red');
  rl.close();
});
