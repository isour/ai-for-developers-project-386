# Требуется GNU Make, Node >=20 (см. contracts/package.json и frontend/package.json) и npm в PATH.

.PHONY: install contracts dev frontend-lint frontend-build frontend-dev prism-mock

# Установка зависимостей во всех JS-проектах репозитория (contracts, frontend).
install:
	cd contracts && npm install
	cd frontend && npm install

# Сборка OpenAPI из TypeSpec (contracts/openapi/openapi.yaml).
contracts:
	cd contracts && npm run compile

# Mock API по OpenAPI (подними до `make frontend-dev`: Vite проксирует /guest и /owner сюда).
prism-mock:
	cd contracts && npm run prism:mock

# Prism (порт 4010) и Vite одной командой; остановка — Ctrl+C (завершает оба процесса в группе).
dev:
	trap 'kill 0' INT TERM; \
	cd $(CURDIR)/contracts && npm run prism:mock & \
	cd $(CURDIR)/frontend && npm run dev & \
	wait

frontend-dev:
	cd frontend && npm run dev

frontend-lint:
	cd frontend && npm run lint

frontend-build:
	cd frontend && npm run build
