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
  for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
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
      const cur = by[p.id];
      const fallbackModel = (DEFAULT_BOT.providers.byProvider[p.id] || {}).model || p.models[0] || '';
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
        by[p.id] = { apiKey: typeof cur === 'string' ? cur : '', model: fallbackModel };
        continue;
      }
      by[p.id] = {
        apiKey: typeof cur.apiKey === 'string' ? cur.apiKey : '',
        model: typeof cur.model === 'string' && cur.model ? cur.model : fallbackModel,
      };
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
  async fsPublish(content) {
    if (!this.fsReady()) return;
    try {
      await window.fb.db.doc('content/published').set({ content, updatedAt: window.fb.serverTimestamp() });
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
        const child = node && typeof node === 'object' && !Array.isArray(node) ? node[k] : undefined;
        const base = node && typeof node === 'object' && !Array.isArray(node) ? { ...node } : {};
        base[k] = copyIn(child, depth + 1);
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

  const previewDraft = React.useCallback(() => {
    setContent((cur) => { Store.setPreview(cur); return cur; });
  }, []);

  return { content, setAt, replace, publish, reset, previewDraft, dirty, publishedAt, setDirty, synced };
}

window.ADMIN_STORE = { Store, buildDefaultContent, useContent, LLM_PROVIDERS, LS };
