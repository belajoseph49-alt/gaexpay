#!/bin/bash
# scripts/migrate-db.sh

set -e

echo "Starting database migration..."
npx prisma generate
npx prisma migrate deploy

echo "Migration completed successfully!"
