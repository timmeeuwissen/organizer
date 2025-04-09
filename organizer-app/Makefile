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

init: ## Initialize the project
	@echo "${COLOR_GREEN}Initializing project...${COLOR_RESET}"
	@echo "${COLOR_YELLOW}Step 1: Installing dependencies${COLOR_RESET}"
	$(MAKE) install
	@echo "${COLOR_YELLOW}Step 2: Setting up environment variables${COLOR_RESET}"
	$(MAKE) setup-env
	@echo "${COLOR_BLUE}Initialization complete. You can now run 'make dev' to start the development server.${COLOR_RESET}"
