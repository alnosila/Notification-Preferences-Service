# @author alnosila — https://github.com/alnosila


#!/bin/sh
set -e

# Production-контейнер: БД может подняться позже app из-за depends_on — ждём явно.
echo "Waiting for PostgreSQL..."
node dist/infrastructure/persistence/wait-for-db.js

echo "Applying migrations..."
node dist/infrastructure/persistence/migrate.js

# Идемпотентный seed (ON CONFLICT) — безопасно при каждом рестарте контейнера.
echo "Seeding defaults and policies..."
node dist/infrastructure/persistence/seed.js

echo "Starting Notification Preferences Service..."
exec node dist/main.js
