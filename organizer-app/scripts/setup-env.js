#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define the env file path
const envFilePath = path.join(__dirname, '..', '.env');

// Check if .env file already exists
const envFileExists = fs.existsSync(envFilePath);

console.log('\n===== Organizer App Environment Setup =====\n');

if (envFileExists) {
  rl.question('An .env file already exists. Do you want to overwrite it? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      startSetup();
    } else {
      console.log('\nSetup canceled. Your existing .env file has been preserved.\n');
      rl.close();
    }
  });
} else {
  startSetup();
}

function startSetup() {
  console.log('\nThis script will help you set up your environment variables for the Organizer App.');
  console.log('You will need to provide the following information:');
  console.log('- Firebase configuration (API Key, Project ID, etc.)');
  console.log('- XAI API Key (optional)');
  console.log('- Other configuration settings\n');
  
  getFirebaseConfig();
}

function getFirebaseConfig() {
  console.log('\n--- Firebase Configuration ---');
  console.log('To get your Firebase configuration:');
  console.log('1. Go to https://console.firebase.google.com/');
  console.log('2. Select your project (or create a new one)');
  console.log('3. Click on the gear icon (Project Settings)');
  console.log('4. Scroll down to "Your apps" section');
  console.log('5. Select your web app (or create one with the </> button)');
  console.log('6. Copy the configuration values from the firebaseConfig object\n');

  let firebaseConfig = {};
  
  rl.question('Firebase API Key: ', (apiKey) => {
    firebaseConfig.apiKey = apiKey;
    
    rl.question('Firebase Auth Domain: ', (authDomain) => {
      firebaseConfig.authDomain = authDomain;
      
      rl.question('Firebase Project ID: ', (projectId) => {
        firebaseConfig.projectId = projectId;
        
        rl.question('Firebase Storage Bucket: ', (storageBucket) => {
          firebaseConfig.storageBucket = storageBucket;
          
          rl.question('Firebase Messaging Sender ID: ', (messagingSenderId) => {
            firebaseConfig.messagingSenderId = messagingSenderId;
            
            rl.question('Firebase App ID: ', (appId) => {
              firebaseConfig.appId = appId;
              
              rl.question('Firebase Measurement ID (optional): ', (measurementId) => {
                firebaseConfig.measurementId = measurementId;
                
                getXaiApiKey(firebaseConfig);
              });
            });
          });
        });
      });
    });
  });
}

function getXaiApiKey(firebaseConfig) {
  console.log('\n--- XAI API Configuration ---');
  console.log('The XAI API is used for intelligent features like suggesting connections,');
  console.log('analyzing behaviors, and generating summaries.');
  console.log('If you don\'t have an XAI API key yet, you can leave this blank and');
  console.log('the app will use simulated responses for demonstration purposes.\n');
  
  rl.question('XAI API Key (optional): ', (xaiApiKey) => {
    getAdditionalConfig(firebaseConfig, xaiApiKey);
  });
}

function getAdditionalConfig(firebaseConfig, xaiApiKey) {
  console.log('\n--- Additional Configuration ---');
  
  rl.question('App Name [Organizer]: ', (appName) => {
    appName = appName || 'Organizer';
    
    rl.question('Default Language [en]: ', (defaultLang) => {
      defaultLang = defaultLang || 'en';
      
      rl.question('API URL [http://localhost:3001/api]: ', (apiUrl) => {
        apiUrl = apiUrl || 'http://localhost:3001/api';
        
        generateEnvFile(firebaseConfig, xaiApiKey, appName, defaultLang, apiUrl);
      });
    });
  });
}

function generateEnvFile(firebaseConfig, xaiApiKey, appName, defaultLang, apiUrl) {
  // Create the env file content
  let envContent = `# Environment Configuration\n\n`;
  
  // App configuration
  envContent += `# App Configuration\n`;
  envContent += `APP_NAME=${appName}\n`;
  envContent += `DEFAULT_LANGUAGE=${defaultLang}\n`;
  envContent += `API_URL=${apiUrl}\n\n`;
  
  // Firebase configuration
  envContent += `# Firebase Configuration\n`;
  envContent += `FIREBASE_API_KEY=${firebaseConfig.apiKey}\n`;
  envContent += `FIREBASE_AUTH_DOMAIN=${firebaseConfig.authDomain}\n`;
  envContent += `FIREBASE_PROJECT_ID=${firebaseConfig.projectId}\n`;
  envContent += `FIREBASE_STORAGE_BUCKET=${firebaseConfig.storageBucket}\n`;
  envContent += `FIREBASE_MESSAGING_SENDER_ID=${firebaseConfig.messagingSenderId}\n`;
  envContent += `FIREBASE_APP_ID=${firebaseConfig.appId}\n`;
  
  if (firebaseConfig.measurementId) {
    envContent += `FIREBASE_MEASUREMENT_ID=${firebaseConfig.measurementId}\n`;
  }
  
  envContent += `\n`;
  
  // XAI API configuration
  envContent += `# XAI API Configuration\n`;
  envContent += `XAI_API_KEY=${xaiApiKey || ''}\n`;
  envContent += `XAI_API_ENABLED=${xaiApiKey ? 'true' : 'false'}\n\n`;
  
  // Feature flags
  envContent += `# Feature Flags\n`;
  envContent += `FEATURE_MAIL_INTEGRATION=true\n`;
  envContent += `FEATURE_CALENDAR_INTEGRATION=true\n`;
  envContent += `FEATURE_NETWORK_GRAPH=true\n`;
  envContent += `FEATURE_STATISTICS=true\n\n`;
  
  // Development configuration
  envContent += `# Development Configuration\n`;
  envContent += `DEBUG_MODE=false\n`;
  envContent += `MOCK_DATA=${!firebaseConfig.apiKey ? 'true' : 'false'}\n`;
  envContent += `VITE_AUTH_BYPASS=false\n\n`;
  
  // Firebase Emulator configuration
  envContent += `# Firebase Emulator Configuration\n`;
  envContent += `FIREBASE_USE_EMULATOR=false\n`;
  envContent += `FIREBASE_EMULATOR_HOST=localhost\n`;
  envContent += `FIREBASE_AUTH_EMULATOR_PORT=9099\n`;
  envContent += `FIREBASE_FIRESTORE_EMULATOR_PORT=8080\n`;
  envContent += `FIREBASE_STORAGE_EMULATOR_PORT=9199\n`;
  
  // Write the env file
  fs.writeFileSync(envFilePath, envContent);
  
  console.log('\n✅ .env file has been successfully created at:', envFilePath);
  console.log('\nNext steps:');
  console.log('1. Make sure you have enabled Authentication in your Firebase console');
  console.log('2. Enable Google as a sign-in provider in Firebase Authentication settings');
  console.log('3. Set up Firestore Database with appropriate security rules');
  console.log('4. Run `make dev` to start the development server\n');
  
  rl.close();
}

// Handle the readline close event
rl.on('close', () => {
  console.log('\nThank you for setting up the Organizer App!\n');
  process.exit(0);
});
