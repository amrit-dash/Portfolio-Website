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

  const VIBES = [
    { id: 'classic', label: 'Classic', cos: { theme: 'dark', accent: '#c8e856', type: 'default', headingFont: 'match', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#c8e856', scanlines: true, bgPattern: 'grid', glow: 100, radius: 'soft', vibe: 'classic' } },
    { id: 'matrix', label: 'Matrix', cos: { theme: 'dark', accent: '#33ff66', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'pixel', cursorColor: '#33ff66', scanlines: true, bgPattern: 'scan', glow: 140, radius: 'sharp', vibe: 'matrix' } },
    { id: 'royal', label: 'Royal', cos: { theme: 'dark', accent: '#9d7cff', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'ring', cursorColor: '#9d7cff', scanlines: false, bgPattern: 'starfield', glow: 120, radius: 'soft', vibe: 'royal' } },
    { id: 'crimson', label: 'Crimson', cos: { theme: 'dark', accent: '#e85c89', type: 'editorial', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#e85c89', scanlines: false, bgPattern: 'starfield', glow: 120, radius: 'soft', vibe: 'crimson' } },
    { id: 'lilac', label: 'Lilac', cos: { theme: 'light', accent: '#9d7cff', type: 'default', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#9d7cff', scanlines: false, bgPattern: 'dots', glow: 90, radius: 'soft', vibe: 'lilac' } },
    { id: 'sunset', label: 'Sunset', cos: { theme: 'light', accent: '#ff7a3d', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#ff7a3d', scanlines: false, bgPattern: 'dots', glow: 110, radius: 'round', vibe: 'sunset' } },
    { id: 'solar', label: 'Solar', cos: { theme: 'light', accent: '#ffd25a', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#ffd25a', scanlines: false, bgPattern: 'grid', glow: 90, radius: 'soft', vibe: 'solar' } },
    { id: 'mono', label: 'Mono', cos: { theme: 'light', accent: '#7a9eff', type: 'default', headingFont: 'mono', tracking: 'normal', cursorStyle: 'cross', cursorColor: '#7a9eff', scanlines: false, bgPattern: 'none', glow: 60, radius: 'sharp', vibe: 'mono' } },
  ];

  /* Agent-editable array collections (path → metadata). */
  const COLLECTIONS = {
    projects: { path: 'projects', idField: 'id' },
    expertise: { path: 'expertise', idField: 'id', renumber: 'expertise' },
    experience: { path: 'experience', idField: 'id' },
    'about.meta': { path: 'about.meta' },
    'about.impact': { path: 'about.impact' },
    'cards.items': { path: 'cards.items' },
    'contact.socials': { path: 'contact.socials' },
    'bot.qa': { path: 'bot.qa' },
    'bot.commands': { path: 'bot.commands', idField: 'id' },
  };

  /* ---------- Agent provider model (SEPARATE from the bot's config/llm) ----------
     The admin agent runs on its OWN keys, stored in config/agent.byProvider — the
     owner's billable keys for better models — never shared with the public bot.

     config/agent shape:
       { active: 'gemini',
         byProvider: { gemini: { apiKey, model }, openai: { apiKey, model }, … },
         refinerModel?: string }                                                   */

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

  function renumberExpertise(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map((e, i) => ({ ...e, num: String(i + 1).padStart(2, '0') }));
  }
  function getVibe(id) { return VIBES.find((v) => v.id === id) || null; }
  function validateExpertiseIcon(icon) { return EXPERTISE_ICONS.includes(icon); }
  function validateSocialIcon(icon) { return SOCIAL_ICONS.includes(icon); }
  function validateCollection(name) { return Reflect.get(COLLECTIONS, name) || null; }
  function providerKind(id) { return Reflect.get(PROVIDER_KIND, id) || null; }

  const exportsObj = {
    EXPERTISE_ICONS,
    SOCIAL_ICONS,
    VIBES,
    COLLECTIONS,
    PROVIDER_KIND,
    AGENT_CONFIG_DEFAULTS,
    AGENT_TOOL_MODELS,
    renumberExpertise,
    getVibe,
    validateExpertiseIcon,
    validateSocialIcon,
    validateCollection,
    providerKind,
    sanitizeSvg,
    isCustomIcon,
    svgColors,
    svgHasStroke,
    recolorSvg,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  }
  if (typeof window !== 'undefined') {
    window.SHARED_SCHEMA = exportsObj;
  }
})();
