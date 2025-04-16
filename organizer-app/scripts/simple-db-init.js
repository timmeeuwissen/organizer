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

  // Create sample meeting categories
  const meetingCategoriesCollection = {};
  
  // Create categories for basic user
  const basicUserCategories = [
    {
      id: generateId(),
      userId: basicUserId,
      name: 'Standup',
      description: 'Daily team standup meetings',
      color: '#4CAF50',
      icon: 'mdi-account-group',
      createdAt: createTimestamp(),
      updatedAt: createTimestamp()
    },
    {
      id: generateId(),
      userId: basicUserId,
      name: 'Client Meeting',
      description: 'Meetings with external clients',
      color: '#F44336',
      icon: 'mdi-account-tie',
      createdAt: createTimestamp(),
      updatedAt: createTimestamp()
    },
    {
      id: generateId(),
      userId: basicUserId,
      name: 'Planning',
      description: 'Sprint planning meetings',
      color: '#2196F3',
      icon: 'mdi-chart-timeline',
      createdAt: createTimestamp(),
      updatedAt: createTimestamp()
    }
  ];
  
  // Add categories to the collection
  basicUserCategories.forEach(category => {
    meetingCategoriesCollection[category.id] = category;
  });
  
  // Create sample meetings
  const meetingsCollection = {};
  
  // Create meetings for basic user
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const basicUserMeetings = [
    {
      id: generateId(),
      userId: basicUserId,
      title: 'Daily Standup',
      description: 'Team daily standup meeting',
      startTime: {
        _seconds: Math.floor(tomorrow.setHours(10, 0, 0) / 1000),
        _nanoseconds: 0
      },
      endTime: {
        _seconds: Math.floor(tomorrow.setHours(10, 30, 0) / 1000),
        _nanoseconds: 0
      },
      location: 'Conference Room A',
      participants: [],
      category: basicUserCategories[0].id, // Standup category
      notes: 'Discuss progress on current sprint',
      createdAt: createTimestamp(),
      updatedAt: createTimestamp()
    },
    {
      id: generateId(),
      userId: basicUserId,
      title: 'Client Presentation',
      description: 'Quarterly update with client',
      startTime: {
        _seconds: Math.floor(yesterday.setHours(14, 0, 0) / 1000),
        _nanoseconds: 0
      },
      endTime: {
        _seconds: Math.floor(yesterday.setHours(15, 30, 0) / 1000),
        _nanoseconds: 0
      },
      location: 'Main Meeting Room',
      participants: [],
      category: basicUserCategories[1].id, // Client Meeting category
      notes: 'Prepare slides for Q3 results',
      createdAt: createTimestamp(),
      updatedAt: createTimestamp()
    }
  ];
  
  // Add meetings to the collection
  basicUserMeetings.forEach(meeting => {
    meetingsCollection[meeting.id] = meeting;
  });

  // Create the database structure
  const database = {
    users: usersCollection,
    meetingCategories: meetingCategoriesCollection,
    meetings: meetingsCollection
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
