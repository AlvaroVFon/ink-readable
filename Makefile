BINARY_NAME=ink-readable-api

build:
	go -C backend build -o ../${BINARY_NAME} ./cmd/main.go

run: build
	./${BINARY_NAME}

test:
	go -C backend test ./...

up:
	docker compose -f ./docker-compose.yml up -d --build

