# Organizer App Feedback System

This document describes the feedback system implemented in the Organizer App.

## Features

- **Feedback Button**: Available on every page for authenticated users
- **Screenshot Capture**: Automatically captures the current page state
- **Console Logs**: Collects recent console messages for debugging (limited to 256 characters)
- **Management Interface**: Admin page to review and process feedback
- **Improved Status Tracking**: Track when feedback is improved/implemented
- **Feedback History**: Archive system to preserve past feedback
- **Claude Integration**: Send approved feedback to Claude in VSCode

## Components

1. **Feedback Button** (`components/feedback/FeedbackButton.vue`)
   - Floating button on each page
   - Form for submitting feedback
   - Screenshot preview
   - Console logs collection

2. **Feedback Management** (`pages/feedback/index.vue`)
   - View all feedback submissions
   - Filter by status (unseen, all, approved, improved, archived)
   - Mark for action (yes/no)
   - Mark as improved when fixed
   - Archive feedback to preserve history

3. **Feedback Store** (`stores/feedback.ts`)
   - State management with Pinia
   - Firestore integration
   - CRUD operations for feedback items
   - Support for improved status tracking
   - Archive functionality to preserve feedback history

4. **Claude Integration** (`scripts/feedback-to-claude.js`)
   - Processes approved feedback (not already improved)
   - Archives metadata but preserves the feedback 
   - Sends to VSCode with Claude

## Usage

### For Users

1. Click the feedback button in the bottom right corner of any page
2. Enter your feedback message
3. Optionally include a screenshot and console logs
4. Submit the feedback

### For Administrators

1. Navigate to `/feedback` to access the management interface
2. Review submitted feedback
3. Mark items for action or ignore
4. Process approved items with Claude
5. Mark as improved when fixed
6. Archive items to move them to history view

### Makefile Commands

```bash
# Deploy Firestore rules to allow feedback operations
make feedback-rules

# Open the feedback management interface
make feedback-review

# Process approved feedback with Claude
make feedback-to-claude
```

## Security Notes

The current Firestore rules are configured for development mode with unrestricted access to the feedback collection. Before deploying to production, update the rules in `firestore.rules` to restrict access appropriately.

### Troubleshooting Firebase Permission Issues

If you encounter Firebase permission errors when deploying Firestore rules, use the included troubleshooting script:

```bash
# Run the interactive Firebase permission fix helper
make firebase-fix
```

This script will:
1. Check your Firebase CLI installation and login status
2. Verify your project configuration in `.firebaserc`
3. Test access to your Firestore database
4. Offer options to fix permission issues:
   - Re-authenticating with Firebase
   - Generating a new CI token
   - Using Firebase emulators for local testing
   - Creating a new Firebase project

Common causes of permission errors:
- Logged in with the wrong Google account
- Missing required project permissions
- Project ID mismatch
- Expired Firebase token
- Firestore database not initialized

## Diagnostics & Troubleshooting

If you're having issues with the feedback system, use these diagnostic tools:

```bash
# Run the feedback diagnostic script
make feedback-diagnostic
```

This will:
- Test the Firestore connection
- Display existing feedback items
- Check for common configuration issues
- Create a test feedback item if needed

### Emulator Mode

For development without Firebase permissions, use the emulator:

```bash
firebase emulators:start
```

## Internationalization

The feedback system supports both English and Dutch languages through the translation files:
- `locales/en.ts`
- `locales/nl.ts`

All status messages, buttons, and UI elements have translations for both languages.
