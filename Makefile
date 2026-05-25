# @author alnosila — https://github.com/alnosila
# All targets run via Docker Compose (no local Node/npm required).

COMPOSE := docker compose
COMPOSE_DEV := docker compose --profile dev
CLI := $(COMPOSE) --profile cli run --rm cli

.PHONY: help check-env up down restart logs dev setup db-setup build test lint lint-fix format install encrypt decrypt

check-env:
	@test -f .env || (echo "Нет .env — сначала: cp vault.example vault && make decrypt" && exit 1)

help:
	@echo "Docker-only commands:"
	@echo "  make up         - Build and start app + PostgreSQL (production image)"
	@echo "  make down       - Stop all services and remove containers"
	@echo "  make restart    - Restart app container"
	@echo "  make logs       - Follow app logs"
	@echo "  make dev        - API with hot reload (app-dev profile)"
	@echo "  make setup      - Start Postgres + migrate + seed (via cli)"
	@echo "  make build      - Build Docker images"
	@echo "  make test       - Run Vitest in container"
	@echo "  make lint       - ESLint in container"
	@echo "  make lint-fix   - ESLint fix + Prettier in container"
	@echo "  make format     - Prettier in container"
	@echo "  make install    - Rebuild dev image and refresh node_modules volume"
	@echo "  make encrypt  - .env → env.enc (пароль в ./vault)"
	@echo "  make decrypt  - env.enc → .env (нужен ./vault от владельца)"

# --- Runtime (production app) ---

up: check-env
	$(COMPOSE) --profile prod up --build -d
	@echo "API: http://localhost:$${PORT:-3000}"

down:
	$(COMPOSE) --profile prod --profile dev --profile cli down

restart:
	$(COMPOSE) --profile prod restart app

logs:
	$(COMPOSE) --profile prod logs -f app

# --- Development ---

dev: check-env
	$(COMPOSE_DEV) up --build app-dev

setup: check-env
	$(COMPOSE) up -d postgres
	@echo "Waiting for PostgreSQL..."
	@$(COMPOSE) up -d --wait postgres
	$(CLI) db:setup
	@echo ""
	@echo "Database ready. Run: make up  (production) or make dev  (hot reload)"
	@echo "Секреты: cp vault.example vault && make decrypt"

encrypt:
	bash scripts/encrypt.sh

decrypt:
	bash scripts/decrypt.sh

db-setup: check-env
	$(COMPOSE) up -d --wait postgres
	$(CLI) db:setup

# --- Build & quality (in container) ---

install:
	$(COMPOSE) --profile cli --profile dev build
	@echo "Dev image built. Run make test or make dev to use it."

build:
	$(COMPOSE) build

test: check-env
	$(COMPOSE) up -d --wait postgres
	$(CLI) test

lint:
	$(CLI) lint

lint-fix:
	$(CLI) lint:fix
	$(COMPOSE) --profile cli run --rm cli format

format:
	$(COMPOSE) --profile cli run --rm cli format
