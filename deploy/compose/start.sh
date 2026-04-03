#!/bin/bash
# Usage: bash deploy/compose/start.sh [dev|stage|prod] [up -d|down|restart]
# Dev: rebuilds the app image from source on every up (--build flag applied to app only)
# Stage/Prod: pulls pre-built image from Docker Hub — never builds from source
set -e

ENV=${1:-dev}
CMD=${@:2}
BASE="deploy/compose/$ENV"

if [ -z "$CMD" ]; then
  echo "Usage: bash deploy/compose/start.sh [dev|stage|prod] [up -d|down|restart|down --volumes]"
  exit 1
fi

# Resolve env file path
case "$ENV" in
  dev)     ENV_FILE=".env.dev" ;;
  stage)   ENV_FILE=".env.staging" ;;
  prod)    ENV_FILE=".env.prod" ;;
  *)       echo "Unknown environment: $ENV. Use dev, stage, or prod."; exit 1 ;;
esac

echo "🚀 Inventorize — $ENV environment — $CMD"

# db.yml starts first — creates the shared network
docker compose --env-file "$ENV_FILE" -f "$BASE/docker-compose.db.yml" $CMD
docker compose --env-file "$ENV_FILE" -f "$BASE/docker-compose.cache.yml" $CMD
docker compose --env-file "$ENV_FILE" -f "$BASE/docker-compose.storage.yml" $CMD
docker compose --env-file "$ENV_FILE" -f "$BASE/docker-compose.pgadmin.yml" $CMD

# MailHog is dev-only
if [ "$ENV" = "dev" ]; then
  docker compose --env-file "$ENV_FILE" -f "$BASE/docker-compose.infra.yml" $CMD
fi

# Dev: --build forces rebuild from source every time
if [ "$ENV" = "dev" ] && [[ "$CMD" == *"up"* ]]; then
  docker compose --env-file "$ENV_FILE" -f "$BASE/docker-compose.app.yml" up --build -d
else
  docker compose --env-file "$ENV_FILE" -f "$BASE/docker-compose.app.yml" $CMD
fi

echo "✅ Done — $ENV environment — $CMD"
