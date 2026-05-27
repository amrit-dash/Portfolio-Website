#!/usr/bin/env node
/**
 * Seeds Firestore with default portfolio content from public/data/default-content.json
 * Usage: node scripts/seed-portfolio.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase login
 */
const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '../public/data/default-content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

console.log(`
To seed Firestore document "portfolio/content":

1. Enable Firestore in Firebase Console (production mode).
2. Deploy rules: npx firebase-tools@latest deploy --only firestore:rules,storage
3. Option A — Firebase Console: Firestore → Add document
   Collection: portfolio  Document ID: content  Paste JSON from:
   ${contentPath}

4. Option B — After configuring firebase-admin locally:
   firebase firestore:set portfolio/content ${contentPath}

Default content version: ${content.version}
`);
