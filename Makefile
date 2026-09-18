BINARY_NAME=ink-readable-api
SQLC=sqlc
MIGRATE=go run -tags 'sqlite' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.19.1
MIGRATIONS_DIR=backend/migrations
DB_PATH?=backend/data/ink-readable.db
DATABASE_URL=sqlite://$(DB_PATH)

.PHONY: build run test sqlc-generate sqlc-vet migrate-create migrate-up migrate-down migrate-down-all migrate-version migrate-force db-reset up up-prod up-dev down down-dev

build:
	go -C backend build -o ../${BINARY_NAME} ./cmd/main.go

run: build
	./${BINARY_NAME}

test:
	go -C backend test ./...

sqlc-generate:
	$(SQLC) generate -f backend/sqlc.yaml

sqlc-vet:
	$(SQLC) vet -f backend/sqlc.yaml

migrate-create:
	$(MIGRATE) create -ext sql -dir $(MIGRATIONS_DIR) -seq $(NAME)

migrate-up:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up

migrate-down:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down 1

migrate-down-all:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down -all

migrate-version:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" version

migrate-force:
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" force $(VERSION)

db-reset: migrate-down-all migrate-up

up: up-prod

up-prod:
	docker compose -f ./docker-compose.yml up -d --build

up-dev:
	docker compose -f ./docker-compose.dev.yml up --build

down:
	docker compose -f ./docker-compose.yml down

down-dev:
	docker compose -f ./docker-compose.dev.yml down
