#!/bin/bash
set -e

# Move into the app directory
cd "$(dirname "$0")/pp2"

echo "Building SportsDeck..."
docker compose build web

echo "Starting PostgreSQL..."
docker compose up -d db

echo "Deploying database migrations..."
docker compose run --rm web npx prisma migrate deploy

echo "Starting SportsDeck..."
docker compose up -d

echo "SportsDeck is now running!"
