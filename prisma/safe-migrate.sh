#!/bin/bash
# ================================================
# CCA Safe Migration Wrapper
# Use this instead of: npx prisma migrate reset
# ================================================

echo ""
echo "⚠️  WARNING: DATABASE OPERATION"
echo "================================"
echo "Host: $DATABASE_URL"
echo ""
echo "This script will modify the CCA database."
echo "Make sure you have a recent backup before proceeding."
echo ""
echo "Type exactly 'YES I AM SURE' to continue:"
read confirmation

if [ "$confirmation" != "YES I AM SURE" ]; then
  echo ""
  echo "❌ Aborted — no changes made"
  exit 1
fi

echo ""
echo "✅ Confirmed — running npx prisma db push..."
npx prisma db push
