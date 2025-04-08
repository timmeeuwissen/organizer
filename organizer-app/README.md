# Organizer App

A comprehensive personal organization platform built with Nuxt 3, Vue 3, and Vuetify.

## Features

- **Behavior Tracking**: Register behaviors you do well, want to do better, or need to improve. Add rationale and action plans.
- **People Management**: Keep a directory of contacts with relevant details and track your interactions.
- **Project Management**: Organize projects with multiple pages, tasks, and team members.
- **Task Management**: Create tasks with subtasks, comments, priority, and more.
- **Calendar Integration**: See your meetings and tasks in a calendar view.
- **Meeting Management**: Create meeting summaries, link to projects and people.
- **Network Visualization**: See how all your data relates to one another with interactive graphs.
- **Statistics**: Track time spent on projects, behaviors, and tasks.
- **Multi-language Support**: Available in English and Dutch.

## Technology Stack

- **Frontend**: 
  - Nuxt 3
  - Vue 3
  - Vuetify 3
  - Pinia for state management
  - SASS for styling
  - Pug for templates
  
- **Backend**: 
  - Firebase (Firestore, Authentication)
  
- **Infrastructure**: 
  - Docker for containerization
  - Kubernetes support
  - Home Assistant integration

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Firebase account (for data storage)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/organizer-app.git
cd organizer-app
```

2. Initialize the project (installs dependencies and sets up environment)

```bash
make init
```

This will:
- Install all dependencies
- Run the environment setup script, which will guide you through configuring Firebase and other settings

Alternatively, you can do these steps manually:

```bash
# Install dependencies
make install

# Set up environment variables
make setup-env
```

3. Start the development server

```bash
make dev
```

### Environment Setup

The project includes an interactive setup script that guides you through creating the `.env` file with all necessary configuration:

- Firebase configuration (API keys, project settings)
- XAI API configuration (optional)
- App settings and feature flags

To run the setup script:

```bash
make setup-env
```

You will need to have:
1. A Firebase project created at [Firebase Console](https://console.firebase.google.com/)
2. Web app configured in your Firebase project
3. Authentication and Firestore enabled in your Firebase project

### Building for Production

```bash
make build
```

### Deployment Options

#### Docker

```bash
make docker-build
make docker-run
```

#### Kubernetes

```bash
make k8s-deploy
```

#### Home Assistant Add-on

```bash
make ha-addon
make ha-run
```

## Architecture

The application follows a modular architecture:

- `stores/`: Pinia stores for state management
- `components/`: Reusable Vue components
- `pages/`: Page components and routing
- `plugins/`: Vuetify, Firebase, i18n setup
- `types/`: TypeScript interfaces
- `locales/`: Language files

## Data Model

- **User**: Authentication and user preferences
- **Behavior**: Things you do well, want to improve, etc.
- **Person**: Contact information and interaction history
- **Project**: Projects with tasks, pages, and team members
- **Task**: Todo items with priority, status, etc.
- **Meeting**: Meeting notes, attendees, action items

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
