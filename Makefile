# Требуется GNU Make, Node >=20 (см. contracts/package.json) и npm в PATH.

.PHONY: contracts

# Сборка OpenAPI из TypeSpec (contracts/openapi/openapi.yaml).
contracts: contracts/node_modules
	cd contracts && npm run compile

contracts/node_modules:
	cd contracts && npm install
