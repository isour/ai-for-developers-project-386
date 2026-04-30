# Требуется GNU Make, Node >=20 (см. contracts/package.json и frontend/package.json) и npm в PATH.

.PHONY: install contracts frontend-lint frontend-build frontend-dev

# Установка зависимостей во всех JS-проектах репозитория (contracts, frontend).
install:
	cd contracts && npm install
	cd frontend && npm install

# Сборка OpenAPI из TypeSpec (contracts/openapi/openapi.yaml).
contracts:
	cd contracts && npm run compile

# --- frontend (Vite + React) ---
frontend-dev:
	cd frontend && npm run dev

frontend-lint:
	cd frontend && npm run lint

frontend-build:
	cd frontend && npm run build
