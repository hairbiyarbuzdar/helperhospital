#!/usr/bin/env bash
# Redeploy this app after a code change. Run from the app directory on the VPS.
set -e
cd "$(dirname "$0")"

git pull origin main
npm ci                 # only matters if deps changed
npm run db:generate    # regenerate the Prisma client
npm run db:push        # sync schema to the DB (only needed if it changed)
npm run build
pm2 restart helperhospital
echo "✔ Deployed."
