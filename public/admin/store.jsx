/* global React */
/* =====================================================
   amrit.os ADMIN — CONTENT STORE
   -----------------------------------------------------
   Persistence layer for the dashboard. Today it is backed by
   localStorage; it is shaped so the swap to Firebase during the
   IDE migration is mechanical:

     localStorage 'amritos.draft'      →  Firestore  content/draft
     localStorage 'amritos.published'  →  Firestore  content/published
     localStorage 'amritos.preview'    →  (transient, live-preview only)
     uploaded image/PDF data-URLs      →  Firebase Storage  (store the
                                           download URL on the field instead)
     admin auth (see app.jsx)          →  Firebase Auth

   The DRAFT is what you edit. PUBLISH copies draft → published, which is
   the snapshot the live site reads (see data.jsx). This keeps work in
   progress off the live site until you choose to ship it.
   ===================================================== */

const LS = {
  draft:     'amritos.draft',
  published: 'amritos.published',
  preview:   'amritos.preview',
  analytics: 'amritos.analytics',
};

/* ---------- Default content (seed) ----------
   Data-driven sections (expertise / experience / projects / socials) are
   seeded from the live site's data.jsx via window.PORTFOLIO_DATA so the
   dashboard always opens on the real, current content. Hero / about / cards /
   bot copy live in app.jsx today, so their defaults are mirrored here. */

/* All content defaults now live in /data.jsx as window.PORTFOLIO_DEFAULTS and
   the LLM provider catalog as window.LLM_PROVIDERS — one source of truth for
   both the admin and the live site. */
const PD = (typeof window !== 'undefined' && window.PORTFOLIO_DATA) || {};
const PORTFOLIO_DEFAULTS = (typeof window !== 'undefined' && window.PORTFOLIO_DEFAULTS) || {};
const LLM_PROVIDERS = (typeof window !== 'undefined' && window.LLM_PROVIDERS) || [];

/* JSON-clone with a replacer that drops anything non-serializable (DOM nodes,
   functions, React fibers, circular refs). Without this, a single accidental
   leak of an event/element into state would poison every subsequent setAt. */
function _safe(_k, v) {
  if (v == null) return v;
  if (typeof v === 'function') return undefined;
  if (typeof v === 'object') {
    if (typeof Node !== 'undefined' && v instanceof Node) return undefined;
    if (typeof Event !== 'undefined' && v instanceof Event) return undefined;
    if (typeof Window !== 'undefined' && v instanceof Window) return undefined;
  }
  return v;
}
const clone = (x) => {
  try { return JSON.parse(JSON.stringify(x, _safe)); }
  catch (e) { console.warn('[admin] clone failed, returning input unchanged', e); return x; }
};

/* Deep-merge stored drafts onto the current defaults so newly-added fields
   (e.g. a provider added in a later release) fall through to defaults instead
   of leaving an undefined intermediate node that the deep-set blows up on.
   Arrays and primitives are replaced wholesale by the override; plain objects
   are merged key-by-key. */
const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);
function deepMerge(base, over) {
  if (!isPlain(over)) return over === undefined ? base : over;
  if (!isPlain(base)) return clone(over);
  const out = { ...base };
  for (const k of Object.keys(over)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    Reflect.set(out, k, deepMerge(Reflect.get(base, k), Reflect.get(over, k)));
  }
  return out;
}

/* buildDefaultContent: deep-copy the shared PORTFOLIO_DEFAULTS from data.jsx so
   the admin's draft is isolated from the live-site reference. */
function buildDefaultContent() {
  return clone(PORTFOLIO_DEFAULTS);
}
const DEFAULT_BOT = (PORTFOLIO_DEFAULTS && PORTFOLIO_DEFAULTS.bot) || { providers: { byProvider: {} } };

/* Normalize content shape so a corrupt draft self-heals instead of locking the
   UI. The only field where corruption has been observed in the wild is
   `bot.providers.byProvider[*].apiKey/model` — coerce them back to strings, and
   ensure every provider in the catalog has a slot. */
function normalizeContent(content) {
  if (!content || typeof content !== 'object') return content;
  const bot = content.bot;
  if (bot && bot.providers) {
    const by = bot.providers.byProvider = (bot.providers.byProvider && typeof bot.providers.byProvider === 'object') ? bot.providers.byProvider : {};
    for (const p of LLM_PROVIDERS) {
      if (p.id === '__proto__' || p.id === 'constructor' || p.id === 'prototype') continue;
      const cur = Reflect.get(by, p.id);
      const defProvider = DEFAULT_BOT.providers && DEFAULT_BOT.providers.byProvider ? Reflect.get(DEFAULT_BOT.providers.byProvider, p.id) : null;
      const fallbackModel = (defProvider || {}).model || (p.models && p.models[0]) || '';
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
        Reflect.set(by, p.id, { apiKey: typeof cur === 'string' ? cur : '', model: fallbackModel });
        continue;
      }
      Reflect.set(by, p.id, {
        apiKey: typeof cur.apiKey === 'string' ? cur.apiKey : '',
        model: typeof cur.model === 'string' && cur.model ? cur.model : fallbackModel,
      });
    }
    if (typeof bot.providers.active !== 'string' || !LLM_PROVIDERS.some((p) => p.id === bot.providers.active)) {
      bot.providers.active = LLM_PROVIDERS[0].id;
    }
  }
  return content;
}

/* ---------- Store ---------- */
const Store = {
  read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch (e) { return null; }
  },
  write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  },
  loadDraft() {
    const d = this.read(LS.draft);
    if (d) {
      const merged = normalizeContent(deepMerge(buildDefaultContent(), d));
      // Re-persist so any stale/corrupt draft on disk is healed (e.g. a bad
      // apiKey shape from an earlier build) rather than reloaded each time.
      this.write(LS.draft, merged);
      return merged;
    }
    const def = normalizeContent(buildDefaultContent());
    this.write(LS.draft, def);
    return def;
  },
  saveDraft(content) { this.write(LS.draft, content); },
  publish(content) {
    this.write(LS.published, content);
    this.clearPreview();
  },
  loadPublished() { return this.read(LS.published); },
  hasPublished() { return !!this.read(LS.published); },
  setPreview(content) { this.write(LS.preview, content); },
  clearPreview() { try { localStorage.removeItem(LS.preview); } catch (e) {} },
  resetDraft() { const def = buildDefaultContent(); this.write(LS.draft, def); return def; },

  /* analytics — aggregated live from the portfolio's event log
     (`amritos.events`, written by logEvent() in /app.jsx). Returns an empty
     skeleton when nothing has been recorded yet so the UI can say "no data"
     instead of pretending. */
  analytics() {
    let events = [];
    try { events = JSON.parse(localStorage.getItem('amritos.events') || '[]') || []; }
    catch (e) { events = []; }
    if (!Array.isArray(events)) events = [];

    const now = Date.now();
    const DAY = 86400000;
    const stat = { cvDownloads: 0, pageViews: 0, botChats: 0, projectOpens: 0 };
    const projectCounts = new Map();
    const history = new Array(14).fill(0);

    for (const ev of events) {
      if (!ev || typeof ev !== 'object') continue;
      const t = Number(ev.at) || 0;
      const type = String(ev.type || '');
      if (type === 'view') {
        stat.pageViews++;
        const daysAgo = Math.floor((now - t) / DAY);
        if (daysAgo >= 0 && daysAgo < 14) history[13 - daysAgo]++;
      } else if (type === 'cv:download') stat.cvDownloads++;
      else if (type === 'bot:chat') stat.botChats++;
      else if (type === 'project:open') {
        stat.projectOpens++;
        const meta = ev.meta || {};
        const name = meta.title || meta.id || '(unknown)';
        projectCounts.set(name, (projectCounts.get(name) || 0) + 1);
      }
    }

    const topProjects = [...projectCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, opens]) => ({ name, opens }));

    const activity = events.slice(-12).reverse().map((ev) => {
      const type = String(ev.type || '');
      const meta = ev.meta || {};
      let what = type;
      if (type === 'view') what = 'Page view';
      else if (type === 'cv:download') what = 'CV downloaded' + (meta && (meta === 'dark' || meta === 'light' || meta.variant) ? ' (' + (meta.variant || meta) + ')' : '');
      else if (type === 'bot:chat') what = 'amrit-bot chat';
      else if (type === 'project:open') what = 'Opened project · ' + (meta.title || meta.id || '');
      return { when: fmtRelative(now - (Number(ev.at) || 0)), what, who: 'visitor' };
    });

    return { ...stat, history, topProjects, activity, totalEvents: events.length };
  },

  /* Clear the captured analytics log — used by the Overview "reset" affordance. */
  resetAnalytics() {
    try { localStorage.removeItem('amritos.events'); } catch (e) {}
  },

  /* ---------- Firestore sync (live, cross-device) ----------
     Available only when Firebase is loaded AND the owner is signed in (rules
     enforce owner-only writes). localStorage stays the offline cache + instant
     first paint; Firestore is the durable, cross-device source of truth. */
  fsReady() { return !!(window.fb && window.fb.db && window.fb.auth && window.fb.auth.currentUser); },

  /* ---------- Firestore analytics reads (owner-only) ---------- */
  fsStatsListen(cb) {
    if (!this.fsReady()) return null;
    return window.fb.db.doc('stats/global').onSnapshot((s) => cb(s.exists ? s.data() : {}), (e) => console.warn('[stats]', e && e.message));
  },
  fsEventsListen(cb, n) {
    if (!this.fsReady()) return null;
    return window.fb.db.collection('events').orderBy('at', 'desc').limit(n || 25).onSnapshot(
      (snap) => cb(snap.docs.map((d) => d.data())), (e) => console.warn('[events]', e && e.message));
  },
  async fsDailyRange(days) {
    if (!this.fsReady()) return [];
    const ids = [];
    const now = new Date();
    for (let i = 0; i < days; i++) { const dt = new Date(now); dt.setDate(now.getDate() - i); ids.push(dt.toISOString().slice(0, 10)); }
    const docs = await Promise.all(ids.map((id) =>
      window.fb.db.doc('stats_daily/' + id).get().then((s) => (s.exists ? { id, ...s.data() } : { id })).catch(() => ({ id }))));
    return docs.reverse(); // chronological
  },
  async fsBotQuestions(n) {
    if (!this.fsReady()) return [];
    try {
      const snap = await window.fb.db.collection('bot_questions').orderBy('at', 'desc').limit(n || 100).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('[botq]', e && e.message); return []; }
  },
  async fsDeleteBotQuestion(id) {
    if (!this.fsReady()) return;
    try { await window.fb.db.collection('bot_questions').doc(id).delete(); } catch (e) {}
  },
  async fsClearStats() {
    if (!this.fsReady()) return false;
    try {
      const tok = await window.fb.auth.currentUser.getIdToken();
      const r = await fetch(window.FUNCTIONS_BASE + '/clearStats', { method: 'POST', headers: { Authorization: 'Bearer ' + tok } });
      return r.ok;
    } catch (e) { return false; }
  },

  /* ---------- Operational settings (config/settings, owner-only) ---------- */
  async fsLoadSettings() {
    const defaults = { botRatePerHour: 30, trackRatePerHour: 120, eventRetentionDays: 30 };
    if (!this.fsReady()) return defaults;
    try { const s = await window.fb.db.doc('config/settings').get(); return { ...defaults, ...(s.exists ? s.data() : {}) }; }
    catch (e) { return defaults; }
  },
  async fsSaveSettings(settings) {
    if (!this.fsReady()) return false;
    try { await window.fb.db.doc('config/settings').set({ ...settings, updatedAt: window.fb.serverTimestamp() }, { merge: true }); return true; }
    catch (e) { console.warn('[store] fsSaveSettings failed', e && e.message); return false; }
  },
  /* ---------- Console theme (config/console, owner-only) ----------
     The admin console's own mode + accent, stored per-owner so the look
     follows across sessions and devices. Distinct from the portfolio's
     published cosmetics. */
  async fsLoadConsole() {
    if (!this.fsReady()) return null;
    try { const s = await window.fb.db.doc('config/console').get(); return s.exists ? s.data() : null; }
    catch (e) { return null; }
  },
  async fsSaveConsole(theme, accent) {
    if (!this.fsReady()) return false;
    try { await window.fb.db.doc('config/console').set({ theme, accent, updatedAt: window.fb.serverTimestamp() }, { merge: true }); return true; }
    catch (e) { console.warn('[store] fsSaveConsole failed', e && e.message); return false; }
  },
  async fsLoadDraft() {
    if (!this.fsReady()) return null;
    try {
      const snap = await window.fb.db.doc('content/draft').get();
      return snap.exists ? (snap.data().content || null) : null;
    } catch (e) { console.warn('[store] fsLoadDraft failed', e && e.message); return null; }
  },
  async fsSaveDraft(content) {
    if (!this.fsReady()) return;
    try { await window.fb.db.doc('content/draft').set({ content, updatedAt: window.fb.serverTimestamp() }); }
    catch (e) { console.warn('[store] fsSaveDraft failed', e && e.message); }
  },
  // Deep-clone content with every LLM apiKey blanked — for the PUBLIC published
  // doc, which must never carry a secret.
  stripKeys(content) {
    const c = JSON.parse(JSON.stringify(content || {}));
    try {
      const by = c.bot.providers.byProvider;
      for (const id in by) {
        if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
        const item = Reflect.get(by, id);
        if (item) item.apiKey = '';
      }
    } catch (e) { /* no providers */ }
    return c;
  },
  // Write the bot runtime config (incl. keys) to the PRIVATE config/llm doc that
  // only the proxy reads. This is what activates a key for the live bot.
  async fsSaveLLMConfig(content) {
    if (!this.fsReady()) return false;
    try {
      const bot = (content && content.bot) || {};
      const prov = bot.providers || {};
      const beh = bot.behavior || {};
      await window.fb.db.doc('config/llm').set({
        active: prov.active || 'gemini',
        byProvider: prov.byProvider || {},
        systemPrompt: bot.systemPrompt || '',
        temperature: typeof beh.temperature === 'number' ? beh.temperature : 0.7,
        maxTokens: typeof beh.maxTokens === 'number' ? beh.maxTokens : 300,
        updatedAt: window.fb.serverTimestamp(),
      });
      return true;
    } catch (e) { console.warn('[store] fsSaveLLMConfig failed', e && e.message); return false; }
  },
  async fsLoadPublished() {
    if (!this.fsReady()) return null;
    try { const s = await window.fb.db.doc('content/published').get(); return s.exists ? (s.data().content || s.data()) : null; }
    catch (e) { return null; }
  },
  async fsPublish(content) {
    if (!this.fsReady()) return;
    try {
      await this.fsSaveLLMConfig(content);                       // keys → private config/llm
      const safe = this.stripKeys(content);                      // public copy carries NO keys
      await window.fb.db.doc('content/published').set({ content: safe, updatedAt: window.fb.serverTimestamp() });
      // Draft is owner-only readable, so it keeps the keys for continued editing.
      await window.fb.db.doc('content/draft').set({ content, updatedAt: window.fb.serverTimestamp() });
    } catch (e) { console.warn('[store] fsPublish failed', e && e.message); }
  },
};

function fmtRelative(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'd ago';
  return new Date(Date.now() - ms).toLocaleDateString();
}

/* ---------- React hook ----------
   Single source of truth for the editing session. `update(path, value)` does
   an immutable set on a dot/array path, marks the draft dirty, and autosaves. */
function useContent() {
  const [content, setContent] = React.useState(() => Store.loadDraft());
  const [dirty, setDirty] = React.useState(false);
  const [publishedAt, setPublishedAt] = React.useState(() => Store.read('amritos.publishedAt'));
  const [synced, setSynced] = React.useState(false); // true once Firestore draft adopted/seeded
  const draftTimer = React.useRef(null);

  // When the owner signs in, adopt the Firestore draft (or seed it from the
  // current local content if none exists). After this, Firestore is the source
  // of truth and localStorage trails as a cache.
  React.useEffect(() => {
    if (!window.fb || !window.fb.auth) return;
    const unsub = window.fb.auth.onAuthStateChanged(async (u) => {
      if (!u) { setSynced(false); return; }
      const remote = await Store.fsLoadDraft();
      if (remote) {
        const merged = normalizeContent(deepMerge(buildDefaultContent(), remote));
        Store.saveDraft(merged);
        setContent(merged);
      } else {
        // No remote draft yet — seed it from whatever we have locally.
        setContent((cur) => { Store.fsSaveDraft(cur); return cur; });
      }
      setSynced(true);
    });
    return () => unsub();
  }, []);

  // Debounced Firestore draft write (1s after the last edit) to avoid a write
  // per keystroke while still keeping the cross-device draft current.
  const scheduleDraftSync = React.useCallback((next) => {
    if (!Store.fsReady()) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => { Store.fsSaveDraft(next); }, 1000);
  }, []);

  const setAt = React.useCallback((path, value) => {
    let computed;
    setContent((prev) => {
      const keys = Array.isArray(path) ? path : String(path).split('.');
      // Path-only immutable update: only the spine to the edited leaf is copied;
      // sibling branches keep their identity. Avoids deep-cloning the whole tree
      // on every keystroke (huge for autosave perf) and prevents a stray
      // non-serializable value anywhere else in state from breaking edits.
      const copyIn = (node, depth) => {
        if (depth === keys.length) return value;
        const k = keys[depth];
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return node;
        const child = node && typeof node === 'object' && !Array.isArray(node) ? Reflect.get(node, k) : undefined;
        const base = node && typeof node === 'object' && !Array.isArray(node) ? { ...node } : {};
        Reflect.set(base, k, copyIn(child, depth + 1));
        return base;
      };
      const next = copyIn(prev, 0);
      Store.saveDraft(next);
      computed = next;
      return next;
    });
    setDirty(true);
    if (computed) scheduleDraftSync(computed);
  }, [scheduleDraftSync]);

  const replace = React.useCallback((next) => {
    setContent(next); Store.saveDraft(next); setDirty(true); scheduleDraftSync(next);
  }, [scheduleDraftSync]);

  const publish = React.useCallback(() => {
    setContent((cur) => { Store.publish(cur); Store.fsPublish(cur); return cur; });
    const ts = new Date().toISOString();
    Store.write('amritos.publishedAt', ts);
    setPublishedAt(ts);
    setDirty(false);
  }, []);

  const reset = React.useCallback(() => {
    const def = Store.resetDraft();
    setContent(def); setDirty(true); scheduleDraftSync(def);
  }, [scheduleDraftSync]);

  // Discard the draft and revert to the last PUBLISHED version (the live site),
  // dropping all unpublished edits. Prefers the cloud-published snapshot, falls
  // back to the local copy, then to defaults. Leaves the draft == published, so
  // the console returns to a clean (non-dirty) state.
  const discardDraft = React.useCallback(async () => {
    let pub = Store.loadPublished();
    if (!pub) { try { pub = await Store.fsLoadPublished(); } catch (e) {} }
    const base = normalizeContent(deepMerge(buildDefaultContent(), pub || {}));
    setContent(base);
    Store.saveDraft(base);
    Store.fsSaveDraft(base);
    Store.clearPreview();
    setDirty(false);
    return true;
  }, []);

  const previewDraft = React.useCallback(() => {
    setContent((cur) => { Store.setPreview(cur); return cur; });
  }, []);

  // Activate the bot/key config for the live proxy without a full publish —
  // writes the private config/llm doc. Accepts an explicit content snapshot
  // (used by the Providers tab to avoid a stale-state race). Returns success.
  const saveLLMConfig = React.useCallback((explicit) => {
    return new Promise((resolve) => {
      if (explicit) { Store.fsSaveLLMConfig(explicit).then(resolve); return; }
      setContent((cur) => { Store.fsSaveLLMConfig(cur).then(resolve); return cur; });
    });
  }, []);

  return { content, setAt, replace, publish, reset, discardDraft, previewDraft, dirty, publishedAt, setDirty, synced, saveLLMConfig };
}

/* ---------- Analytics hook (real-time, Firestore-backed) ----------
   Subscribes to the global counters + recent-events feed and loads the per-day
   buckets for the last 30 days. Re-attaches when the owner signs in. Returns a
   shape compatible with the existing Overview plus richer data for the
   dedicated Analytics page. */
function useAnalytics() {
  const [counters, setCounters] = React.useState(null);
  const [recent, setRecent] = React.useState([]);
  const [daily, setDaily] = React.useState([]);

  React.useEffect(() => {
    if (!window.fb || !window.fb.auth) return;
    let u1 = null, u2 = null;
    const unsubAuth = window.fb.auth.onAuthStateChanged(async (u) => {
      if (u1) u1(); if (u2) u2(); u1 = u2 = null;
      if (u) {
        u1 = Store.fsStatsListen(setCounters);
        u2 = Store.fsEventsListen(setRecent, 150); // full feed for the Analytics page; Overview slices to 5
        try { setDaily(await Store.fsDailyRange(30)); } catch (e) {}
      } else { setCounters(null); setRecent([]); setDaily([]); }
    });
    return () => { if (u1) u1(); if (u2) u2(); unsubAuth(); };
  }, []);

  const refreshDaily = React.useCallback(async () => {
    try { setDaily(await Store.fsDailyRange(30)); } catch (e) {}
  }, []);

  const c = counters || {};
  const history = daily.slice(-14).map((d) => d.views || 0);
  const projAgg = {};
  daily.forEach((d) => {
    const bp = d.byProject || {};
    for (const k in bp) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      Reflect.set(projAgg, k, (Reflect.get(projAgg, k) || 0) + Reflect.get(bp, k));
    }
  });
  const topProjects = Object.entries(projAgg).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, opens]) => ({ name, opens }));
  const evMs = (ev) => (ev.at && ev.at.toMillis ? ev.at.toMillis() : (ev.at && ev.at.seconds ? ev.at.seconds * 1000 : Date.now()));
  const activity = recent.map((ev) => {
    const meta = ev.meta || {};
    let what = ev.type;
    if (ev.type === 'view') what = 'Page view';
    else if (ev.type === 'cv:download') what = 'CV downloaded' + (meta.variant ? ' (' + meta.variant + ')' : '');
    else if (ev.type === 'bot:chat') what = 'amrit-bot chat' + (meta.command ? ' · /' + meta.command : '');
    else if (ev.type === 'project:open') what = 'Opened · ' + (meta.title || meta.id || 'project');
    else if (ev.type === 'social:click') what = 'Social · ' + (meta.label || '');
    else if (ev.type === 'link:click') what = 'Link · ' + (meta.label || meta.href || '');
    else if (ev.type === 'cta:click') what = 'CTA · ' + (meta.label || '');
    const where = [ev.city, ev.country].filter(Boolean).join(', ') || (ev.source || 'visitor');
    return { when: fmtRelative(Date.now() - evMs(ev)), what, who: where, type: ev.type, city: ev.city || null, region: ev.region || null, country: ev.country || null };
  });
  const totalEvents = ['views', 'cvDownloads', 'botChats', 'projectOpens', 'socialClicks', 'linkClicks', 'ctaClicks']
    .reduce((s, k) => s + (Reflect.get(c, k) || 0), 0);

  return {
    ready: counters != null,
    pageViews: c.views || 0, cvDownloads: c.cvDownloads || 0, botChats: c.botChats || 0, projectOpens: c.projectOpens || 0,
    socialClicks: c.socialClicks || 0, linkClicks: c.linkClicks || 0, ctaClicks: c.ctaClicks || 0,
    history, topProjects, activity, totalEvents, daily, recent, counters: c, refreshDaily,
  };
}

window.ADMIN_STORE = { Store, buildDefaultContent, useContent, useAnalytics, LLM_PROVIDERS, LS };
