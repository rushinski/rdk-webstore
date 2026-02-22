COMPOSE_FILE = ./infra/docker/docker-compose.yml

.PHONY: docker-up docker-down docker-ps run db-up db-down

docker-up:
	docker-compose -f $(COMPOSE_FILE) up -d

docker-down:
	docker-compose -f $(COMPOSE_FILE) down

docker-ps:
	docker-compose -f $(COMPOSE_FILE) ps

run:
	cd backend/api && doppler run -- go run ./cmd/api/

db-up:
	doppler run -- goose -dir database/migrations postgres "$$DATABASE_URL" up

db-down:
	doppler run -- goose -dir database/migrations postgres "$$DATABASE_URL" down