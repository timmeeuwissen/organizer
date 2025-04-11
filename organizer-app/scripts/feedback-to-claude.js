#!/usr/bin/env node

/**
 * This script processes feedback submissions that have been marked for action (userAction="yes")
 * and prepares them for sending to the Claude VSCode extension.
 * 
 * It retrieves the approved feedback items from Firestore, formats them appropriately,
 * and opens VSCode with the Claude extension and passes the feedback information.
 */

const { getFirestore, collection, query, where, getDocs, updateDoc, doc, limit } = require('firebase/firestore');
const { initializeApp } = require('firebase/app');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Process approved feedback items from Firestore
 */
async function processApprovedFeedback() {
  try {
    // Log startup message
    console.log('Starting to process approved feedback items...');
    console.log('Connecting to Firestore...');
    
    // Create query to get approved feedback
    const feedbackRef = collection(db, 'feedbacks');
    
    // First check if we can access the collection at all
    try {
      await getDocs(query(feedbackRef, limit(1)));
      console.log('Successfully connected to Firestore and accessed the feedbacks collection.');
    } catch (e) {
      console.error('Error accessing feedbacks collection. Please ensure:');
      console.error('1. You have deployed the Firestore rules with "make feedback-rules"');
      console.error('2. You are authenticated with Firebase');
      console.error('3. The collection "feedbacks" exists in your Firestore database');
      console.error('\nError details:', e);
      return;
    }
  
      // Use a simple query that doesn't require composite indexes
      console.log('Querying for approved feedback items...');
      try {
        // First try with a more specific query
        const q = query(
          feedbackRef,
          where('userAction', '==', 'yes')
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('No approved feedback items to process.');
          return;
        }

        // Filter items in memory that haven't been processed and aren't improved yet
        const feedbackItems = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => item.processedByClaude !== true && item.improved !== true);
        
        if (feedbackItems.length === 0) {
          console.log('No feedback items need processing (all are either improved or already processed).');
          return;
        }

        console.log(`Found ${feedbackItems.length} approved feedback items to process.`);
        
        // Process each approved feedback item using the processFeedbackItem function
        for (const feedback of feedbackItems) {
          console.log(`Processing feedback: ${feedback.id}`);
          
          // Process the feedback item
          await processFeedbackItem(feedback);
          
          // Only process one feedback item at a time
          break;
        }
      } catch (e) {
        if (e.code === 'failed-precondition' && e.message.includes('requires an index')) {
          console.error('\n⚠️ Firestore index error!');
          console.error('This query requires a composite index in Firestore.');
          console.error('Please follow the link in the error message to create the necessary index:');
          console.error(e.message);
          console.error('\nAlternatively, to avoid this error, you can create the index manually:');
          console.error('1. Go to Firebase Console: https://console.firebase.google.com');
          console.error('2. Select your project and go to Firestore Database');
          console.error('3. Go to the "Indexes" tab');
          console.error('4. Click "Create index"');
          console.error('5. Collection: "feedbacks"');
          console.error('6. Fields to index:');
          console.error('   - userAction (Ascending)');
          console.error('   - processedByClaude (Ascending)');
          console.error('7. Click "Create index"');
          return;
        } else {
          throw e;
        }
      }
  } catch (error) {
    console.error('Error processing feedback:', error);
  }
}

/**
 * Process a single feedback item
 */
async function processFeedbackItem(feedback) {
      
  // Create a temporary file with the feedback content
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempFile = path.join(tempDir, `feedback-${feedback.id}.json`);
  
  // Prepare feedback data for Claude
  let timestampStr = '';
  try {
    // Handle Firestore timestamp objects or other timestamp formats
    if (feedback.timestamp) {
      if (feedback.timestamp.toDate && typeof feedback.timestamp.toDate === 'function') {
        // Handle Firestore timestamp objects
        timestampStr = feedback.timestamp.toDate().toISOString();
      } else if (feedback.timestamp.seconds && feedback.timestamp.nanoseconds) {
        // Handle Firestore timestamp data
        const milliseconds = feedback.timestamp.seconds * 1000 + feedback.timestamp.nanoseconds / 1000000;
        timestampStr = new Date(milliseconds).toISOString();
      } else if (feedback.timestamp instanceof Date) {
        // Handle native Date objects
        timestampStr = feedback.timestamp.toISOString();
      } else if (typeof feedback.timestamp === 'string') {
        // Handle string timestamps
        timestampStr = new Date(feedback.timestamp).toISOString();
      } else if (typeof feedback.timestamp === 'number') {
        // Handle numeric timestamps (milliseconds)
        timestampStr = new Date(feedback.timestamp).toISOString();
      } else {
        // Fallback to current time
        console.warn(`Unrecognized timestamp format:`, feedback.timestamp);
        timestampStr = new Date().toISOString();
      }
    } else {
      timestampStr = new Date().toISOString();
    }
  } catch (err) {
    console.warn(`Error formatting timestamp, using current time instead: ${err.message}`);
    timestampStr = new Date().toISOString();
  }
  
  const feedbackForClaude = {
    message: feedback.message || 'No message provided',
    screenshot: feedback.screenshot ? 'Included (base64 encoded - truncated for readability)' : 'Not included',
    consoleMessages: feedback.consoleMessages || 'None',
    page: feedback.page || 'Unknown page',
    timestamp: timestampStr
  };
  
  // Write formatted feedback to the temporary file
  fs.writeFileSync(tempFile, JSON.stringify(feedbackForClaude, null, 2));
  
  // Open VSCode with the file and trigger Claude with the appropriate prompt
  const claudePrompt = `Please review this user feedback and suggest action: ${feedback.message}`;
  
  // Create a promise to handle the async exec call
  return new Promise((resolve, reject) => {
    // Command to open VSCode with Claude
    // This assumes the user has VSCode with Claude extension installed
    // and the 'code' command is in the PATH
    const command = `code "${tempFile}" --goto 1:1 && sleep 1 && osascript -e 'tell application "System Events" to keystroke "k" using {command down, shift down}' && sleep 0.5 && osascript -e 'tell application "System Events" to keystroke "${claudePrompt}"'`;
    
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error opening VSCode with Claude: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error(`Error: ${stderr}`);
        reject(new Error(stderr));
        return;
      }
      
      console.log(`VSCode opened with feedback: ${feedback.id}`);
      
      try {
        // Mark feedback as processed but preserve it for history
        await updateDoc(doc(db, 'feedbacks', feedback.id), {
          processedByClaude: true,
          processedAt: new Date(),
          archived: false // Explicitly mark as not archived to keep in regular views
        });
        
        console.log(`Feedback ${feedback.id} marked as processed`);
        resolve();
      } catch (err) {
        console.error(`Error marking feedback as processed: ${err.message}`);
        reject(err);
      }
    });
  });
}

// Run the script
processApprovedFeedback();
