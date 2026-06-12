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
  const BG_PATTERNS = ['grid', 'dots', 'scan', 'starfield', 'crosshatch', 'hex', 'circuits', 'waves', 'diagonal', 'brick', 'noise', 'aurora', 'cosmos', 'matrixrain', 'particles', 'pulse', 'lightning', 'rain', 'smoke', 'binarystream', 'nebula', 'morphgeo', 'none'];
  const RAIN_DIRECTIONS = ['down', 'diagonal-left', 'diagonal-right', 'left', 'right'];
  const COMET_DIRECTIONS = ['right-down', 'left-down', 'right', 'left', 'up-right'];
  const PARTICLE_DRIFT_DIRECTIONS = ['up', 'down', 'diagonal-up', 'diagonal-down', 'left', 'right'];
  const MORPH_STYLES = ['spin', 'pulse', 'warp', 'orbit'];
  const NUMBER_FORMATS = ['binary', 'octal', 'decimal', 'hex'];
  /* Pattern metadata for admin labels (animated badge) and wallpaper tuning. */
  const BG_PATTERN_META = {
    grid: { label: 'Grid', animated: false },
    dots: { label: 'Dots', animated: false },
    scan: { label: 'Scan lines', animated: false },
    starfield: { label: 'Starfield', animated: false },
    crosshatch: { label: 'Crosshatch', animated: false },
    hex: { label: 'Hex mesh', animated: false },
    circuits: { label: 'Circuit pulse', animated: true, supportsRandomness: true },
    waves: { label: 'Waves', animated: false },
    diagonal: { label: 'Diagonal', animated: false },
    brick: { label: 'Brick', animated: false },
    noise: { label: 'Noise grain', animated: false },
    aurora: { label: 'Aurora', animated: true, supportsRandomness: true },
    cosmos: { label: 'Cosmos', animated: true, supportsRandomness: true },
    matrixrain: { label: 'Matrix rain', animated: true, supportsRandomness: true },
    particles: { label: 'Floating particles', animated: true, supportsRandomness: true },
    pulse: { label: 'Gradient pulse', animated: true, supportsRandomness: true },
    lightning: { label: 'Lightning', animated: true, supportsRandomness: true },
    rain: { label: 'Rain', animated: true, supportsRandomness: true },
    smoke: { label: 'Smoke drift', animated: true, supportsRandomness: true },
    binarystream: { label: 'Binary stream', animated: true, supportsRandomness: true },
    nebula: { label: 'Nebula', animated: true, supportsRandomness: true },
    morphgeo: { label: 'Geometric morph', animated: true, supportsRandomness: true },
    none: { label: 'None', animated: false },
  };
  const CANVAS_WALLPAPERS = ['cosmos', 'matrixrain', 'lightning', 'rain', 'binarystream', 'nebula', 'circuits'];
  const CSS_ANIM_WALLPAPERS = ['aurora', 'particles', 'pulse', 'smoke', 'morphgeo'];
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
  ];

  const VIBES = [
    /* —— Dark mode —— */
    { id: 'classic', label: 'Classic', desc: 'Dark · lime CRT grid', category: 'dark',
      cos: { theme: 'dark', accent: '#c8e856', type: 'default', headingFont: 'match', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#c8e856', scanlines: true, bgPattern: 'grid', wallpaperBrightness: 55, wallpaperIntensity: 50, wallpaperUseAccent: true, glow: 100, radius: 'soft', vibe: 'classic' } },
    { id: 'matrix', label: 'Matrix', desc: 'Dark · green rain', category: 'dark',
      cos: { theme: 'dark', accent: '#33ff66', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'pixel', cursorColor: '#33ff66', scanlines: true, bgPattern: 'matrixrain', wallpaperBrightness: 50, wallpaperIntensity: 70, wallpaperAnimSpeed: 72, wallpaperUseAccent: true, glow: 140, radius: 'sharp', vibe: 'matrix' } },
    { id: 'royal', label: 'Royal', desc: 'Dark · violet cosmos', category: 'dark',
      cos: { theme: 'dark', accent: '#9d7cff', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'ring', cursorColor: '#9d7cff', scanlines: false, bgPattern: 'cosmos', wallpaperBrightness: 45, wallpaperIntensity: 35, wallpaperAnimSpeed: 38, wallpaperUseAccent: true, vignetteIntensity: 35, vignetteDirection: 'center', glow: 120, radius: 'soft', vibe: 'royal' } },
    { id: 'crimson', label: 'Crimson', desc: 'Dark · rose stars', category: 'dark',
      cos: { theme: 'dark', accent: '#e85c89', type: 'editorial', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#e85c89', scanlines: false, bgPattern: 'starfield', wallpaperBrightness: 48, wallpaperIntensity: 28, wallpaperUseAccent: true, glow: 120, radius: 'soft', vibe: 'crimson' } },
    { id: 'midnight', label: 'Midnight', desc: 'Dark · deep blue night', category: 'dark',
      cos: { theme: 'dark', accent: '#4a9eff', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'halo', cursorColor: '#4a9eff', scanlines: false, bgPattern: 'cosmos', wallpaperBrightness: 38, wallpaperIntensity: 42, wallpaperAnimSpeed: 42, wallpaperUseAccent: true, vignetteIntensity: 50, vignetteDirection: 'center', glow: 110, radius: 'soft', vibe: 'midnight' } },
    { id: 'neon', label: 'Neon', desc: 'Dark · cyan circuits', category: 'dark',
      cos: { theme: 'dark', accent: '#00e5ff', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'trail', cursorColor: '#00e5ff', scanlines: false, bgPattern: 'circuits', wallpaperBrightness: 52, wallpaperIntensity: 78, wallpaperAnimSpeed: 62, wallpaperUseAccent: true, glow: 150, radius: 'sharp', vibe: 'neon' } },
    { id: 'obsidian', label: 'Obsidian', desc: 'Dark · steel crosshatch', category: 'dark',
      cos: { theme: 'dark', accent: '#8b9cb3', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'cross', cursorColor: '#8b9cb3', scanlines: false, bgPattern: 'crosshatch', wallpaperBrightness: 28, wallpaperIntensity: 40, wallpaperUseAccent: true, glow: 70, radius: 'sharp', vibe: 'obsidian' } },
    { id: 'terminal', label: 'Terminal', desc: 'Dark · amber scanlines', category: 'dark',
      cos: { theme: 'dark', accent: '#ffb000', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'square', cursorColor: '#ffb000', scanlines: true, bgPattern: 'scan', wallpaperBrightness: 46, wallpaperIntensity: 82, wallpaperUseAccent: true, glow: 90, radius: 'sharp', vibe: 'terminal' } },
    /* —— Light mode —— */
    { id: 'lilac', label: 'Lilac', desc: 'Light · violet drift', category: 'light',
      cos: { theme: 'light', accent: '#9d7cff', type: 'default', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#9d7cff', scanlines: false, bgPattern: 'particles', wallpaperBrightness: 55, wallpaperIntensity: 30, wallpaperAnimSpeed: 48, particleDensity: 32, particleSize: 42, wallpaperUseAccent: true, glow: 90, radius: 'soft', vibe: 'lilac' } },
    { id: 'sunset', label: 'Sunset', desc: 'Light · amber pulse', category: 'light',
      cos: { theme: 'light', accent: '#ff7a3d', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#ff7a3d', scanlines: false, bgPattern: 'pulse', wallpaperBrightness: 52, wallpaperIntensity: 48, wallpaperAnimSpeed: 55, wallpaperUseAccent: true, glow: 110, radius: 'round', vibe: 'sunset' } },
    { id: 'solar', label: 'Solar', desc: 'Light · gold diagonal', category: 'light',
      cos: { theme: 'light', accent: '#ffd25a', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#ffd25a', scanlines: false, bgPattern: 'diagonal', wallpaperBrightness: 50, wallpaperIntensity: 38, wallpaperUseAccent: true, glow: 90, radius: 'soft', vibe: 'solar' } },
    { id: 'mono', label: 'Mono', desc: 'Light · slate flat', category: 'light',
      cos: { theme: 'light', accent: '#7a9eff', type: 'default', headingFont: 'mono', tracking: 'normal', cursorStyle: 'cross', cursorColor: '#7a9eff', scanlines: false, bgPattern: 'none', wallpaperBrightness: 50, wallpaperIntensity: 50, wallpaperUseAccent: true, glow: 60, radius: 'sharp', vibe: 'mono' } },
    { id: 'parchment', label: 'Parchment', desc: 'Light · warm brick', category: 'light',
      cos: { theme: 'light', accent: '#c4a574', type: 'default', headingFont: 'serif', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#c4a574', scanlines: false, bgPattern: 'brick', wallpaperBrightness: 32, wallpaperIntensity: 42, wallpaperUseAccent: true, glow: 75, radius: 'soft', vibe: 'parchment' } },
    { id: 'mint', label: 'Mint', desc: 'Light · fresh waves', category: 'light',
      cos: { theme: 'light', accent: '#3dd68c', type: 'rounded', headingFont: 'rounded', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#3dd68c', scanlines: false, bgPattern: 'waves', wallpaperBrightness: 48, wallpaperIntensity: 44, wallpaperUseAccent: true, glow: 95, radius: 'round', vibe: 'mint' } },
    { id: 'blush', label: 'Blush', desc: 'Light · soft pink dots', category: 'light',
      cos: { theme: 'light', accent: '#f472b6', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'outline', cursorColor: '#f472b6', scanlines: false, bgPattern: 'dots', wallpaperBrightness: 52, wallpaperIntensity: 36, wallpaperUseAccent: true, glow: 100, radius: 'round', vibe: 'blush' } },
    { id: 'sky', label: 'Sky', desc: 'Light · airy pulse', category: 'light',
      cos: { theme: 'light', accent: '#38bdf8', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'halo', cursorColor: '#38bdf8', scanlines: false, bgPattern: 'pulse', wallpaperBrightness: 42, wallpaperIntensity: 35, wallpaperAnimSpeed: 45, wallpaperUseAccent: true, glow: 85, radius: 'soft', vibe: 'sky' } },
    /* —— Retro & CRT —— */
    { id: 'arcade', label: 'Arcade', desc: 'Retro · neon hex', category: 'retro',
      cos: { theme: 'dark', accent: '#ff6b9d', type: 'retro', headingFont: 'retro', tracking: 'wide', cursorStyle: 'pixel', cursorColor: '#ff6b9d', scanlines: true, bgPattern: 'hex', wallpaperBrightness: 58, wallpaperIntensity: 68, wallpaperUseAccent: true, glow: 130, radius: 'sharp', vibe: 'arcade' } },
    { id: 'vhs', label: 'VHS', desc: 'Retro · magenta noise', category: 'retro',
      cos: { theme: 'dark', accent: '#d946ef', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'beam', cursorColor: '#d946ef', scanlines: true, bgPattern: 'noise', wallpaperBrightness: 40, wallpaperIntensity: 62, wallpaperUseAccent: true, vignetteIntensity: 45, vignetteDirection: 'all', glow: 115, radius: 'soft', vibe: 'vhs' } },
    /* —— Bold & experimental —— */
    { id: 'synthwave', label: 'Synthwave', desc: 'Bold · aurora waves', category: 'bold',
      cos: { theme: 'dark', accent: '#b967ff', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'trail', cursorColor: '#ff71ce', scanlines: false, bgPattern: 'aurora', wallpaperBrightness: 58, wallpaperIntensity: 50, wallpaperAnimSpeed: 50, wallpaperUseAccent: false, wallpaperColor: '#ff71ce', vignetteIntensity: 40, vignetteDirection: 'center', glow: 160, radius: 'round', vibe: 'synthwave' } },
    { id: 'ink', label: 'Ink', desc: 'Bold · high contrast', category: 'bold',
      cos: { theme: 'light', accent: '#1a1c14', type: 'slab', headingFont: 'slab', tracking: 'tight', cursorStyle: 'bold', cursorColor: '#1a1c14', scanlines: false, bgPattern: 'crosshatch', wallpaperBrightness: 22, wallpaperIntensity: 48, wallpaperUseAccent: true, glow: 50, radius: 'sharp', vibe: 'ink' } },
    /* —— Animated wallpaper presets —— */
    { id: 'northern', label: 'Northern', desc: 'Dark · aurora lights', category: 'bold',
      cos: { theme: 'dark', accent: '#34d399', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'halo', cursorColor: '#6ee7b7', scanlines: false, bgPattern: 'aurora', wallpaperBrightness: 55, wallpaperIntensity: 45, wallpaperAnimSpeed: 38, wallpaperUseAccent: false, wallpaperColor: '#34d399', vignetteIntensity: 30, vignetteDirection: 'bottom', glow: 130, radius: 'round', vibe: 'northern' } },
    { id: 'eclipse', label: 'Eclipse', desc: 'Dark · moon & comets', category: 'bold',
      cos: { theme: 'dark', accent: '#fbbf24', type: 'editorial', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#fde68a', scanlines: false, bgPattern: 'cosmos', wallpaperBrightness: 42, wallpaperIntensity: 38, wallpaperAnimSpeed: 35, wallpaperUseAccent: true, vignetteIntensity: 55, vignetteDirection: 'center', glow: 105, radius: 'soft', vibe: 'eclipse' } },
    { id: 'digital', label: 'Digital', desc: 'Dark · code rain', category: 'bold',
      cos: { theme: 'dark', accent: '#22c55e', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'beam', cursorColor: '#4ade80', scanlines: true, bgPattern: 'matrixrain', wallpaperBrightness: 48, wallpaperIntensity: 65, wallpaperAnimSpeed: 78, wallpaperUseAccent: true, glow: 95, radius: 'sharp', vibe: 'digital' } },
    { id: 'drift', label: 'Drift', desc: 'Light · floating motes', category: 'light',
      cos: { theme: 'light', accent: '#a78bfa', type: 'rounded', headingFont: 'rounded', tracking: 'normal', cursorStyle: 'outline', cursorColor: '#8b5cf6', scanlines: false, bgPattern: 'particles', wallpaperBrightness: 50, wallpaperIntensity: 28, wallpaperAnimSpeed: 42, particleDensity: 30, particleSize: 40, wallpaperUseAccent: true, glow: 88, radius: 'round', vibe: 'drift' } },
    { id: 'breathe', label: 'Breathe', desc: 'Light · soft pulse', category: 'light',
      cos: { theme: 'light', accent: '#fb7185', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'dot', cursorColor: '#fda4af', scanlines: false, bgPattern: 'pulse', wallpaperBrightness: 46, wallpaperIntensity: 32, wallpaperAnimSpeed: 28, wallpaperUseAccent: true, glow: 92, radius: 'round', vibe: 'breathe' } },
    { id: 'deepsea', label: 'Deep sea', desc: 'Dark · bioluminescent', category: 'dark',
      cos: { theme: 'dark', accent: '#06b6d4', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'trail', cursorColor: '#67e8f9', scanlines: false, bgPattern: 'particles', wallpaperBrightness: 44, wallpaperIntensity: 32, wallpaperAnimSpeed: 52, particleDensity: 38, particleSize: 48, wallpaperUseAccent: true, vignetteIntensity: 38, vignetteDirection: 'bottom', glow: 125, radius: 'soft', vibe: 'deepsea' } },
    { id: 'storm', label: 'Storm', desc: 'Dark · electric sky', category: 'dark',
      cos: { theme: 'dark', accent: '#60a5fa', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'halo', cursorColor: '#93c5fd', scanlines: false, bgPattern: 'lightning', wallpaperBrightness: 52, wallpaperIntensity: 55, wallpaperAnimSpeed: 62, wallpaperUseAccent: true, vignetteIntensity: 48, vignetteDirection: 'top', glow: 135, radius: 'soft', vibe: 'storm' } },
    { id: 'abyss', label: 'Abyss', desc: 'Dark · cosmic nebula', category: 'dark',
      cos: { theme: 'dark', accent: '#818cf8', type: 'editorial', headingFont: 'display', tracking: 'wide', cursorStyle: 'ring', cursorColor: '#a5b4fc', scanlines: false, bgPattern: 'nebula', wallpaperBrightness: 46, wallpaperIntensity: 42, wallpaperAnimSpeed: 32, wallpaperUseAccent: false, wallpaperColor: '#6366f1', vignetteIntensity: 52, vignetteDirection: 'center', glow: 118, radius: 'round', vibe: 'abyss' } },
    { id: 'void', label: 'Void', desc: 'Dark · drifting smoke', category: 'dark',
      cos: { theme: 'dark', accent: '#94a3b8', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'cross', cursorColor: '#cbd5e1', scanlines: false, bgPattern: 'smoke', wallpaperBrightness: 38, wallpaperIntensity: 48, wallpaperAnimSpeed: 28, wallpaperUseAccent: true, vignetteIntensity: 42, vignetteDirection: 'all', glow: 72, radius: 'sharp', vibe: 'void' } },
    { id: 'drizzle', label: 'Drizzle', desc: 'Light · soft rainfall', category: 'light',
      cos: { theme: 'light', accent: '#64748b', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#94a3b8', scanlines: false, bgPattern: 'rain', wallpaperBrightness: 36, wallpaperIntensity: 44, wallpaperAnimSpeed: 48, wallpaperUseAccent: true, glow: 78, radius: 'soft', vibe: 'drizzle' } },
    { id: 'cream', label: 'Cream', desc: 'Light · morphing shapes', category: 'light',
      cos: { theme: 'light', accent: '#d97706', type: 'rounded', headingFont: 'rounded', tracking: 'normal', cursorStyle: 'outline', cursorColor: '#f59e0b', scanlines: false, bgPattern: 'morphgeo', wallpaperBrightness: 44, wallpaperIntensity: 38, wallpaperAnimSpeed: 40, wallpaperUseAccent: true, glow: 86, radius: 'round', vibe: 'cream' } },
    { id: 'phosphor', label: 'Phosphor', desc: 'Retro · green data stream', category: 'retro',
      cos: { theme: 'dark', accent: '#39ff14', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'beam', cursorColor: '#39ff14', scanlines: true, bgPattern: 'binarystream', wallpaperBrightness: 50, wallpaperIntensity: 62, wallpaperAnimSpeed: 68, wallpaperUseAccent: true, glow: 125, radius: 'sharp', vibe: 'phosphor' } },
    { id: 'tube', label: 'Tube', desc: 'Retro · CRT amber haze', category: 'retro',
      cos: { theme: 'dark', accent: '#f59e0b', type: 'retro', headingFont: 'retro', tracking: 'wide', cursorStyle: 'square', cursorColor: '#fbbf24', scanlines: true, bgPattern: 'smoke', wallpaperBrightness: 42, wallpaperIntensity: 52, wallpaperAnimSpeed: 35, wallpaperUseAccent: false, wallpaperColor: '#f59e0b', vignetteIntensity: 38, vignetteDirection: 'horizontal', glow: 105, radius: 'sharp', vibe: 'tube' } },
    { id: 'volta', label: 'Volta', desc: 'Bold · crackling energy', category: 'bold',
      cos: { theme: 'dark', accent: '#facc15', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'trail', cursorColor: '#fef08a', scanlines: false, bgPattern: 'lightning', wallpaperBrightness: 58, wallpaperIntensity: 72, wallpaperAnimSpeed: 78, wallpaperUseAccent: false, wallpaperColor: '#eab308', vignetteIntensity: 35, vignetteDirection: 'center', glow: 155, radius: 'round', vibe: 'volta' } },
    { id: 'helix', label: 'Helix', desc: 'Bold · morphing geometry', category: 'bold',
      cos: { theme: 'dark', accent: '#ec4899', type: 'modern', headingFont: 'display', tracking: 'wide', cursorStyle: 'diamond', cursorColor: '#f472b6', scanlines: false, bgPattern: 'morphgeo', wallpaperBrightness: 54, wallpaperIntensity: 58, wallpaperAnimSpeed: 55, wallpaperUseAccent: false, wallpaperColor: '#a855f7', vignetteIntensity: 32, vignetteDirection: 'center', glow: 148, radius: 'round', vibe: 'helix' } },
    { id: 'cipher', label: 'Cipher', desc: 'Bold · scrolling binary', category: 'bold',
      cos: { theme: 'dark', accent: '#14b8a6', type: 'mono', headingFont: 'mono', tracking: 'tight', cursorStyle: 'beam', cursorColor: '#2dd4bf', scanlines: true, bgPattern: 'binarystream', wallpaperBrightness: 46, wallpaperIntensity: 70, wallpaperAnimSpeed: 82, wallpaperUseAccent: true, glow: 112, radius: 'sharp', vibe: 'cipher' } },
  ];

  const CUSTOM_VIBE_IDS = ['custom-1', 'custom-2', 'custom-3', 'custom-4', 'custom-5', 'custom-6'];
  const CUSTOM_VIBE_SLOT_COUNT = CUSTOM_VIBE_IDS.length;
  const COSMETIC_SNAPSHOT_KEYS = [
    'theme', 'accent', 'accentTone', 'type', 'fontScale', 'headingFont', 'tracking',
    'scanlines', 'cursorStyle', 'cursorColor', 'botIcon', 'botIconColor',
    'bgPattern', 'wallpaperBrightness', 'wallpaperIntensity', 'wallpaperAnimSpeed', 'wallpaperRandomness',
    'wallpaperUseAccent', 'wallpaperColor', 'vignetteIntensity', 'vignetteDirection',
    'rainDirection', 'starSize', 'cometDensity', 'cometDirection',
    'particleSize', 'particleDensity', 'particleOpacity', 'particleDrift', 'morphStyle', 'numberFormat', 'binaryFontSize',
    'glow', 'radius',
  ];

  function createDefaultCustomVibes() {
    return CUSTOM_VIBE_IDS.map((id, i) => ({
      id,
      name: '',
      label: 'Custom vibe ' + (i + 1),
      cos: null,
    }));
  }

  /* Heal cosmetics.customVibes on load — legacy drafts, sparse arrays, null slots. */
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

  function coerceCustomVibes(value) {
    return CUSTOM_VIBE_IDS.map((id, i) => normalizeCustomVibeSlot(
      Array.isArray(value) ? value[i] : undefined,
      id,
      'Custom vibe ' + (i + 1),
    ));
  }

  /* Merge missing cosmetics scalars + heal custom vibe slots (admin draft load). */
  function normalizeCosmetics(cos, defaultCos) {
    const def = defaultCos && typeof defaultCos === 'object' ? defaultCos : {};
    const c = cos && typeof cos === 'object' && !Array.isArray(cos) ? { ...cos } : {};
    c.customVibes = coerceCustomVibes(c.customVibes);
    for (const k of Object.keys(def)) {
      if (k === 'customVibes') continue;
      if (c[k] === undefined) c[k] = def[k];
    }
    if (typeof c.vibe !== 'string' || (!getVibe(c.vibe) && !isCustomVibeId(c.vibe))) {
      c.vibe = typeof def.vibe === 'string' ? def.vibe : 'classic';
    }
    return c;
  }

  function isCustomVibeId(id) {
    return CUSTOM_VIBE_IDS.includes(id);
  }

  function getCustomVibe(id, customVibes) {
    if (!isCustomVibeId(id)) return null;
    const slots = Array.isArray(customVibes) ? customVibes : [];
    return slots.find((s) => s && s.id === id) || { id, name: '', label: 'Custom vibe ' + id.replace('custom-', ''), cos: null };
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
    return { ...c, ...slot.cos, vibe: c.vibe, customVibes: c.customVibes };
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
    if (!Array.isArray(value)) return { error: 'invalid-cosmetics', message: 'cosmetics.customVibes must be an array of ' + CUSTOM_VIBE_SLOT_COUNT + ' slots' };
    if (value.length !== CUSTOM_VIBE_SLOT_COUNT) return { error: 'invalid-cosmetics', message: 'cosmetics.customVibes must contain exactly ' + CUSTOM_VIBE_SLOT_COUNT + ' slots' };
    for (let i = 0; i < value.length; i++) {
      const slot = value[i];
      if (!slot || typeof slot !== 'object') return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}] must be an object` };
      if (slot.id !== CUSTOM_VIBE_IDS[i]) return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].id must be "${CUSTOM_VIBE_IDS[i]}"` };
      if (typeof slot.label !== 'string') return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].label must be a string` };
      if (slot.name != null && typeof slot.name !== 'string') return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].name must be a string` };
      if (slot.cos != null) {
        if (typeof slot.cos !== 'object' || Array.isArray(slot.cos)) return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].cos must be an object or null` };
        for (const k of Object.keys(slot.cos)) {
          if (!COSMETIC_SNAPSHOT_KEYS.includes(k)) return { error: 'invalid-cosmetics', message: `cosmetics.customVibes[${i}].cos.${k} is not a valid cosmetic field` };
          const err = validateCosmeticsWrite('cosmetics.' + k, slot.cos[k]);
          if (err) return err;
        }
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
          return { error: 'unknown-vibe', message: `Unknown vibe id: ${value}. Use applyVibePreset for built-in presets or custom-1..custom-6.` };
        }
        break;
      case 'customVibes':
        return validateCustomVibes(value);
      case 'rainDirection':
        if (!RAIN_DIRECTIONS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.rainDirection must be one of: ${RAIN_DIRECTIONS.join(', ')}` };
        break;
      case 'cometDirection':
        if (!COMET_DIRECTIONS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.cometDirection must be one of: ${COMET_DIRECTIONS.join(', ')}` };
        break;
      case 'particleDrift':
        if (!PARTICLE_DRIFT_DIRECTIONS.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.particleDrift must be one of: ${PARTICLE_DRIFT_DIRECTIONS.join(', ')}` };
        break;
      case 'morphStyle':
        if (!MORPH_STYLES.includes(value)) return { error: 'invalid-cosmetics', message: `cosmetics.morphStyle must be one of: ${MORPH_STYLES.join(', ')}` };
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
      case 'vignetteIntensity':
      case 'glow': {
        const ranges = {
          accentTone: [0, 100], fontScale: [85, 120], wallpaperBrightness: [0, 100], wallpaperIntensity: [0, 100],
          wallpaperAnimSpeed: [0, 100], wallpaperRandomness: [0, 100], starSize: [0, 100], cometDensity: [0, 100],
          particleSize: [0, 100], particleDensity: [0, 100], particleOpacity: [0, 100], binaryFontSize: [0, 100],
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
      case 'scanlines':
        if (typeof value !== 'boolean') return { error: 'invalid-cosmetics', message: `cosmetics.${field} must be a boolean` };
        break;
      default:
        break;
    }
    return null;
  }

  /* Resolve active cosmetics — merges custom-1..6 slot snapshot when cosmetics.vibe is custom. */
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
        : k === 'cometDirection' ? 'right-down'
        : k === 'particleDrift' ? 'up'
        : k === 'morphStyle' ? 'spin'
        : k === 'numberFormat' ? 'binary'
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
      'bgPattern (grid|dots|scan|starfield|crosshatch|hex|circuits|waves|diagonal|brick|noise|aurora|cosmos|matrixrain|particles|pulse|lightning|rain|smoke|binarystream|nebula|morphgeo|none)',
      'wallpaperBrightness (0–100 opacity) · wallpaperIntensity (0–100 pattern density) · wallpaperAnimSpeed · wallpaperRandomness (0=deterministic/uniform sliders · 100=chaos overrides direction/speed/phase per element) · wallpaperUseAccent · wallpaperColor',
      'Per-pattern: rainDirection (down|diagonal-left|diagonal-right|left|right) · starSize · cometDensity · cometDirection · particleSize · particleDensity · particleOpacity · particleDrift (up|down|diagonal-up|diagonal-down|left|right) · morphStyle (spin|pulse|warp|orbit) · numberFormat (binary|octal|decimal|hex) · binaryFontSize',
      'vignetteIntensity (0=off) · vignetteDirection · glow · radius · scanlines · cursorStyle · cursorColor',
      'botIcon · botIconColor · vibe (built-in preset id or custom-1..custom-6) · customVibes (6 saved slots). Prefer applyVibePreset / applyCustomVibe / saveCustomVibe.',
      'Animated patterns: circuits · aurora · cosmos · matrixrain · particles · pulse · lightning · rain · smoke · binarystream · nebula · morphgeo.',
    ].join(' ');
  }
  function resolveWallpaperCosmetics(cos) {
    const c = cos && typeof cos === 'object' ? cos : {};
    const pattern = BG_PATTERNS.includes(c.bgPattern) ? c.bgPattern : 'grid';
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
    const rainDirection = RAIN_DIRECTIONS.includes(c.rainDirection) ? c.rainDirection : 'down';
    const cometDirection = COMET_DIRECTIONS.includes(c.cometDirection) ? c.cometDirection : 'right-down';
    const morphStyle = MORPH_STYLES.includes(c.morphStyle) ? c.morphStyle : 'spin';
    const numberFormat = NUMBER_FORMATS.includes(c.numberFormat) ? c.numberFormat : 'binary';
    const rand = randomness / 100;
    const i = intense / 100;
    const liCurve = i * (0.35 + i * 0.65);
    const pDensity = pattern === 'particles' ? particleDensity / 100 : i;
    const opacity = 0.15 + (bright / 100) * 0.85;
    const size = Math.round(56 - i * 44);
    const fieldSize = pattern === 'starfield'
      ? Math.round(520 + (1 - i) * 480)
      : Math.round(480 - i * 360);
    // Higher animSpeed → shorter duration (faster motion). 0≈60s · 50≈18s · 100≈1.5s.
    const speedSec = Math.max(1.5, Math.round(60 - (animSpeed / 100) * 58.5));
    const speedMult = 20 / speedSec;
    const starScale = 0.55 + (starSize / 100) * 1.45;
    const cometFreq = 0.35 + (cometDensity / 100) * 0.85;
    const morphVariant = morphStyle === 'spin' ? 0 : morphStyle === 'pulse' ? 1 : morphStyle === 'warp' ? 2 : 3;
    const morphVariantAfter = Math.round(chaosLerp(morphVariant, (morphVariant + 2) % 4, randomness));
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
      morphVariant,
      morphVariantAfter,
      morphStyle,
      morphPhase: randPhaseA + 'deg',
      starCount: Math.round(24 + i * 72),
      starScale,
      cometInterval: Math.max(2.5, Math.round(16 - cometFreq * 12)),
      cometIntervalVar: rand * 0.85,
      cometDirection,
      cometVecX: cometVecNorm.vx,
      cometVecY: cometVecNorm.vy,
      particleCount: Math.min(20, Math.round(6 + pDensity * 14)),
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
      binaryRowCount: Math.round(18 + i * 34),
      numberFormat,
      numberGlyphs: numberGlyphs[numberFormat] || numberGlyphs.binary,
      binaryFontPx: Math.round(9 + (binaryFontSize / 100) * 9),
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
  function applyWallpaperVarsToRoot(root, cos, tonedAccent) {
    if (!root) return;
    const c = cos && typeof cos === 'object' ? cos : {};
    const useAccent = c.wallpaperUseAccent !== false;
    const wpColor = useAccent ? tonedAccent : (c.wallpaperColor || tonedAccent);
    const wp = resolveWallpaperCosmetics(c);
    root.style.setProperty('--wallpaper-color', wpColor);
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
    root.style.setProperty('--wp-rand-dur-a', wp.randDurA || wp.randDurScale);
    root.style.setProperty('--wp-rand-dur-b', wp.randDurB || wp.randDurScale);
    root.style.setProperty('--wp-rand-phase-a', (wp.randPhaseA || '0') + 'deg');
    root.style.setProperty('--wp-rand-phase-b', (wp.randPhaseB || '0') + 'deg');
    root.style.setProperty('--wp-column-count', wp.columnCount.toString());
    if (wp.morphStyle) root.dataset.morphStyle = wp.morphStyle;
    else delete root.dataset.morphStyle;
    const gridMix = root.dataset.theme === 'light' ? '32%' : '38%';
    root.style.setProperty('--grid', 'color-mix(in oklab, var(--wallpaper-color) ' + gridMix + ', transparent)');
    if (wp.animated) root.dataset.bgAnimated = 'on'; else delete root.dataset.bgAnimated;
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
      ? 0.06 + 0.62 * Math.pow(i, 0.78)
      : 0.1 + 0.9 * Math.pow(i, 0.72);
    const mid = peak * 0.5;
    const reach = Math.round(20 + 62 * i);
    const midStop = Math.round(reach * 0.42);
    const ink = light ? '255,252,245' : '0,0,0';
    const c = (a) => 'rgba(' + ink + ',' + Math.min(1, a).toFixed(3) + ')';
    switch (direction) {
      case 'center': {
        const inner = Math.round(38 - 28 * i);
        return 'radial-gradient(ellipse 88% 78% at center, transparent ' + inner + '%, ' + c(peak) + ' 100%)';
      }
      case 'all': {
        const inner = Math.round(28 - 20 * i);
        return 'radial-gradient(ellipse 100% 96% at center, transparent ' + inner + '%, ' + c(peak) + ' 100%)';
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
    const edge = Math.round(18 + 52 * i);
    const cornerReach = Math.round(55 + 45 * i);
    /* CSS mask: black = show wallpaper, transparent = hide. Same shape both themes. */
    const vis = '#000';
    switch (direction) {
      case 'center': {
        const inner = Math.round(58 - 38 * i);
        const outer = Math.round(92 - 14 * i);
        return { mask: 'radial-gradient(ellipse 85% 75% at center, ' + vis + ' ' + inner + '%, transparent ' + outer + '%)', composite: null };
      }
      case 'all': {
        const inner = Math.round(42 - 28 * i);
        const outer = Math.round(94 - 12 * i);
        return { mask: 'radial-gradient(ellipse 98% 94% at center, ' + vis + ' ' + inner + '%, transparent ' + outer + '%)', composite: null };
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
    if (mask && mask !== 'none' && intensity >= 35) {
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
    BG_PATTERNS,
    BG_PATTERN_META,
    RAIN_DIRECTIONS,
    COMET_DIRECTIONS,
    PARTICLE_DRIFT_DIRECTIONS,
    MORPH_STYLES,
    NUMBER_FORMATS,
    CANVAS_WALLPAPERS,
    CSS_ANIM_WALLPAPERS,
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
    isCustomVibeId,
    getCustomVibe,
    createDefaultCustomVibes,
    coerceCustomVibes,
    normalizeCosmetics,
    snapshotCosmetics,
    mergeCustomVibeCosmetics,
    resolveEffectiveCosmetics,
    auditCosmeticsSync,
    CUSTOM_VIBE_IDS,
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
    resolveWallpaperCosmetics,
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
