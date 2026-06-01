#!/usr/bin/env bash
# Deploy the backend: Cloud Functions + Firestore rules + Storage rules.
# No web build needed. Kept manual (matches the workflow_dispatch CI posture).
set -euo pipefail
cd "$(dirname "$0")/.."
echo "▶ Deploying backend (functions + firestore:rules + storage rules)…"
firebase deploy --only functions,firestore:rules,storage --project amrit-dash-portfolio
echo "✓ Backend deployed."
