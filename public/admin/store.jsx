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
  draft:         'amritos.draft',
  published:     'amritos.published',
  preview:       'amritos.preview',
  analytics:     'amritos.analytics',
  draftUpdatedAt:'amritos.draftUpdatedAt',
};

/* Runtime vision probe result — keyed to provider+model; overrides static supportsVision. */
const VISION_TEST_KEY = 'amritos.visionTest';

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

/* Normalize + merge a raw stored snapshot for compare/persist. */
function mergeContentSnapshot(raw) {
  if (!raw) return null;
  return normalizeContent(deepMerge(buildDefaultContent(), raw));
}
/* Canonical snapshot for draft↔published compare — keys stripped, defaults merged. */
function contentForCompare(content) {
  const snap = mergeContentSnapshot(content);
  if (!snap) return null;
  return Store.stripKeys(snap);
}
/* Stable JSON — sorted object keys so Firestore round-trips never false-diff on key order. */
function stableStringify(value) {
  return JSON.stringify(value, function (_k, v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const out = {};
      for (const key of Object.keys(v).sort()) out[key] = v[key];
      return out;
    }
    return v;
  });
}
/* Sort id-keyed arrays so reordering the same rows does not look like drift. */
function stabilizeArrays(node) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) {
    if (node.length && node.every((item) => item && typeof item.id === 'string')) {
      return [...node]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((item) => stabilizeArrays(item));
    }
    return node.map((item) => stabilizeArrays(item));
  }
  const out = {};
  for (const k of Object.keys(node)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    Reflect.set(out, k, stabilizeArrays(Reflect.get(node, k)));
  }
  return out;
}
/* Visitor-visible fingerprint — merged, normalized, apiKeys stripped. */
function contentFingerprint(content) {
  const snap = contentForCompare(content);
  if (!snap) return '{}';
  return stableStringify(stabilizeArrays(snap));
}
function draftMatchesPublished(draft, published) {
  if (!published) return false;
  return contentFingerprint(draft) === contentFingerprint(published);
}
/* Canonical published snapshot stored locally + compared against draft. */
function canonicalPublishedFromDraft(draft) {
  return mergeContentSnapshot(Store.stripKeys(mergeContentSnapshot(draft)));
}
/* Canonical JSON for echo de-dupe — always normalized + merged, never raw editor state. */
function contentStateJson(content) {
  const snap = mergeContentSnapshot(content);
  return snap ? stableStringify(snap) : '';
}

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
  // Heal impact-timeline — always an array of {id,label,html} (agent may write a
  // single object or numeric-key map instead of replacing the whole array).
  const about = content.about;
  if (about) {
    const coerce = (window.SHARED_SCHEMA && window.SHARED_SCHEMA.coerceImpactArray)
      || ((v, fb) => (Array.isArray(v) ? v : Array.isArray(fb) ? fb : []));
    const fallback = (PORTFOLIO_DEFAULTS.about && PORTFOLIO_DEFAULTS.about.impact) || [];
    about.impact = coerce(about.impact, fallback);
  }
  return content;
}

/* ---------- Store ---------- */
const Store = {
  _draftAdopter: null,
  async adoptRemoteDraft(remote) {
    if (remote && this._draftAdopter) this._draftAdopter(remote);
  },
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
  /* Prefer Firestore published when signed in — matches what the live site reads. */
  async loadPublishedSnapshot() {
    let pub = this.loadPublished();
    if (this.fsReady()) {
      try {
        const remote = await this.fsLoadPublished();
        if (remote) {
          pub = remote;
          this.write(LS.published, remote);
        }
      } catch (e) { /* keep local fallback */ }
    }
    return mergeContentSnapshot(pub);
  },
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
  // Live head of the recent-events feed — capped at `n` docs so Overview + Analytics
  // stay current without subscribing to the full retention window.
  fsEventsListen(n, cb) {
    const size = n || 20;
    if (!this.fsReady()) return () => {};
    return window.fb.db.collection('events').orderBy('at', 'desc').limit(size)
      .onSnapshot((snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cb(rows, snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
      }, (e) => console.warn('[events-live]', e && e.message));
  },
  // Live per-day buckets for the last `days` calendar dates (traffic + project bars).
  fsDailyListen(days, cb) {
    if (!this.fsReady()) return () => {};
    const ids = Store.dailyStatIds(days);
    if (!ids.length) return () => {};
    const FieldPath = window.firebase && window.firebase.firestore && window.firebase.firestore.FieldPath;
    if (!FieldPath) return () => {};
    return window.fb.db.collection('stats_daily').where(FieldPath.documentId(), 'in', ids)
      .onSnapshot((snap) => {
        const byId = {};
        snap.docs.forEach((d) => { byId[d.id] = { id: d.id, ...d.data() }; });
        cb(ids.map((id) => byId[id] || { id }));
      }, (e) => console.warn('[daily-live]', e && e.message));
  },
  dailyStatIds(days) {
    const ids = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(now);
      dt.setDate(now.getDate() - i);
      ids.push(dt.toISOString().slice(0, 10));
    }
    return ids;
  },
  // Older pages of the feed (scroll-driven). The live head is fsEventsListen; this
  // only runs on explicit scroll so we never hold a 150-doc subscription.
  async fsEventsPage(after, n) {
    const size = n || 20;
    if (!this.fsReady()) return { rows: [], cursor: null, done: true };
    try {
      let q = window.fb.db.collection('events').orderBy('at', 'desc').limit(size);
      if (after) q = q.startAfter(after);
      const snap = await q.get();
      return {
        rows: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : (after || null),
        done: snap.docs.length < size,
      };
    } catch (e) { console.warn('[events]', e && e.message); return { rows: [], cursor: after || null, done: true }; }
  },
  async fsDailyRange(days) {
    if (!this.fsReady()) return [];
    const ids = Store.dailyStatIds(days);
    const docs = await Promise.all(ids.map((id) =>
      window.fb.db.doc('stats_daily/' + id).get().then((s) => (s.exists ? { id, ...s.data() } : { id })).catch(() => ({ id }))));
    return docs;
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
  // Background AI-inbox run state (suggestions + processed marks) so triage
  // survives navigation AND reload. config/{doc} is owner read/write.
  async fsSaveInboxRun(data) {
    if (!this.fsReady()) return;
    try { await window.fb.db.doc('config/inboxRun').set({ ...data, updatedAt: window.fb.serverTimestamp() }, { merge: true }); } catch (e) { console.warn('[inboxRun] save', e && e.message); }
  },
  async fsLoadInboxRun() {
    if (!this.fsReady()) return null;
    try { const s = await window.fb.db.doc('config/inboxRun').get(); return s.exists ? s.data() : null; } catch (e) { return null; }
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
    const canonical = mergeContentSnapshot(content);
    if (!canonical) return;
    try { await window.fb.db.doc('content/draft').set({ content: canonical, updatedAt: window.fb.serverTimestamp() }); }
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

  /* ---------- Admin AGENT config (config/agent — the agent's OWN keys) ----------
     SEPARATE from the bot's config/llm. The owner pastes billable keys here for
     better models; the public bot never reads them, and they are owner-only in
     firestore.rules (config/{doc}). Shape mirrors config/llm:
       { active, byProvider:{ [id]:{ apiKey, model } }, refinerModel } */
  async fsLoadAgentConfig() {
    const defaults = (window.SHARED_SCHEMA && window.SHARED_SCHEMA.AGENT_CONFIG_DEFAULTS) || { active: 'gemini', byProvider: {} };
    if (!this.fsReady()) return JSON.parse(JSON.stringify(defaults));
    try {
      const s = await window.fb.db.doc('config/agent').get();
      const data = s.exists ? s.data() : {};
      return {
        active: data.active || defaults.active,
        byProvider: (data.byProvider && typeof data.byProvider === 'object') ? data.byProvider : (defaults.byProvider || {}),
        refinerModel: data.refinerModel || '',
      };
    } catch (e) { console.warn('[store] fsLoadAgentConfig failed', e && e.message); return JSON.parse(JSON.stringify(defaults)); }
  },
  async fsSaveAgentConfig(config) {
    if (!this.fsReady()) return false;
    try {
      await window.fb.db.doc('config/agent').set({
        active: config.active || 'gemini',
        byProvider: config.byProvider || {},
        refinerModel: config.refinerModel || '',
        updatedAt: window.fb.serverTimestamp(),
      }, { merge: true });
      return true;
    } catch (e) { console.warn('[store] fsSaveAgentConfig failed', e && e.message); return false; }
  },

  /* ---------- Agent endpoint calls (owner idToken; key stays server-side) ---------- */
  async _ownerToken() {
    if (!this.fsReady() || !window.fb.auth.currentUser) return null;
    return window.fb.auth.currentUser.getIdToken();
  },
  // Shared agent/refine/inbox POST with actionable error surfacing. A thrown
  // fetch (TypeError "Failed to fetch") means the endpoint is unreachable —
  // almost always because the new functions aren't deployed yet (or, on
  // localhost without ?emu=1, FUNCTIONS_BASE points at production). A non-OK
  // response body is read and surfaced so the real reason (403 / 400 no-config /
  // 429 cap / provider error) shows in the UI instead of a blank "Failed to fetch".
  async _agentFetch(path, payload) {
    const base = window.FUNCTIONS_BASE || '';
    const tok = await this._ownerToken();
    if (!tok) return { error: 'not-signed-in', message: 'Sign in as the owner to use the agent.' };
    const url = base + path;
    let r;
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify(payload || {}),
      });
    } catch (e) {
      return {
        error: 'unreachable',
        message: `Couldn't reach ${url} (${(e && e.message) || 'network error'}). `
          + `These agent endpoints are new — deploy the backend with \`npm run deploy:backend\`, `
          + `or run the Firebase emulator and open the admin with ?emu=1.`,
      };
    }
    let body = '';
    try { body = await r.text(); } catch (e) { /* no body */ }
    let data = null;
    if (body) { try { data = JSON.parse(body); } catch (e) { /* non-JSON */ } }
    if (!r.ok) {
      const msg = (data && (data.message || data.error))
        || `HTTP ${r.status} from ${path}${body ? ' — ' + body.slice(0, 400) : ''}`;
      return { error: data && data.error ? data.error : ('http-' + r.status), message: msg, status: r.status };
    }
    return data != null ? data : { error: 'bad-response', message: 'Empty/invalid response from ' + path };
  },
  readVisionTest() {
    try {
      const raw = sessionStorage.getItem(VISION_TEST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  saveVisionTest({ providerId, model, ok }) {
    const entry = {
      providerId: String(providerId || ''),
      model: String(model || ''),
      ok: !!ok,
      at: Date.now(),
    };
    try { sessionStorage.setItem(VISION_TEST_KEY, JSON.stringify(entry)); } catch (e) { /* quota */ }
    return entry;
  },
  clearVisionTest() {
    try { sessionStorage.removeItem(VISION_TEST_KEY); } catch (e) { /* ignore */ }
  },
  visionTestPassed(providerId, model) {
    const hit = this.readVisionTest();
    if (!hit || !hit.ok) return false;
    return hit.providerId === String(providerId || '') && hit.model === String(model || '');
  },
  agentSupportsVision(cfg) {
    const SCHEMA = window.SHARED_SCHEMA || {};
    if (!cfg) return false;
    const id = cfg.active || 'gemini';
    const model = (cfg.byProvider && cfg.byProvider[id] && cfg.byProvider[id].model) || '';
    if (SCHEMA.supportsVision && SCHEMA.supportsVision(id, model)) return true;
    return this.visionTestPassed(id, model);
  },
  async agentTurn({ message, attachments, currentRoute, chatId }) {
    const payload = { message, currentRoute, chatId: chatId || 'default' };
    if (attachments && attachments.length) {
      payload.attachments = attachments.map((a) => ({ mime: a.mime, data: a.data }));
      try {
        const cfg = await this.fsLoadAgentConfig();
        const id = (cfg && cfg.active) || 'gemini';
        const model = (cfg && cfg.byProvider && cfg.byProvider[id] && cfg.byProvider[id].model) || '';
        if (this.visionTestPassed(id, model)) payload.visionVerified = true;
      } catch (e) { /* ignore */ }
    }
    return this._agentFetch('/agent', payload);
  },
  agentUndo(chatId) {
    return this._agentFetch('/agent', { action: 'undo', chatId: chatId || 'default' });
  },
  agentRevertPath(path, before) {
    return this._agentFetch('/agent', { action: 'revert-path', path, before });
  },
  // Inbox triage — batch-classify visitor questions (server caps a run at 25,
  // processed 5 at a time in one conversation).
  inboxProcess(ids) {
    return this._agentFetch('/inboxProcess', { ids });
  },
  // Inline field refiner — single-shot rewrite. Pass `text` for one field, or
  // `fields: { label, html, ... }` for a multi-field proposal.
  refineText({ text, fields, label, context }) {
    return this._agentFetch('/refine', { text, fields, label, context });
  },
  // Read-only function-log feed from Cloud Logging (nothing stored). `source`:
  // 'agent' | 'bot' | 'all'. `sinceMs` fetches only newer entries for live polls.
  fetchLogs({ source, errorsOnly, sinceMs, beforeMs, limit } = {}) {
    return this._agentFetch('/logs', { source: source || 'all', errorsOnly: !!errorsOnly, sinceMs: sinceMs || 0, beforeMs: beforeMs || 0, limit: limit || 60 });
  },
  // Connectivity check for one provider — sends "hello", logs the result.
  // `key`/`model` are optional overrides so a just-typed (unsaved) key can be tested.
  testModel({ scope, provider, model, key }) {
    return this._agentFetch('/testModel', { scope: scope || 'agent', provider, model, key });
  },
  testVision({ scope, provider, model, key }) {
    return this._agentFetch('/testVision', { scope: scope || 'agent', provider, model, key });
  },
  // Chat history + clear (owner-only Firestore reads).
  async fsLoadAgentMessages(chatId, n) {
    if (!this.fsReady()) return [];
    try {
      const s = await window.fb.db.collection(`agent_chats/${chatId || 'default'}/messages`).orderBy('ts', 'asc').limit(n || 200).get();
      const roleOrder = { user: 0, assistant: 1, tool: 2 };
      const createdAtMs = (doc) => {
        const c = doc && doc.createdAt;
        if (!c) return 0;
        if (typeof c.toMillis === 'function') return c.toMillis();
        if (typeof c === 'number') return c;
        return 0;
      };
      return s.docs.map((d) => ({ ...d.data(), createdAt: d.data().createdAt })).sort((a, b) => {
        const ta = Number(a.ts) || 0;
        const tb = Number(b.ts) || 0;
        if (ta !== tb) return ta - tb;
        const ca = createdAtMs(a);
        const cb = createdAtMs(b);
        if (ca !== cb) return ca - cb;
        const sa = Number(a.seq);
        const sb = Number(b.seq);
        if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
        return (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
      });
    } catch (e) { return []; }
  },
  async fsClearAgentChat(chatId) {
    if (!this.fsReady()) return false;
    try {
      const col = window.fb.db.collection(`agent_chats/${chatId || 'default'}/messages`);
      const snap = await col.limit(400).get();
      const batch = window.fb.db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return true;
    } catch (e) { console.warn('[store] fsClearAgentChat failed', e && e.message); return false; }
  },
  // Recent turn audits — used to rebuild change/undo UI for older chat turns that
  // predate turnMeta on message docs. Filtered client-side to avoid composite indexes.
  async fsLoadAgentAudits(chatId, limit) {
    if (!this.fsReady()) return [];
    const cid = chatId || 'default';
    try {
      const s = await window.fb.db.collection('agent_audit').orderBy('createdAt', 'desc').limit(limit || 80).get();
      return s.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => (a.chatId || 'default') === cid);
    } catch (e) { return []; }
  },

  /* ---------- Live draft listener (U14) ----------
     Subscribe to content/draft so the agent's server-side writes appear in the
     open admin tab. Returns an unsubscribe fn. The callback gets
     { content, updatedAtMs } on every remote change (including our own echoes —
     the hook de-dupes those by comparing JSON). */
  fsDraftListen(cb) {
    if (!this.fsReady()) return () => {};
    return window.fb.db.doc('content/draft').onSnapshot(
      (s) => {
        if (!s.exists) return;
        const d = s.data() || {};
        const ts = d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : 0;
        cb({ content: d.content || null, updatedAtMs: ts });
      },
      (e) => console.warn('[store] draft listen', e && e.message)
    );
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
  const [draftUpdatedAt, setDraftUpdatedAt] = React.useState(() => Store.read(LS.draftUpdatedAt));
  const touchDraftUpdatedAt = React.useCallback((ts) => {
    const iso = ts || new Date().toISOString();
    Store.write(LS.draftUpdatedAt, iso);
    setDraftUpdatedAt(iso);
  }, []);
  const [publishedSnapshot, setPublishedSnapshot] = React.useState(() => mergeContentSnapshot(Store.loadPublished()));
  const [synced, setSynced] = React.useState(false); // true once Firestore draft adopted/seeded
  const [agentBusy, setAgentBusyState] = React.useState(false);
  const draftTimer = React.useRef(null);
  // U14 concurrency state:
  //  agentBusyRef — while a client-initiated agent turn is in flight, autosave is
  //    paused so the client's stale whole-doc .set() can't clobber the agent write.
  //  lastJsonRef  — JSON of the content we last held/saved, so the live listener
  //    can tell our own echo from a genuine remote (agent) change.
  //  pendingRemoteRef — a remote change that arrived while a field was focused; it
  //    is adopted once focus leaves (so we never stomp the value under the cursor).
  const agentBusyRef = React.useRef(false);
  const lastJsonRef = React.useRef('');
  const pendingRemoteRef = React.useRef(null);
  const publishedSnapshotRef = React.useRef(publishedSnapshot);
  const publishedAtRef = React.useRef(publishedAt);
  const draftUpdatedAtRef = React.useRef(draftUpdatedAt);
  React.useEffect(() => { publishedSnapshotRef.current = publishedSnapshot; }, [publishedSnapshot]);
  React.useEffect(() => { publishedAtRef.current = publishedAt; }, [publishedAt]);
  React.useEffect(() => { draftUpdatedAtRef.current = draftUpdatedAt; }, [draftUpdatedAt]);
  const setAgentBusy = React.useCallback((b) => { agentBusyRef.current = !!b; setAgentBusyState(!!b); }, []);
  const isEditingField = () => {
    const el = typeof document !== 'undefined' ? document.activeElement : null;
    if (!el) return false;
    // Agent composer focus must not defer server draft adoption (U14).
    if (el.closest && (el.closest('.composer') || el.closest('.agentchat') || el.closest('.agentdock'))) return false;
    const tag = (el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  };

  // When the owner signs in, adopt the Firestore draft (or seed it from the
  // current local content if none exists). After this, Firestore is the source
  // of truth and localStorage trails as a cache. Also refresh the published
  // snapshot so draft-vs-live diff detection matches Firestore.
  React.useEffect(() => {
    if (!window.fb || !window.fb.auth) return;
    const unsub = window.fb.auth.onAuthStateChanged(async (u) => {
      if (!u) { setSynced(false); return; }
      const pub = await Store.loadPublishedSnapshot();
      if (pub) setPublishedSnapshot(pub);
      const remote = await Store.fsLoadDraft();
      if (remote) {
        const merged = mergeContentSnapshot(remote);
        Store.saveDraft(merged);
        setContent(merged);
        lastJsonRef.current = contentStateJson(merged);
        if (pub && draftMatchesPublished(merged, pub)) {
          setPublishedSnapshot(pub);
          setDirty(false);
          const pubAt = Store.read('amritos.publishedAt');
          if (pubAt) touchDraftUpdatedAt(pubAt);
        }
      } else {
        // No remote draft yet — seed it from whatever we have locally.
        setContent((cur) => {
          const canonical = mergeContentSnapshot(cur);
          Store.fsSaveDraft(canonical);
          lastJsonRef.current = contentStateJson(canonical);
          return canonical;
        });
      }
      setSynced(true);
    });
    return () => unsub();
  }, []);

  const draftDiffersFromPublished = React.useMemo(() => {
    if (!publishedSnapshot) return false;
    return !draftMatchesPublished(content, publishedSnapshot);
  }, [content, publishedSnapshot]);

  /* Unpublished = local dirty flag or visitor-visible drift from published.
     Timestamps only break ties when content already differs — never when
     fingerprints match (Firestore echoes can bump draftUpdatedAt alone). */
  const hasUnpublishedEdits = React.useMemo(() => {
    if (!publishedSnapshot) return !!dirty;
    if (!draftDiffersFromPublished) return !!dirty;
    if (dirty) return true;
    if (!draftUpdatedAt || !publishedAt) return true;
    return new Date(draftUpdatedAt).getTime() > new Date(publishedAt).getTime();
  }, [dirty, publishedSnapshot, draftDiffersFromPublished, draftUpdatedAt, publishedAt]);

  // When draft content matches published, clear stale dirty and align timestamps.
  React.useEffect(() => {
    if (!publishedSnapshot || draftDiffersFromPublished) return;
    if (dirty) setDirty(false);
    if (publishedAt && draftUpdatedAt !== publishedAt) touchDraftUpdatedAt(publishedAt);
  }, [content, publishedSnapshot, draftDiffersFromPublished, dirty, publishedAt, draftUpdatedAt, touchDraftUpdatedAt]);

  const showSyncFromLive = React.useMemo(() => {
    if (!publishedSnapshot || !draftDiffersFromPublished || hasUnpublishedEdits) return false;
    if (publishedAt && draftUpdatedAt) {
      return new Date(publishedAt).getTime() > new Date(draftUpdatedAt).getTime();
    }
    return true;
  }, [publishedSnapshot, draftDiffersFromPublished, hasUnpublishedEdits, publishedAt, draftUpdatedAt]);

  // Debounced Firestore draft write (1s after the last edit) to avoid a write
  // per keystroke while still keeping the cross-device draft current.
  const scheduleDraftSync = React.useCallback((next) => {
    if (!Store.fsReady()) return;
    // Pause autosave while an agent turn is in flight: a debounced stale whole-doc
    // .set() here would clobber the agent's server write (U14 / KD2).
    if (agentBusyRef.current) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    const canonical = mergeContentSnapshot(next);
    if (!canonical) return;
    // Record our own latest content so the live listener treats the resulting
    // snapshot as an echo, not a remote change (must match listener normalization).
    lastJsonRef.current = contentStateJson(canonical);
    draftTimer.current = setTimeout(() => { Store.fsSaveDraft(canonical); }, 1000);
  }, []);

  // U14 — adopt the agent's server-side draft writes into the open editor, and
  // keep the dedicated Agent page + floating dock in sync, WITHOUT stomping the
  // field the owner is actively editing.
  const adoptRemoteDraft = React.useCallback((remote) => {
    if (!remote) return;
    const merged = mergeContentSnapshot(remote);
    const json = contentStateJson(merged);
    if (json === lastJsonRef.current) return; // our own echo
    // Firestore echoes / key-only diffs must not replace the editor when the
    // remote payload already matches the live published baseline.
    if (publishedSnapshot && draftMatchesPublished(merged, publishedSnapshot)) {
      lastJsonRef.current = json;
      return;
    }
    lastJsonRef.current = json;
    Store.saveDraft(merged);
    setContent(merged);
  }, [publishedSnapshot]);

  React.useEffect(() => {
    Store._draftAdopter = adoptRemoteDraft;
    return () => { Store._draftAdopter = null; };
  }, [adoptRemoteDraft]);

  React.useEffect(() => {
    if (!window.fb || !window.fb.auth) return;
    let unsub = null;
    const unsubAuth = window.fb.auth.onAuthStateChanged((u) => {
      if (unsub) { unsub(); unsub = null; }
      if (!u) return;
      unsub = Store.fsDraftListen(({ content: remote, updatedAtMs }) => {
        if (!remote) return;
        const json = contentStateJson(remote);
        if (json === lastJsonRef.current) {
          const pub = publishedSnapshotRef.current;
          const pubAt = publishedAtRef.current;
          if (pub && pubAt && draftMatchesPublished(remote, pub) && draftUpdatedAtRef.current !== pubAt) {
            touchDraftUpdatedAt(pubAt);
          }
          return;
        }
        if (updatedAtMs) {
          const iso = new Date(updatedAtMs).toISOString();
          Store.write(LS.draftUpdatedAt, iso);
          setDraftUpdatedAt(iso);
        }
        // Defer adoption while a field is focused so we never replace the value
        // under the cursor; the flush interval below picks it up on blur/idle.
        if (isEditingField()) { pendingRemoteRef.current = remote; return; }
        adoptRemoteDraft(remote);
      });
    });
    // Flush a deferred remote change once the owner stops editing.
    const flush = setInterval(() => {
      if (pendingRemoteRef.current && !isEditingField()) {
        const r = pendingRemoteRef.current; pendingRemoteRef.current = null; adoptRemoteDraft(r);
      }
    }, 1200);
    return () => { if (unsub) unsub(); unsubAuth(); clearInterval(flush); };
  }, [adoptRemoteDraft]);

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
    touchDraftUpdatedAt();
    if (computed) scheduleDraftSync(computed);
  }, [scheduleDraftSync, touchDraftUpdatedAt]);

  const replace = React.useCallback((next) => {
    setContent(next); Store.saveDraft(next); setDirty(true); touchDraftUpdatedAt(); scheduleDraftSync(next);
  }, [scheduleDraftSync, touchDraftUpdatedAt]);

  const publish = React.useCallback(async () => {
    // Cancel any pending debounced draft write — it can land after publish and
    // revert the draft on Firestore, leaving draft↔published permanently out of sync.
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    let snap = null;
    let pubSnap = null;
    setContent((cur) => {
      snap = mergeContentSnapshot(cur);
      pubSnap = canonicalPublishedFromDraft(snap);
      Store.saveDraft(snap);
      lastJsonRef.current = contentStateJson(snap);
      return snap;
    });
    if (!snap || !pubSnap) return;
    // Local published cache matches the public Firestore doc (key-stripped).
    Store.publish(pubSnap);
    // In-memory published baseline is the canonical public snapshot (no apiKeys).
    // Draft keeps keys for editing; fingerprint compare strips them on both sides.
    setPublishedSnapshot(pubSnap);
    const ts = new Date().toISOString();
    Store.write('amritos.publishedAt', ts);
    setPublishedAt(ts);
    touchDraftUpdatedAt(ts);
    setDirty(false);
    try {
      await Store.fsPublish(snap);
    } catch (e) { /* local publish already applied */ }
  }, [touchDraftUpdatedAt]);

  const reset = React.useCallback(() => {
    const def = Store.resetDraft();
    setContent(def); setDirty(true); touchDraftUpdatedAt(); scheduleDraftSync(def);
  }, [scheduleDraftSync, touchDraftUpdatedAt]);

  // Copy the live PUBLISHED snapshot into draft (localStorage + Firestore),
  // overwriting every in-progress edit. Prefers Firestore when signed in.
  // Preserves bot LLM apiKeys — the public published doc is key-stripped.
  const syncDraftFromPublished = React.useCallback(async () => {
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    const base = await Store.loadPublishedSnapshot();
    if (!base) return false;
    setContent((cur) => {
      const next = clone(base);
      try {
        const curBy = cur && cur.bot && cur.bot.providers && cur.bot.providers.byProvider;
        const nextProv = next.bot && next.bot.providers;
        if (curBy && nextProv) {
          const by = { ...(nextProv.byProvider || {}) };
          // Only re-attach draft apiKeys — published snapshot is key-stripped and
          // is the source of truth for every other bot field (model, active, etc.).
          for (const id of Object.keys(by)) {
            if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
            const curP = Reflect.get(curBy, id);
            const nextP = Reflect.get(by, id) || {};
            Reflect.set(by, id, {
              ...nextP,
              apiKey: (curP && typeof curP.apiKey === 'string') ? curP.apiKey : '',
            });
          }
          nextProv.byProvider = by;
        }
      } catch (e) { /* keep published as-is */ }
      const merged = mergeContentSnapshot(next);
      lastJsonRef.current = contentStateJson(merged);
      Store.saveDraft(merged);
      Store.fsSaveDraft(merged);
      return merged;
    });
      Store.clearPreview();
    setDirty(false);
    if (publishedAt) touchDraftUpdatedAt(publishedAt);
    setPublishedSnapshot(canonicalPublishedFromDraft(base) || base);
    return true;
  }, [publishedAt, touchDraftUpdatedAt]);

  /* Revert draft to the in-memory published snapshot (discard unpublished edits). */
  const discardDraft = React.useCallback(() => {
    if (!publishedSnapshot) return false;
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
      draftTimer.current = null;
    }
    setContent((cur) => {
      const next = clone(publishedSnapshot);
      try {
        const curBy = cur && cur.bot && cur.bot.providers && cur.bot.providers.byProvider;
        const nextProv = next.bot && next.bot.providers;
        if (curBy && nextProv) {
          const by = { ...(nextProv.byProvider || {}) };
          for (const id of Object.keys(by)) {
            if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
            const curP = Reflect.get(curBy, id);
            const nextP = Reflect.get(by, id) || {};
            Reflect.set(by, id, {
              ...nextP,
              apiKey: (curP && typeof curP.apiKey === 'string') ? curP.apiKey : '',
            });
          }
          nextProv.byProvider = by;
        }
      } catch (e) { /* keep published as-is */ }
      const merged = mergeContentSnapshot(next);
      lastJsonRef.current = contentStateJson(merged);
      Store.saveDraft(merged);
      Store.fsSaveDraft(merged);
      return merged;
    });
    Store.clearPreview();
    setDirty(false);
    if (publishedAt) touchDraftUpdatedAt(publishedAt);
    return true;
  }, [publishedSnapshot, publishedAt, touchDraftUpdatedAt]);

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

  return {
    content, setAt, replace, publish, reset, discardDraft, syncDraftFromPublished, previewDraft,
    dirty, hasUnpublishedEdits, showSyncFromLive, draftDiffersFromPublished, draftUpdatedAt,
    publishedSnapshot, publishedAt, setDirty, synced,
    saveLLMConfig, agentBusy, setAgentBusy, adoptRemoteDraft,
  };
}

/* ---------- Analytics hook (real-time, Firestore-backed) ----------
   Live snapshot listeners on stats/global, events (head), and stats_daily keep
   Overview + Analytics current while signed in. Scroll pagination on Analytics
   appends older event pages via one-shot .get() reads. Re-attaches on sign-in. */
const EVENTS_PAGE = 20; // live head size + each scroll page (cost-bounded)

function useAnalytics() {
  const [counters, setCounters] = React.useState(null);
  const [liveEvents, setLiveEvents] = React.useState([]);
  const [olderEvents, setOlderEvents] = React.useState([]);
  const [daily, setDaily] = React.useState([]);
  const [timeTick, setTimeTick] = React.useState(0); // re-render relative timestamps
  const liveTailSnapRef = React.useRef(null);        // oldest doc in the live head
  const olderTailSnapRef = React.useRef(null);       // cursor after scroll pages
  const loadingRef = React.useRef(false);            // guards against overlapping scroll loads
  const [eventsDone, setEventsDone] = React.useState(false);
  const [eventsLoading, setEventsLoading] = React.useState(false);

  const recent = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const ev of liveEvents.concat(olderEvents)) {
      const k = ev.id || String(ev.at && ev.at.seconds) + ev.type;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(ev);
    }
    return out;
  }, [liveEvents, olderEvents]);

  // Drop scroll-appended pages; the live head listener keeps the top current.
  const resetActivityPagination = React.useCallback(() => {
    setOlderEvents([]);
    olderTailSnapRef.current = null;
    setEventsDone(liveEvents.length < EVENTS_PAGE);
  }, [liveEvents.length]);

  // Manual refresh — same as resetting pagination (live head is already subscribed).
  const refreshEvents = React.useCallback(() => { resetActivityPagination(); }, [resetActivityPagination]);

  // Append the NEXT page (scroll-driven). No-op once the feed is exhausted.
  const loadMoreEvents = React.useCallback(async () => {
    if (loadingRef.current || eventsDone) return;
    const cursor = olderTailSnapRef.current || liveTailSnapRef.current;
    if (!cursor && !liveEvents.length) return;
    loadingRef.current = true; setEventsLoading(true);
    const { rows, cursor: nextCursor, done } = await Store.fsEventsPage(cursor, EVENTS_PAGE);
    setOlderEvents((prev) => prev.concat(rows));
    olderTailSnapRef.current = nextCursor;
    setEventsDone(done);
    loadingRef.current = false; setEventsLoading(false);
  }, [eventsDone, liveEvents.length]);

  React.useEffect(() => {
    if (!window.fb || !window.fb.auth) return;
    let u1 = null; let u2 = null; let u3 = null; let tickId = null;
    const unsubAuth = window.fb.auth.onAuthStateChanged((u) => {
      if (u1) { u1(); u1 = null; }
      if (u2) { u2(); u2 = null; }
      if (u3) { u3(); u3 = null; }
      if (tickId) { clearInterval(tickId); tickId = null; }
      if (u) {
        u1 = Store.fsStatsListen(setCounters);
        u2 = Store.fsEventsListen(EVENTS_PAGE, (rows, oldestSnap) => {
          setLiveEvents(rows);
          liveTailSnapRef.current = oldestSnap;
          setEventsLoading(false);
          if (!olderTailSnapRef.current) setEventsDone(rows.length < EVENTS_PAGE);
        });
        u3 = Store.fsDailyListen(30, setDaily);
        tickId = setInterval(() => setTimeTick((t) => t + 1), 30000);
      } else {
        setCounters(null); setLiveEvents([]); setOlderEvents([]); setDaily([]);
        liveTailSnapRef.current = null; olderTailSnapRef.current = null;
        setEventsDone(false);
      }
    });
    return () => {
      if (u1) u1(); if (u2) u2(); if (u3) u3();
      if (tickId) clearInterval(tickId);
      unsubAuth();
    };
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
  const activity = React.useMemo(() => {
    void timeTick; // tick every 30s so "Nm ago" stays fresh without new events
    return recent.map((ev) => {
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
  }, [recent, timeTick]);
  const totalEvents = ['views', 'cvDownloads', 'botChats', 'projectOpens', 'socialClicks', 'linkClicks', 'ctaClicks']
    .reduce((s, k) => s + (Reflect.get(c, k) || 0), 0);

  return {
    ready: counters != null,
    pageViews: c.views || 0, cvDownloads: c.cvDownloads || 0, botChats: c.botChats || 0, projectOpens: c.projectOpens || 0,
    socialClicks: c.socialClicks || 0, linkClicks: c.linkClicks || 0, ctaClicks: c.ctaClicks || 0,
    history, topProjects, activity, totalEvents, daily, recent, counters: c, refreshDaily,
    loadMoreEvents, refreshEvents, resetActivityPagination, eventsDone, eventsLoading,
  };
}

window.ADMIN_STORE = {
  Store, buildDefaultContent, useContent, useAnalytics, LLM_PROVIDERS, LS,
  contentFingerprint, draftMatchesPublished, canonicalPublishedFromDraft,
};
