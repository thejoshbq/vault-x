.PHONY: help build run dev clean install-frontend build-frontend docker-build docker-up docker-down test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install-deps: ## Install Go dependencies
	go mod download
	go mod tidy

install-frontend: ## Install frontend dependencies
	cd web && npm install

build-frontend: install-frontend ## Build frontend for production
	cd web && npm run build

build: build-frontend ## Build Go binary with embedded frontend
	go build -o bin/budget-system ./cmd/server

run: ## Run the application locally (without Docker)
	@mkdir -p data backups
	go run ./cmd/server/main.go

dev-frontend: ## Run frontend in development mode
	cd web && npm run dev

dev-backend: ## Run backend in development mode
	@mkdir -p data backups
	go run ./cmd/server/main.go

dev: ## Run both frontend and backend in dev mode (in separate terminals)
	@echo "Run 'make dev-backend' in one terminal and 'make dev-frontend' in another"

docker-build: ## Build Docker image
	docker build -t budget-system:latest .

docker-up: ## Start application with Docker Compose
	docker-compose up -d

docker-down: ## Stop Docker Compose services
	docker-compose down

docker-logs: ## View Docker Compose logs
	docker-compose logs -f

clean: ## Clean build artifacts
	rm -rf bin/
	rm -rf web/dist/
	rm -rf web/node_modules/
	rm -rf data/*.db
	rm -rf data/*.db-*

reset-db: ## Delete database (WARNING: destroys all data)
	rm -rf data/budget.db*
	@echo "Database deleted. Will be recreated on next run."

test: ## Run Go tests
	go test -v ./...

.DEFAULT_GOAL := help
