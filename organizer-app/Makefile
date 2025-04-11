.PHONY: help
.DEFAULT_GOAL := help

# Colors for terminal output
COLOR_RESET = \033[0m
COLOR_GREEN = \033[32m
COLOR_YELLOW = \033[33m
COLOR_BLUE = \033[34m
COLOR_CYAN = \033[36m

setup-env: ## Set up environment variables
	@echo "${COLOR_GREEN}Setting up environment variables...${COLOR_RESET}"
	node scripts/setup-env.js

help: ## Show this help message
	@echo "${COLOR_BLUE}Organizer App${COLOR_RESET} - Personal Organization Platform"
	@echo ""
	@echo "${COLOR_YELLOW}Available targets:${COLOR_RESET}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  ${COLOR_CYAN}%-20s${COLOR_RESET} %s\n", $$1, $$2}'
	@echo ""

install: ## Install dependencies
	@echo "${COLOR_GREEN}Installing dependencies...${COLOR_RESET}"
	npm install --legacy-peer-deps

dev: ## Start development server
	@echo "${COLOR_GREEN}Starting development server...${COLOR_RESET}"
	npm run dev

build: ## Build for production
	@echo "${COLOR_GREEN}Building for production...${COLOR_RESET}"
	npm run build

preview: ## Preview production build locally
	@echo "${COLOR_GREEN}Previewing production build...${COLOR_RESET}"
	npm run preview

generate: ## Generate static site
	@echo "${COLOR_GREEN}Generating static site...${COLOR_RESET}"
	npm run generate

test: ## Run unit tests
	@echo "${COLOR_GREEN}Running unit tests...${COLOR_RESET}"
	npm run test

test-e2e: ## Run end-to-end tests
	@echo "${COLOR_GREEN}Running end-to-end tests...${COLOR_RESET}"
	npm run test:e2e

lint: ## Lint code
	@echo "${COLOR_GREEN}Linting code...${COLOR_RESET}"
	npm run lint

lint-fix: ## Fix linting issues
	@echo "${COLOR_GREEN}Fixing linting issues...${COLOR_RESET}"
	npm run lint:fix

clean: ## Clean build files
	@echo "${COLOR_GREEN}Cleaning build files...${COLOR_RESET}"
	rm -rf .nuxt dist .output node_modules/.cache

docker-build: ## Build Docker image
	@echo "${COLOR_GREEN}Building Docker image...${COLOR_RESET}"
	docker build -t organizer-app .

docker-run: ## Run app in Docker
	@echo "${COLOR_GREEN}Running app in Docker...${COLOR_RESET}"
	docker run -p 3000:3000 organizer-app

k8s-deploy: ## Deploy to Kubernetes
	@echo "${COLOR_GREEN}Deploying to Kubernetes...${COLOR_RESET}"
	kubectl apply -f k8s/deployment.yaml
	kubectl apply -f k8s/service.yaml

k8s-status: ## Check Kubernetes deployment status
	@echo "${COLOR_GREEN}Checking Kubernetes deployment status...${COLOR_RESET}"
	kubectl get pods -l app=organizer-app
	kubectl get svc -l app=organizer-app

k8s-delete: ## Delete Kubernetes deployment
	@echo "${COLOR_GREEN}Deleting Kubernetes deployment...${COLOR_RESET}"
	kubectl delete -f k8s/service.yaml
	kubectl delete -f k8s/deployment.yaml

feedback-rules: ## Deploy Firestore rules to enable feedback functionality
	@echo "${COLOR_GREEN}Deploying Firestore rules for feedback system...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This will update security rules to allow the feedback system to work.${COLOR_RESET}"
	@echo ""
	firebase deploy --only firestore:rules

feedback-review: ## Review user feedback and take action for Claude integration
	@echo "${COLOR_GREEN}Opening feedback review interface...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This will show all user feedback submissions and allow you to select ones for Claude to act on.${COLOR_RESET}"
	@echo ""
	npm run dev -- --open=feedback

feedback-to-claude: ## Process approved feedback with Claude
	@echo "${COLOR_GREEN}Processing approved feedback with Claude...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This will take approved feedback items and send them to VSCode with Claude.${COLOR_RESET}"
	@echo ""
	node scripts/feedback-to-claude.js

feedback-diagnostic: ## Run diagnostic tests on the feedback system
	@echo "${COLOR_GREEN}Running feedback system diagnostics...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This will check Firestore connection and feedback collection status.${COLOR_RESET}"
	@echo ""
	node scripts/feedback-diagnostic.js

feedback-demo-mode: ## Force demo mode for feedback without Firebase authentication
	@echo "${COLOR_GREEN}Enabling demo mode for feedback system...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This will patch files to use demo data without Firebase authentication.${COLOR_RESET}"
	@echo "${COLOR_YELLOW}Use this when you want to test the feedback system without Firebase.${COLOR_RESET}"
	@echo ""
	node scripts/force-demo-auth.js

ha-addon: ## Build Home Assistant add-on
	@echo "${COLOR_GREEN}Building Home Assistant add-on...${COLOR_RESET}"
	cd ha-addon && docker build -t organizer-ha-addon .

ha-run: ## Run Home Assistant add-on locally
	@echo "${COLOR_GREEN}Running Home Assistant add-on locally...${COLOR_RESET}"
	docker run -p 8099:8099 organizer-ha-addon

firebase-setup: ## Set up Firebase project and Firestore database
	@echo "${COLOR_GREEN}Setting up Firebase and Firestore...${COLOR_RESET}"
	node scripts/firebase-setup.js

firebase-deploy: ## Deploy to Firebase
	@echo "${COLOR_GREEN}Deploying to Firebase...${COLOR_RESET}"
	firebase deploy

firebase-rules: ## Deploy Firebase security rules
	@echo "${COLOR_GREEN}Deploying Firebase security rules...${COLOR_RESET}"
	firebase deploy --only firestore:rules

firebase-fix: ## Fix Firebase permission issues
	@echo "${COLOR_GREEN}Running Firebase permission fix helper...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This interactive script will help diagnose and fix Firebase permission issues.${COLOR_RESET}"
	@echo ""
	node scripts/firebase-permission-fix.js

firebase-emulate: ## Run Firebase emulators
	@echo "${COLOR_GREEN}Running Firebase emulators...${COLOR_RESET}"
	firebase emulators:start

firebase-init-db-legacy: ## Initialize Firestore database structure (requires firebase-admin)
	@echo "${COLOR_GREEN}Initializing Firestore database structure...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This will create the necessary collections and documents for the app.${COLOR_RESET}"
	@echo "${COLOR_YELLOW}Installing required dependencies first...${COLOR_RESET}"
	npm install firebase-admin dotenv uuid --no-save
	node scripts/firebase-admin-modules.js initializeDatabase

firebase-init-db: ## Create sample database structure (no dependencies required)
	@echo "${COLOR_GREEN}Creating sample database structure...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This will create a JSON file with sample data for Firestore.${COLOR_RESET}"
	node scripts/simple-db-init.js

# OAuth Integration Setup Targets
oauth-google-setup: ## Set up Google OAuth for Gmail, Calendar, and People APIs
	@echo "${COLOR_GREEN}Setting up Google OAuth for API Integration...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This is a one-time setup process to configure access to:${COLOR_RESET}"
	@echo "- Gmail API (for email access)"
	@echo "- Google Calendar API (for calendar events and appointments)"
	@echo "- Google People API (for contacts)"
	@echo ""
	@echo "${COLOR_CYAN}Prerequisites:${COLOR_RESET}"
	@echo "1. Google account with access to Google Cloud Console"
	@echo "2. Basic understanding of OAuth 2.0 authorization flow"
	@echo "3. Permission to create OAuth credentials for your Google account"
	@echo ""
	@echo "${COLOR_YELLOW}Follow these steps:${COLOR_RESET}"
	@echo "1. First time: Run the setup script to create credentials and obtain tokens"
	@echo "2. Save the credentials from the script output in your Organizer App profile"
	@echo "3. Configure which services to sync (mail, calendar, contacts)"
	@echo ""
	@echo "${COLOR_GREEN}Run this command in a temporary directory to avoid dependency conflicts:${COLOR_RESET}"
	@echo "  TMP_DIR=\$$(mktemp -d) && cd \$$TMP_DIR && npm init -y && npm pkg set type=module && npm install axios express open && cp $(PWD)/scripts/setup-google-oauth-esm.js . && node setup-google-oauth-esm.js"
	@echo ""
	@echo "${COLOR_YELLOW}After completing the setup, the script will provide detailed instructions on how to add the integration to your Organizer App.${COLOR_RESET}"
	@echo ""

oauth-ms-setup: ## Set up Microsoft OAuth for Outlook/Office 365 integration
	@echo "${COLOR_GREEN}Setting up Microsoft OAuth for Outlook/Office 365 integration...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This feature is coming soon...${COLOR_RESET}"
	@echo "${COLOR_CYAN}For now, please use the Google OAuth setup as a reference.${COLOR_RESET}"

oauth-setup: ## Guide through setting up all OAuth integrations
	@echo "${COLOR_GREEN}OAuth Integration Setup Guide${COLOR_RESET}"
	@echo "${COLOR_YELLOW}This will guide you through setting up OAuth for email services.${COLOR_RESET}"
	@echo ""
	@echo "Available integrations:"
	@echo "  1. Google (Gmail) - Run 'make oauth-google-setup'"
	@echo "  2. Microsoft (Outlook/Office 365) - Run 'make oauth-ms-setup'"
	@echo ""
	@echo "${COLOR_YELLOW}After completing the OAuth setup, use the refresh tokens in your integration account settings.${COLOR_RESET}"

init: ## Initialize the project
	@echo "${COLOR_GREEN}Initializing project...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}Step 1: Installing dependencies${COLOR_RESET}"
	$(MAKE) install
	@echo "${COLOR_YELLOW}Step 2: Setting up environment variables${COLOR_RESET}"
	$(MAKE) setup-env
	@echo "${COLOR_BLUE}Initialization complete. You can now run 'make dev' to start the development server.${COLOR_RESET}"
