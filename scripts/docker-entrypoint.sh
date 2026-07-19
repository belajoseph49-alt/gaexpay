#!/bin/sh

echo "Starting Docker Entrypoint..."

# Wait for DB to be up before running push
echo "Pushing database schema..."
npx prisma@6.11.1 db push --accept-data-loss

echo "Starting Next.js application..."
exec node server.js
