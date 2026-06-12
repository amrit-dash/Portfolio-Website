#!/usr/bin/env node
/* Assert cosmetics fields are wired through defaults, validation, hints, and live-sync keys. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const schema = require(join(root, 'public/shared-schema.js'));

const DEFAULT_COSMETICS = {
  theme: 'dark',
  accent: '#c8e856',
  accentTone: 50,
  type: 'default',
  fontScale: 100,
  headingFont: 'match',
  tracking: 'normal',
  scanlines: true,
  cursorStyle: 'ring',
  cursorColor: '#c8e856',
  botIcon: 'brain-computer',
  botIconColor: 'accent',
  bgPattern: 'grid',
  wallpaperBrightness: 50,
  wallpaperIntensity: 50,
  wallpaperAnimSpeed: 50,
  wallpaperRandomness: 40,
  rainDirection: 'down',
  starSize: 50,
  cometDensity: 40,
  nightSkyBrightness: 50,
  cometDirection: 'right-down',
  particleSize: 45,
  particleDensity: 35,
  particleOpacity: 70,
  particleDrift: 'up',
  morphStyle: 'spin',
  numberFormat: 'binary',
  binaryFontSize: 50,
  wallpaperUseAccent: true,
  wallpaperColor: '',
  vignetteIntensity: 45,
  vignetteDirection: 'center',
  glow: 100,
  radius: 'soft',
  vibe: 'classic',
  customVibes: schema.createDefaultCustomVibes(),
};

const appJsx = readFileSync(join(root, 'public/app.jsx'), 'utf8');
const liveSyncMatch = appJsx.match(/\['accent',[^\]]+\]/);
const liveSyncKeys = liveSyncMatch
  ? liveSyncMatch[0].replace(/'/g, '').match(/[a-zA-Z]+/g).filter((k) => k !== 'accent')
  : [];

const audit = schema.auditCosmeticsSync(DEFAULT_COSMETICS);
const liveMissing = schema.COSMETICS_ALL_KEYS.filter((k) => {
  if (k === 'theme' || k === 'vibe' || k === 'customVibes') return false;
  return !liveSyncMatch || !liveSyncMatch[0].includes("'" + k + "'");
});

console.log('=== Cosmetics coverage audit ===');
console.log('VIBES:', schema.VIBES.length, '(expect 36)');
console.log('COSMETICS_ALL_KEYS:', schema.COSMETICS_ALL_KEYS.length);
console.log('auditCosmeticsSync.ok:', audit.ok);
if (audit.missingInDefaults.length) console.log('  missingInDefaults:', audit.missingInDefaults);
if (audit.missingInSnapshotKeys.length) console.log('  missingInSnapshotKeys:', audit.missingInSnapshotKeys);
if (audit.validateOk.length !== schema.COSMETICS_ALL_KEYS.length) {
  console.log('  validate gaps:', schema.COSMETICS_ALL_KEYS.filter((k) => !audit.validateOk.includes(k)));
}
if (audit.hintMissing.length) console.log('  hintMissing:', audit.hintMissing);
if (liveMissing.length) console.log('  app.jsx liveCos→tweak sync missing:', liveMissing);
else console.log('  app.jsx liveCos tweak sync: all snapshot keys covered');

const failed = !audit.ok || schema.VIBES.length !== 36 || liveMissing.length > 0;
process.exit(failed ? 1 : 0);
