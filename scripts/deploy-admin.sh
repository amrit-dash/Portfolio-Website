#!/usr/bin/env bash
# Deploy ONLY the admin console → amritos-admin.web.app
# (Builds both bundles; only dist/admin is used by this target.)
set -euo pipefail
cd "$(dirname "$0")/.."
echo "▶ Building bundles…"
npm run build
echo "▶ Deploying admin console → amritos-admin.web.app"
firebase deploy --only hosting:amritos-admin --project amrit-dash-portfolio
echo "✓ Admin deployed."
