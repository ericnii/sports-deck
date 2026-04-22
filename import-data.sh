#!/bin/bash
# Prepopulates the database by triggering the Next.js API endpoints 
# that fetch initialized data from Prisma and the Football API.

echo "Waiting for the web server to be ready..."
until curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ | grep -qE "^(200|301|302|307|308)$"; do
  printf '.'
  sleep 2
done
echo ""
echo "Server is ready! Importing data..."

echo "Populating General Forums..."
curl -s -X GET http://localhost:8080/api/forums/ > /dev/null

echo "Populating Team Forums..."
curl -s -X GET http://localhost:8080/api/forums/teams > /dev/null

echo "Populating Match Threads from Football API..."
curl -s -X POST http://localhost:8080/api/forums/threads/matches > /dev/null

echo ""
echo "Data has been successfully imported and prepopulated!"
