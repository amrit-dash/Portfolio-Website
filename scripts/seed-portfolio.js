/**
 * Seeds Firestore with default portfolio content.
 * Usage: node scripts/seed-portfolio.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase login + project active.
 */
const { readFileSync } = require("fs");
const { join } = require("path");

async function main() {
  const admin = require("firebase-admin");
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountPath) {
    console.error("Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.");
    process.exit(1);
  }
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "amrit-dash-portfolio"
  });

  const db = admin.firestore();
  const content = JSON.parse(
    readFileSync(join(__dirname, "../public/data/default-content.json"), "utf8")
  );
  const settings = {
    defaultTheme: "dark",
    accentHue: 142,
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    fontBody: "'IBM Plex Mono', ui-monospace, monospace",
    bootEnabled: true,
    reducedMotion: false
  };

  await db.doc("portfolio/content").set(content);
  await db.doc("portfolio/settings").set(settings);
  console.log("Seeded portfolio/content and portfolio/settings");
  console.log("Add your Firebase Auth UID to admins/{uid} for dashboard access.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
