#!/usr/bin/env node

/**
 * Force Demo Auth Mode
 * 
 * This script forces the app into demo/bypass auth mode by modifying
 * local storage and .env settings to ensure the feedback system works
 * without real Firebase authentication.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

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

function createTestFeedback(fileName = 'sample-feedback.json') {
  print('Creating sample feedback data...', 'blue');
  
  const feedbackData = {
    feedbacks: [
      {
        id: "test-feedback-1",
        userId: "demo-user-id", // This should match the demo user ID in auth.ts
        message: "This is a test feedback message 1",
        screenshot: "",
        consoleMessages: "Console log 1\nConsole log 2",
        timestamp: new Date().toISOString(),
        page: "/dashboard",
        seen: false,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "test-feedback-2",
        userId: "demo-user-id",
        message: "This is a test feedback message 2",
        screenshot: "",
        consoleMessages: "Test console message",
        timestamp: new Date().toISOString(),
        page: "/calendar",
        seen: true,
        userAction: "yes",
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "test-feedback-3",
        userId: "demo-user-id",
        message: "This is a test feedback message 3",
        screenshot: "",
        consoleMessages: "Error message",
        timestamp: new Date().toISOString(),
        page: "/tasks",
        seen: true,
        userAction: "no",
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "test-feedback-4",
        userId: "demo-user-id",
        message: "This is a test feedback message 4 (improved)",
        screenshot: "",
        consoleMessages: "Test message",
        timestamp: new Date().toISOString(),
        page: "/people",
        seen: true,
        userAction: "yes",
        improved: true,
        improvedAt: new Date().toISOString(),
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "test-feedback-5",
        userId: "demo-user-id",
        message: "This is a test feedback message 5 (archived)",
        screenshot: "",
        consoleMessages: "Test message",
        timestamp: new Date().toISOString(),
        page: "/projects",
        seen: true,
        userAction: "yes",
        archived: true,
        archivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  };
  
  // Write to file
  const filePath = path.join(__dirname, '..', fileName);
  fs.writeFileSync(filePath, JSON.stringify(feedbackData, null, 2));
  
  print(`✅ Sample feedback data created at ${filePath}`, 'green');
  print('You can now import this data into the Firebase emulator or use it with mock data', 'green');
  
  return filePath;
}

function ensureAuthBypassInEnv() {
  print('Checking .env file for auth bypass setting...', 'blue');
  
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check if VITE_AUTH_BYPASS is already set to true
    if (envContent.includes('VITE_AUTH_BYPASS=true')) {
      print('✅ Auth bypass is already enabled in .env', 'green');
      return true;
    }
    
    // Remove existing setting if present
    envContent = envContent.replace(/VITE_AUTH_BYPASS=.*\n/g, '');
    
    // Add the setting
    envContent += '\nVITE_AUTH_BYPASS=true\n';
    
    fs.writeFileSync(envPath, envContent);
    print('✅ Added VITE_AUTH_BYPASS=true to .env', 'green');
    
    return true;
  } catch (error) {
    print(`❌ Error updating .env file: ${error.message}`, 'red');
    return false;
  }
}

function patchFeedbackStore() {
  print('Patching feedback store for demo mode...', 'blue');
  
  const feedbackStorePath = path.join(__dirname, '..', 'stores', 'feedback.ts');
  
  try {
    if (!fs.existsSync(feedbackStorePath)) {
      print(`❌ Feedback store file not found at ${feedbackStorePath}`, 'red');
      return false;
    }
    
    let content = fs.readFileSync(feedbackStorePath, 'utf8');
    
    // Check if we need to patch the store
    if (content.includes('// Demo mode - load from static data')) {
      print('✅ Feedback store already patched for demo mode', 'green');
      return true;
    }
    
    // Find the fetchFeedbacks function to patch
    const fetchFeedbacksMatch = content.match(/const fetchFeedbacks = async \(userId: string\) => {[\s\S]*?}/);
    
    if (!fetchFeedbacksMatch) {
      print('❌ Could not find fetchFeedbacks function to patch', 'red');
      return false;
    }
    
    const originalFetchFeedbacks = fetchFeedbacksMatch[0];
    
    // Create a new version with demo mode
    const patchedFetchFeedbacks = `const fetchFeedbacks = async (userId: string) => {
    loading.value = true
    error.value = null
    
    // Check for demo mode
    const isDev = import.meta.env.DEV
    const bypassAuth = isDev && import.meta.env.VITE_AUTH_BYPASS === 'true'
    
    if (bypassAuth) {
      console.log('Demo mode - load from static data')
      try {
        // Create demo feedbacks
        feedbacks.value = [
          {
            id: "demo-feedback-1",
            userId: "demo-user-id",
            message: "This is a demo feedback item 1",
            screenshot: "",
            consoleMessages: "Demo console log 1\\nDemo console log 2",
            timestamp: new Date(),
            page: "/dashboard",
            seen: false,
            archived: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: "demo-feedback-2",
            userId: "demo-user-id",
            message: "This is a demo feedback item 2",
            screenshot: "",
            consoleMessages: "Test console message",
            timestamp: new Date(),
            page: "/calendar",
            seen: true,
            userAction: "yes",
            archived: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: "demo-feedback-3",
            userId: "demo-user-id",
            message: "This is a demo feedback item 3",
            screenshot: "",
            consoleMessages: "Error message demo",
            timestamp: new Date(),
            page: "/tasks",
            seen: true,
            userAction: "no",
            archived: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: "demo-feedback-4",
            userId: "demo-user-id",
            message: "This is a demo feedback item 4 (improved)",
            screenshot: "",
            consoleMessages: "Demo message",
            timestamp: new Date(),
            page: "/people",
            seen: true,
            userAction: "yes",
            improved: true,
            improvedAt: new Date(),
            archived: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: "demo-feedback-5",
            userId: "demo-user-id",
            message: "This is a demo feedback item 5 (archived)",
            screenshot: "",
            consoleMessages: "Demo message",
            timestamp: new Date(),
            page: "/projects",
            seen: true,
            userAction: "yes",
            archived: true,
            archivedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
        
        console.log(\`Created \${feedbacks.value.length} demo feedback items\`)
        loading.value = false
        return
      } catch (e) {
        console.error('Error creating demo feedbacks:', e)
      }
    }
    
    // Continue with normal Firestore logic for non-demo mode
    try {
      console.log('Initializing Firestore connection...')
      const db = getFirestore()
      
      if (!db) {
        console.error('Failed to initialize Firestore')
        error.value = 'Failed to connect to Firestore'
        return
      }
      
      console.log('Firestore initialized successfully')
      const feedbacksRef = collection(db, 'feedbacks')
      
      console.log('Getting all feedback items (development mode - no filters)')
      
      try {
        // First try a simple query to see if we can access Firestore at all
        const testQuery = query(feedbacksRef, limit(1))
        const testResult = await getDocs(testQuery)
        console.log(\`Test query returned \${testResult.docs.length} items\`)
      } catch (testError) {
        console.error('Test query failed:', testError)
      }
      
      // Development mode - get ALL feedback without filtering by userId
      const q = query(feedbacksRef)
      
      console.log('Executing main query...')
      const querySnapshot = await getDocs(q)
      
      console.log(\`Query returned \${querySnapshot.docs.length} items\`)
      
      if (querySnapshot.empty) {
        console.log('No feedback items found')
        feedbacks.value = []
        return
      }
      
      // Process results with detailed logging
      const results: Feedback[] = []
      
      querySnapshot.forEach(doc => {
        try {
          const rawData = doc.data()
          console.log(\`Processing document \${doc.id}:\`, rawData)
          
          // Convert Firestore timestamps to Date objects
          let processedData: any = { ...rawData }
          
          // Ensure data has all required fields
          const feedback: Feedback = {
            id: doc.id,
            userId: processedData.userId || 'unknown',
            message: processedData.message || '',
            screenshot: processedData.screenshot || '',
            consoleMessages: processedData.consoleMessages || '',
            timestamp: processedData.timestamp?.toDate?.() || new Date(),
            seen: !!processedData.seen,
            userAction: processedData.userAction || undefined,
            improved: !!processedData.improved,
            improvedAt: processedData.improvedAt?.toDate?.() || undefined,
            archived: !!processedData.archived,
            archivedAt: processedData.archivedAt?.toDate?.() || undefined,
            processedByClaude: !!processedData.processedByClaude,
            processedAt: processedData.processedAt?.toDate?.() || undefined,
            createdAt: processedData.createdAt?.toDate?.() || new Date(),
            updatedAt: processedData.updatedAt?.toDate?.() || new Date(),
            page: processedData.page || ''
          }
          
          console.log(\`Processed feedback object:\`, feedback)
          results.push(feedback)
        } catch (docError) {
          console.error(\`Error processing document \${doc.id}:\`, docError)
        }
      })
      
      console.log(\`Successfully processed \${results.length} feedback items\`)
      feedbacks.value = results
      
    } catch (e) {
      console.error('Error fetching feedbacks:', e)
      error.value = 'Failed to load feedbacks'
    } finally {
      loading.value = false
    }
  }`;
    
    // Replace the original function with the patched version
    content = content.replace(originalFetchFeedbacks, patchedFetchFeedbacks);
    
    fs.writeFileSync(feedbackStorePath, content);
    print('✅ Successfully patched feedback store for demo mode', 'green');
    
    return true;
  } catch (error) {
    print(`❌ Error patching feedback store: ${error.message}`, 'red');
    return false;
  }
}

function patchFeedbackPage() {
  print('Patching feedback page component...', 'blue');
  
  const feedbackPagePath = path.join(__dirname, '..', 'pages', 'feedback', 'index.vue');
  
  try {
    if (!fs.existsSync(feedbackPagePath)) {
      print(`❌ Feedback page not found at ${feedbackPagePath}`, 'red');
      return false;
    }
    
    let content = fs.readFileSync(feedbackPagePath, 'utf8');
    
    // Check if we need to patch
    if (content.includes('// For demo mode')) {
      print('✅ Feedback page already patched for demo mode', 'green');
      return true;
    }
    
    // Find the onMounted hook to patch
    const onMountedMatch = content.match(/onMounted\(async \(\) => {[\s\S]*?}\)/);
    
    if (!onMountedMatch) {
      print('❌ Could not find onMounted hook to patch', 'red');
      return false;
    }
    
    const originalOnMounted = onMountedMatch[0];
    
    // Create a new version with demo mode check
    const patchedOnMounted = `onMounted(async () => {
  // Clear any previous errors, safely check if method exists
  if (typeof feedbackStore.clearError === 'function') {
    feedbackStore.clearError()
  } else if (feedbackStore.error) {
    feedbackStore.error = null
  }
  
  // For demo mode
  const isDev = import.meta.env.DEV
  const bypassAuth = isDev && import.meta.env.VITE_AUTH_BYPASS === 'true'
  
  if (bypassAuth) {
    console.log('Demo mode - loading feedback without user check')
    await feedbackStore.fetchFeedbacks('demo-user-id')
    return
  }
  
  if (authStore.user) {
    await feedbackStore.fetchFeedbacks(authStore.user.id)
  }
})`;
    
    // Replace the original hook with the patched version
    content = content.replace(originalOnMounted, patchedOnMounted);
    
    fs.writeFileSync(feedbackPagePath, content);
    print('✅ Successfully patched feedback page for demo mode', 'green');
    
    return true;
  } catch (error) {
    print(`❌ Error patching feedback page: ${error.message}`, 'red');
    return false;
  }
}

function addLocalStorageDemoMode() {
  print('Adding a script to set demo mode in localStorage on page load...', 'blue');
  
  const appVuePath = path.join(__dirname, '..', 'app.vue');
  
  try {
    if (!fs.existsSync(appVuePath)) {
      print(`❌ App.vue not found at ${appVuePath}`, 'red');
      return false;
    }
    
    let content = fs.readFileSync(appVuePath, 'utf8');
    
    // Check if we already added the script
    if (content.includes('localStorage.setItem(\'demoMode\', \'true\')')) {
      print('✅ Demo mode localStorage script already added', 'green');
      return true;
    }
    
    // Check if there's a script setup section to add to
    if (content.includes('<script setup>')) {
      // Add after the script setup opening
      content = content.replace(
        '<script setup>',
        '<script setup>\n// Force demo mode for auth bypass\nif (typeof window !== \'undefined\') {\n  localStorage.setItem(\'demoMode\', \'true\');\n  console.log(\'Demo mode set in localStorage\');\n}\n'
      );
    } else {
      // Add a new script setup section
      content = content.replace(
        '</template>',
        '</template>\n\n<script setup>\n// Force demo mode for auth bypass\nif (typeof window !== \'undefined\') {\n  localStorage.setItem(\'demoMode\', \'true\');\n  console.log(\'Demo mode set in localStorage\');\n}\n</script>'
      );
    }
    
    fs.writeFileSync(appVuePath, content);
    print('✅ Successfully added localStorage demo mode script', 'green');
    
    return true;
  } catch (error) {
    print(`❌ Error adding localStorage demo mode script: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  print('🔧 Force Demo Auth Mode Helper', 'cyan');
  print('===================================', 'cyan');
  print('This script will force the app into demo auth mode', 'yellow');
  console.log();
  
  // Steps to enforce demo mode
  let success = true;
  
  // 1. Ensure .env has VITE_AUTH_BYPASS=true
  success = success && ensureAuthBypassInEnv();
  
  // 2. Patch feedback store with demo data
  success = success && patchFeedbackStore();
  
  // 3. Patch feedback page to load without requiring auth
  success = success && patchFeedbackPage();
  
  // 4. Add localStorage demo mode setup
  success = success && addLocalStorageDemoMode();
  
  // 5. Create sample feedback data file
  const feedbackPath = createTestFeedback();
  
  if (success) {
    print('\n🎉 Success! Demo auth mode is now enforced', 'green');
    print('\nTo see the changes, restart your development server:', 'cyan');
    print('  npm run dev', 'yellow');
    print('\nThen visit the feedback page:', 'cyan');
    print('  http://localhost:3000/feedback', 'yellow');
    
    print('\nRecommended: Use Firebase emulators for full testing:', 'cyan');
    print('  firebase emulators:start', 'yellow');
    
    print('\nTo restore normal authentication, edit .env and change:', 'cyan');
    print('  VITE_AUTH_BYPASS=true → VITE_AUTH_BYPASS=false', 'yellow');
  } else {
    print('\n❌ Some operations failed. See messages above for details.', 'red');
    print('You may need to manually make some changes.', 'yellow');
  }
}

// Run the main function
main();
