#!/bin/bash
# Moves into the app directory
cd "$(dirname "$0")/pp2"

# Shuts down the Docker containers gracefully
echo "Stopping SportsDeck..."
docker-compose down
echo "SportsDeck has been shut down!"
