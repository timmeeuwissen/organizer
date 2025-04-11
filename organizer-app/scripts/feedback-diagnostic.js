#!/usr/bin/env node

/**
 * Feedback System Diagnostic Script
 * 
 * This script tests the connection to Firebase/Firestore and diagnostics the feedback
 * collection. It can help troubleshoot issues with feedback data retrieval.
 */

const { getFirestore, collection, query, getDocs, setDoc, doc } = require('firebase/firestore');
const { initializeApp } = require('firebase/app');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Check if required env vars are present
function checkEnvVars() {
  console.log('🔍 Checking environment variables...');
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID'
  ];

  let missingVars = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('   Make sure .env file exists and has these variables');
    return false;
  }

  console.log('✅ All required environment variables found');
  return true;
}

// Initialize Firebase and test connection
async function testFirebaseConnection() {
  console.log('🔥 Testing Firebase connection...');
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
    
    // Test Firestore connection
    const db = getFirestore(app);
    console.log('✅ Firestore instance created');
    
    return { success: true, app, db };
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return { success: false, error };
  }
}

// Check if feedbacks collection exists and read items
async function checkFeedbacksCollection(db) {
  console.log('🔍 Checking "feedbacks" collection...');
  try {
    const feedbacksRef = collection(db, 'feedbacks');
    const q = query(feedbacksRef);
    const querySnapshot = await getDocs(q);
    
    console.log(`✅ Successfully queried "feedbacks" collection`);
    console.log(`📊 Found ${querySnapshot.docs.length} feedback items`);
    
    if (querySnapshot.docs.length > 0) {
      console.log('\n📝 First 5 feedback items:');
      querySnapshot.docs.slice(0, 5).forEach((doc, i) => {
        console.log(`\nFeedback #${i+1} (ID: ${doc.id}):`);
        const data = doc.data();
        console.log(JSON.stringify(data, null, 2));
      });
    } else {
      console.log('Collection is empty. Would you like to create a test feedback item? (y/n)');
      process.stdin.once('data', async (buffer) => {
        const answer = buffer.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          await createTestFeedback(db);
          process.exit(0);
        } else {
          console.log('No test feedback created.');
          process.exit(0);
        }
      });
    }
    
    return { success: true, count: querySnapshot.docs.length };
  } catch (error) {
    console.error('❌ Error accessing "feedbacks" collection:', error);
    return { success: false, error };
  }
}

// Create a test feedback item
async function createTestFeedback(db) {
  console.log('🔧 Creating test feedback item...');
  
  try {
    const testFeedback = {
      userId: 'test-user',
      message: 'This is a test feedback item created by the diagnostic script',
      screenshot: '',
      consoleMessages: 'Test console message',
      timestamp: new Date(),
      seen: false,
      page: '/test-page',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const feedbacksRef = collection(db, 'feedbacks');
    const newFeedbackRef = doc(feedbacksRef);
    await setDoc(newFeedbackRef, testFeedback);
    
    console.log(`✅ Test feedback created successfully with ID: ${newFeedbackRef.id}`);
    return { success: true, id: newFeedbackRef.id };
  } catch (error) {
    console.error('❌ Error creating test feedback:', error);
    return { success: false, error };
  }
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('🔧 Starting Feedback System Diagnostics');
  console.log('======================================');
  
  // Check environment variables
  if (!checkEnvVars()) {
    return;
  }
  
  // Test Firebase connection
  const firebaseResult = await testFirebaseConnection();
  if (!firebaseResult.success) {
    return;
  }
  
  // Check feedbacks collection
  await checkFeedbacksCollection(firebaseResult.db);
}

// Run the diagnostics
runDiagnostics();
