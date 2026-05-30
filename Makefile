.PHONY: build run setup test docker lint

build:
	go build -o bin/waf ./cmd/waf
	go build -o bin/setup ./cmd/setup
	go build -o bin/smart-waf ./cmd/cli

setup: build
	./bin/setup

run: build
	./bin/smart-waf start

test:
	go test -race -cover ./...

docker:
	docker compose -f deploy/docker/docker-compose.yml up --build

lint:
	golangci-lint run
