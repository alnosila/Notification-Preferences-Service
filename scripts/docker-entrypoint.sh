#!/bin/sh
# @author alnosila — https://github.com/alnosila
set -e

echo "Waiting for PostgreSQL..."
node dist/infrastructure/persistence/wait-for-db.js

echo "Applying migrations..."
node dist/infrastructure/persistence/migrate.js

echo "Seeding defaults and policies..."
node dist/infrastructure/persistence/seed.js

echo "Starting Notification Preferences Service..."
exec node dist/main.js
