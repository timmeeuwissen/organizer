#!/usr/bin/env node

/**
 * This script processes feedback submissions that have been marked for action (userAction="yes")
 * and prepares them for sending to the Claude VSCode extension.
 * 
 * It retrieves the approved feedback items from Firestore, formats them appropriately,
 * and opens VSCode with the Claude extension and passes the feedback information.
 */

const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');
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
    // Create query to get approved feedback
    const feedbackRef = collection(db, 'feedbacks');
    const q = query(
      feedbackRef,
      where('userAction', '==', 'yes'),
      where('processedByClaude', '!=', true)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No approved feedback items to process.');
      return;
    }

    // Process each approved feedback item
    for (const docSnapshot of querySnapshot.docs) {
      const feedback = {
        id: docSnapshot.id,
        ...docSnapshot.data()
      };

      console.log(`Processing feedback: ${feedback.id}`);
      
      // Create a temporary file with the feedback content
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFile = path.join(tempDir, `feedback-${feedback.id}.json`);
      
      // Prepare feedback data for Claude
      const feedbackForClaude = {
        message: feedback.message,
        screenshot: feedback.screenshot ? 'Included (base64 encoded - truncated for readability)' : 'Not included',
        consoleMessages: feedback.consoleMessages || 'None',
        page: feedback.page,
        timestamp: feedback.timestamp ? new Date(feedback.timestamp).toISOString() : new Date().toISOString()
      };
      
      // Write formatted feedback to the temporary file
      fs.writeFileSync(tempFile, JSON.stringify(feedbackForClaude, null, 2));
      
      // Open VSCode with the file and trigger Claude with the appropriate prompt
      const claudePrompt = `Please review this user feedback and suggest action: ${feedback.message}`;
      
      // Command to open VSCode with Claude
      // This assumes the user has VSCode with Claude extension installed
      // and the 'code' command is in the PATH
      const command = `code "${tempFile}" --goto 1:1 && sleep 1 && osascript -e 'tell application "System Events" to keystroke "k" using {command down, shift down}' && sleep 0.5 && osascript -e 'tell application "System Events" to keystroke "${claudePrompt}"'`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error opening VSCode with Claude: ${error.message}`);
          return;
        }
        
        if (stderr) {
          console.error(`Error: ${stderr}`);
          return;
        }
        
        console.log(`VSCode opened with feedback: ${feedback.id}`);
        
        // Mark feedback as processed
        updateDoc(doc(db, 'feedbacks', feedback.id), {
          processedByClaude: true,
          processedAt: new Date()
        }).catch(err => {
          console.error(`Error marking feedback as processed: ${err.message}`);
        });
      });
      
      // Only process one feedback item at a time to avoid overwhelming the system
      break;
    }
  } catch (error) {
    console.error('Error processing feedback:', error);
  }
}

// Run the script
processApprovedFeedback();
