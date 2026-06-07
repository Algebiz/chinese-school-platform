#!/bin/bash
# Run this before any migration
# Usage: bash scripts/pre-migration-check.sh

echo "Running pre-migration safety checks..."

# Check 1: Confirm not in production accidentally
if [ "$NODE_ENV" = "production" ]; then
  echo "⚠️  NODE_ENV is production"
  echo "Are you sure you want to run migrations? (yes/no)"
  read confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted"
    exit 1
  fi
fi

# Check 2: Run database check
echo "Checking database state..."
npx tsx --env-file=.env.local prisma/check-migration.ts

# Check 3: Remind about backup
echo ""
echo "📋 Pre-migration checklist:"
echo "  [ ] Recent backup exists (check your email)"
echo "  [ ] DRY_RUN tested successfully"
echo "  [ ] No active enrollment sessions in progress"
echo ""
echo "Type 'PROCEED' to continue with migration:"
read proceed

if [ "$proceed" != "PROCEED" ]; then
  echo "❌ Aborted — no changes made"
  exit 1
fi

echo "✅ Pre-migration checks passed — proceeding..."
