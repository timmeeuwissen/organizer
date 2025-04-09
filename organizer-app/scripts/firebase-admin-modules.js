#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
function initializeAdminApp() {
  try {
    // Check if we're already initialized
    try {
      return admin.app();
    } catch (e) {
      // App not initialized, continue
    }

    // Try to use service account file if it exists
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Initialized Firebase Admin SDK with service account file');
      return admin.app();
    }
    
    // Otherwise use application default credentials or .env file
    const dotEnvPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(dotEnvPath)) {
      // Load environment variables from .env file
      require('dotenv').config();
    }
    
    // If FIREBASE_PROJECT_ID is specified in .env, use it
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (projectId) {
      admin.initializeApp({
        projectId: projectId
      });
      console.log(`Initialized Firebase Admin SDK for project: ${projectId}`);
    } else {
      // Fall back to application default credentials
      admin.initializeApp();
      console.log('Initialized Firebase Admin SDK with application default credentials');
    }
    
    return admin.app();
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
}

// Initialize Firestore database with required collections and documents
async function initializeDatabase() {
  const app = initializeAdminApp();
  const db = admin.firestore();
  
  console.log('Initializing Firestore database structure...');
  
  try {
    // Check if we have test users in the database
    const usersCollection = db.collection('users');
    const usersSnapshot = await usersCollection.limit(1).get();
    
    // If no users exist, create some test users
    if (usersSnapshot.empty) {
      console.log('No users found. Creating sample user...');
      
      // Create a test user
      const testUserId = 'test-user-' + Date.now();
      await usersCollection.doc(testUserId).set({
        id: testUserId,
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        settings: {
          defaultLanguage: 'en',
          darkMode: false,
          emailNotifications: true,
          calendarSync: false,
          integrationAccounts: []
        }
      });
      
      console.log('Created sample user: test@example.com');
      
      // Create a second user with integration sample
      const userId2 = 'test-user-with-integrations-' + Date.now();
      await usersCollection.doc(userId2).set({
        id: userId2,
        email: 'integrated@example.com',
        displayName: 'Integrated User',
        photoURL: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        settings: {
          defaultLanguage: 'en',
          darkMode: true,
          emailNotifications: true,
          calendarSync: true,
          integrationAccounts: [
            {
              id: 'sample-integration-1',
              name: 'Work Gmail',
              type: 'google',
              email: 'work@example.com',
              username: 'work@example.com',
              connected: true,
              lastSync: admin.firestore.FieldValue.serverTimestamp(),
              syncCalendar: true,
              syncMail: true,
              syncTasks: true,
              syncContacts: true,
              showInCalendar: true,
              showInMail: true,
              showInTasks: true,
              showInContacts: true,
              color: '#4285F4',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            },
            {
              id: 'sample-integration-2',
              name: 'Personal Office 365',
              type: 'office365',
              email: 'personal@example.com',
              username: 'personal@example.com',
              connected: true,
              lastSync: admin.firestore.FieldValue.serverTimestamp(),
              syncCalendar: true,
              syncMail: true,
              syncTasks: false,
              syncContacts: false,
              showInCalendar: true,
              showInMail: true,
              showInTasks: false,
              showInContacts: false,
              color: '#0078D4',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
          ]
        }
      });
      
      console.log('Created sample user with integrations: integrated@example.com');
    } else {
      console.log('Users collection already initialized');
    }

    console.log('Firestore database structure initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Main command handler
const command = process.argv[2];

if (command === 'initializeDatabase') {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Database initialization error:', error);
      process.exit(1);
    });
} else {
  console.error(`Unknown command: ${command}`);
  console.log('Available commands:');
  console.log('  - initializeDatabase: Initialize Firestore database structure');
  process.exit(1);
}
