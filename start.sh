#!/bin/bash
# Moves into the app directory
cd "$(dirname "$0")/pp2"

# Starts the Docker containers in the background and forces a rebuild
echo "Building and starting SportsDeck..."
docker-compose up -d --build
echo "SportsDeck is now running!"
