# WASM Game Engine Makefile

# Variables
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Colors
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

# Directories
PROJECT_ROOT := $(shell pwd)
WASM_DIR := $(PROJECT_ROOT)/wasm
PUBLIC_DIR := $(PROJECT_ROOT)/public
BUILD_DIR := $(WASM_DIR)/build

# Phony targets
.PHONY: help build build-docker build-quick clean test lint format dev serve setup install

## help: Show this help message
help:
	@echo "$(GREEN)WASM Game Engine - Available Commands$(NC)"
	@echo ""
	@grep -E '^##' Makefile | sed 's/## //'
	@echo ""

## build: Build WASM module from C++ source
build:
	@echo "$(YELLOW)Building WASM module...$(NC)"
	@./build.sh

## build-docker: Build using Docker container
build-docker:
	@echo "$(YELLOW)Building with Docker...$(NC)"
	@./build.sh --docker

## build-quick: Quick build (skip WASM if exists)
build-quick:
	@echo "$(YELLOW)Quick build...$(NC)"
	@./build-quick.sh

## build-production: Production build with minification
build-production:
	@echo "$(YELLOW)Production build...$(NC)"
	@./build-quick.sh --production

## clean: Remove all build artifacts
clean:
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf $(BUILD_DIR)
	@rm -f $(PUBLIC_DIR)/game_engine.js $(PUBLIC_DIR)/game_engine.wasm
	@rm -rf coverage test-results
	@rm -f *.min.js *.min.css
	@echo "$(GREEN)Clean complete!$(NC)"

## test: Run test suite
test:
	@echo "$(YELLOW)Running tests...$(NC)"
	@npm test

## test-watch: Run tests in watch mode
test-watch:
	@npm run test:watch

## test-coverage: Run tests with coverage
test-coverage:
	@npm run test:coverage

## lint: Run ESLint
lint:
	@echo "$(YELLOW)Running ESLint...$(NC)"
	@npm run lint

## lint-fix: Fix ESLint issues
lint-fix:
	@echo "$(YELLOW)Fixing ESLint issues...$(NC)"
	@npm run lint:fix

## format: Format code with Prettier
format:
	@echo "$(YELLOW)Formatting code...$(NC)"
	@npm run format

## dev: Start development environment
dev: build-quick serve

## serve: Start development server
serve:
	@echo "$(YELLOW)Starting development server...$(NC)"
	@./build-quick.sh --serve

## setup: Setup development environment
setup:
	@echo "$(YELLOW)Setting up environment...$(NC)"
	@./setup-env.sh

## install: Install Node.js dependencies
install:
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	@npm install

## docker-compose-up: Start services with Docker Compose
docker-compose-up:
	@docker-compose up -d

## docker-compose-down: Stop Docker Compose services
docker-compose-down:
	@docker-compose down

# Default target
all: clean build test