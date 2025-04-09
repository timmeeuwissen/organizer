#!/usr/bin/env node

/**
 * Simple database initialization script
 * This is a standalone script that doesn't require Firebase Admin SDK
 * Instead, it creates a JSON file with sample data that would mimic
 * the structure of the Firestore database
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Function to generate UUIDs without external dependencies
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Create a timestamp in the format Firestore would use
function createTimestamp() {
  return {
    _seconds: Math.floor(Date.now() / 1000),
    _nanoseconds: 0
  };
}

// Create sample user data
function createSampleData() {
  // Create sample user with no integrations
  const basicUserId = `test-user-${Date.now()}`;
  const basicUser = {
    id: basicUserId,
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: '',
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    lastLogin: createTimestamp(),
    settings: {
      defaultLanguage: 'en',
      darkMode: false,
      emailNotifications: true,
      calendarSync: false,
      integrationAccounts: []
    }
  };

  // Create sample user with integrations
  const integrationUserId = `test-user-with-integrations-${Date.now()}`;
  const integratedUser = {
    id: integrationUserId,
    email: 'integrated@example.com',
    displayName: 'Integrated User',
    photoURL: '',
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    lastLogin: createTimestamp(),
    settings: {
      defaultLanguage: 'en',
      darkMode: true,
      emailNotifications: true,
      calendarSync: true,
      integrationAccounts: [
        {
          id: generateId(),
          name: 'Work Gmail',
          type: 'google',
          email: 'work@example.com',
          username: 'work@example.com',
          connected: true,
          lastSync: createTimestamp(),
          syncCalendar: true,
          syncMail: true,
          syncTasks: true,
          syncContacts: true,
          showInCalendar: true,
          showInMail: true,
          showInTasks: true,
          showInContacts: true,
          color: '#4285F4',
          createdAt: createTimestamp(),
          updatedAt: createTimestamp()
        },
        {
          id: generateId(),
          name: 'Personal Office 365',
          type: 'office365',
          email: 'personal@example.com',
          username: 'personal@example.com',
          connected: true,
          lastSync: createTimestamp(),
          syncCalendar: true,
          syncMail: true,
          syncTasks: false,
          syncContacts: false,
          showInCalendar: true,
          showInMail: true,
          showInTasks: false,
          showInContacts: false,
          color: '#0078D4',
          createdAt: createTimestamp(),
          updatedAt: createTimestamp()
        }
      ]
    }
  };

  // Create the users collection
  const usersCollection = {
    [basicUserId]: basicUser,
    [integrationUserId]: integratedUser
  };

  // Create the database structure
  const database = {
    users: usersCollection
  };

  return database;
}

// Main function
function main() {
  console.log('Creating sample database structure...');
  
  try {
    // Create the database structure
    const database = createSampleData();
    
    // Define the output directory and file path
    const outputDir = path.join(process.cwd(), 'firebase-export');
    const outputFile = path.join(outputDir, 'firebase-export.json');
    
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the database structure to a file
    fs.writeFileSync(outputFile, JSON.stringify(database, null, 2));
    
    console.log(`Sample database structure created at: ${outputFile}`);
    console.log('\nTo import this data into Firebase:');
    console.log('1. Go to Firebase Console');
    console.log('2. Navigate to Firestore Database');
    console.log('3. Click on "Import/Export" and select the JSON file');
    console.log('\nAlternatively, you can use this sample data as a reference');
    console.log('for how to structure your Firestore database.');
    
  } catch (error) {
    console.error('Error creating sample database structure:', error);
    process.exit(1);
  }
}

// Run the main function
main();
