#!/bin/bash

set -e  # Exit on error

export VITE_API_URL=http://localhost:3000
export VITE_WS_URL=ws://localhost:3000
export VITE_OPENAPI_URL=http://localhost:3000/documentation/json
export CDP_PORT=9223

echo "Starting Xvfb..."
Xvfb :10 -screen 0 1920x1080x24 &

echo "Starting nginx..."
nginx -c /app/nginx.conf
# Check if nginx started successfully
if ! ps aux | grep nginx | grep -v grep > /dev/null; then
    echo "Failed to start nginx"
    exit 1
fi

echo "Starting API service..."
cd /app/api && npm run start &

echo "Starting UI service..."
cd /app/ui && npm run start &

echo "All services started. Keeping container alive..."
# Use trap to handle shutdown gracefully
trap 'echo "Shutting down..."; nginx -s quit; kill $(jobs -p)' SIGINT SIGTERM

# Keep the script running
while true; do
    sleep 1
done