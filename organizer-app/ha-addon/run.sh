#!/usr/bin/env bashio

# Make data directory
mkdir -p /data

# Set rights
chmod 777 /data

cd /app

# Start the app
echo "Starting Organizer App..."
node .output/server/index.mjs
