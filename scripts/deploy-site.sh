#!/usr/bin/env bash
# Deploy ONLY the public portfolio → amritdash.web.app
# (Builds both bundles; only dist/site is used by this target.)
# Vanilla v1 on amrit-dash-portfolio.web.app is never touched.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "▶ Building bundles…"
npm run build
echo "▶ Deploying portfolio site → amritdash.web.app"
firebase deploy --only hosting:amritdash --project amrit-dash-portfolio
echo "✓ Site deployed."
