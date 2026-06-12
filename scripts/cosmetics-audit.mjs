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
  wallpaperAnimPaused: false,
  wallpaperRandomness: 40,
  rainDirection: 'down',
  waveDirection: 'up',
  starSize: 50,
  cometDensity: 40,
  cometDirection: 'right-down',
  particleSize: 45,
  particleDensity: 35,
  particleOpacity: 70,
  particleDrift: 'up',
  morphStyle: 'spin',
  morphBlobCount: 4,
  morphSmoothness: 72,
  morphMergeStrength: 50,
  numberFormat: 'binary',
  binaryFontSize: 50,
  honeycombStyle: 'outline',
  cursorInteractStrength: 55,
  cursorTrailLength: 50,
  cursorParticleDensity: 40,
  cursorSweepRadius: 50,
  cursorEffect: 'none',
  cursorEffectTrailStyle: 'glow',
  cursorEffectTrailLength: 50,
  cursorEffectIntensity: 55,
  cursorEffectRippleCount: 50,
  cursorEffectRippleSpeed: 50,
  cursorEffectCometDirection: 'cursor',
  cursorEffectCometIntensity: 50,
  cursorEffectCometSpeed: 50,
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

const invalidVibePatterns = schema.VIBES.filter((v) => {
  const p = v.cos && v.cos.bgPattern;
  return !p || !schema.BG_PATTERNS.includes(p);
});

const metaAnimated = Object.entries(schema.BG_PATTERN_META || {})
  .filter(([, m]) => m.animated)
  .map(([id]) => id);
const cssAnim = schema.CSS_ANIM_WALLPAPERS || [];
const canvasAnim = schema.CANVAS_WALLPAPERS || [];
const animMetaMismatch = metaAnimated.filter((id) => !cssAnim.includes(id) && !canvasAnim.includes(id));

const EXPECTED_VIBE_COUNT = 48;
const EXPECTED_VISIBLE_VIBE_COUNT = 20;
const EXPECTED_EXTENDED_VIBE_COUNT = 28;

const hiddenVibes = schema.VIBES.filter((v) => schema.isVibeHidden && schema.isVibeHidden(v));
const visibleVibes = schema.getVisibleVibes ? schema.getVisibleVibes() : schema.VIBES;

console.log('=== Cosmetics coverage audit ===');
console.log('VIBES:', schema.VIBES.length, '(expect ' + EXPECTED_VIBE_COUNT + ')');
console.log('  visible:', visibleVibes.length, '(expect ' + EXPECTED_VISIBLE_VIBE_COUNT + ')');
console.log('  extended:', hiddenVibes.length, '(expect ' + EXPECTED_EXTENDED_VIBE_COUNT + ')');
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

console.log('\n=== Vibe → bgPattern validity ===');
if (invalidVibePatterns.length) {
  console.log('  INVALID:', invalidVibePatterns.map((v) => v.id + ' → ' + (v.cos && v.cos.bgPattern)));
} else {
  console.log('  all ' + EXPECTED_VIBE_COUNT + ' vibes reference valid BG_PATTERNS');
  schema.VIBES.forEach((v) => {
    const p = v.cos.bgPattern;
    const anim = !!(schema.BG_PATTERN_META[p] && schema.BG_PATTERN_META[p].animated);
    console.log('  ' + v.id.padEnd(12) + p.padEnd(14) + (anim ? 'animated' : 'static'));
  });
}
if (animMetaMismatch.length) {
  console.log('  animated meta without canvas/css layer:', animMetaMismatch);
}

const failed = !audit.ok
  || schema.VIBES.length !== EXPECTED_VIBE_COUNT
  || visibleVibes.length !== EXPECTED_VISIBLE_VIBE_COUNT
  || hiddenVibes.length !== EXPECTED_EXTENDED_VIBE_COUNT
  || liveMissing.length > 0
  || invalidVibePatterns.length > 0
  || animMetaMismatch.length > 0;
process.exit(failed ? 1 : 0);
