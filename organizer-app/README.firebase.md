# Firebase Setup for Organizer App

This document explains how to set up Firebase for the Organizer App, including authentication and Firestore database.

## Prerequisites

- Node.js and npm installed
- Firebase CLI installed globally (`npm install -g firebase-tools`)
- Firebase account

## Setup Process

### Automatic Setup

We've created a streamlined setup process that handles most of the configuration automatically:

1. Run the Firebase setup script:

```bash
make firebase-setup
```

This script will:
- Check if Firebase CLI is installed
- Verify if you're logged in to Firebase
- Create a new Firebase project or use an existing one
- Set up Firebase Authentication and Firestore
- Create a web app in your Firebase project
- Update your local `.env` file with Firebase configuration
- Create basic Firestore security rules
- Deploy the security rules to Firebase

2. After setting up Firebase, install the dependencies (if not already done):

```bash
make install
```

3. Initialize the database structure:

```bash
make firebase-init-db
```

This will create a sample JSON file in `firebase-export/firebase-export.json` with all the necessary database structure. You can use this file as a reference or import it directly into Firebase.

If you have already installed all the required dependencies (firebase-admin, dotenv, etc.) and want to directly initialize the database in Firebase, you can use:

```bash
make firebase-init-db-legacy
```

### Manual Setup

If you prefer to set up Firebase manually:

1. Log in to Firebase:

```bash
firebase login
```

2. Initialize Firebase in your project:

```bash
firebase init
```

Select:
- Firestore
- Authentication
- (Optionally) Hosting if you want to deploy the app

3. Create a web app in your Firebase project:

```bash
firebase apps:create WEB organizer-app
```

4. Get the SDK config:

```bash
firebase apps:sdkconfig WEB <your-app-id>
```

5. Add the configuration to your `.env` file:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Firestore Database Structure

The app uses the following Firestore collections:

- `users`: Stores user profiles and settings
  - Each document contains user information and a `settings` object
  - The `settings` object includes `integrationAccounts` array for storing email/calendar integrations

## Firebase Configuration Files

The repository includes several Firebase configuration files:

- `firebase.json`: Main configuration file for Firebase that defines services and emulators
- `firestore.rules`: Security rules for Firestore database
- `firestore.indexes.json`: Index configuration for Firestore queries

These files are essential for Firebase operations and deployment.

## Working with Firebase Locally

### Running Firebase Emulators

For local development, you can use Firebase emulators:

```bash
make firebase-emulate
```

This will start local emulators for Firestore and Authentication on ports defined in `firebase.json`.

### Deploying to Firebase

Before deploying, make sure you're logged in to Firebase and have proper permissions:

```bash
firebase login
```

If you're using a project ID that doesn't exist or you don't have access to, you'll need to create a new project or use an existing one:

```bash
firebase projects:create my-organizer-app
# Or select an existing project
firebase use --add
```

Then update your `.firebaserc` file with the correct project ID.

To deploy your security rules to Firebase:

```bash
make firebase-rules
```

To deploy everything (including hosting if configured):

```bash
make firebase-deploy
```

#### Troubleshooting Deployment Issues

If you see permission errors (HTTP 403) when deploying rules:

1. Make sure you're logged in with `firebase login`
2. Verify the project in `.firebaserc` exists and you have access to it
3. Try creating a new project with `firebase projects:create` and updating `.firebaserc`
4. If working locally only, you can use Firebase emulators instead:
   ```bash
   make firebase-emulate
   ```

## Integration Accounts

Integration accounts are stored in the user's settings object in Firestore. The structure of an integration account is:

```javascript
{
  id: 'unique-id', // UUID
  name: 'Account Name',
  type: 'google', // or 'exchange', 'office365', etc.
  email: 'user@example.com',
  username: 'user@example.com',
  connected: true, // Connection status
  lastSync: Timestamp, // Last synchronization time
  syncCalendar: true,
  syncMail: true,
  syncTasks: true,
  syncContacts: true,
  showInCalendar: true,
  showInMail: true,
  showInTasks: true,
  showInContacts: true,
  color: '#4285F4', // Color for visual identification
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

When adding a new integration, make sure to update the user's settings in Firestore.
