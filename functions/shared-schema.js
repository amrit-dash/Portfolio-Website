/* Shared portfolio enums + agent config schema — loadable in Node (require) and
   browser (global window.SHARED_SCHEMA). Single source of truth so the server
   validators and the client editors can never drift apart.

   IMPORTANT: this file loads as a PLAIN classic <script> in admin.html (not via
   Babel). Everything is wrapped in an IIFE so it leaks NOTHING to global scope —
   otherwise its top-level `const`s (EXPERTISE_ICONS, VIBES, …) would collide with
   the same names declared in editors.jsx (which Babel transpiles to `var`),
   crashing the admin. Only window.SHARED_SCHEMA / module.exports escape. */
'use strict';

(function () {
  const EXPERTISE_ICONS = ['automation', 'rag', 'gas', 'flutter', 'bots', 'shopify', 'web', 'ios', 'comedy', 'brain'];
  const SOCIAL_ICONS = ['whatsapp', 'linkedin', 'github', 'instagram', 'email', 'web'];

  /* Appearance cosmetics — enums consumed by admin, portfolio, and agent tools. */
  const CURSOR_STYLES = ['ring', 'pixel', 'dot', 'cross', 'halo', 'outline', 'bold', 'diamond', 'trail', 'square', 'beam'];
  const CURSOR_EFFECTS = ['none', 'trail', 'comet', 'ripple', 'spark', 'glow'];
  const CURSOR_EFFECT_TRAIL_STYLES = ['glow', 'line', 'dotted', 'particles'];
  const CURSOR_EFFECT_COMET_DIRECTIONS = ['cursor', 'up', 'down', 'random'];
  const BG_PATTERNS = ['grid', 'dots', 'diagonal', 'crosshatch', '3dgrid', 'honeycomb', 'honeycombGlow', 'padgrid', 'waves', 'brick', 'noise', 'circuits', 'aurora', 'cosmos', 'matrixrain', 'particles', 'lightning', 'rain', 'binarystream', 'nebula', 'morphgeo', 'fluidcore', 'snowinteractive', 'ripplepool', 'fireflies', 'none'];
  const HONEYCOMB_STYLES = ['outline', 'fill'];
  const CURSOR_WALLPAPERS = ['snowinteractive', 'ripplepool', 'fireflies'];
  const RAIN_DIRECTIONS = ['down', 'diagonal-left', 'diagonal-right', 'left', 'right'];
  const WAVE_DIRECTIONS = ['up', 'down', 'left', 'right', 'diagonal-up', 'diagonal-down'];
  const COMET_DIRECTIONS = ['right-down', 'left-down', 'right', 'left', 'up-right'];
  const PARTICLE_DRIFT_DIRECTIONS = ['up', 'down', 'diagonal-up', 'diagonal-down', 'left', 'right'];
  const NUMBER_FORMATS = ['binary', 'octal', 'decimal', 'hex'];
  /* Pattern metadata for admin labels (animated badge) and wallpaper tuning. */
  const BG_PATTERN_META = {
    grid: { label: 'Grid', animated: false },
    dots: { label: 'Dots', animated: false },
    diagonal: { label: 'Diagonal', animated: false },
    crosshatch: { label: 'Crosshatch', animated: false },
    '3dgrid': { label: '3D grid', animated: false },
    honeycomb: { label: 'Honeycomb', animated: false },
    honeycombGlow: { label: 'Honeycomb glow', animated: true, supportsRandomness: true },
    padgrid: { label: 'Pad grid', animated: false },
    circuits: { label: 'Circuit pulse', animated: true, supportsRandomness: true },
    waves: { label: 'Waves', animated: true, supportsRandomness: true },
    brick: { label: 'Brick', animated: false },
    noise: { label: 'Noise grain', animated: false },
    aurora: { label: 'Aurora', animated: true, supportsRandomness: true },
    cosmos: { label: 'Cosmos', animated: true, supportsRandomness: true },
    matrixrain: { label: 'Matrix rain', animated: true, supportsRandomness: true },
    particles: { label: 'Floating particles', animated: true, supportsRandomness: true },
    lightning: { label: 'Lightning', animated: true, supportsRandomness: true },
    rain: { label: 'Rain', animated: true, supportsRandomness: true },
    binarystream: { label: 'Binary stream', animated: true, supportsRandomness: true },
    nebula: { label: 'Nebula', animated: true, supportsRandomness: true },
    morphgeo: { label: 'Soft blobs', animated: true, supportsRandomness: true },
    fluidcore: { label: 'Fluid core', animated: true, supportsRandomness: true },
    snowinteractive: { label: 'Snow interactive', animated: true, cursorReactive: true },
    ripplepool: { label: 'Ripple pool', animated: true, cursorReactive: true },
    fireflies: { label: 'Fireflies', animated: true, cursorReactive: true },
    none: { label: 'None', animated: false },
  };
  const CANVAS_WALLPAPERS = ['cosmos', 'matrixrain', 'lightning', 'rain', 'binarystream', 'nebula', 'circuits', 'particles', 'morphgeo', 'fluidcore', 'honeycombGlow', 'snowinteractive', 'ripplepool', 'fireflies'];
  const CSS_ANIM_WALLPAPERS = ['aurora', 'waves'];
  const LEGACY_BG_PATTERNS = {
    scan: 'grid',
    starfield: 'cosmos',
    halftone: 'dots',
    radar: 'circuits',
    pulse: 'aurora',
    smoke: 'nebula',
    hex: 'honeycomb',
    hexagons: 'honeycomb',
    hexgrid: '3dgrid',
    honeycombgrid: 'honeycomb',
    hexglow: 'honeycombGlow',
    honeycombglow: 'honeycombGlow',
    cursorsnow: 'snowinteractive',
    cursornight: 'ripplepool',
    cursortrail: 'fireflies',
  };
  const FONT_TYPES = ['default', 'editorial', 'pixel', 'modern', 'mono', 'slab', 'rounded', 'retro'];
  const HEADING_FONTS = ['match', 'serif', 'editorial', 'grotesk', 'mono', 'pixel', 'slab', 'rounded', 'retro', 'display'];
  const RADIUS_VALUES = ['sharp', 'soft', 'round'];
  /* Wallpaper vignette — which edges/corners fade; intensity 0 = off. */
  const VIGNETTE_DIRECTIONS = [
    'none', 'center', 'all',
    'top', 'bottom', 'left', 'right',
    'horizontal', 'vertical',
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
  ];
  const VIBE_CATEGORIES = [
    { id: 'dark', label: 'Dark mode' },
    { id: 'light', label: 'Light mode' },
    { id: 'retro', label: 'Retro & CRT' },
    { id: 'bold', label: 'Bold & experimental' },
    { id: 'multi-tone', label: 'Multi-tone' },
  ];

  const VIBES = [
    /* —— Dark mode —— */
    { id: 'classic', label: 'Classic', desc: 'Dark · lime CRT grid', category: 'dark',
      cos: { theme: 'dark', accent: '#c8e856', type: 'default', headingFont: 'match', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#c8e856', scanlines: true, bgPattern: 'grid', wallpaperBrightness: 55, wallpaperIntensity: 50, wallpaperUseAccent: true, cursorEffect: 'glow', cursorEffectIntensity: 45, glow: 100, radius: 'soft', vibe: 'classic' } },
    { id: 'matrix', label: 'Matrix', desc: 'Dark · green rain', category: 'dark',
      cos: { theme: 'dark', accent: '#33ff66', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'pixel', cursorColor: '#33ff66', scanlines: true, bgPattern: 'matrixrain', wallpaperBrightness: 50, wallpaperIntensity: 70, wallpaperAnimSpeed: 72, wallpaperUseAccent: true, cursorEffect: 'glow', cursorEffectIntensity: 72, glow: 140, radius: 'sharp', vibe: 'matrix' } },
    { id: 'royal', label: 'Royal', desc: 'Dark · violet cosmos', category: 'dark',
      cos: { theme: 'dark', accent: '#9d7cff', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'ring', cursorColor: '#9d7cff', scanlines: false, bgPattern: 'cosmos', wallpaperBrightness: 45, wallpaperIntensity: 35, wallpaperAnimSpeed: 38, starSize: 58, cometDensity: 42, wallpaperUseAccent: true, cursorEffect: 'glow', cursorEffectIntensity: 50, vignetteIntensity: 35, vignetteDirection: 'center', glow: 120, radius: 'soft', vibe: 'royal' } },
    { id: 'crimson', label: 'Crimson', desc: 'Dark · morphing rose geometry', category: 'dark',
      cos: { theme: 'dark', accent: '#e85c89', type: 'editorial', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#fda4af', scanlines: false, bgPattern: 'morphgeo', wallpaperBrightness: 56, wallpaperIntensity: 46, wallpaperAnimSpeed: 42, wallpaperUseAccent: false, wallpaperColor: '#be185d', cursorEffect: 'glow', cursorEffectIntensity: 55, glow: 120, radius: 'soft', vibe: 'crimson' } },
    /* extended: blue waves overlap deepsea / sky — user-requested hide */
    { id: 'midnight', label: 'Midnight', desc: 'Dark · deep blue waves', category: 'dark', hidden: true,
      cos: { theme: 'dark', accent: '#4a9eff', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'halo', cursorColor: '#60a5fa', scanlines: false, bgPattern: 'waves', wallpaperBrightness: 44, wallpaperIntensity: 48, wallpaperAnimSpeed: 42, waveDirection: 'up', wallpaperUseAccent: false, wallpaperColor: '#1d4ed8', cursorEffect: 'glow', cursorEffectIntensity: 48, vignetteIntensity: 50, vignetteDirection: 'center', glow: 110, radius: 'soft', vibe: 'midnight' } },
    { id: 'neon', label: 'Neon', desc: 'Dark · cyan circuits + sparks', category: 'dark',
      cos: { theme: 'dark', accent: '#00e5ff', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'trail', cursorColor: '#00e5ff', scanlines: false, bgPattern: 'circuits', wallpaperBrightness: 52, wallpaperIntensity: 78, wallpaperAnimSpeed: 62, wallpaperUseAccent: true, cursorEffect: 'spark', cursorEffectIntensity: 72, glow: 150, radius: 'sharp', vibe: 'neon' } },
    { id: 'obsidian', label: 'Obsidian', desc: 'Dark · 3D grid + ripples', category: 'dark',
      cos: { theme: 'dark', accent: '#8b9cb3', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'cross', cursorColor: '#cbd5e1', scanlines: false, bgPattern: '3dgrid', wallpaperBrightness: 42, wallpaperIntensity: 52, wallpaperUseAccent: true, cursorEffect: 'ripple', cursorEffectIntensity: 60, cursorEffectRippleCount: 55, glow: 70, radius: 'sharp', vibe: 'obsidian' } },
    /* extended: padgrid+comet overlaps classic grid / retro CRT family */
    { id: 'terminal', label: 'Terminal', desc: 'Dark · amber pad grid + comets', category: 'dark', hidden: true,
      cos: { theme: 'dark', accent: '#ffb000', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'square', cursorColor: '#ffb000', scanlines: true, bgPattern: 'padgrid', wallpaperBrightness: 46, wallpaperIntensity: 82, wallpaperUseAccent: true, cursorEffect: 'comet', cursorEffectCometDirection: 'down', cursorEffectCometIntensity: 65, cursorEffectCometSpeed: 58, glow: 90, radius: 'sharp', vibe: 'terminal' } },
    /* —— Light mode —— */
    /* extended: violet particles overlap drift */
    { id: 'lilac', label: 'Lilac', desc: 'Light · violet drift', category: 'light', hidden: true,
      cos: { theme: 'light', accent: '#7c3aed', type: 'default', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#6d28d9', scanlines: false, bgPattern: 'particles', wallpaperBrightness: 58, wallpaperIntensity: 36, wallpaperAnimSpeed: 48, particleDensity: 38, particleSize: 42, wallpaperUseAccent: false, wallpaperColor: '#8b5cf6', glow: 90, radius: 'soft', vibe: 'lilac' } },
    { id: 'sunset', label: 'Sunset', desc: 'Light · amber glow + aurora', category: 'light',
      cos: { theme: 'light', accent: '#c2410c', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#ea580c', scanlines: false, bgPattern: 'aurora', wallpaperBrightness: 56, wallpaperIntensity: 52, wallpaperAnimSpeed: 55, wallpaperUseAccent: false, wallpaperColor: '#ea580c', cursorEffect: 'glow', cursorEffectIntensity: 65, glow: 110, radius: 'round', vibe: 'sunset' } },
    /* extended: honeycombGlow overlaps blush / digital — user-requested hide */
    { id: 'solar', label: 'Solar', desc: 'Light · gold honeycomb glow', category: 'light', hidden: true,
      cos: { theme: 'light', accent: '#b45309', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#d97706', scanlines: false, bgPattern: 'honeycombGlow', honeycombStyle: 'outline', wallpaperBrightness: 54, wallpaperIntensity: 48, wallpaperAnimSpeed: 48, wallpaperUseAccent: false, wallpaperColor: '#ca8a04', cursorEffect: 'trail', cursorEffectTrailStyle: 'line', cursorEffectTrailLength: 45, cursorEffectIntensity: 58, glow: 90, radius: 'soft', vibe: 'solar' } },
    { id: 'mono', label: 'Mono', desc: 'Light · slate flat', category: 'light',
      cos: { theme: 'light', accent: '#3b5bdb', type: 'default', headingFont: 'mono', tracking: 'normal', cursorStyle: 'cross', cursorColor: '#364fc7', scanlines: false, bgPattern: 'none', wallpaperBrightness: 50, wallpaperIntensity: 50, wallpaperUseAccent: true, glow: 60, radius: 'sharp', vibe: 'mono' } },
    /* extended: warm brick niche — parchment overlaps mono flat light looks */
    { id: 'parchment', label: 'Parchment', desc: 'Light · warm brick', category: 'light', hidden: true,
      cos: { theme: 'light', accent: '#92703a', type: 'default', headingFont: 'serif', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#78572f', scanlines: false, bgPattern: 'brick', wallpaperBrightness: 42, wallpaperIntensity: 46, wallpaperUseAccent: false, wallpaperColor: '#a67c3d', glow: 75, radius: 'soft', vibe: 'parchment' } },
    { id: 'mint', label: 'Mint', desc: 'Light · ripple pool', category: 'light',
      cos: { theme: 'light', accent: '#059669', type: 'rounded', headingFont: 'rounded', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#047857', scanlines: false, bgPattern: 'ripplepool', wallpaperBrightness: 56, wallpaperIntensity: 48, wallpaperAnimSpeed: 44, cursorInteractStrength: 68, cursorTrailLength: 55, cursorEffect: 'ripple', cursorEffectIntensity: 52, cursorEffectRippleCount: 48, wallpaperUseAccent: false, wallpaperColor: '#047857', glow: 95, radius: 'round', vibe: 'mint' } },
    /* extended: filled honeycomb incremental vs solar honeycombGlow */
    { id: 'blush', label: 'Blush', desc: 'Light · filled honeycomb', category: 'light', hidden: true,
      cos: { theme: 'light', accent: '#db2777', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'outline', cursorColor: '#be185d', scanlines: false, bgPattern: 'honeycomb', honeycombStyle: 'fill', wallpaperBrightness: 54, wallpaperIntensity: 42, wallpaperUseAccent: false, wallpaperColor: '#ec4899', cursorEffect: 'spark', cursorEffectIntensity: 48, glow: 100, radius: 'round', vibe: 'blush' } },
    /* extended: airy waves overlap sunset aurora / inkwave multi-tone */
    { id: 'sky', label: 'Sky', desc: 'Light · airy waves', category: 'light', hidden: true,
      cos: { theme: 'light', accent: '#0284c7', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'halo', cursorColor: '#0369a1', scanlines: false, bgPattern: 'waves', wallpaperBrightness: 48, wallpaperIntensity: 40, wallpaperAnimSpeed: 45, waveDirection: 'up', wallpaperUseAccent: false, wallpaperColor: '#0ea5e9', glow: 85, radius: 'soft', vibe: 'sky' } },
    /* —— Retro & CRT —— */
    { id: 'arcade', label: 'Arcade', desc: 'Retro · neon honeycomb trail', category: 'retro',
      cos: { theme: 'dark', accent: '#ff6b9d', type: 'retro', headingFont: 'retro', tracking: 'wide', cursorStyle: 'pixel', cursorColor: '#ff6b9d', scanlines: true, bgPattern: 'honeycomb', honeycombStyle: 'fill', wallpaperBrightness: 58, wallpaperIntensity: 68, wallpaperUseAccent: true, cursorEffect: 'trail', cursorEffectTrailStyle: 'particles', cursorEffectTrailLength: 55, cursorEffectIntensity: 62, glow: 130, radius: 'sharp', vibe: 'arcade' } },
    { id: 'vhs', label: 'VHS', desc: 'Retro · magenta noise + sparks', category: 'retro',
      cos: { theme: 'dark', accent: '#d946ef', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'beam', cursorColor: '#d946ef', scanlines: true, bgPattern: 'noise', wallpaperBrightness: 40, wallpaperIntensity: 62, wallpaperUseAccent: false, wallpaperColor: '#d946ef', cursorEffect: 'spark', cursorEffectIntensity: 70, vignetteIntensity: 45, vignetteDirection: 'all', glow: 115, radius: 'soft', vibe: 'vhs' } },
    /* —— Bold & experimental —— */
    { id: 'synthwave', label: 'Synthwave', desc: 'Bold · rolling waves', category: 'bold',
      cos: { theme: 'dark', accent: '#9333ea', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'trail', cursorColor: '#f472b6', scanlines: false, bgPattern: 'waves', wallpaperBrightness: 62, wallpaperIntensity: 54, wallpaperAnimSpeed: 50, waveDirection: 'diagonal-up', wallpaperUseAccent: false, wallpaperColor: '#ec4899', cursorEffect: 'trail', cursorEffectTrailStyle: 'glow', cursorEffectTrailLength: 58, cursorEffectIntensity: 65, vignetteIntensity: 40, vignetteDirection: 'center', glow: 160, radius: 'round', vibe: 'synthwave' } },
    { id: 'ink', label: 'Ink', desc: 'Bold · high contrast', category: 'bold',
      cos: { theme: 'light', accent: '#1a1c14', type: 'slab', headingFont: 'slab', tracking: 'tight', cursorStyle: 'bold', cursorColor: '#1a1c14', scanlines: false, bgPattern: 'crosshatch', wallpaperBrightness: 38, wallpaperIntensity: 55, wallpaperUseAccent: true, glow: 50, radius: 'sharp', vibe: 'ink' } },
    /* —— Animated wallpaper presets —— */
    /* extended: aurora overlaps sunset / northern */
    { id: 'northern', label: 'Northern', desc: 'Dark · aurora lights', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#34d399', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'halo', cursorColor: '#6ee7b7', scanlines: false, bgPattern: 'aurora', wallpaperBrightness: 58, wallpaperIntensity: 48, wallpaperAnimSpeed: 38, wallpaperUseAccent: false, wallpaperColor: '#10b981', vignetteIntensity: 30, vignetteDirection: 'bottom', glow: 130, radius: 'round', vibe: 'northern' } },
    { id: 'eclipse', label: 'Eclipse', desc: 'Dark · ripple pool + comets', category: 'bold',
      cos: { theme: 'dark', accent: '#fbbf24', type: 'editorial', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#fde68a', scanlines: false, bgPattern: 'ripplepool', wallpaperBrightness: 42, wallpaperIntensity: 38, wallpaperAnimSpeed: 35, cursorInteractStrength: 62, cursorParticleDensity: 40, cursorEffect: 'comet', cursorEffectCometDirection: 'cursor', cursorEffectCometIntensity: 58, cursorEffectCometSpeed: 52, wallpaperUseAccent: true, vignetteIntensity: 55, vignetteDirection: 'center', glow: 105, radius: 'soft', vibe: 'eclipse' } },
    /* extended: green honeycombGlow overlaps neon circuits / solar light */
    { id: 'digital', label: 'Digital', desc: 'Dark · honeycomb glow', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#22c55e', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'beam', cursorColor: '#4ade80', scanlines: true, bgPattern: 'honeycombGlow', honeycombStyle: 'outline', wallpaperBrightness: 52, wallpaperIntensity: 65, wallpaperAnimSpeed: 55, wallpaperUseAccent: false, wallpaperColor: '#16a34a', glow: 95, radius: 'sharp', vibe: 'digital' } },
    /* extended: violet particles overlap lilac */
    { id: 'drift', label: 'Drift', desc: 'Light · floating motes', category: 'light', hidden: true,
      cos: { theme: 'light', accent: '#7c3aed', type: 'rounded', headingFont: 'rounded', tracking: 'normal', cursorStyle: 'outline', cursorColor: '#6d28d9', scanlines: false, bgPattern: 'particles', wallpaperBrightness: 54, wallpaperIntensity: 34, wallpaperAnimSpeed: 42, particleDensity: 34, particleSize: 40, wallpaperUseAccent: false, wallpaperColor: '#8b5cf6', glow: 88, radius: 'round', vibe: 'drift' } },
    /* extended: soft pink aurora overlaps sunset */
    { id: 'breathe', label: 'Breathe', desc: 'Light · soft glow', category: 'light', hidden: true,
      cos: { theme: 'light', accent: '#e11d48', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'dot', cursorColor: '#be123c', scanlines: false, bgPattern: 'aurora', wallpaperBrightness: 50, wallpaperIntensity: 36, wallpaperAnimSpeed: 28, wallpaperUseAccent: false, wallpaperColor: '#f43f5e', glow: 92, radius: 'round', vibe: 'breathe' } },
    { id: 'deepsea', label: 'Deep sea', desc: 'Dark · fireflies + trail', category: 'dark',
      cos: { theme: 'dark', accent: '#06b6d4', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'trail', cursorColor: '#67e8f9', scanlines: false, bgPattern: 'fireflies', wallpaperBrightness: 44, wallpaperIntensity: 32, wallpaperAnimSpeed: 52, cursorInteractStrength: 70, cursorParticleDensity: 28, cursorSweepRadius: 52, cursorEffect: 'trail', cursorEffectTrailStyle: 'glow', cursorEffectTrailLength: 62, cursorEffectIntensity: 70, wallpaperUseAccent: true, vignetteIntensity: 38, vignetteDirection: 'bottom', glow: 125, radius: 'soft', vibe: 'deepsea' } },
    /* extended: lightning overlaps static / deepsea weather — user-requested hide */
    { id: 'storm', label: 'Storm', desc: 'Dark · electric sky', category: 'dark', hidden: true,
      cos: { theme: 'dark', accent: '#60a5fa', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'halo', cursorColor: '#93c5fd', scanlines: false, bgPattern: 'lightning', wallpaperBrightness: 52, wallpaperIntensity: 55, wallpaperAnimSpeed: 62, wallpaperUseAccent: true, cursorEffect: 'spark', cursorEffectIntensity: 68, vignetteIntensity: 48, vignetteDirection: 'top', glow: 135, radius: 'soft', vibe: 'storm' } },
    /* extended: violet nebula overlaps void / royal — user-requested hide */
    { id: 'abyss', label: 'Abyss', desc: 'Dark · fluid core vignette', category: 'dark', hidden: true,
      cos: { theme: 'dark', accent: '#818cf8', type: 'editorial', headingFont: 'display', tracking: 'wide', cursorStyle: 'ring', cursorColor: '#a5b4fc', scanlines: false, bgPattern: 'fluidcore', wallpaperBrightness: 52, wallpaperIntensity: 46, wallpaperAnimSpeed: 28, fluidSize: 58, fluidMorphSpeed: 38, wallpaperUseAccent: false, wallpaperColor: '#4338ca', cursorEffect: 'glow', cursorEffectIntensity: 52, vignetteIntensity: 52, vignetteDirection: 'center', glow: 118, radius: 'round', vibe: 'abyss' } },
    /* extended: grey nebula near-duplicate of abyss */
    { id: 'void', label: 'Void', desc: 'Dark · soft nebula', category: 'dark', hidden: true,
      cos: { theme: 'dark', accent: '#94a3b8', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'cross', cursorColor: '#e2e8f0', scanlines: false, bgPattern: 'nebula', wallpaperBrightness: 44, wallpaperIntensity: 50, wallpaperAnimSpeed: 28, wallpaperUseAccent: false, wallpaperColor: '#64748b', vignetteIntensity: 42, vignetteDirection: 'all', glow: 72, radius: 'sharp', vibe: 'void' } },
    { id: 'drizzle', label: 'Drizzle', desc: 'Light · interactive snow', category: 'light',
      cos: { theme: 'light', accent: '#475569', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#334155', scanlines: false, bgPattern: 'snowinteractive', wallpaperBrightness: 44, wallpaperIntensity: 48, wallpaperAnimSpeed: 48, cursorInteractStrength: 55, cursorSweepRadius: 58, cursorParticleDensity: 48, wallpaperUseAccent: false, wallpaperColor: '#64748b', glow: 78, radius: 'soft', vibe: 'drizzle' } },
    /* extended: amber morphgeo light overlaps citrus multi-tone */
    { id: 'cream', label: 'Cream', desc: 'Light · morphing shapes', category: 'light', hidden: true,
      cos: { theme: 'light', accent: '#b45309', type: 'rounded', headingFont: 'rounded', tracking: 'normal', cursorStyle: 'outline', cursorColor: '#92400e', scanlines: false, bgPattern: 'morphgeo', wallpaperBrightness: 50, wallpaperIntensity: 42, wallpaperAnimSpeed: 40, wallpaperUseAccent: false, wallpaperColor: '#d97706', glow: 86, radius: 'round', vibe: 'cream' } },
    /* extended: green binarystream overlaps matrix / glitch */
    { id: 'phosphor', label: 'Phosphor', desc: 'Retro · green data stream', category: 'retro', hidden: true,
      cos: { theme: 'dark', accent: '#39ff14', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'beam', cursorColor: '#39ff14', scanlines: true, bgPattern: 'binarystream', wallpaperBrightness: 50, wallpaperIntensity: 62, wallpaperAnimSpeed: 68, binaryFontSize: 72, wallpaperUseAccent: true, cursorEffect: 'glow', cursorEffectIntensity: 80, glow: 125, radius: 'sharp', vibe: 'phosphor' } },
    /* extended: amber nebula CRT overlaps terminal / void */
    { id: 'tube', label: 'Tube', desc: 'Retro · CRT amber comets', category: 'retro', hidden: true,
      cos: { theme: 'dark', accent: '#f59e0b', type: 'retro', headingFont: 'retro', tracking: 'wide', cursorStyle: 'square', cursorColor: '#fbbf24', scanlines: true, bgPattern: 'nebula', wallpaperBrightness: 42, wallpaperIntensity: 52, wallpaperAnimSpeed: 35, wallpaperUseAccent: false, wallpaperColor: '#f59e0b', cursorEffect: 'comet', cursorEffectCometDirection: 'random', cursorEffectCometIntensity: 45, vignetteIntensity: 38, vignetteDirection: 'horizontal', glow: 105, radius: 'sharp', vibe: 'tube' } },
    /* extended: yellow circuits overlap neon */
    { id: 'volta', label: 'Volta', desc: 'Bold · crackling circuits', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#facc15', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'trail', cursorColor: '#fef08a', scanlines: false, bgPattern: 'circuits', wallpaperBrightness: 60, wallpaperIntensity: 72, wallpaperAnimSpeed: 78, wallpaperUseAccent: false, wallpaperColor: '#ca8a04', vignetteIntensity: 35, vignetteDirection: 'center', glow: 155, radius: 'round', vibe: 'volta' } },
    /* extended: pink morphgeo overlaps crimson / prism */
    { id: 'helix', label: 'Helix', desc: 'Bold · morphing geometry', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#ec4899', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'diamond', cursorColor: '#f472b6', scanlines: false, bgPattern: 'morphgeo', wallpaperBrightness: 56, wallpaperIntensity: 58, wallpaperAnimSpeed: 55, wallpaperUseAccent: false, wallpaperColor: '#7c3aed', vignetteIntensity: 32, vignetteDirection: 'center', glow: 148, radius: 'round', vibe: 'helix' } },
    /* extended: teal binary overlaps matrix / phosphor */
    { id: 'cipher', label: 'Cipher', desc: 'Bold · scrolling binary', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#14b8a6', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'beam', cursorColor: '#2dd4bf', scanlines: true, bgPattern: 'binarystream', wallpaperBrightness: 46, wallpaperIntensity: 70, wallpaperAnimSpeed: 82, wallpaperUseAccent: true, glow: 112, radius: 'sharp', vibe: 'cipher' } },
    /* extended: indigo morphgeo spark overlaps crimson */
    { id: 'prism', label: 'Prism', desc: 'Bold · pulsing geometry + sparks', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#818cf8', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'diamond', cursorColor: '#c4b5fd', scanlines: false, bgPattern: 'morphgeo', wallpaperBrightness: 54, wallpaperIntensity: 55, wallpaperAnimSpeed: 48, wallpaperUseAccent: false, wallpaperColor: '#4338ca', cursorEffect: 'spark', cursorEffectIntensity: 68, vignetteIntensity: 38, vignetteDirection: 'center', glow: 142, radius: 'round', vibe: 'prism' } },
    /* extended: grey rain+ripple overlaps storm / drizzle weather family */
    { id: 'static', label: 'Static', desc: 'Bold · storm rain + ripples', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#94a3b8', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'cross', cursorColor: '#cbd5e1', scanlines: false, bgPattern: 'rain', rainDirection: 'diagonal-right', wallpaperBrightness: 44, wallpaperIntensity: 58, wallpaperAnimSpeed: 65, wallpaperUseAccent: true, cursorEffect: 'ripple', cursorEffectIntensity: 62, cursorEffectRippleCount: 60, vignetteIntensity: 42, vignetteDirection: 'top', glow: 88, radius: 'sharp', vibe: 'static' } },
    /* extended: matrix rain variant overlaps matrix preset */
    { id: 'glitch', label: 'Glitch', desc: 'Bold · matrix rain + dotted trail', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#a3e635', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'pixel', cursorColor: '#bef264', scanlines: true, bgPattern: 'matrixrain', wallpaperBrightness: 48, wallpaperIntensity: 72, wallpaperAnimSpeed: 78, wallpaperUseAccent: true, cursorEffect: 'trail', cursorEffectTrailStyle: 'dotted', cursorEffectTrailLength: 70, cursorEffectIntensity: 75, glow: 118, radius: 'sharp', vibe: 'glitch' } },
    /* extended: pink cosmos overlaps royal */
    { id: 'supernova', label: 'Supernova', desc: 'Bold · cosmos + upward comets', category: 'bold', hidden: true,
      cos: { theme: 'dark', accent: '#f472b6', type: 'editorial', headingFont: 'display', tracking: 'wide', cursorStyle: 'halo', cursorColor: '#fbcfe8', scanlines: false, bgPattern: 'cosmos', wallpaperBrightness: 54, wallpaperIntensity: 44, wallpaperAnimSpeed: 42, starSize: 72, cometDensity: 58, wallpaperUseAccent: false, wallpaperColor: '#db2777', cursorEffect: 'comet', cursorEffectCometDirection: 'up', cursorEffectCometIntensity: 72, cursorEffectCometSpeed: 60, vignetteIntensity: 45, vignetteDirection: 'center', glow: 148, radius: 'round', vibe: 'supernova' } },
    /* —— Multi-tone —— */
    { id: 'split', label: 'Split', desc: 'Multi · coral ink + gold cursor', category: 'multi-tone',
      cos: { theme: 'dark', accent: '#ff6b6b', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#fde047', scanlines: false, bgPattern: 'honeycomb', honeycombStyle: 'outline', wallpaperBrightness: 58, wallpaperIntensity: 60, wallpaperUseAccent: false, wallpaperColor: '#5eead4', cursorEffect: 'spark', cursorEffectIntensity: 55, glow: 110, radius: 'soft', vibe: 'split' } },
    { id: 'duotone', label: 'Duotone', desc: 'Multi · violet sky + pink cursor', category: 'multi-tone',
      cos: { theme: 'dark', accent: '#c084fc', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'halo', cursorColor: '#fb7185', scanlines: false, bgPattern: 'fireflies', wallpaperBrightness: 56, wallpaperIntensity: 48, wallpaperAnimSpeed: 50, cursorInteractStrength: 72, cursorParticleDensity: 42, cursorSweepRadius: 48, wallpaperUseAccent: false, wallpaperColor: '#67e8f9', cursorEffect: 'trail', cursorEffectTrailStyle: 'particles', cursorEffectTrailLength: 50, cursorEffectIntensity: 58, vignetteIntensity: 40, vignetteDirection: 'bottom', glow: 125, radius: 'round', vibe: 'duotone' } },
    /* extended: slate waves overlap sky / sunset — user-requested hide */
    { id: 'inkwave', label: 'Ink wave', desc: 'Multi · slate waves + crimson cursor', category: 'multi-tone', hidden: true,
      cos: { theme: 'light', accent: '#0f172a', type: 'slab', headingFont: 'slab', tracking: 'tight', cursorStyle: 'bold', cursorColor: '#e11d48', scanlines: false, bgPattern: 'waves', waveDirection: 'left', wallpaperBrightness: 52, wallpaperIntensity: 50, wallpaperAnimSpeed: 46, wallpaperUseAccent: false, wallpaperColor: '#475569', cursorEffect: 'ripple', cursorEffectIntensity: 48, cursorEffectRippleCount: 42, glow: 72, radius: 'sharp', vibe: 'inkwave' } },
    /* extended: lime morph overlaps crimson / cream */
    { id: 'citrus', label: 'Citrus', desc: 'Multi · lime morph + red cursor', category: 'multi-tone', hidden: true,
      cos: { theme: 'light', accent: '#4d7c0f', type: 'rounded', headingFont: 'rounded', tracking: 'normal', cursorStyle: 'outline', cursorColor: '#dc2626', scanlines: false, bgPattern: 'morphgeo', wallpaperBrightness: 58, wallpaperIntensity: 48, wallpaperAnimSpeed: 44, wallpaperUseAccent: false, wallpaperColor: '#92400e', glow: 92, radius: 'round', vibe: 'citrus' } },
    /* extended: silver honeycombGlow overlaps digital / noir */
    { id: 'noir', label: 'Noir', desc: 'Multi · silver glow + amber cursor', category: 'multi-tone', hidden: true,
      cos: { theme: 'dark', accent: '#e2e8f0', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'cross', cursorColor: '#fbbf24', scanlines: false, bgPattern: 'honeycombGlow', honeycombStyle: 'outline', wallpaperBrightness: 55, wallpaperIntensity: 62, wallpaperAnimSpeed: 52, wallpaperUseAccent: false, wallpaperColor: '#94a3b8', glow: 95, radius: 'sharp', vibe: 'noir' } },
    { id: 'coralpool', label: 'Coral pool', desc: 'Multi · teal ripples + lime cursor', category: 'multi-tone',
      cos: { theme: 'dark', accent: '#f97316', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#a3e635', scanlines: false, bgPattern: 'ripplepool', wallpaperBrightness: 54, wallpaperIntensity: 50, wallpaperAnimSpeed: 38, cursorInteractStrength: 75, cursorTrailLength: 62, wallpaperUseAccent: false, wallpaperColor: '#22d3ee', cursorEffect: 'ripple', cursorEffectIntensity: 54, cursorEffectRippleCount: 62, vignetteIntensity: 48, vignetteDirection: 'center', glow: 115, radius: 'soft', vibe: 'coralpool' } },
    { id: 'polar', label: 'Polar', desc: 'Multi · ice aurora + ember cursor', category: 'multi-tone',
      cos: { theme: 'dark', accent: '#0ea5e9', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'halo', cursorColor: '#fb923c', scanlines: false, bgPattern: 'aurora', wallpaperBrightness: 58, wallpaperIntensity: 48, wallpaperAnimSpeed: 34, wallpaperUseAccent: false, wallpaperColor: '#7dd3fc', cursorEffect: 'glow', cursorEffectIntensity: 58, vignetteIntensity: 42, vignetteDirection: 'bottom', glow: 118, radius: 'round', vibe: 'polar' } },
    /* extended: violet morph overlaps crimson / prism — user-requested hide */
    { id: 'gilded', label: 'Gilded', desc: 'Multi · violet morph + gold cursor', category: 'multi-tone', hidden: true,
      cos: { theme: 'dark', accent: '#c084fc', type: 'editorial', headingFont: 'display', tracking: 'wide', cursorStyle: 'diamond', cursorColor: '#fcd34d', scanlines: false, bgPattern: 'morphgeo', wallpaperBrightness: 58, wallpaperIntensity: 54, wallpaperAnimSpeed: 46, wallpaperUseAccent: false, wallpaperColor: '#8b5cf6', cursorEffect: 'comet', cursorEffectCometDirection: 'cursor', cursorEffectCometIntensity: 55, cursorEffectCometSpeed: 48, vignetteIntensity: 36, vignetteDirection: 'center', glow: 132, radius: 'round', vibe: 'gilded' } },
  ];

  function isVibeHidden(vibe) {
    if (!vibe || typeof vibe !== 'object') return false;
    return vibe.hidden === true || vibe.tier === 'extended';
  }

  function getVisibleVibes() {
    return VIBES.filter((v) => !isVibeHidden(v));
  }

  function getExtendedVibes() {
    return VIBES.filter((v) => isVibeHidden(v));
  }

  const CUSTOM_VIBE_ID_PREFIX = 'custom-';
  const COSMETIC_SNAPSHOT_KEYS = [
    'theme', 'accent', 'accentTone', 'type', 'fontScale', 'headingFont', 'tracking',
    'scanlines', 'cursorStyle', 'cursorColor', 'botIcon', 'botIconColor',
    'bgPattern', 'wallpaperBrightness', 'wallpaperIntensity', 'wallpaperAnimSpeed', 'wallpaperAnimPaused', 'wallpaperRandomness',
    'wallpaperUseAccent', 'wallpaperColor', 'vignetteIntensity', 'vignetteDirection',
    'rainDirection', 'waveDirection', 'starSize', 'cometDensity', 'cometDirection',
    'particleSize', 'particleDensity', 'particleOpacity', 'particleDrift', 'numberFormat', 'binaryFontSize',
    'fluidSize', 'fluidMorphSpeed',
    'honeycombStyle', 'honeycombGlowDensity', 'cursorInteractStrength', 'cursorTrailLength', 'cursorParticleDensity', 'cursorSweepRadius',
    'cursorEffect', 'cursorEffectTrailStyle', 'cursorEffectTrailLength', 'cursorEffectIntensity',
    'cursorEffectRippleCount', 'cursorEffectRippleSpeed',
    'cursorEffectCometDirection', 'cursorEffectCometIntensity', 'cursorEffectCometSpeed',
    'cursorRingLag', 'uiGlassOpacity',
    'glow', 'radius',
  ];

  function createDefaultCustomVibes() {
    return [];
  }

  function isCustomVibeId(id) {
    return typeof id === 'string' && id.startsWith(CUSTOM_VIBE_ID_PREFIX) && id.length > CUSTOM_VIBE_ID_PREFIX.length;
  }

  function customVibeNum(id) {
    const n = parseInt(String(id || '').slice(CUSTOM_VIBE_ID_PREFIX.length), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function nextCustomVibeId(customVibes) {
    const slots = Array.isArray(customVibes) ? customVibes : [];
    let max = 0;
    for (const s of slots) {
      if (!s || !isCustomVibeId(s.id)) continue;
      const n = customVibeNum(s.id);
      if (n > max) max = n;
    }
    return CUSTOM_VIBE_ID_PREFIX + (max + 1);
  }

  /* Heal cosmetics.customVibes on load — legacy fixed slots, sparse arrays, empty slots. */
  function normalizeCustomVibeSlot(slot, id, labelDefault) {
    const row = slot && typeof slot === 'object' && !Array.isArray(slot) ? slot : {};
    const cos = row.cos;
    return {
      id,
      name: typeof row.name === 'string' ? row.name : '',
      label: typeof row.label === 'string' && row.label.trim() ? row.label : labelDefault,
      cos: cos && typeof cos === 'object' && !Array.isArray(cos) ? cos : null,
    };
  }

  function healBgPattern(raw) {
    if (typeof raw !== 'string') return 'grid';
    if (BG_PATTERNS.includes(raw)) return raw;
    return LEGACY_BG_PATTERNS[raw] || 'grid';
  }

  function coerceCustomVibes(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const out = [];
    for (const raw of value) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const id = isCustomVibeId(raw.id) ? raw.id : null;
      if (!id || seen.has(id)) continue;
      const num = customVibeNum(id);
      const slot = normalizeCustomVibeSlot(raw, id, num > 0 ? 'Custom vibe ' + num : id);
      if (!slot.cos || typeof slot.cos !== 'object') continue;
      if (slot.cos.bgPattern) slot.cos = { ...slot.cos, bgPattern: healBgPattern(slot.cos.bgPattern) };
      seen.add(id);
      out.push(slot);
    }
    out.sort((a, b) => customVibeNum(a.id) - customVibeNum(b.id));
    return out;
  }

  /* Merge missing cosmetics scalars + heal custom vibe slots (admin draft load). */
  function normalizeCosmetics(cos, defaultCos) {
    const def = defaultCos && typeof defaultCos === 'object' ? defaultCos : {};
    const c = cos && typeof cos === 'object' && !Array.isArray(cos) ? { ...cos } : {};
    c.customVibes = coerceCustomVibes(c.customVibes);
    if (c.bgPattern === 'hexagons' || c.bgPattern === 'hex') {
      c.bgPattern = 'honeycomb';
      if (!HONEYCOMB_STYLES.includes(c.honeycombStyle)) c.honeycombStyle = 'fill';
    } else if (c.bgPattern) {
      c.bgPattern = healBgPattern(c.bgPattern);
    }
    for (const k of Object.keys(def)) {
      if (k === 'customVibes') continue;
      if (c[k] === undefined) c[k] = def[k];
    }
    if (typeof c.vibe !== 'string' || (!getVibe(c.vibe) && !isCustomVibeId(c.vibe))) {
      c.vibe = typeof def.vibe === 'string' ? def.vibe : 'classic';
    }
    return c;
  }

  function getCustomVibe(id, customVibes) {
    if (!isCustomVibeId(id)) return null;
    const slots = coerceCustomVibes(customVibes);
    return slots.find((s) => s && s.id === id) || null;
  }

  function snapshotCosmetics(cos) {
    const c = cos && typeof cos === 'object' ? cos : {};
    const snap = {};
    COSMETIC_SNAPSHOT_KEYS.forEach((k) => {
      if (c[k] !== undefined) snap[k] = c[k];
    });
    return snap;
  }

  function mergeCustomVibeCosmetics(cos) {
    const c = cos && typeof cos === 'object' ? cos : {};
    if (!isCustomVibeId(c.vibe)) return c;
    const slot = getCustomVibe(c.vibe, c.customVibes);
    if (!slot || !slot.cos || typeof slot.cos !== 'object') return c;
    // Saved slot fills gaps; inline draft fields (including unsaved tweaks) win.
    const merged = { ...slot.cos };
    COSMETIC_SNAPSHOT_KEYS.forEach((k) => {
      if (c[k] !== undefined) merged[k] = c[k];
    });
    return { ...c, ...merged, vibe: c.vibe, customVibes: c.customVibes };
  }

  /* Agent-editable array collections (path → metadata). */
  const COLLECTIONS = {
    projects: { path: 'projects', idField: 'id' },
    expertise: { path: 'expertise', idField: 'id', renumber: 'expertise' },
    experience: { path: 'experience', idField: 'id' },
    'about.meta': { path: 'about.meta' },
    'about.impact': { path: 'about.impact' },
    cards: { path: 'cards', idField: 'id' },
    'contact.socials': { path: 'contact.socials' },
    'bot.qa': { path: 'bot.qa' },
    'bot.commands': { path: 'bot.commands', idField: 'id' },
  };

  /* ---------- Agent provider model (SEPARATE from the bot's config/llm) ----------
     The admin agent runs on its OWN keys, stored in config/agent.byProvider — the
     owner's billable keys for better models — never shared with the public bot.

     config/agent shape:
       { active: 'gemini',
         refinerActive: 'gemini',
         byProvider: { gemini: { apiKey, model }, openai: { apiKey, model }, … },
         refinerModel?: string (legacy override — prefer refinerActive provider model) } */

  /* Which wire format each provider speaks. Drives native adapter selection on
     the server AND the model-picker grouping on the client. */
  const PROVIDER_KIND = {
    gemini: 'gemini',       // native generateContent (functionDeclarations)
    anthropic: 'anthropic', // native Messages API (tool_use / tool_result)
    openai: 'openai',       // OpenAI chat-completions tool-calling
    openrouter: 'openai',   // same wire format, own key + catalog
    mistral: 'openai',
    grok: 'openai',         // xAI Grok — api.x.ai, keys start "xai-"
    groq: 'openai',         // Groq Cloud — api.groq.com, keys start "gsk_" (NOT xAI)
  };

  const AGENT_CONFIG_DEFAULTS = {
    active: 'gemini',
    refinerActive: 'gemini',
    byProvider: {
      gemini: { model: 'gemini-2.5-flash' },
    },
  };

  /* Curated tool-capable models (the floor for the agent settings picker). */
  const AGENT_TOOL_MODELS = {
    gemini: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', free: true },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', free: false },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', free: true },
    ],
    anthropic: [
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', free: false },
      { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', free: false },
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', free: false },
    ],
    openai: [
      { id: 'gpt-4o', label: 'GPT-4o', free: false },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', free: false },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', free: false },
    ],
    openrouter: [
      { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free)', free: true },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', free: false },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (via OR)', free: false },
    ],
    mistral: [
      { id: 'mistral-large-latest', label: 'Mistral Large', free: false },
      { id: 'mistral-small-latest', label: 'Mistral Small', free: false },
    ],
    grok: [
      { id: 'grok-4', label: 'Grok 4', free: false },
      { id: 'grok-3', label: 'Grok 3', free: false },
      { id: 'grok-3-mini', label: 'Grok 3 mini', free: false },
    ],
    groq: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', free: true },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', free: true },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', free: true },
      { id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2', free: true },
    ],
  };

  /* Known vision-capable models per provider (exact ids). Admin UI shows the vision
     tag when the selected model is listed here; custom/fetched models fall through
     to supportsVision heuristics or a successful Test vision probe. */
  const VISION_MODELS_BY_PROVIDER = {
    gemini: [
      'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash',
      'gemini-3-flash-preview', 'gemini-3-pro-preview',
      'gemini-1.5-pro', 'gemini-1.5-flash',
    ],
    anthropic: [
      'claude-sonnet-4-5', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest',
      'claude-3-opus-latest',
    ],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4-turbo', 'gpt-4.1'],
    openrouter: [
      'google/gemini-2.0-flash-exp:free', 'anthropic/claude-3.5-sonnet',
      'google/gemini-flash-1.5',
    ],
    mistral: ['mistral-large-latest', 'mistral-small-latest', 'pixtral-large-latest'],
    grok: ['grok-4', 'grok-3', 'grok-3-mini'],
    groq: ['moonshotai/kimi-k2-instruct'],
  };

  function modelInVisionMap(providerId, model) {
    const list = Reflect.get(VISION_MODELS_BY_PROVIDER, providerId) || [];
    return list.includes(model);
  }

  /* Models known to accept URL/page context when the server fetches and injects
     text (agent fetchUrl / capability probe). Most tool-capable chat models qualify. */
  const URL_MODELS_BY_PROVIDER = {
    gemini: [
      'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash',
      'gemini-3-flash-preview', 'gemini-3-pro-preview',
      'gemini-1.5-pro', 'gemini-1.5-flash',
    ],
    anthropic: [
      'claude-sonnet-4-5', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest',
      'claude-3-opus-latest',
    ],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4-turbo', 'gpt-4.1', 'gpt-4.1-nano'],
    openrouter: [
      'google/gemini-2.0-flash-exp:free', 'anthropic/claude-3.5-sonnet',
      'google/gemini-flash-1.5', 'openai/gpt-4o-mini',
    ],
    mistral: ['mistral-large-latest', 'mistral-small-latest'],
    grok: ['grok-4', 'grok-3', 'grok-3-mini'],
    groq: [
      'llama-3.3-70b-versatile', 'llama-3.1-8b-instant',
      'openai/gpt-oss-120b', 'moonshotai/kimi-k2-instruct',
    ],
  };

  function modelInUrlMap(providerId, model) {
    const list = Reflect.get(URL_MODELS_BY_PROVIDER, providerId) || [];
    return list.includes(model);
  }

  /* Sanitize an uploaded SVG before it's stored in content + rendered inline.
     Owner-only upload, but we still strip the obvious script/handler vectors and
     cap the size so a pasted blob can't bloat the doc or run code. */
  function sanitizeSvg(raw) {
    let s = String(raw || '').trim();
    if (!s) return '';
    const m = s.match(/<svg[\s\S]*<\/svg>/i);
    if (!m) return '';
    s = m[0]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
    if (s.length > 20000) return '';
    return s;
  }
  function isCustomIcon(id) { return typeof id === 'string' && id.indexOf('custom_') === 0; }

  /* Distinct concrete colors declared in an SVG (fill/stroke attrs + inline
     styles). Ignores none/transparent/currentColor and url(...) refs. Returned
     as a lowercased array — used to decide if an uploaded icon is monocolor. */
  function svgColors(svg) {
    const s = String(svg || '');
    const set = new Set();
    const re = /(?:fill|stroke)\s*(?:=\s*["']|:\s*)([^"';}\)]+)/gi;
    let m;
    while ((m = re.exec(s))) {
      const t = m[1].trim().toLowerCase();
      if (t && t !== 'none' && t !== 'transparent' && t !== 'currentcolor' && t.indexOf('url(') !== 0) set.add(t);
    }
    return Array.from(set);
  }

  /* Does an SVG draw with a concrete stroke (i.e. it's an outline icon, not a
     solid filled shape)? Used to pick a sensible default for fill-stripping. */
  function svgHasStroke(svg) {
    const re = /stroke\s*(?:=\s*["']|:\s*)([^"';}\)]+)/gi;
    let m;
    while ((m = re.exec(String(svg || '')))) {
      const t = m[1].trim().toLowerCase();
      if (t && t !== 'none' && t !== 'transparent' && t.indexOf('url(') !== 0) return true;
    }
    return false;
  }

  /* Repaint an SVG so it inherits the site theme. `color` is a hex or the string
     "currentColor" (so the icon picks up the accent like the built-in icons).
     none/transparent/url() refs are always preserved.

     stripFills (default true for outline icons): for outline icons — those that
     draw with a stroke — every concrete *fill* is forced to `none` so any solid
     interior or background the source baked in becomes transparent, leaving only
     the recolored outline. Solid icons (no stroke) ignore stripFills, since
     blanking their fills would erase them; their fills are recolored instead.
     If the file declares no paint at all (relies on the default black fill), we
     set fill on the root <svg> so the recolor still takes. */
  function recolorSvg(svg, color, opts) {
    let s = String(svg || '');
    if (!s) return s;
    opts = opts || {};
    const keep = (v) => { const t = String(v).trim().toLowerCase(); return t === 'none' || t === 'transparent' || t.indexOf('url(') === 0; };
    const stripFills = opts.stripFills && svgHasStroke(s);

    // Strokes → the theme color.
    let strokeHits = 0;
    s = s.replace(/stroke(\s*=\s*)"([^"]*)"/gi, (m, eq, v) => { if (keep(v)) return m; strokeHits++; return 'stroke' + eq + '"' + color + '"'; });
    s = s.replace(/stroke(\s*=\s*)'([^']*)'/gi, (m, eq, v) => { if (keep(v)) return m; strokeHits++; return 'stroke' + eq + "'" + color + "'"; });
    s = s.replace(/stroke(\s*:\s*)([^;"'}\)]+)/gi, (m, c, v) => { if (keep(v)) return m; strokeHits++; return 'stroke' + c + color; });

    // Fills → transparent (outline mode) or the theme color.
    const fillTo = stripFills ? 'none' : color;
    let fillHits = 0;
    s = s.replace(/fill(\s*=\s*)"([^"]*)"/gi, (m, eq, v) => { if (keep(v)) return m; fillHits++; return 'fill' + eq + '"' + fillTo + '"'; });
    s = s.replace(/fill(\s*=\s*)'([^']*)'/gi, (m, eq, v) => { if (keep(v)) return m; fillHits++; return 'fill' + eq + "'" + fillTo + "'"; });
    s = s.replace(/fill(\s*:\s*)([^;"'}\)]+)/gi, (m, c, v) => { if (keep(v)) return m; fillHits++; return 'fill' + c + fillTo; });

    if (strokeHits === 0 && fillHits === 0) s = s.replace(/<svg\b/i, '<svg fill="' + color + '"');
    return s;
  }

  /* Per-color repaint. `map` keys are lowercased source colors (as returned by
     svgColors); each value is the replacement — a hex, "currentColor" (follow
     theme), or "none" (make transparent). Every fill/stroke whose value matches
     a map key is rewritten; colors not in the map, plus none/transparent/url()
     refs, are left untouched. If the file declares no paint at all, the single
     map value is applied to the root <svg> fill so the choice still takes. */
  function recolorSvgMap(svg, map) {
    let s = String(svg || '');
    if (!s || !map) return s;
    const lookup = (v) => {
      const t = String(v).trim().toLowerCase();
      if (t === 'none' || t === 'transparent' || t.indexOf('url(') === 0) return null;
      return Object.prototype.hasOwnProperty.call(map, t) ? map[t] : null;
    };
    let hits = 0;
    const rep = (m, a, eq, v) => { const r = lookup(v); if (r == null) return m; hits++; return a + eq + '"' + r + '"'; };
    s = s.replace(/(fill|stroke)(\s*=\s*)"([^"]*)"/gi, rep);
    s = s.replace(/(fill|stroke)(\s*=\s*)'([^']*)'/gi, (m, a, eq, v) => { const r = lookup(v); if (r == null) return m; hits++; return a + eq + "'" + r + "'"; });
    s = s.replace(/(fill|stroke)(\s*:\s*)([^;"'}\)]+)/gi, (m, a, c, v) => { const r = lookup(v); if (r == null) return m; hits++; return a + c + r; });
    if (hits === 0) {
      const only = Object.keys(map)[0];
      if (only) s = s.replace(/<svg\b/i, '<svg fill="' + map[only] + '"');
    }
    return s;
  }

  /* Normalize one impact-timeline row — stable id + string fields. */
  function normalizeImpactEntry(item, idx) {
    const row = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
    return {
      id: typeof row.id === 'string' && row.id ? row.id : ('imp_' + idx),
      label: typeof row.label === 'string' ? row.label : '',
      html: typeof row.html === 'string' ? row.html : '',
    };
  }

  /* Reject label-keyed maps at about.impact root (e.g. { "Now": { html } }). */
  function validateImpactWrite(value) {
    if (value == null || Array.isArray(value) || typeof value !== 'object') return null;
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return { error: 'invalid-impact-shape', message: 'about.impact must be an array or entry object' };
    }
    if (keys.every((k) => /^\d+$/.test(k))) return null;
    const entryFields = new Set(['id', 'label', 'html']);
    if (keys.every((k) => entryFields.has(k))) return null;
    return {
      error: 'invalid-impact-shape',
      message: 'about.impact expects an array or {id,label,html}; label-keyed maps like {"Now":{...}} are not supported',
    };
  }

  /* Coerce agent/corrupt writes back to an impact array. A single entry object
     merges into fallback by id or case-insensitive label (e.g. "In Between"). */
  function coerceImpactArray(value, fallback) {
    const heal = (arr) => (Array.isArray(arr) ? arr : []).map((item, idx) => normalizeImpactEntry(item, idx));
    if (Array.isArray(value)) return heal(value);
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      const allNumeric = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
      if (allNumeric) {
        return heal(keys.sort((a, b) => Number(a) - Number(b)).map((k) => value[k]));
      }
      const row = value;
      const base = heal(fallback);
      const matchId = typeof row.id === 'string' && row.id ? row.id : '';
      const matchLabel = typeof row.label === 'string' ? row.label : '';
      const matchIdx = base.findIndex((item) =>
        (matchId && item.id === matchId)
        || (matchLabel && item.label && item.label.toLowerCase() === matchLabel.toLowerCase())
      );
      if (matchIdx >= 0) {
        const next = base.slice();
        next[matchIdx] = normalizeImpactEntry({ ...base[matchIdx], ...row }, matchIdx);
        return next;
      }
      return base.concat([normalizeImpactEntry(row, base.length)]).map((item, idx) => normalizeImpactEntry(item, idx));
    }
    if (typeof value === 'string') {
      const t = value.trim();
      if (t && /^[[{]/.test(t)) {
        try { return coerceImpactArray(JSON.parse(t), fallback); } catch (e) { /* fall through */ }
      }
    }
    return heal(fallback);
  }

  /* Experience date range — legacy `date` string migrates to startedOn + endedOn. */
  function parseExperienceDateRange(raw) {
    const s = String(raw || '').trim();
    if (!s) return { startedOn: '', endedOn: '' };
    const parts = s.split(/\s*[–—-]\s+/);
    if (parts.length < 2) return { startedOn: s, endedOn: '' };
    const startedOn = parts[0].trim();
    let endedOn = parts.slice(1).join(' – ').trim();
    if (/present/i.test(endedOn)) endedOn = '';
    return { startedOn, endedOn };
  }

  function formatExperienceDateRange(entry) {
    if (!entry || typeof entry !== 'object') return '';
    const started = String(entry.startedOn || '').trim();
    const ended = entry.current ? '' : String(entry.endedOn || '').trim();
    if (started) return `${started} – ${ended || (entry.current ? 'Present' : '')}`.replace(/ – $/, '');
    return String(entry.date || '').trim();
  }

  function normalizeExperienceEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const row = { ...entry };
    const hasNew = String(row.startedOn || '').trim() || String(row.endedOn || '').trim();
    if (!hasNew && String(row.date || '').trim()) {
      const parsed = parseExperienceDateRange(row.date);
      row.startedOn = parsed.startedOn;
      row.endedOn = parsed.endedOn;
      if (!row.current && parsed.endedOn === '' && /present/i.test(String(row.date))) row.current = true;
    }
    if (!String(row.startedOn || '').trim()) row.startedOn = '';
    if (row.current) row.endedOn = '';
    else if (!String(row.endedOn || '').trim()) row.endedOn = '';
    if (hasNew || String(row.date || '').trim()) delete row.date;
    return row;
  }

  function coerceExperienceArray(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(normalizeExperienceEntry);
  }

  /* Normalize a projects row — map description→desc, coerce tags to a string[]. */
  function normalizeProjectItem(item) {
    const row = item && typeof item === 'object' && !Array.isArray(item) ? { ...item } : {};
    if (!String(row.desc || '').trim() && typeof row.description === 'string' && row.description.trim()) {
      row.desc = row.description.trim();
    }
    delete row.description;
    if (!Array.isArray(row.tags)) {
      row.tags = typeof row.tags === 'string'
        ? row.tags.split(/[,·|]/).map((s) => s.trim()).filter(Boolean)
        : [];
    } else {
      row.tags = row.tags.map((t) => String(t).trim()).filter(Boolean);
    }
    return row;
  }

  /* Optional soft fill when a caller wants placeholder desc/tags from title/cat. */
  function applyProjectDefaults(item) {
    const row = normalizeProjectItem(item);
    const title = String(row.title || 'New project').trim();
    if (!String(row.desc || '').trim() && title) {
      row.desc = `${title} — portfolio project showcasing relevant work, stack, and outcomes.`;
    }
    if (!row.tags.length) {
      const fromCat = String(row.cat || '').split(/[·|,]/).map((s) => s.trim()).filter(Boolean);
      row.tags = fromCat.length ? fromCat.slice(0, 6) : (title ? [title.split(/\s+/)[0]] : ['Portfolio']);
    }
    return row;
  }

  function validateProjectItem(item) {
    normalizeProjectItem(item);
    return { ok: true };
  }

  function renumberExpertise(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map((e, i) => ({ ...e, num: String(i + 1).padStart(2, '0') }));
  }
  function getVibe(id) { return VIBES.find((v) => v.id === id) || null; }

  function validateCustomVibes(value) {
    if (!Array.isArray(value)) return { error: 'invalid-cosmetics', message: 'cosmetics.customVibes must be an array' };
    const seen = new Set();
    for (let i = 0; i < value.length; i++) {
      const slot = value[i];
      if (!slot || typeof slot !== 'object') return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}] must be an object` };
      if (!isCustomVibeId(slot.id)) return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].id must start with "${CUSTOM_VIBE_ID_PREFIX}"` };
      if (seen.has(slot.id)) return { error: 'invalid-cosmetics', message: `cosmetics.customVibes duplicate id "${slot.id}"` };
      seen.add(slot.id);
      if (typeof slot.label !== 'string') return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].label must be a string` };
      if (slot.name != null && typeof slot.name !== 'string') return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].name must be a string` };
      if (slot.cos == null || typeof slot.cos !== 'object' || Array.isArray(slot.cos)) {
        return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].cos must be an object` };
      }
      for (const k of Object.keys(slot.cos)) {
        if (!COSMETIC_SNAPSHOT_KEYS.includes(k)) return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].cos.${k} is not a valid cosmetic field` };
        const err = validateCosmeticsWrite('cosmetics.' + k, slot.cos[k]);
        if (err) return err;
      }
    }
    return null;
  }

  function clampCosmeticNumber(n, min, max, fallback) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.max(min, Math.min(max, Math.round(x)));
  }

  /** 0–100 randomness → 0–1 blend factor for chaos mixer. */
  function wallpaperRandFactor(randomness) {
    return clampCosmeticNumber(randomness, 0, 100, 0) / 100;
  }

  /** Blend deterministic slider value toward a chaotic target. At 0: deterministic; at 100: chaotic. */
  function chaosLerp(deterministic, chaotic, randomness) {
    const t = wallpaperRandFactor(randomness);
    return deterministic + (chaotic - deterministic) * t;
  }

  /** Jitter baseValue by ±randomRange scaled by randomness (for per-element spawn). */
  function mixRandomness(baseValue, randomRange, randomness) {
    const t = wallpaperRandFactor(randomness);
    return baseValue + (Math.random() - 0.5) * 2 * randomRange * t;
  }

  /** Particle layer drift: at 0 both layers match settings; at 100 layers split directions. */
  function resolveParticleDriftLayers(detX, detY, randomness) {
    const t = wallpaperRandFactor(randomness);
    const chaosA = { x: 0.85, y: -0.9 };
    const chaosB = { x: -0.95, y: 0.75 };
    return {
      driftAX: chaosLerp(detX, chaosA.x, t * 100),
      driftAY: chaosLerp(detY, chaosA.y, t * 100),
      driftBX: chaosLerp(detX, chaosB.x, t * 100),
      driftBY: chaosLerp(detY, chaosB.y, t * 100),
    };
  }
  function validateVignetteDirection(v) { return VIGNETTE_DIRECTIONS.includes(v); }
  function validateRadius(v) { return RADIUS_VALUES.includes(v); }
  const TRACKING_VALUES = ['tight', 'normal', 'wide'];
  const BOT_ICON_IDS = ['brain-computer', 'brain', 'brain14', 'intelligence', 'bot-ai', 'brain-pc2', 'brain-pc'];
  const BOT_ICON_COLORS = ['white', 'accent'];
  /* All editable cosmetics.leaf keys — used by DEFAULT_COSMETICS + auditCosmeticsSync(). */
  const COSMETICS_ALL_KEYS = COSMETIC_SNAPSHOT_KEYS.concat(['vibe', 'customVibes']);

  function isHexColor(v) {
    return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim());
  }

  /* Validate agent setContentPath writes under cosmetics.* (leaf or whole-object merge). */
  function validateCosmeticsWrite(path, value) {
    const parts = String(path || '').split('.').filter(Boolean);
    if (parts[0] !== 'cosmetics') return null;
    if (parts.length === 1 && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const k of Object.keys(value)) {
        const err = validateCosmeticsWrite('cosmetics.' + k, value[k]);
        if (err) return err;
      }
      return null;
    }
    const field = parts[1];
    if (!field || parts.length > 2) return null;
    switch (field) {
      case 'theme':
        if (value !== 'dark' && value !== 'light') return { error: 'invalid-cosmetics', message: 'cosmetics.theme must be "dark" or "light"' };
        break;
      case 'accent':
      case 'cursorColor':
        if (!isHexColor(value)) return { error: 'invalid-cosmetics', message: `cosmetics.${field} must be a #RRGGBB hex color` };
        break;
      case 'wallpaperColor':
        if (value !== '' && !isHexColor(value)) return { error: 'invalid-cosmetics', message: 'cosmetics.wallpaperColor must be empty or a #RRGGBB hex color' };
        break;
      case 'type':
        if (!FONT_TYPES.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.type must be one of: ${FONT_TYPES.join(', ')}` };
        break;
      case 'headingFont':
        if (!HEADING_FONTS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.headingFont must be one of: ${HEADING_FONTS.join(', ')}` };
        break;
      case 'cursorStyle':
        if (!CURSOR_STYLES.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.cursorStyle must be one of: ${CURSOR_STYLES.join(', ')}` };
        break;
      case 'cursorEffect':
        if (!CURSOR_EFFECTS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.cursorEffect must be one of: ${CURSOR_EFFECTS.join(', ')}` };
        break;
      case 'cursorEffectTrailStyle':
        if (!CURSOR_EFFECT_TRAIL_STYLES.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.cursorEffectTrailStyle must be one of: ${CURSOR_EFFECT_TRAIL_STYLES.join(', ')}` };
        break;
      case 'cursorEffectCometDirection':
        if (!CURSOR_EFFECT_COMET_DIRECTIONS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.cursorEffectCometDirection must be one of: ${CURSOR_EFFECT_COMET_DIRECTIONS.join(', ')}` };
        break;
      case 'bgPattern':
        if (!BG_PATTERNS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.bgPattern must be one of: ${BG_PATTERNS.join(', ')}` };
        break;
      case 'radius':
        if (!validateRadius(value)) return { error: 'invalid-cosmetics', message: `cosmetics.radius must be one of: ${RADIUS_VALUES.join(', ')}` };
        break;
      case 'vignetteDirection':
        if (!validateVignetteDirection(value)) return { error: 'invalid-cosmetics', message: `cosmetics.vignetteDirection must be one of: ${VIGNETTE_DIRECTIONS.join(', ')}` };
        break;
      case 'tracking':
        if (!TRACKING_VALUES.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.tracking must be one of: ${TRACKING_VALUES.join(', ')}` };
        break;
      case 'botIcon':
        if (!BOT_ICON_IDS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.botIcon must be one of: ${BOT_ICON_IDS.join(', ')}` };
        break;
      case 'botIconColor':
        if (!BOT_ICON_COLORS.includes(value)) return { error: 'invalid-cosmetics', message: 'cosmetics.botIconColor must be "white" or "accent"' };
        break;
      case 'vibe':
        if (!getVibe(value) && !isCustomVibeId(value)) {
          return { error: 'unknown-vibe', message: `Unknown vibe id: ${value}. Use applyVibePreset for built-in presets or a custom-* slot id.` };
        }
        break;
      case 'customVibes':
        return validateCustomVibes(value);
      case 'rainDirection':
        if (!RAIN_DIRECTIONS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.rainDirection must be one of: ${RAIN_DIRECTIONS.join(', ')}` };
        break;
      case 'waveDirection':
        if (!WAVE_DIRECTIONS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.waveDirection must be one of: ${WAVE_DIRECTIONS.join(', ')}` };
        break;
      case 'cometDirection':
        if (!COMET_DIRECTIONS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.cometDirection must be one of: ${COMET_DIRECTIONS.join(', ')}` };
        break;
      case 'particleDrift':
        if (!PARTICLE_DRIFT_DIRECTIONS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.particleDrift must be one of: ${PARTICLE_DRIFT_DIRECTIONS.join(', ')}` };
        break;
      case 'honeycombStyle':
        if (!HONEYCOMB_STYLES.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.honeycombStyle must be one of: ${HONEYCOMB_STYLES.join(', ')}` };
        break;
      case 'numberFormat':
        if (!NUMBER_FORMATS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.numberFormat must be one of: ${NUMBER_FORMATS.join(', ')}` };
        break;
      case 'accentTone':
      case 'fontScale':
      case 'wallpaperBrightness':
      case 'wallpaperIntensity':
      case 'wallpaperAnimSpeed':
      case 'wallpaperRandomness':
      case 'starSize':
      case 'cometDensity':
      case 'particleSize':
      case 'particleDensity':
      case 'particleOpacity':
      case 'binaryFontSize':
      case 'fluidSize':
      case 'fluidMorphSpeed':
      case 'honeycombGlowDensity':
      case 'cursorInteractStrength':
      case 'cursorTrailLength':
      case 'cursorParticleDensity':
      case 'cursorSweepRadius':
      case 'cursorEffectTrailLength':
      case 'cursorEffectIntensity':
      case 'cursorEffectRippleCount':
      case 'cursorEffectRippleSpeed':
      case 'cursorEffectCometIntensity':
      case 'cursorEffectCometSpeed':
      case 'cursorRingLag':
      case 'uiGlassOpacity':
      case 'vignetteIntensity':
      case 'glow': {
        const ranges = {
          accentTone: [0, 100], fontScale: [85, 120], wallpaperBrightness: [0, 100], wallpaperIntensity: [0, 100],
          wallpaperAnimSpeed: [0, 100], wallpaperRandomness: [0, 100], starSize: [0, 100], cometDensity: [0, 100],
          particleSize: [0, 100], particleDensity: [0, 100], particleOpacity: [0, 100], binaryFontSize: [0, 100],
          fluidSize: [0, 100], fluidMorphSpeed: [0, 100], honeycombGlowDensity: [0, 100],
          cursorInteractStrength: [0, 100], cursorTrailLength: [0, 100], cursorParticleDensity: [0, 100], cursorSweepRadius: [0, 100],
          cursorEffectTrailLength: [0, 100], cursorEffectIntensity: [0, 100], cursorEffectRippleCount: [0, 100], cursorEffectRippleSpeed: [0, 100], cursorEffectCometIntensity: [0, 100], cursorEffectCometSpeed: [0, 100],
          cursorRingLag: [0, 100], uiGlassOpacity: [0, 100],
          vignetteIntensity: [0, 100], glow: [0, 160],
        };
        const bounds = ranges[field];
        const n = Number(value);
        if (!Number.isFinite(n) || n < bounds[0] || n > bounds[1]) {
          return { error: 'invalid-cosmetics', message: `cosmetics.${field} must be a number ${bounds[0]}–${bounds[1]}` };
        }
        break;
      }
      case 'wallpaperUseAccent':
      case 'wallpaperAnimPaused':
      case 'scanlines':
        if (typeof value !== 'boolean') return { error: 'invalid-cosmetics', message: `cosmetics.${field} must be a boolean` };
        break;
      default:
        break;
    }
    return null;
  }

  /* Resolve active cosmetics — merges custom-* slot snapshot when cosmetics.vibe is custom. */
  function resolveEffectiveCosmetics(cos) {
    return mergeCustomVibeCosmetics(cos);
  }

  /* Dev/CI audit: assert cosmetics keys appear in defaults, validation, hints, and snapshot keys. */
  function auditCosmeticsSync(defaultCos) {
    const def = defaultCos && typeof defaultCos === 'object' ? defaultCos : {};
    const defaultKeys = Object.keys(def);
    const hint = cosmeticsFieldHint();
    const validateFields = COSMETICS_ALL_KEYS.filter((k) => {
      const sample = k === 'theme' ? 'dark'
        : k === 'accent' || k === 'cursorColor' ? '#c8e856'
        : k === 'wallpaperColor' ? ''
        : k === 'wallpaperUseAccent' || k === 'scanlines' ? true
        : k === 'customVibes' ? createDefaultCustomVibes()
        : k === 'vibe' ? 'classic'
        : k === 'botIcon' ? 'brain-computer'
        : k === 'botIconColor' ? 'accent'
        : k === 'bgPattern' ? 'grid'
        : k === 'type' ? 'default'
        : k === 'headingFont' ? 'match'
        : k === 'tracking' ? 'normal'
        : k === 'cursorStyle' ? 'ring'
        : k === 'radius' ? 'soft'
        : k === 'vignetteDirection' ? 'center'
        : k === 'fontScale' ? 100
        : k === 'rainDirection' ? 'down'
        : k === 'waveDirection' ? 'up'
        : k === 'wallpaperAnimPaused' ? false
        : k === 'cometDirection' ? 'right-down'
        : k === 'particleDrift' ? 'up'
        : k === 'honeycombStyle' ? 'outline'
        : k === 'numberFormat' ? 'binary'
        : k === 'cursorEffect' ? 'none'
        : k === 'cursorEffectTrailStyle' ? 'glow'
        : k === 'cursorEffectCometDirection' ? 'cursor'
        : 50;
      return !validateCosmeticsWrite('cosmetics.' + k, sample);
    });
    const gaps = {
      missingInDefaults: COSMETICS_ALL_KEYS.filter((k) => !(k in def)),
      missingInSnapshotKeys: defaultKeys.filter((k) => k !== 'vibe' && k !== 'customVibes' && !COSMETIC_SNAPSHOT_KEYS.includes(k)),
      validateOk: validateFields,
      hintMissing: COSMETICS_ALL_KEYS.filter((k) => {
        const tokens = [k, k.replace(/([A-Z])/g, (m) => ' ' + m.toLowerCase()).trim()];
        return !tokens.some((tok) => hint.includes(tok));
      }),
    };
    gaps.ok = gaps.missingInDefaults.length === 0
      && gaps.missingInSnapshotKeys.length === 0
      && gaps.validateOk.length === COSMETICS_ALL_KEYS.length
      && gaps.hintMissing.length === 0;
    return gaps;
  }

  function cosmeticsFieldHint() {
    return [
      'Appearance (cosmetics.*): theme · accent · accentTone · type · headingFont · tracking · fontScale',
      'bgPattern (grid|dots|diagonal|crosshatch|3dgrid|honeycomb|honeycombGlow|padgrid|circuits|waves|brick|noise|aurora|cosmos|matrixrain|particles|lightning|rain|binarystream|nebula|morphgeo|fluidcore|snowinteractive|ripplepool|fireflies|none)',
      'wallpaperBrightness (0–100 opacity) · wallpaperIntensity (0–100 pattern density) · wallpaperAnimSpeed · wallpaperAnimPaused (freeze animated motion) · wallpaperRandomness (0=deterministic/uniform sliders · 100=chaos overrides direction/speed/phase per element) · wallpaperUseAccent (pattern ink follows accent when true) · wallpaperColor (custom pattern tint when wallpaperUseAccent is false; accent color always used for glow/hi on canvas patterns)',
      'Per-pattern: honeycombStyle (outline|fill) · honeycombGlowDensity (0–100 max % of hex cells glowing at once on honeycombGlow) · rainDirection · waveDirection · starSize · cometDensity · cometDirection · particleSize · particleDensity · particleOpacity · particleDrift · numberFormat · binaryFontSize · fluidSize · fluidMorphSpeed (fluidcore blob scale + morph/flow rate; wallpaperAnimSpeed controls rotation) · cursorInteractStrength · cursorTrailLength (interactive wallpaper trail) · cursorParticleDensity · cursorSweepRadius (snowinteractive)',
      'cursorEffect (none|trail|comet|ripple|spark|glow) — global overlay independent of wallpaper · cursorEffectTrailStyle (glow|line|dotted|particles) · cursorEffectTrailLength · cursorEffectIntensity · cursorEffectRippleCount (ripple burst: 0=1 ring · 100=8 varied) · cursorEffectRippleSpeed (0=slow expansion · 100=fast) · cursorEffectCometDirection (cursor|up|down|random) · cursorEffectCometIntensity · cursorEffectCometSpeed',
      'vignetteIntensity (0=off) · vignetteDirection · glow · radius · scanlines · cursorStyle · cursorColor · cursorRingLag (0=snappy ring follow · 100=floaty trail on ring/trail cursors) · uiGlassOpacity (0=opaque panels · 100=translucent windows/bot/expertise cards with blur)',
      'botIcon · botIconColor · vibe (built-in preset id or custom-* slot id; segments: dark, light, retro, bold, multi-tone; admin shows 20 core presets — 28 extended tier hidden by default; agent applyVibePreset accepts any id) · customVibes (unlimited saved slots). Read: readAppearanceConfig. Write: setContentPath (cosmetics.*), updateAppearance (batch fields), applyVibePreset / applyCustomVibe, saveCustomVibe.',
      'Multi-tone presets: wallpaperUseAccent false + explicit wallpaperColor for pattern ink; cursorColor often differs from accent and wallpaper tint.',
      'Static honeycomb: honeycombStyle outline (grid lines) · fill (sparse filled cells via wallpaperIntensity). Animated: honeycombGlow (staggered accent hex pulses · honeycombGlowDensity caps simultaneous glow count).',
      'Interactive wallpapers: snowinteractive (continuous snowfall swept by cursor) · ripplepool (cursor disturbs water ripples) · fireflies (motes scatter from cursor).',
      'Animated patterns: circuits · waves · aurora · cosmos · matrixrain · particles · lightning · rain · binarystream · nebula · morphgeo (soft drifting blobs — uses global brightness/intensity/animSpeed/randomness) · fluidcore (centered water blob — fluidSize · fluidMorphSpeed · wallpaperAnimSpeed=rotation) · honeycombGlow.',
    ].join(' ');
  }

  function honeycombCellHash(col, row) {
    const x = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function flatTopHexPath(cx, cy, r) {
    const w = Math.sqrt(3) * r;
    const pts = [
      [cx, cy - r],
      [cx + w / 2, cy - r / 2],
      [cx + w / 2, cy + r / 2],
      [cx, cy + r],
      [cx - w / 2, cy + r / 2],
      [cx - w / 2, cy - r / 2],
    ];
    return 'M' + pts.map((p) => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join('L') + 'Z';
  }

  function flatTopHexCorners(cx, cy, r) {
    const hw = Math.sqrt(3) * r;
    return [
      [cx, cy - r],
      [cx + hw / 2, cy - r / 2],
      [cx + hw / 2, cy + r / 2],
      [cx, cy + r],
      [cx - hw / 2, cy + r / 2],
      [cx - hw / 2, cy - r / 2],
    ];
  }

  function honeycombEdgeKey(x1, y1, x2, y2) {
    const a = x1.toFixed(2) + ',' + y1.toFixed(2);
    const b = x2.toFixed(2) + ',' + y2.toFixed(2);
    return a < b ? a + '|' + b : b + '|' + a;
  }

  function honeycombEdgeMidInTile(x1, y1, x2, y2, tileW, tileH) {
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const eps = 0.001;
    return mx >= -eps && mx < tileW - eps && my >= -eps && my < tileH - eps;
  }

  function honeycombCenterInTile(cx, cy, tileW, tileH) {
    const eps = 0.001;
    return cx >= -eps && cx < tileW - eps && cy >= -eps && cy < tileH - eps;
  }

  /** Largest flat-top hex radius at (cx,cy) that fits entirely inside the repeat tile. */
  function honeycombFillRadiusInTile(cx, cy, r, tileW, tileH) {
    const rFromX = (2 / Math.sqrt(3)) * Math.min(cx, tileW - cx);
    const rf = Math.min(r, rFromX, cy, tileH - cy);
    return rf >= r * 0.92 ? r : rf >= r * 0.55 ? rf : 0;
  }

  /** Flat-top honeycomb SVG tile — deduped 1px edges for seamless repeat. */
  function buildHoneycombSvgDataUri(opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const rowH = Math.max(12, o.size || 36);
    const r = rowH / 1.5;
    const w = Math.sqrt(3) * r;
    const tileW = w * 2;
    const tileH = rowH * 2;
    const stroke = o.strokeColor || 'rgba(200,232,86,0.38)';
    const fill = o.fillColor || stroke;
    const style = o.style || o.mode || 'outline';
    const isFill = style === 'fill' || style === 'filled-sparse';
    const fillRatio = typeof o.fillRatio === 'number' ? o.fillRatio : 0;
    const edges = new Map();
    const cells = [];
    for (let row = -1; row <= 3; row++) {
      for (let col = -1; col <= 4; col++) {
        const cx = col * w + (row % 2 !== 0 ? w / 2 : 0) + w / 2;
        const cy = row * rowH + r;
        if (cx < -w || cx > tileW + w || cy < -r || cy > tileH + r) continue;
        cells.push({ col, row, cx, cy });
        const pts = flatTopHexCorners(cx, cy, r);
        for (let i = 0; i < 6; i++) {
          const x1 = pts[i][0];
          const y1 = pts[i][1];
          const x2 = pts[(i + 1) % 6][0];
          const y2 = pts[(i + 1) % 6][1];
          if (!honeycombEdgeMidInTile(x1, y1, x2, y2, tileW, tileH)) continue;
          edges.set(honeycombEdgeKey(x1, y1, x2, y2), { x1, y1, x2, y2 });
        }
      }
    }
    let body = '';
    if (isFill) {
      cells.forEach((cell) => {
        if (!honeycombCenterInTile(cell.cx, cell.cy, tileW, tileH)) return;
        if (honeycombCellHash(cell.col, cell.row) >= fillRatio) return;
        const fillR = honeycombFillRadiusInTile(cell.cx, cell.cy, r, tileW, tileH);
        if (fillR <= 0) return;
        const d = flatTopHexPath(cell.cx, cell.cy, fillR);
        body += '<path d="' + d + '" fill="' + fill + '" fill-opacity="0.52" stroke="none"/>';
      });
    }
    if (!isFill || fillRatio > 0) {
      edges.forEach(({ x1, y1, x2, y2 }) => {
        body += '<line x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2)
          + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2)
          + '" stroke="' + stroke + '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
      });
    }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + tileW.toFixed(2) + '" height="' + tileH.toFixed(2)
      + '" viewBox="0 0 ' + tileW.toFixed(2) + ' ' + tileH.toFixed(2) + '">' + body + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  function resolveHoneycombTileMetrics(size) {
    const rowH = Math.max(12, size || 36);
    const r = rowH / 1.5;
    const w = Math.sqrt(3) * r;
    return { tileW: w * 2, tileH: rowH * 2, r, rowH };
  }

  function resolveWallpaperCosmetics(cos) {
    const c = cos && typeof cos === 'object' ? cos : {};
    const rawPattern = typeof c.bgPattern === 'string' ? c.bgPattern : 'grid';
    const pattern = healBgPattern(rawPattern);
    const bright = clampCosmeticNumber(c.wallpaperBrightness, 0, 100, 50);
    const intense = clampCosmeticNumber(c.wallpaperIntensity, 0, 100, 50);
    const animSpeed = clampCosmeticNumber(c.wallpaperAnimSpeed, 0, 100, 50);
    const randomness = clampCosmeticNumber(c.wallpaperRandomness, 0, 100, 40);
    const starSize = clampCosmeticNumber(c.starSize, 0, 100, 50);
    const cometDensity = clampCosmeticNumber(c.cometDensity, 0, 100, 40);
    const particleSize = clampCosmeticNumber(c.particleSize, 0, 100, 45);
    const particleDensity = clampCosmeticNumber(c.particleDensity, 0, 100, 35);
    const particleOpacity = clampCosmeticNumber(c.particleOpacity, 0, 100, 70);
    const particleDrift = PARTICLE_DRIFT_DIRECTIONS.includes(c.particleDrift) ? c.particleDrift : 'up';
    const binaryFontSize = clampCosmeticNumber(c.binaryFontSize, 0, 100, 50);
    const fluidSize = clampCosmeticNumber(c.fluidSize, 0, 100, 50);
    const fluidMorphSpeed = clampCosmeticNumber(c.fluidMorphSpeed, 0, 100, 45);
    const honeycombGlowDensity = clampCosmeticNumber(c.honeycombGlowDensity, 0, 100, 50);
    const rainDirection = RAIN_DIRECTIONS.includes(c.rainDirection) ? c.rainDirection : 'down';
    const waveDirection = WAVE_DIRECTIONS.includes(c.waveDirection) ? c.waveDirection : 'up';
    const cometDirection = COMET_DIRECTIONS.includes(c.cometDirection) ? c.cometDirection : 'right-down';
    const honeycombStyle = HONEYCOMB_STYLES.includes(c.honeycombStyle) ? c.honeycombStyle : 'outline';
    const cursorInteractStrength = clampCosmeticNumber(c.cursorInteractStrength, 0, 100, 55);
    const cursorTrailLength = clampCosmeticNumber(c.cursorTrailLength, 0, 100, 50);
    const cursorParticleDensity = clampCosmeticNumber(c.cursorParticleDensity, 0, 100, 40);
    const cursorSweepRadius = clampCosmeticNumber(c.cursorSweepRadius, 0, 100, 50);
    const numberFormat = NUMBER_FORMATS.includes(c.numberFormat) ? c.numberFormat : 'binary';
    const rand = randomness / 100;
    const i = intense / 100;
    const liCurve = i * (0.35 + i * 0.65);
    const pDensity = pattern === 'particles' ? particleDensity / 100 : i;
    const opacity = 0.15 + (bright / 100) * 0.85;
    const size = Math.round(56 - i * 44);
    const fieldSize = Math.round(480 - i * 360);
    // Higher animSpeed → shorter duration (faster motion). 0≈60s · 50≈18s · 100≈1.5s.
    const speedSec = Math.max(1.5, Math.round(60 - (animSpeed / 100) * 58.5));
    const speedMult = 20 / speedSec;
    const starScale = 0.55 + (starSize / 100) * 1.45;
    const fluidScale = 0.14 + (fluidSize / 100) * 0.36;
    const fluidMorphMult = 0.12 + (fluidMorphSpeed / 100) * 1.35;
    const cometFreq = 0.35 + (cometDensity / 100) * 0.85;
    const randDurA = (0.55 + rand * 0.35 + (1 - rand) * 0.2).toFixed(3);
    const randDurB = (0.7 + rand * 1.05).toFixed(3);
    const randPhaseA = (rand * 137.5).toFixed(1);
    const randPhaseB = (rand * 241.3 + 42).toFixed(1);
    const numberGlyphs = {
      binary: '01',
      octal: '01234567',
      decimal: '0123456789',
      hex: '0123456789ABCDEF',
    };
    const rainTilt = {
      down: 1.5,
      'diagonal-left': -6,
      'diagonal-right': 6,
      left: -12,
      right: 12,
    };
    const cometVec = {
      'right-down': { vx: 1, vy: 0.35 },
      'left-down': { vx: -1, vy: 0.35 },
      right: { vx: 1.2, vy: 0.1 },
      left: { vx: -1.2, vy: 0.1 },
      'up-right': { vx: 0.85, vy: -0.55 },
    };
    const cometVecNorm = cometVec[cometDirection] || cometVec['right-down'];
    const particleDriftVec = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      'diagonal-up': { x: 1, y: -1 },
      'diagonal-down': { x: 1, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const particleDriftNorm = particleDriftVec[particleDrift] || particleDriftVec.up;
    const waveDriftVec = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      'diagonal-up': { x: 1, y: -1 },
      'diagonal-down': { x: 1, y: 1 },
    };
    const waveDriftNorm = waveDriftVec[waveDirection] || waveDriftVec.up;
    const particleDrifts = resolveParticleDriftLayers(
      particleDriftNorm.x,
      particleDriftNorm.y,
      randomness,
    );
    return {
      pattern,
      opacity,
      size,
      fieldSize,
      animDur: speedSec + 's',
      speedSec,
      speedMult,
      randomness,
      rand,
      randDelay: (rand * 18).toFixed(2) + 's',
      randDurScale: (0.55 + rand * 1.15).toFixed(3),
      randDurA,
      randDurB,
      randPhaseA,
      randPhaseB,
      honeycombStyle,
      honeycombGlowDensity,
      cursorInteractStrength,
      cursorTrailLength,
      cursorTrailPoints: Math.round(8 + (cursorTrailLength / 100) * 36),
      cursorParticleDensity,
      cursorSnowCount: Math.max(12, Math.round(24 + ((cursorParticleDensity / 100) * 0.55 + (intense / 100) * 0.45) * 196)),
      cursorSweepRadius,
      cursorSweepPx: Math.round(28 + (cursorSweepRadius / 100) * 88),
      cursorInteractNorm: cursorInteractStrength / 100,
      starCount: Math.round(24 + i * 72),
      starScale,
      cometInterval: Math.max(2.5, Math.round(16 - cometFreq * 12)),
      cometIntervalVar: rand * 0.85,
      cometDirection,
      cometVecX: cometVecNorm.vx,
      cometVecY: cometVecNorm.vy,
      particleCount: Math.min(90, Math.round(8 + Math.pow(pDensity, 1.35) * 72)),
      particleSize,
      particleSizeScale: 0.65 + (particleSize / 100) * 1.1,
      particleOpacity,
      particleOpacityNorm: particleOpacity / 100,
      particleDrift,
      particleDriftX: particleDriftNorm.x,
      particleDriftY: particleDriftNorm.y,
      particleDriftAX: particleDrifts.driftAX,
      particleDriftAY: particleDrifts.driftAY,
      particleDriftBX: particleDrifts.driftBX,
      particleDriftBY: particleDrifts.driftBY,
      columnCount: Math.round(22 + i * 58),
      rainDropCount: Math.round(90 + i * 260),
      rainDirection,
      rainTilt: rainTilt[rainDirection] != null ? rainTilt[rainDirection] : 1.5,
      waveDirection,
      waveDriftX: waveDriftNorm.x,
      waveDriftY: waveDriftNorm.y,
      waveTileX: Math.round(size * 2.5),
      waveTileY: Math.round(size * 1.25),
      binaryRowCount: Math.round(18 + i * 34),
      numberFormat,
      numberGlyphs: numberGlyphs[numberFormat] || numberGlyphs.binary,
      binaryFontPx: Math.round(9 + (binaryFontSize / 100) * 9),
      fluidSize,
      fluidMorphSpeed,
      fluidScale,
      fluidMorphMult,
      nebulaBlobCount: Math.round(4 + i * 10),
      circuitPathCount: Math.round(10 + i * 32),
      circuitCellSize: Math.max(28, Math.round(52 - i * 22)),
      lightningInterval: Math.max(0.8, 14 - liCurve * 12),
      lightningStrikeCount: Math.min(3, 1 + Math.round(liCurve * 2)),
      lightningBranchDepth: Math.min(2, 1 + Math.round(liCurve * 1.2)),
      lightningBranchChance: 0.08 + liCurve * 0.22,
      lightningMaxBranches: Math.round(2 + liCurve * 3),
      bright,
      intense,
      animSpeed,
      animated: !!(BG_PATTERN_META[pattern] && BG_PATTERN_META[pattern].animated),
    };
  }
  /** Theme-aware ink for canvas wallpapers (contrast on light vs dark backgrounds). */
  function resolveWallpaperCanvasInk(theme, rgb, intense, pattern) {
    const light = theme === 'light';
    const i = clampCosmeticNumber(intense, 0, 100, 50) / 100;
    const base = rgb && typeof rgb === 'object' ? rgb : { r: 200, g: 232, b: 86 };
    if (pattern === 'lightning') {
      if (light) {
        return {
          r: Math.round(base.r * 0.4 + 28),
          g: Math.round(base.g * 0.4 + 32),
          b: Math.round(base.b * 0.45 + 48),
          hi: [
            Math.min(255, Math.round(base.r * 0.55 + 120)),
            Math.min(255, Math.round(base.g * 0.55 + 130)),
            Math.min(255, Math.round(base.b * 0.6 + 145)),
          ],
          flash: 0.38 + i * 0.48,
          alphaBoost: 1.35 + i * 0.55,
        };
      }
      return {
        r: base.r,
        g: base.g,
        b: base.b,
        hi: [255, 255, 255],
        flash: 0.2 + i * 0.55,
        alphaBoost: 1.1 + i * 0.5,
      };
    }
    if (pattern === 'nebula') {
      if (light) {
        return {
          r: Math.round(base.r * 0.38 + 54),
          g: Math.round(base.g * 0.34 + 48),
          b: Math.round(base.b * 0.44 + 76),
          hi: [
            Math.min(255, Math.round(base.r * 0.52 + 92)),
            Math.min(255, Math.round(base.g * 0.48 + 84)),
            Math.min(255, Math.round(base.b * 0.58 + 112)),
          ],
          flash: 0,
          alphaBoost: 1.6 + i * 0.7,
        };
      }
      return {
        r: base.r,
        g: base.g,
        b: base.b,
        hi: [
          Math.min(255, Math.round((base.r + 255) * 0.62)),
          Math.min(255, Math.round((base.g + 255) * 0.58)),
          Math.min(255, Math.round((base.b + 255) * 0.66)),
        ],
        flash: 0,
        alphaBoost: 1.05 + i * 0.42,
      };
    }
    if (pattern === 'rain') {
      if (light) {
        return {
          r: Math.round(base.r * 0.38 + 36),
          g: Math.round(base.g * 0.38 + 40),
          b: Math.round(base.b * 0.45 + 56),
          hi: [20, 32, 64],
          flash: 0,
          alphaBoost: 1.65 + i * 0.75,
        };
      }
      return {
        r: Math.min(255, Math.round(base.r * 0.92 + 24)),
        g: Math.min(255, Math.round(base.g * 0.92 + 28)),
        b: Math.min(255, Math.round(base.b * 0.95 + 36)),
        hi: [210, 228, 255],
        flash: 0,
        alphaBoost: 1.05 + i * 0.5,
      };
    }
    if (pattern === 'matrixrain') {
      if (light) {
        return {
          r: Math.round(base.r * 0.34 + 32),
          g: Math.round(base.g * 0.38 + 38),
          b: Math.round(base.b * 0.32 + 40),
          hi: [
            Math.min(255, Math.round(base.r * 0.55 + 18)),
            Math.min(255, Math.round(base.g * 0.65 + 42)),
            Math.min(255, Math.round(base.b * 0.4 + 28)),
          ],
          flash: 0,
          alphaBoost: 1.5 + i * 0.65,
        };
      }
      return {
        r: base.r,
        g: base.g,
        b: base.b,
        hi: [255, 255, 255],
        flash: 0,
        alphaBoost: 0.95 + i * 0.4,
      };
    }
    if (pattern === 'circuits') {
      if (light) {
        return {
          r: Math.round(base.r * 0.32 + 28),
          g: Math.round(base.g * 0.42 + 36),
          b: Math.round(base.b * 0.28 + 32),
          hi: [
            Math.min(255, Math.round(base.r * 0.5 + 48)),
            Math.min(255, Math.round(base.g * 0.62 + 72)),
            Math.min(255, Math.round(base.b * 0.45 + 40)),
          ],
          flash: 0,
          alphaBoost: 1.45 + i * 0.55,
        };
      }
      return {
        r: base.r,
        g: base.g,
        b: base.b,
        hi: [255, 255, 255],
        flash: 0,
        alphaBoost: 1.05 + i * 0.45,
      };
    }
    if (light) {
      return {
        r: Math.round(base.r * 0.22 + 42),
        g: Math.round(base.g * 0.22 + 48),
        b: Math.round(base.b * 0.28 + 62),
        hi: [32, 48, 88],
        flash: 0.22 + i * 0.5,
        alphaBoost: 1.4 + i * 0.6,
      };
    }
    return {
      r: base.r,
      g: base.g,
      b: base.b,
      hi: [255, 255, 255],
      flash: 0.08 + i * 0.2,
      alphaBoost: 0.95 + i * 0.35,
    };
  }
  /** Pattern ink vs accent glow — dual-tone wallpaper colors. */
  function resolveWallpaperColors(cos, tonedAccent) {
    const c = cos && typeof cos === 'object' ? cos : {};
    const accent = typeof tonedAccent === 'string' && tonedAccent ? tonedAccent : (c.accent || '#c8e856');
    const useAccent = c.wallpaperUseAccent !== false;
    const patternColor = useAccent ? accent : (c.wallpaperColor || accent);
    return { patternColor, accentColor: accent };
  }

  function applyWallpaperVarsToRoot(root, cos, tonedAccent) {
    if (!root) return;
    const c = cos && typeof cos === 'object' ? cos : {};
    const wpColors = resolveWallpaperColors(c, tonedAccent);
    const wpColor = wpColors.patternColor;
    const wp = resolveWallpaperCosmetics(c);
    root.style.setProperty('--wallpaper-color', wpColor);
    root.style.setProperty('--wallpaper-accent', wpColors.accentColor);
    root.style.setProperty('--wp-opacity', wp.opacity.toString());
    root.style.setProperty('--wp-size', wp.size + 'px');
    root.style.setProperty('--wp-field-size', wp.fieldSize + 'px');
    root.style.setProperty('--wp-anim-dur', wp.animDur);
    root.style.setProperty('--wp-speed', wp.speedSec.toString());
    root.style.setProperty('--wp-rand', wp.rand.toString());
    root.style.setProperty('--wp-rand-delay', wp.randDelay);
    root.style.setProperty('--wp-rand-dur', wp.randDurScale);
    root.style.setProperty('--wp-star-count', wp.starCount.toString());
    root.style.setProperty('--wp-comet-interval', wp.cometInterval.toString());
    root.style.setProperty('--wp-particle-count', wp.particleCount.toString());
    root.style.setProperty('--wp-particle-size', (wp.particleSizeScale || 1).toString());
    root.style.setProperty('--wp-p-opacity', (wp.particleOpacityNorm == null ? 0.7 : wp.particleOpacityNorm).toString());
    root.style.setProperty('--wp-p-drift-x', (wp.particleDriftX == null ? 0 : wp.particleDriftX).toString());
    root.style.setProperty('--wp-p-drift-y', (wp.particleDriftY == null ? -1 : wp.particleDriftY).toString());
    root.style.setProperty('--wp-p-drift-x-a', (wp.particleDriftAX == null ? wp.particleDriftX : wp.particleDriftAX).toString());
    root.style.setProperty('--wp-p-drift-y-a', (wp.particleDriftAY == null ? wp.particleDriftY : wp.particleDriftAY).toString());
    root.style.setProperty('--wp-p-drift-x-b', (wp.particleDriftBX == null ? wp.particleDriftX : wp.particleDriftBX).toString());
    root.style.setProperty('--wp-p-drift-y-b', (wp.particleDriftBY == null ? wp.particleDriftY : wp.particleDriftBY).toString());
    root.style.setProperty('--wp-wave-dx', (wp.waveDriftX == null ? 0 : wp.waveDriftX).toString());
    root.style.setProperty('--wp-wave-dy', (wp.waveDriftY == null ? -1 : wp.waveDriftY).toString());
    root.style.setProperty('--wp-wave-tile-x', (wp.waveTileX || wp.size * 2.5) + 'px');
    root.style.setProperty('--wp-wave-tile-y', (wp.waveTileY || wp.size * 1.25) + 'px');
    root.style.setProperty('--wp-rand-dur-a', wp.randDurA || wp.randDurScale);
    root.style.setProperty('--wp-rand-dur-b', wp.randDurB || wp.randDurScale);
    root.style.setProperty('--wp-rand-phase-a', (wp.randPhaseA || '0') + 'deg');
    root.style.setProperty('--wp-rand-phase-b', (wp.randPhaseB || '0') + 'deg');
    root.style.setProperty('--wp-column-count', wp.columnCount.toString());
    const gridMix = root.dataset.theme === 'light' ? '32%' : '38%';
    root.style.setProperty('--grid', 'color-mix(in oklab, var(--wallpaper-color) ' + gridMix + ', transparent)');
    const bgPat = healBgPattern(c.bgPattern);
    if (bgPat === 'honeycomb') {
      const honeyStyle = HONEYCOMB_STYLES.includes(c.honeycombStyle) ? c.honeycombStyle : 'outline';
      root.dataset.honeycombStyle = honeyStyle;
      const gridAlpha = root.dataset.theme === 'light' ? 0.32 : 0.38;
      const rgb = /^#([0-9a-fA-F]{6})$/.test(String(wpColor || ''))
        ? {
          r: parseInt(String(wpColor).slice(1, 3), 16),
          g: parseInt(String(wpColor).slice(3, 5), 16),
          b: parseInt(String(wpColor).slice(5, 7), 16),
        }
        : { r: 200, g: 232, b: 86 };
      const stroke = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + gridAlpha + ')';
      const fill = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + Math.min(0.72, gridAlpha + 0.18) + ')';
      const tile = resolveHoneycombTileMetrics(wp.size);
      const uri = buildHoneycombSvgDataUri({
        size: wp.size,
        style: honeyStyle,
        fillRatio: honeyStyle === 'fill' ? (wp.intense / 100) * 0.22 : 0,
        strokeColor: stroke,
        fillColor: fill,
      });
      root.style.setProperty('--wp-honeycomb-bg', uri);
      root.style.setProperty('--wp-honeycomb-tile-x', tile.tileW.toFixed(2) + 'px');
      root.style.setProperty('--wp-honeycomb-tile-y', tile.tileH.toFixed(2) + 'px');
    } else {
      delete root.dataset.honeycombStyle;
      root.style.removeProperty('--wp-honeycomb-bg');
      root.style.removeProperty('--wp-honeycomb-tile-x');
      root.style.removeProperty('--wp-honeycomb-tile-y');
    }
    if (wp.animated) root.dataset.bgAnimated = 'on'; else delete root.dataset.bgAnimated;
    if (c.wallpaperAnimPaused) root.dataset.wpAnimPaused = 'on'; else delete root.dataset.wpAnimPaused;
  }
  function resolveVignetteCosmetics(cos) {
    const c = cos && typeof cos === 'object' ? cos : {};
    return {
      intensity: typeof c.vignetteIntensity === 'number'
        ? clampCosmeticNumber(c.vignetteIntensity, 0, 100, 0)
        : 45,
      direction: typeof c.vignetteDirection === 'string' && validateVignetteDirection(c.vignetteDirection)
        ? c.vignetteDirection
        : 'center',
    };
  }
  /* Theme-aware edge tint for wallpaper vignette (painted on body::after, above wallpaper).
     Dark mode: black ink. Light mode: warm white/cream ink — not dark brown. */
  function buildWallpaperVignetteOverlay(direction, intensity, theme) {
    const i = clampCosmeticNumber(intensity, 0, 100, 0) / 100;
    if (i <= 0 || !direction || direction === 'none') return null;
    const light = theme === 'light';
    const peak = light
      ? 0.1 + 0.9 * Math.pow(i, 0.55)
      : 0.14 + 0.86 * Math.pow(i, 0.5);
    const mid = peak * 0.58;
    const reach = Math.round(32 + 68 * i);
    const midStop = Math.round(reach * 0.42);
    const ink = light ? '255,252,245' : '0,0,0';
    const c = (a) => 'rgba(' + ink + ',' + Math.min(1, a).toFixed(3) + ')';
    switch (direction) {
      case 'center': {
        const inner = Math.round(34 - 32 * i);
        return 'radial-gradient(ellipse 92% 84% at center, transparent ' + inner + '%, ' + c(peak) + ' 100%)';
      }
      case 'all': {
        const inner = Math.round(24 - 22 * i);
        return 'radial-gradient(ellipse 104% 100% at center, transparent ' + inner + '%, ' + c(peak) + ' 100%)';
      }
      case 'top':
        return 'linear-gradient(to bottom, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'bottom':
        return 'linear-gradient(to top, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'left':
        return 'linear-gradient(to right, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'right':
        return 'linear-gradient(to left, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'horizontal':
        return 'linear-gradient(to bottom, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%), '
          + 'linear-gradient(to top, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'vertical':
        return 'linear-gradient(to right, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%), '
          + 'linear-gradient(to left, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'top-left':
        return 'radial-gradient(ellipse 130% 130% at top left, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'top-right':
        return 'radial-gradient(ellipse 130% 130% at top right, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'bottom-left':
        return 'radial-gradient(ellipse 130% 130% at bottom left, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      case 'bottom-right':
        return 'radial-gradient(ellipse 130% 130% at bottom right, ' + c(peak) + ' 0%, ' + c(mid) + ' ' + midStop + '%, transparent ' + reach + '%)';
      default:
        return null;
    }
  }
  /* Optional wallpaper-layer mask (opaque = visible). Supplements overlay at high intensity.
     Mask luminance is theme-neutral (#000 = visible); overlay carries theme ink color. */
  function buildWallpaperVignetteMask(direction, intensity, theme) {
    const i = clampCosmeticNumber(intensity, 0, 100, 0) / 100;
    if (i <= 0 || !direction || direction === 'none') return { mask: 'none', composite: null };
    const edge = Math.round(24 + 62 * i);
    const cornerReach = Math.round(48 + 52 * i);
    /* CSS mask: black = show wallpaper, transparent = hide. Same shape both themes. */
    const vis = '#000';
    switch (direction) {
      case 'center': {
        const inner = Math.round(54 - 50 * i);
        const outer = Math.round(86 - 24 * i);
        return { mask: 'radial-gradient(ellipse 90% 82% at center, ' + vis + ' ' + inner + '%, transparent ' + outer + '%)', composite: null };
      }
      case 'all': {
        const inner = Math.round(38 - 34 * i);
        const outer = Math.round(88 - 26 * i);
        return { mask: 'radial-gradient(ellipse 102% 98% at center, ' + vis + ' ' + inner + '%, transparent ' + outer + '%)', composite: null };
      }
      case 'top':
        return { mask: 'linear-gradient(to bottom, transparent 0%, ' + vis + ' ' + edge + '%)', composite: null };
      case 'bottom':
        return { mask: 'linear-gradient(to top, transparent 0%, ' + vis + ' ' + edge + '%)', composite: null };
      case 'left':
        return { mask: 'linear-gradient(to right, transparent 0%, ' + vis + ' ' + edge + '%)', composite: null };
      case 'right':
        return { mask: 'linear-gradient(to left, transparent 0%, ' + vis + ' ' + edge + '%)', composite: null };
      case 'horizontal':
        return {
          mask: 'linear-gradient(to bottom, transparent 0%, ' + vis + ' ' + edge + '%), linear-gradient(to top, transparent 0%, ' + vis + ' ' + edge + '%)',
          composite: 'add',
        };
      case 'vertical':
        return {
          mask: 'linear-gradient(to right, transparent 0%, ' + vis + ' ' + edge + '%), linear-gradient(to left, transparent 0%, ' + vis + ' ' + edge + '%)',
          composite: 'add',
        };
      case 'top-left':
        return { mask: 'radial-gradient(ellipse 110% 110% at top left, transparent 0%, ' + vis + ' ' + cornerReach + '%)', composite: null };
      case 'top-right':
        return { mask: 'radial-gradient(ellipse 110% 110% at top right, transparent 0%, ' + vis + ' ' + cornerReach + '%)', composite: null };
      case 'bottom-left':
        return { mask: 'radial-gradient(ellipse 110% 110% at bottom left, transparent 0%, ' + vis + ' ' + cornerReach + '%)', composite: null };
      case 'bottom-right':
        return { mask: 'radial-gradient(ellipse 110% 110% at bottom right, transparent 0%, ' + vis + ' ' + cornerReach + '%)', composite: null };
      default:
        return { mask: 'none', composite: null };
    }
  }
  function applyWallpaperVignetteStyle(root, direction, intensity, themeOverride) {
    if (!root || !root.style) return;
    const theme = (themeOverride === 'light' || themeOverride === 'dark')
      ? themeOverride
      : (root.dataset.theme === 'light' ? 'light' : 'dark');
    const overlay = buildWallpaperVignetteOverlay(direction, intensity, theme);
    if (!overlay) {
      root.style.removeProperty('--wp-vignette-overlay');
      root.style.removeProperty('--wp-vignette-mask');
      root.style.removeProperty('--wp-vignette-composite');
      root.style.removeProperty('--wp-vignette-ink');
      delete root.dataset.vignette;
      return;
    }
    root.style.setProperty('--wp-vignette-overlay', overlay);
    root.style.setProperty('--wp-vignette-ink', theme === 'light' ? '255,252,245' : '0,0,0');
    const { mask, composite } = buildWallpaperVignetteMask(direction, intensity, theme);
    if (mask && mask !== 'none' && intensity >= 18) {
      root.style.setProperty('--wp-vignette-mask', mask);
      if (composite) root.style.setProperty('--wp-vignette-composite', composite);
      else root.style.removeProperty('--wp-vignette-composite');
    } else {
      root.style.removeProperty('--wp-vignette-mask');
      root.style.removeProperty('--wp-vignette-composite');
    }
    root.dataset.vignette = direction;
  }

  function validateExpertiseIcon(icon) { return EXPERTISE_ICONS.includes(icon); }
  function validateSocialIcon(icon) { return SOCIAL_ICONS.includes(icon); }
  function validateCollection(name) { return Reflect.get(COLLECTIONS, name) || null; }
  function providerKind(id) { return Reflect.get(PROVIDER_KIND, id) || null; }

  /* Whether the active provider+model can accept image attachments in chat.
     Groq curated models = false. OpenRouter = model-name heuristics.
     Gemini/OpenAI/Anthropic/Mistral/Grok = true for curated tool models. */
  function supportsVision(providerId, model) {
    const id = String(providerId || '').toLowerCase();
    const m = String(model || '').toLowerCase();
    if (!id || !m) return false;

    if (modelInVisionMap(id, model)) return true;

    /* Groq chat models are text-only; llama-4 scout is the lone vision exception when listed. */
    if (id === 'groq') return /llama-4.*scout/i.test(m);

    if (id === 'openrouter') {
      /* Prefer VISION_MODELS_BY_PROVIDER; heuristics only for names that clearly imply vision. */
      if (/gemini|gpt-4o|gpt-4\.1|gpt-4(?!\.1)|claude-3|claude-sonnet|llava|pixtral|qwen.*vl|vision|moondream|phi-3.*vision/i.test(m)) return true;
      if (/llama-?3\.|meta-llama\/llama|deepseek(?!.*vl)|kimi|moonshotai\/kimi/i.test(m)) return false;
      const curated = (AGENT_TOOL_MODELS.openrouter || []).find((x) => x.id === model);
      if (curated) return /gemini|claude/i.test(curated.id);
      return false;
    }

    if (id === 'gemini') return /gemini/i.test(m);
    if (id === 'openai') return /gpt-4|gpt-4o|gpt-4\.1|o[134]/i.test(m);
    if (id === 'anthropic') return /claude/i.test(m);
    if (id === 'mistral') return /pixtral|mistral-(large|small)/i.test(m);
    if (id === 'grok') return /grok/i.test(m);
    return false;
  }

  /* Static table OR a successful runtime vision probe (owner-only, client-sent flag). */
  function acceptsVision(providerId, model, visionVerified) {
    return supportsVision(providerId, model) || !!visionVerified;
  }

  /* Whether the provider+model can use server-fetched URL/page text in chat. */
  function supportsUrlContext(providerId, model) {
    const id = String(providerId || '').toLowerCase();
    const m = String(model || '').toLowerCase();
    if (!id || !m) return false;
    if (modelInUrlMap(id, model)) return true;
    if (id === 'gemini') return /gemini/i.test(m);
    if (id === 'openai') return /gpt-4|gpt-4o|gpt-4\.1|o[134]/i.test(m);
    if (id === 'anthropic') return /claude/i.test(m);
    if (id === 'mistral') return /mistral-(large|small)/i.test(m);
    if (id === 'grok') return /grok/i.test(m);
    if (id === 'groq') return /llama|kimi|gpt-oss/i.test(m);
    if (id === 'openrouter') {
      if (/gemini|gpt-4o|gpt-4\.1|gpt-4(?!\.1)|claude-3|claude-sonnet|deepseek|llama|kimi/i.test(m)) return true;
      return false;
    }
    return false;
  }

  function acceptsUrlContext(providerId, model, urlVerified) {
    return supportsUrlContext(providerId, model) || !!urlVerified;
  }

  const exportsObj = {
    EXPERTISE_ICONS,
    SOCIAL_ICONS,
    CURSOR_STYLES,
    CURSOR_EFFECTS,
    CURSOR_EFFECT_TRAIL_STYLES,
    CURSOR_EFFECT_COMET_DIRECTIONS,
    BG_PATTERNS,
    BG_PATTERN_META,
    HONEYCOMB_STYLES,
    CURSOR_WALLPAPERS,
    RAIN_DIRECTIONS,
    WAVE_DIRECTIONS,
    COMET_DIRECTIONS,
    PARTICLE_DRIFT_DIRECTIONS,
    NUMBER_FORMATS,
    CANVAS_WALLPAPERS,
    CSS_ANIM_WALLPAPERS,
    LEGACY_BG_PATTERNS,
    FONT_TYPES,
    HEADING_FONTS,
    RADIUS_VALUES,
    VIGNETTE_DIRECTIONS,
    VIBE_CATEGORIES,
    VIBES,
    COLLECTIONS,
    PROVIDER_KIND,
    AGENT_CONFIG_DEFAULTS,
    AGENT_TOOL_MODELS,
    VISION_MODELS_BY_PROVIDER,
    URL_MODELS_BY_PROVIDER,
    modelInVisionMap,
    modelInUrlMap,
    normalizeImpactEntry,
    validateImpactWrite,
    coerceImpactArray,
    parseExperienceDateRange,
    formatExperienceDateRange,
    normalizeExperienceEntry,
    coerceExperienceArray,
    normalizeProjectItem,
    applyProjectDefaults,
    validateProjectItem,
    renumberExpertise,
    getVibe,
    isVibeHidden,
    getVisibleVibes,
    getExtendedVibes,
    isCustomVibeId,
    getCustomVibe,
    createDefaultCustomVibes,
    healBgPattern,
    coerceCustomVibes,
    normalizeCosmetics,
    snapshotCosmetics,
    mergeCustomVibeCosmetics,
    resolveEffectiveCosmetics,
    auditCosmeticsSync,
    CUSTOM_VIBE_ID_PREFIX,
    nextCustomVibeId,
    customVibeNum,
    COSMETIC_SNAPSHOT_KEYS,
    COSMETICS_ALL_KEYS,
    BOT_ICON_IDS,
    clampCosmeticNumber,
    wallpaperRandFactor,
    chaosLerp,
    mixRandomness,
    resolveParticleDriftLayers,
    validateVignetteDirection,
    validateRadius,
    validateCosmeticsWrite,
    cosmeticsFieldHint,
    buildHoneycombSvgDataUri,
    resolveHoneycombTileMetrics,
    resolveWallpaperCosmetics,
    resolveWallpaperColors,
    resolveWallpaperCanvasInk,
    applyWallpaperVarsToRoot,
    resolveVignetteCosmetics,
    buildWallpaperVignetteOverlay,
    buildWallpaperVignetteMask,
    applyWallpaperVignetteStyle,
    validateExpertiseIcon,
    validateSocialIcon,
    validateCollection,
    providerKind,
    supportsVision,
    acceptsVision,
    supportsUrlContext,
    acceptsUrlContext,
    sanitizeSvg,
    isCustomIcon,
    svgColors,
    svgHasStroke,
    recolorSvg,
    recolorSvgMap,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  }
  if (typeof window !== 'undefined') {
    window.SHARED_SCHEMA = exportsObj;
  }
})();
