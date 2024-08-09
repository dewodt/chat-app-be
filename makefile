init-network:
	docker network create chat-app-network

run-db:
	docker compose up --build chat-app-db

run-app-dev:
	docker compose up --build chat-app-be-dev

run-app-prod:
	docker compose up --build chat-app-be-prod

reset:
	docker compose down -v
	sudo rm -rf ./db-data

stop:
	docker compose down