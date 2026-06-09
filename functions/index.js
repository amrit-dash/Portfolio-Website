/* =====================================================
   amrit.os — Cloud Functions (Gen 2, Node 20)
   -----------------------------------------------------
   Endpoints:
     GET  /warmup     — no-op to defeat cold starts (pinged by the boot splash)
     POST /chat       — multi-provider LLM bot proxy; keys read server-side from
                        Firestore config/llm and NEVER returned to the browser.
                        Per-IP rate limited; the authenticated owner bypasses.
     POST /track      — analytics ingest; increments counters + daily buckets,
                        appends a capped event feed, enriches with geo + source.
     POST /clearStats — owner-only; wipes analytics (counters, buckets, events).
     POST /inboxPurge  — owner-only; rules-only junk/duplicate cleanup (no LLM).
     POST /inboxProcess — owner-only; purge + AI triage; persists to config/inboxRun.
     (scheduled) inboxWeekly — Monday 03:00 IST auto-triage of new inbox questions.

   Secrets posture: the only secrets (LLM API keys) live in Firestore
   `config/llm`, readable solely by these functions via the Admin SDK. Firestore
   rules deny all client access to that doc. See firestore.rules.
   ===================================================== */

const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Co-located with Firestore (asia-south1 / Mumbai) so the per-request reads on
// /chat and /track don't pay a cross-region round-trip. Storage lives in
// us-central1 but is accessed client-side, not from these functions.
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

// The Google account allowed to use admin-only endpoints (and to bypass the bot
// rate limit when testing). Override via env OWNER_EMAIL at deploy time.
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'amrit.dash60@gmail.com').toLowerCase();

// Allowed origins for CORS — the two hosting sites + local dev.
const ALLOWED_ORIGINS = [
  'https://amritdash.web.app',
  'https://amrit-dash-portfolio.web.app',
  'https://amritos-admin.web.app',
  'http://localhost:3000',
  'http://localhost:5000',
];

/* ---------- LLM provider catalog (mirrors data.jsx) ---------- */
const PROVIDERS = {
  gemini:     { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent' },
  openai:     { endpoint: 'https://api.openai.com/v1/chat/completions' },
  anthropic:  { endpoint: 'https://api.anthropic.com/v1/messages' },
  openrouter: { endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  mistral:    { endpoint: 'https://api.mistral.ai/v1/chat/completions' },
  grok:       { endpoint: 'https://api.x.ai/v1/chat/completions' },
  groq:       { endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
};

/* ---------- helpers ---------- */
function cors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
}

function clientIp(req) {
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.ip || req.connection?.remoteAddress || '0.0.0.0';
}
const hashIp = (ip) => crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24);

// Verify a Firebase Auth ID token from the Authorization header; return the
// decoded token if it's the owner, else null. Used for owner-only routes and
// the bot rate-limit bypass during admin testing.
async function verifyOwner(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    if ((decoded.email || '').toLowerCase() === OWNER_EMAIL) return decoded;
  } catch (e) { /* invalid token */ }
  return null;
}

// Structured app log. Cloud Logging parses a JSON line on stdout into
// jsonPayload + severity, so the admin Logs views can classify and filter by
// `kind` (bot:llm / agent:llm / agent:refine / agent:tool / bot:inbox) and read
// provider/model/ok without scraping text. Logging must never throw.
function alog(severity, kind, fields) {
  try {
    const f = fields || {};
    console.log(JSON.stringify({ severity, message: `[${kind}] ${f.summary || ''}`.trim(), amritos: { kind, ...f } }));
  } catch (e) { /* swallow */ }
}

// Windowed per-IP rate limit backed by a Firestore transaction.
async function rateLimited(ipHash, key, limit, windowMs) {
  const ref = db.collection('ratelimits').doc(`${key}_${ipHash}`);
  const now = Date.now();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : null;
    if (!d || now - d.windowStart > windowMs) {
      tx.set(ref, { windowStart: now, count: 1 });
      return false;
    }
    if (d.count >= limit) return true;
    tx.update(ref, { count: d.count + 1 });
    return false;
  });
}

// Skip obviously non-routable IPs (localhost / private ranges) — no point
// geo-locating them and they only waste a lookup.
function isPublicIp(ip) {
  if (!ip || ip === '0.0.0.0') return false;
  if (/^(10\.|127\.|192\.168\.|169\.254\.|::1|fc|fd)/i.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  return true;
}

async function geoLookup(ip) {
  // Free, no-key geo-IP. Best-effort; failures degrade to nulls. ip-api.com is
  // built for server-side use (generous free tier) — primary; ipwho.is is the
  // HTTPS fallback. Some free services rate-limit datacenter IPs, hence two.
  if (!isPublicIp(ip)) return { country: null, region: null, city: null };
  try {
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`, { signal: AbortSignal.timeout(4500) });
    const d = await r.json();
    if (d && d.status === 'success') return { country: d.country || null, region: d.regionName || null, city: d.city || null };
  } catch (e) { console.warn('[geo] ip-api failed for', ip, e && e.message); }
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(4500) });
    const d = await r.json();
    if (d && d.success !== false) return { country: d.country || null, region: d.region || null, city: d.city || null };
  } catch (e) { console.warn('[geo] ipwho failed for', ip, e && e.message); }
  return { country: null, region: null, city: null };
}

// Pure salutations → handled with a canned reply, never sent to the LLM or
// logged for review. Matches the whole message (after stripping punctuation),
// not substrings, so "hey, what do you build?" still goes to the model.
const GREETINGS = new Set(['hi', 'hii', 'hiii', 'hey', 'heyy', 'hello', 'helo', 'hullo', 'yo', 'sup', 'wassup', 'hola', 'namaste', 'howdy', 'hiya', 'greetings', 'gm', 'good morning', 'good afternoon', 'good evening', 'hey there', 'hi there', 'hello there', 'hey bot', 'hello bot', 'test', 'testing', 'ping']);
function isGreeting(s) {
  const t = String(s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  if (!t) return true;
  if (t.length <= 2) return true;
  return GREETINGS.has(t);
}

function categorizeSource(referrer) {
  if (!referrer) return 'direct';
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, '');
    if (/google\./.test(h)) return 'google';
    if (/linkedin\./.test(h)) return 'linkedin';
    if (/github\./.test(h)) return 'github';
    if (/(t\.co|twitter|x\.com)/.test(h)) return 'twitter';
    if (/instagram\./.test(h)) return 'instagram';
    if (/(wa\.me|whatsapp)/.test(h)) return 'whatsapp';
    return h;
  } catch (e) { return 'other'; }
}

/* ===================================================== */
/*  /warmup                                              */
/* ===================================================== */
exports.warmup = onRequest((req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  res.json({ ok: true, t: Date.now() });
});

/* ===================================================== */
/*  /chat — multi-provider bot proxy                     */
/* ===================================================== */
exports.chat = onRequest(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const { message, suggestion } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'no-message' });

  // Greetings: answer with a canned line — no LLM call, no review-inbox capture.
  // Keeps salutations from burning quota or bloating the training queue.
  if (isGreeting(message)) {
    // canned: answered locally, NOT by the LLM — so the admin test panel can
    // label it correctly instead of crediting the active provider.
    return res.status(200).json({ text: "hey 👋 ask me anything about amrit — his work, projects, automation, or comedy. or try /stats, /work, /links.", canned: true });
  }

  // Owner (admin test panel) bypasses the rate limit entirely.
  const owner = await verifyOwner(req);
  if (!owner) {
    const settings = await getSettings();
    const limit = settings.botRatePerHour || 30;
    const limited = await rateLimited(hashIp(clientIp(req)), 'chat', limit, 3600_000);
    if (limited) return res.status(429).json({ error: 'rate-limit', message: "you've hit the chat limit for now — try again in a bit." });
  }

  // Capture real questions for the bot-training inbox (greetings + junk already
  // filtered above; also skip very short/low-signal input).
  const trimmed = String(message).trim();
  if (trimmed.length >= 4 && !classifyInboxJunk(trimmed).junk) {
    db.collection('bot_questions').add({ at: FieldValue.serverTimestamp(), q: trimmed.slice(0, 500) }).catch(() => {});
  }

  let cfg;
  try {
    const snap = await db.doc('config/llm').get();
    cfg = snap.exists ? snap.data() : null;
  } catch (e) { cfg = null; }

  const active = (cfg && cfg.active) || 'gemini';
  const pcfg = (cfg && cfg.byProvider && cfg.byProvider[active]) || {};
  const provider = PROVIDERS[active];
  const key = pcfg.apiKey;
  const model = pcfg.model;

  // Surface the real upstream error ONLY to the authenticated owner (admin test
  // panel), so debugging "offline" doesn't require log-diving. Public visitors
  // just get the clean fallback signal.
  const fail = (reason) => {
    alog('WARNING', 'bot:llm', { provider: active, model, ok: false, summary: reason });
    return res.status(200).json({ text: null, fallback: true, ...(owner ? { error: reason } : {}) });
  };

  // No key configured → tell the client to fall back to local Q&A.
  if (!provider || !key) return fail('No API key set for the active provider (' + active + '). Paste a key and click Activate.');

  const MD_STYLE = '\n\nReply formatting: use markdown (**bold**, *italic*, `-` or `1.` lists) when listing multiple points; otherwise plain text is fine. No HTML, headings, or code fences. Stay concise, casual lowercase.';
  const systemPrompt = ((cfg && cfg.systemPrompt) || '') + MD_STYLE;
  const temperature = Number(cfg && cfg.temperature) || 0.7;
  const maxTokens = Number(cfg && cfg.maxTokens) || 300;
  const userMsg = suggestion
    ? `Suggested answer from knowledge base: "${suggestion}"\n\nUser question: ${message}\n\nRespond using the suggested answer as reference. Rephrase naturally if needed. Use **bold** or lists only when they clarify multiple points. Keep concise, casual lowercase.`
    : message;

  // Pull a human-readable error out of any provider's error JSON shape.
  const errOf = (status, d) => {
    const m = (d && (d.error?.message || d.error?.[0]?.message || (typeof d.error === 'string' ? d.error : null) || d.message)) || ('HTTP ' + status);
    return `${active} (${model}): ${m}`;
  };

  try {
    let r, d, text;
    if (active === 'gemini') {
      const url = provider.endpoint.replace('{model}', model) + '?key=' + encodeURIComponent(key);
      r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts: [{ text: userMsg }] }], generationConfig: { temperature, maxOutputTokens: maxTokens } }) });
      d = await r.json();
      text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (active === 'anthropic') {
      r = await fetch(provider.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] }) });
      d = await r.json();
      text = d?.content?.[0]?.text;
    } else {
      r = await fetch(provider.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], temperature, max_tokens: maxTokens }) });
      d = await r.json();
      text = d?.choices?.[0]?.message?.content;
    }
    if (!r.ok || (d && d.error)) return fail(errOf(r.status, d));
    if (!text) return fail('Empty response from ' + active + ' (' + model + ').');
    alog('INFO', 'bot:llm', { provider: active, model, ok: true, summary: 'reply ok' });
    return res.status(200).json({ text: String(text).trim() });
  } catch (e) {
    return fail('Request to ' + active + ' failed: ' + (e && e.message));
  }
});

/* ===================================================== */
/*  /models — list a provider's models from its API      */
/*  Owner-only. Key is sent in the request body, used     */
/*  server-side, and never stored — lets the admin fetch  */
/*  the live model catalog before saving a key.           */
/* ===================================================== */
exports.models = onRequest(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  const { provider, key } = req.body || {};
  if (!provider) return res.status(400).json({ error: 'no-provider' });
  // Fall back to the stored key if none supplied (e.g. re-listing after save).
  let useKey = key;
  if (!useKey) {
    try { const s = await db.doc('config/llm').get(); useKey = s.exists && s.data().byProvider?.[provider]?.apiKey; } catch (e) {}
  }

  try {
    let url, headers = {}, pick;
    if (provider === 'gemini') {
      if (!useKey) return res.status(400).json({ error: 'no-key' });
      url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(useKey) + '&pageSize=200';
      pick = (d) => (d.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => (m.name || '').replace(/^models\//, ''));
    } else if (provider === 'anthropic') {
      if (!useKey) return res.status(400).json({ error: 'no-key' });
      url = 'https://api.anthropic.com/v1/models?limit=100';
      headers = { 'x-api-key': useKey, 'anthropic-version': '2023-06-01' };
      pick = (d) => (d.data || []).map((m) => m.id);
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/models'; // public catalog, key optional
      if (useKey) headers = { Authorization: 'Bearer ' + useKey };
      pick = (d) => (d.data || []).map((m) => m.id);
    } else {
      // OpenAI-compatible: openai, mistral, grok, groq
      const bases = { openai: 'https://api.openai.com/v1/models', mistral: 'https://api.mistral.ai/v1/models', grok: 'https://api.x.ai/v1/models', groq: 'https://api.groq.com/openai/v1/models' };
      url = bases[provider];
      if (!url) return res.status(400).json({ error: 'unknown-provider' });
      if (!useKey) return res.status(400).json({ error: 'no-key' });
      headers = { Authorization: 'Bearer ' + useKey };
      pick = (d) => (d.data || []).map((m) => m.id);
    }
    const r = await fetch(url, { headers });
    const d = await r.json();
    if (!r.ok || d.error) {
      const msg = (d && (d.error?.message || (typeof d.error === 'string' ? d.error : null))) || ('HTTP ' + r.status);
      return res.status(200).json({ error: msg });
    }
    const models = (pick(d) || []).filter(Boolean).sort();
    return res.status(200).json({ models });
  } catch (e) {
    return res.status(200).json({ error: 'fetch failed: ' + (e && e.message) });
  }
});

/* ===================================================== */
/*  /track — analytics ingest                            */
/* ===================================================== */
const TRACK_TYPES = new Set(['view', 'project:open', 'cv:download', 'bot:chat', 'social:click', 'link:click', 'cta:click']);
const COUNTER = {
  'view': 'views', 'project:open': 'projectOpens', 'cv:download': 'cvDownloads',
  'bot:chat': 'botChats', 'social:click': 'socialClicks', 'link:click': 'linkClicks', 'cta:click': 'ctaClicks',
};

exports.track = onRequest(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const { type, meta, referrer } = req.body || {};
  if (!TRACK_TYPES.has(type)) return res.status(400).json({ error: 'bad-type' });

  const ip = clientIp(req);
  const ipHash = hashIp(ip);

  // Anti-spam so nobody can inflate stats. Limit is admin-tunable (config/settings).
  const settings = await getSettings();
  const trackLimit = Number(settings.trackRatePerHour) || 120;
  if (await rateLimited(ipHash, 'track', trackLimit, 3600_000)) return res.status(429).json({ error: 'rate-limit' });

  const geo = await geoLookup(ip);
  const source = categorizeSource(referrer);
  const counterField = COUNTER[type];
  const today = new Date().toISOString().slice(0, 10);

  const batch = db.batch();
  const inc = FieldValue.increment(1);

  // Global counter
  batch.set(db.doc('stats/global'), { [counterField]: inc, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  // Per-day bucket with breakdowns. Use NESTED objects (not dotted keys) so
  // set({merge:true}) merges into the maps — dotted keys would create literal
  // "bySource.google" fields instead of bySource:{google:n}.
  const daily = { date: today, [counterField]: inc };
  if (source) daily.bySource = { [source]: inc };
  if (geo.country) daily.byCountry = { [geo.country]: inc };
  if (type === 'project:open' && meta && meta.id) daily.byProject = { [meta.id]: inc };
  if (type === 'social:click' && meta && meta.label) daily.bySocial = { [meta.label]: inc };
  batch.set(db.doc(`stats_daily/${today}`), daily, { merge: true });

  // Capped recent-activity feed (raw IP kept per owner request; admin-only).
  batch.set(db.collection('events').doc(), {
    at: FieldValue.serverTimestamp(), type, meta: meta || null, source,
    ip, country: geo.country, region: geo.region, city: geo.city,
  });

  await batch.commit().catch(() => {});
  res.status(204).send('');

  // Opportunistic retention prune (~4% of calls) so the per-event feed stays
  // within the configured window without a separate scheduler. Counters/buckets
  // are never pruned — only individual event docs.
  if (Math.random() < 0.04) {
    try {
      const days = Number(settings.eventRetentionDays) || 30;
      const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - days * 86400000);
      const old = await db.collection('events').where('at', '<', cutoff).limit(50).get();
      if (!old.empty) { const b = db.batch(); old.docs.forEach((d) => b.delete(d.ref)); await b.commit(); }
    } catch (e) { /* best-effort */ }
  }
});

/* ===================================================== */
/*  /clearStats — owner-only analytics reset             */
/* ===================================================== */
exports.clearStats = onRequest({ invoker: 'public' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  await deleteCollection('events', 400);
  await deleteCollection('stats_daily', 400);
  await db.doc('stats/global').delete().catch(() => {});
  res.json({ ok: true });
});

async function deleteCollection(path, batchSize) {
  while (true) {
    const snap = await db.collection(path).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < batchSize) break;
  }
}

/* ---------- settings (admin-tunable, read from Firestore) ---------- */
async function getSettings() {
  try {
    const snap = await db.doc('config/settings').get();
    return snap.exists ? snap.data() : {};
  } catch (e) { return {}; }
}

/* ===================================================== */
/*  Agent config — config/agent holds the agent's OWN     */
/*  keys, fully SEPARATE from the bot's config/llm. The    */
/*  owner supplies billable keys here for better models;   */
/*  the public bot never reads them, and they never reach  */
/*  the browser or any content/published doc.              */
/* ===================================================== */
// Synced copy of public/shared-schema.js — kept inside functions/ so it ships
// in the deploy package (the public/ dir is NOT uploaded). Refreshed from the
// canonical public/ copy by the functions predeploy hook in firebase.json.
const sharedSchema = require('./shared-schema');

async function getAgentConfig() {
  try {
    const snap = await db.doc('config/agent').get();
    const data = snap.exists ? snap.data() : {};
    return {
      active: data.active || sharedSchema.AGENT_CONFIG_DEFAULTS.active,
      refinerActive: data.refinerActive || data.active || sharedSchema.AGENT_CONFIG_DEFAULTS.refinerActive || sharedSchema.AGENT_CONFIG_DEFAULTS.active,
      byProvider: (data.byProvider && typeof data.byProvider === 'object') ? data.byProvider : {},
      refinerModel: data.refinerModel || null,
      imageProvider: data.imageProvider || null,
    };
  } catch (e) {
    return { active: 'gemini', refinerActive: 'gemini', byProvider: {}, refinerModel: null, imageProvider: null };
  }
}

// Resolve the agent's OWN key for a provider — from config/agent, NOT config/llm.
function resolveAgentKey(config, provider) {
  const pcfg = config && config.byProvider && Reflect.get(config.byProvider, provider);
  return (pcfg && pcfg.apiKey) || null;
}

// Drop raw keys so the loop + audit only ever see provider/model, never secrets.
function stripAgentConfigKeys(config) {
  const by = {};
  const src = (config && config.byProvider) || {};
  for (const id of Object.keys(src)) {
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
    const p = Reflect.get(src, id) || {};
    by[id] = { model: p.model || null, imageModel: p.imageModel || null };
  }
  return {
    active: config.active,
    refinerActive: config.refinerActive || config.active || null,
    byProvider: by,
    refinerModel: config.refinerModel || null,
    imageProvider: config.imageProvider || null,
  };
}

// Image generation keys — Gemini image model and/or OpenAI DALL·E (text-only providers skipped).
function resolveImageGenConfig(fullConfig) {
  const by = (fullConfig && fullConfig.byProvider) || {};
  const gemini = Reflect.get(by, 'gemini') || {};
  const openai = Reflect.get(by, 'openai') || {};
  const geminiKey = gemini.apiKey || null;
  const openaiKey = openai.apiKey || null;
  return {
    imageGemini: geminiKey ? { key: geminiKey, model: gemini.imageModel || null } : null,
    imageOpenai: openaiKey ? { key: openaiKey, model: openai.imageModel || null } : null,
    imagePrefer: fullConfig.imageProvider || null,
  };
}

/* ===================================================== */
/*  /agent — owner-only agentic tool loop                */
/* ===================================================== */
const { runAgentTurn } = require('./agent/loop');
const { undoLastChange, revertPath } = require('./agent/content-ops');

// invoker:'public' = the Cloud Run service ACCEPTS the request; auth is still
// enforced in-code by verifyOwner() (Firebase ID token === OWNER_EMAIL), exactly
// like chat/models/track. A browser can't auth at the Cloud Run IAM layer with a
// Firebase token, so this is the only way to call it from the admin — declaring
// it here stops a future deploy from silently dropping the allUsers binding.
exports.agent = onRequest({ invoker: 'public', timeoutSeconds: 300, memory: '512MiB' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const owner = await verifyOwner(req);
  if (!owner) return res.status(403).json({ error: 'forbidden' });

  const body = req.body || {};
  const { action, chatId, path: revertPathStr, before } = body;

  // Lightweight, non-LLM actions: turn-level undo and per-path revert.
  if (action === 'undo') {
    try {
      const result = await undoLastChange({ db, FieldValue, chatId: chatId || 'default' });
      return res.status(result.ok ? 200 : 404).json(result);
    } catch (e) {
      console.error('[agent/undo]', e && e.message);
      return res.status(500).json({ error: 'internal', message: e && e.message });
    }
  }

  if (action === 'revert-path') {
    if (!revertPathStr || typeof revertPathStr !== 'string') return res.status(400).json({ error: 'no-path' });
    try {
      const result = await revertPath({ db, FieldValue, path: revertPathStr, beforeValue: before });
      return res.status(result.ok ? 200 : 400).json(result);
    } catch (e) {
      console.error('[agent/revert]', e && e.message);
      return res.status(500).json({ error: 'internal', message: e && e.message });
    }
  }

  const { message, currentRoute, inboxMode, attachments: rawAttachments } = body;
  const msgText = typeof message === 'string' ? message : '';
  if (!msgText.trim() && !(Array.isArray(rawAttachments) && rawAttachments.length)) {
    return res.status(400).json({ error: 'no-message' });
  }

  const fullConfig = await getAgentConfig();
  const providerId = fullConfig.active || 'gemini';
  const providerKey = resolveAgentKey(fullConfig, providerId);
  const refinerProviderId = fullConfig.refinerActive || providerId;
  const refinerProviderKey = resolveAgentKey(fullConfig, refinerProviderId);
  const imageGen = resolveImageGenConfig(fullConfig);
  const settings = await getSettings();

  const multimodal = require('./agent/multimodal');
  let attachments = null;
  if (Array.isArray(rawAttachments) && rawAttachments.length) {
    const pcfg = (fullConfig.byProvider && fullConfig.byProvider[providerId]) || {};
    const model = pcfg.model || '';
    const visionVerified = body.visionVerified === true;
    if (!sharedSchema.acceptsVision(providerId, model, visionVerified)) {
      return res.status(400).json({
        error: 'unsupported-vision',
        message: `${providerId} / ${model || '(no model)'} does not support image attachments. Switch to a vision-capable model or run Test vision in Agent settings.`,
      });
    }
    try {
      attachments = multimodal.parseAttachments(rawAttachments);
    } catch (e) {
      const code = e && e.message;
      const map = {
        'invalid-attachments': 'Attachments must be an array.',
        'too-many-attachments': `At most ${multimodal.ATTACH_MAX_COUNT} images per message.`,
        'invalid-attachment': 'Invalid image attachment.',
        'empty-attachment': 'Empty image attachment.',
        'attachment-too-large': 'Image exceeds the 4 MB limit.',
        'not-an-image': 'Attachment is not a supported image (JPEG, PNG, GIF, WebP).',
      };
      return res.status(400).json({ error: code || 'invalid-attachment', message: map[code] || code });
    }
  }

  try {
    const result = await runAgentTurn({
      db,
      FieldValue,
      admin,                                            // for Admin-SDK Storage upload (image gen)
      agentConfig: stripAgentConfigKeys(fullConfig),   // model/provider only — no secrets pass deeper
      providerKey,                                      // the one resolved key, used to call the provider
      refinerProviderId,
      refinerProviderKey,
      imageGemini: imageGen.imageGemini,
      imageOpenai: imageGen.imageOpenai,
      imagePrefer: imageGen.imagePrefer,
      providerCatalog: PROVIDERS,
      message: String(msgText).slice(0, 8000),
      attachments,
      chatId: chatId || 'default',
      currentRoute: currentRoute || '/',
      inboxMode: !!inboxMode,
      settings,
    });
    const okTurn = result.status >= 200 && result.status < 300 && !(result.body && result.body.error);
    alog(okTurn ? 'INFO' : 'WARNING', 'agent:llm', {
      provider: fullConfig.active || 'gemini',
      model: (fullConfig.byProvider && fullConfig.byProvider[fullConfig.active || 'gemini'] || {}).model,
      ok: okTurn,
      summary: okTurn
        ? `turn ok · ${((result.body && result.body.toolCalls) || []).length} tool calls · ${((result.body && result.body.changedPaths) || []).length} changes`
        : `turn failed: ${(result.body && (result.body.message || result.body.error)) || 'error'}`,
    });
    return res.status(result.status).json(result.body);
  } catch (e) {
    alog('ERROR', 'agent:llm', { provider: fullConfig.active || 'gemini', ok: false, summary: (e && e.message) || 'internal error' });
    console.error('[agent]', e && e.message);
    return res.status(500).json({ error: 'internal', message: e && e.message });
  }
});

/* ===================================================== */
/*  /refine — owner-only inline field rewriter            */
/*  Single-shot, NO tools. Reuses the agent's own key      */
/*  (config/agent) + refinerModel (or the active model).   */
/* ===================================================== */
const agentProviders = require('./agent/providers');
const { checkDailyCap } = require('./agent/loop');
const {
  classifyInboxJunk,
  extractJson,
  normalizeSuggestion,
  purgeInboxJunk,
  triageQuestionBatch,
  mergeInboxRun,
  runScheduledInboxTriage,
} = require('./agent/inbox-triage');

exports.refine = onRequest({ invoker: 'public' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  const { text, fields, label, context } = req.body || {};
  const multi = fields && typeof fields === 'object' && !Array.isArray(fields);
  if (!multi && (!text || typeof text !== 'string')) return res.status(400).json({ error: 'no-text' });

  const settings = await getSettings();
  const cap = await checkDailyCap(db, FieldValue, settings);
  if (!cap.ok) return res.status(429).json({ error: 'daily-cap', message: 'Daily limit reached.' });

  const cfg = await getAgentConfig();
  const providerId = cfg.refinerActive || cfg.active || 'gemini';
  const provider = PROVIDERS[providerId];
  const key = resolveAgentKey(cfg, providerId);
  const pcfg = (cfg.byProvider && cfg.byProvider[providerId]) || {};
  const model = cfg.refinerModel || pcfg.model;
  if (!provider || !key || !model) return res.status(400).json({ error: 'no-config', message: 'Refiner provider/key/model not configured.' });

  const stripWrappingQuotes = (s) => {
    const t = String(s || '').trim();
    const pairs = [['"', '"'], ["'", "'"], ['\u201c', '\u201d'], ['\u2018', '\u2019']];
    for (const [open, close] of pairs) {
      if (t.startsWith(open) && t.endsWith(close) && t.length > 1) return t.slice(1, -1).trim();
    }
    return t;
  };

  const emTagGuidance = 'When a field supports inline HTML, wrap accent or highlight words in <em>...</em> (not double quotes or asterisks). Preserve existing <em> tags on proper nouns and key terms unless rewording removes them.';
  const noQuoteGuidance = 'Do not wrap output strings in double quotes, single quotes, or curly quotes — return plain text (or HTML) only.';

  const systemPrompt = multi
    ? [
      'You are an inline copy editor for a portfolio admin console.',
      'Rewrite ONLY the provided fields so they are tighter, clearer, and on-voice.',
      'Match the existing tone. Do not add new facts. Keep roughly the same length unless clearly bloated.',
      emTagGuidance,
      'Return ONLY a JSON object with the same keys and rewritten string values.',
      noQuoteGuidance + ' No preamble, no markdown fences, no explanation.',
    ].join(' ')
    : [
      'You are an inline copy editor for a portfolio admin console.',
      'Rewrite ONLY the provided field text so it is tighter, clearer, and on-voice.',
      'Match the existing tone. Do not add new facts. Keep roughly the same length unless it is clearly bloated.',
      emTagGuidance,
      'Return ONLY the rewritten text — no preamble, no markdown, no explanation.',
      noQuoteGuidance,
    ].join(' ');

  const fieldLines = multi
    ? Object.entries(fields).map(([k, v]) => `${k}: ${String(v == null ? '' : v).slice(0, 2000)}`).join('\n')
    : String(text).slice(0, 4000);
  const htmlHint = multi && Object.prototype.hasOwnProperty.call(fields, 'html')
    ? 'Note: the html field renders as inline HTML on the live site — use <em>...</em> for accent words.\n'
    : '';
  const userMsg = `Field: ${label || '(unlabeled)'}\n${context ? 'Context: ' + context + '\n' : ''}${htmlHint}\n${multi ? 'Fields to rewrite:\n' : 'Text to rewrite:\n'}${fieldLines}`;

  try {
    const gen = await agentProviders.generate(providerId, {
      endpoint: provider.endpoint,
      model, key,
      systemPrompt,
      messages: [{ role: 'user', text: userMsg, toolCalls: [], toolResults: [] }],
      tools: [],
      temperature: 0.6,
      maxTokens: multi ? 900 : 700,
    });
    const raw = (gen.text || '').trim();
    if (!raw) {
      alog('WARNING', 'agent:refine', { provider: providerId, model, ok: false, summary: 'empty rewrite for ' + (label || 'field') });
      return res.status(200).json({ error: 'empty', message: 'The model returned no text.' });
    }

    let proposal;
    if (multi) {
      const parsed = extractJson(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        alog('WARNING', 'agent:refine', { provider: providerId, model, ok: false, summary: 'invalid multi-field JSON for ' + (label || 'field') });
        return res.status(200).json({ error: 'bad-format', message: 'The model did not return valid JSON for the fields.' });
      }
      proposal = {};
      for (const k of Object.keys(fields)) {
        if (typeof parsed[k] === 'string') proposal[k] = stripWrappingQuotes(parsed[k]);
      }
      if (!Object.keys(proposal).length) {
        return res.status(200).json({ error: 'empty', message: 'The model returned no rewritten fields.' });
      }
    } else {
      proposal = stripWrappingQuotes(raw);
      if (!proposal) return res.status(200).json({ error: 'empty', message: 'The model returned no text.' });
    }

    alog('INFO', 'agent:refine', { provider: providerId, model, ok: true, summary: 'refined ' + (label || 'field') });
    return res.status(200).json({ proposal, provider: providerId, model });
  } catch (e) {
    alog('ERROR', 'agent:refine', { provider: providerId, model, ok: false, summary: (e && e.message) || 'provider error' });
    return res.status(200).json({ error: 'provider-error', message: e && e.message });
  }
});

/* ===================================================== */
/*  /logs — owner-only, read-only function-log feed       */
/*  Reads from Cloud Logging (the compute SA already has   */
/*  logging.logEntries.list via roles/editor). Nothing is  */
/*  stored — most recent page by default, only-newer via    */
/*  sinceMs for live polling, older via beforeMs. Powers    */
/*  the agent/bot Logs                                        */
/*  views and the Analytics "Function logs" tally.          */
/* ===================================================== */
// UI source → the Cloud Run service(s) whose logs it surfaces.
const LOG_SOURCES = {
  agent: ['agent', 'refine'],
  bot: ['chat', 'inboxProcess', 'inboxPurge', 'inboxWeekly'],
  all: ['agent', 'refine', 'chat', 'inboxProcess', 'inboxPurge', 'inboxWeekly', 'models', 'track', 'clearStats'],
};
// service name → coarse surface label for the UI.
function logSurface(svc) {
  if (svc === 'agent' || svc === 'refine') return 'agent';
  if (svc === 'chat' || svc === 'inboxProcess' || svc === 'inboxPurge' || svc === 'inboxWeekly') return 'bot';
  return 'system';
}
let _logging = null;
function loggingClient() {
  if (!_logging) { const { Logging } = require('@google-cloud/logging'); _logging = new Logging(); }
  return _logging;
}

exports.logs = onRequest({ invoker: 'public' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  const body = req.body || {};
  const source = LOG_SOURCES[body.source] ? body.source : 'all';
  const services = LOG_SOURCES[source];
  const errorsOnly = !!body.errorsOnly;
  const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 300);
  // Live polling passes sinceMs for newer-only; "load older" passes beforeMs to
  // page backwards; first load has no time window — just the newest page.
  const sinceMs = Number(body.sinceMs) || 0;
  const beforeMs = Number(body.beforeMs) || 0;
  let timeClause = '';
  if (sinceMs) timeClause = ` AND timestamp>"${new Date(sinceMs).toISOString()}"`;
  else if (beforeMs) timeClause = ` AND timestamp<"${new Date(beforeMs).toISOString()}"`;

  const svcFilter = services.map((s) => `resource.labels.service_name="${s}"`).join(' OR ');
  let filter = `resource.type="cloud_run_revision" AND (${svcFilter})${timeClause}`;
  if (errorsOnly) filter += ' AND severity>=WARNING';

  try {
    const [entries] = await loggingClient().getEntries({ filter, orderBy: 'timestamp desc', pageSize: limit });
    const out = [];
    for (const e of entries) {
      const md = e.metadata || {};
      const svc = (md.resource && md.resource.labels && md.resource.labels.service_name) || '';
      const ts = md.timestamp ? new Date(md.timestamp).getTime() : Date.now();
      const sev = md.severity || 'DEFAULT';
      let msg = '', amritos = null;
      const data = e.data;
      if (typeof data === 'string') msg = data;
      else if (data && typeof data === 'object') { amritos = data.amritos || null; msg = data.message || ''; }
      msg = String(msg || '').trim();
      if (!msg) continue;                       // skip request/system rows with no payload
      out.push({
        ts, severity: sev, service: svc, surface: logSurface(svc),
        message: msg.slice(0, 800),
        ...(amritos ? { kind: amritos.kind, provider: amritos.provider, model: amritos.model, ok: amritos.ok } : {}),
      });
    }
    return res.status(200).json({ entries: out, now: Date.now() });
  } catch (e) {
    console.error('[logs]', e && e.message);
    return res.status(500).json({ error: 'internal', message: e && e.message });
  }
});

/* ===================================================== */
/*  /testModel — owner-only connectivity check            */
/*  Sends a tiny "hello" to one provider using its stored  */
/*  key (agent config or bot config/llm), logs the result  */
/*  (so it appears in the Logs view) and returns the reply. */
/* ===================================================== */
const { runCapabilityProbes, probeVision } = require('./agent/capability-probes');

async function resolveProviderTestConfig(body) {
  const providerId = body.provider || 'gemini';
  const scope = body.scope === 'bot' ? 'bot' : 'agent';
  const prov = PROVIDERS[providerId];
  if (!prov) return { error: 'unknown-provider', status: 400 };
  const overrideKey = (typeof body.key === 'string' && body.key.trim()) ? body.key.trim() : null;
  let key, model;
  if (scope === 'bot') {
    let c = {}; try { const s = await db.doc('config/llm').get(); c = s.exists ? s.data() : {}; } catch (e) {}
    const pc = (c.byProvider && c.byProvider[providerId]) || {};
    key = overrideKey || pc.apiKey; model = body.model || pc.model;
  } else {
    const c = await getAgentConfig();
    key = overrideKey || resolveAgentKey(c, providerId);
    const pc = (c.byProvider && c.byProvider[providerId]) || {};
    model = body.model || pc.model;
  }
  if (!key) return { error: 'no-key', status: 400, message: `No ${scope} key saved for ${providerId}.` };
  if (!model) return { error: 'no-model', status: 400, message: `No model selected for ${providerId}.` };
  return { providerId, scope, prov, key, model };
}

exports.testCapabilities = onRequest({ invoker: 'public' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  const body = req.body || {};
  const cfg = await resolveProviderTestConfig(body);
  if (cfg.error) return res.status(cfg.status || 400).json({ error: cfg.error, message: cfg.message });

  const { providerId, scope, prov, key, model } = cfg;
  const kind = scope === 'bot' ? 'bot:llm' : 'agent:llm';
  const t0 = Date.now();
  const probes = Array.isArray(body.probes) ? body.probes : ['vision', 'url'];
  try {
    const results = await runCapabilityProbes({
      agentProviders,
      providerId,
      endpoint: prov.endpoint,
      model,
      key,
      testUrl: body.testUrl,
      probes,
    });
    const ms = Date.now() - t0;
    const parts = [];
    if (results.vision) parts.push(`vision ${results.vision.ok ? 'ok' : 'fail'}`);
    if (results.url) parts.push(`url ${results.url.ok ? 'ok' : (results.url.skipped ? 'skip' : 'fail')}`);
    if (results.search) parts.push(`search ${results.search.skipped ? 'skip' : (results.search.ok ? 'ok' : 'fail')}`);
    alog(parts.every((p) => p.includes('ok') || p.includes('skip')) ? 'INFO' : 'WARNING', kind, {
      provider: providerId, model, ok: true, test: true, capabilities: true,
      summary: `test capabilities (${ms}ms): ${parts.join(', ')}`,
    });
    return res.status(200).json({
      ok: true,
      provider: providerId,
      model,
      ms,
      vision: results.vision || null,
      url: results.url || null,
      search: results.search || null,
    });
  } catch (e) {
    alog('ERROR', kind, { provider: providerId, model, ok: false, test: true, capabilities: true, summary: `test capabilities failed: ${(e && e.message) || 'error'}` });
    return res.status(200).json({ ok: false, error: (e && e.message) || 'failed', provider: providerId, model });
  }
});

exports.testVision = onRequest({ invoker: 'public' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  const body = req.body || {};
  const cfg = await resolveProviderTestConfig(body);
  if (cfg.error) return res.status(cfg.status || 400).json({ error: cfg.error, message: cfg.message });

  const { providerId, scope, prov, key, model } = cfg;
  const kind = scope === 'bot' ? 'bot:llm' : 'agent:llm';
  const t0 = Date.now();
  try {
    const result = await probeVision({
      agentProviders, providerId, endpoint: prov.endpoint, model, key,
    });
    const ok = !!result.ok;
    const ms = result.ms || (Date.now() - t0);
    alog(ok ? 'INFO' : 'WARNING', kind, {
      provider: providerId, model, ok, test: true, vision: true,
      summary: ok ? `test vision ok (${ms}ms): ${(result.reply || '').slice(0, 80)}` : `test vision failed (${ms}ms): ${(result.reply || result.error || '').slice(0, 120) || 'empty reply'}`,
    });
    return res.status(200).json({ ok, reply: result.reply, error: result.error, provider: providerId, model, ms });
  } catch (e) {
    alog('ERROR', kind, { provider: providerId, model, ok: false, test: true, vision: true, summary: `test vision failed: ${(e && e.message) || 'error'}` });
    return res.status(200).json({ ok: false, error: (e && e.message) || 'failed', provider: providerId, model });
  }
});

exports.testModel = onRequest({ invoker: 'public' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  const body = req.body || {};
  const providerId = body.provider || 'gemini';
  const scope = body.scope === 'bot' ? 'bot' : 'agent';
  const prov = PROVIDERS[providerId];
  if (!prov) return res.status(400).json({ error: 'unknown-provider' });

  // Optional overrides let the admin test a key/model just typed but not yet
  // saved (same affordance as /models). Fall back to the stored config.
  const overrideKey = (typeof body.key === 'string' && body.key.trim()) ? body.key.trim() : null;
  let key, model;
  if (scope === 'bot') {
    let c = {}; try { const s = await db.doc('config/llm').get(); c = s.exists ? s.data() : {}; } catch (e) {}
    const pc = (c.byProvider && c.byProvider[providerId]) || {};
    key = overrideKey || pc.apiKey; model = body.model || pc.model;
  } else {
    const c = await getAgentConfig();
    key = overrideKey || resolveAgentKey(c, providerId);
    const pc = (c.byProvider && c.byProvider[providerId]) || {};
    model = body.model || pc.model;
  }
  if (!key) return res.status(400).json({ error: 'no-key', message: `No ${scope} key saved for ${providerId}.` });
  if (!model) return res.status(400).json({ error: 'no-model', message: `No model selected for ${providerId}.` });

  const kind = scope === 'bot' ? 'bot:llm' : 'agent:llm';
  const t0 = Date.now();
  try {
    const gen = await agentProviders.generate(providerId, {
      endpoint: prov.endpoint, model, key,
      systemPrompt: 'You are a connectivity test. Reply with a short, friendly one-line hello.',
      messages: [{ role: 'user', text: 'hello', toolCalls: [], toolResults: [] }],
      tools: [], temperature: 0.3, maxTokens: 60,
    });
    const reply = (gen.text || '').trim();
    const ms = Date.now() - t0;
    alog(reply ? 'INFO' : 'WARNING', kind, { provider: providerId, model, ok: !!reply, test: true, summary: `test model ${reply ? `ok (${ms}ms): ${reply.slice(0, 100)}` : 'returned empty reply'}` });
    return res.status(200).json({ ok: !!reply, reply, provider: providerId, model, ms });
  } catch (e) {
    alog('ERROR', kind, { provider: providerId, model, ok: false, test: true, summary: `test model failed: ${(e && e.message) || 'error'}` });
    return res.status(200).json({ ok: false, error: (e && e.message) || 'failed', provider: providerId, model });
  }
});

/* ===================================================== */
/*  /inboxPurge — owner-only junk + duplicate cleanup     */
/*  Rules-only (no LLM): single-word noise, repeated-word */
/*  patterns ("hello hello"), exact duplicates. Deletes   */
/*  from bot_questions and marks processed in inboxRun.   */
/* ===================================================== */
exports.inboxPurge = onRequest({ invoker: 'public' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  const { ids } = req.body || {};
  const purged = await purgeInboxJunk(db, {
    ids: Array.isArray(ids) && ids.length ? ids : null,
    limit: 300,
    alog,
  });
  if (purged.length) {
    await mergeInboxRun(db, FieldValue, { purgedIds: purged.map((p) => p.id) });
    alog('INFO', 'bot:inbox', { ok: true, auto: true, summary: `purged ${purged.length} junk/duplicate question(s)` });
  }
  return res.status(200).json({ purged, count: purged.length });
});

/* ===================================================== */
/*  /inboxProcess — owner-only inbox triage classifier    */
/*  Purges junk first, then classifies remaining ids in   */
/*  batches of 5. Suggestions merge into config/inboxRun */
/*  when called from the scheduled job; the admin client    */
/*  also persists locally after each chunk.               */
/* ===================================================== */
exports.inboxProcess = onRequest({ invoker: 'public', timeoutSeconds: 300, memory: '512MiB' }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!(await verifyOwner(req))) return res.status(403).json({ error: 'forbidden' });

  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'no-ids' });
  const useIds = ids.filter((x) => typeof x === 'string');

  const purged = await purgeInboxJunk(db, { ids: useIds, alog });
  const purgedSet = new Set(purged.map((p) => p.id));
  const triageIds = useIds.filter((id) => !purgedSet.has(id)).slice(0, 25);
  if (!triageIds.length) {
    if (purged.length) await mergeInboxRun(db, FieldValue, { purgedIds: purged.map((p) => p.id) });
    return res.status(200).json({ suggestions: [], processed: 0, purged });
  }

  const settings = await getSettings();
  const cap = await checkDailyCap(db, FieldValue, settings);
  if (!cap.ok) return res.status(429).json({ error: 'daily-cap', message: 'Daily limit reached.', purged });

  const cfg = await getAgentConfig();
  const providerId = cfg.active || 'gemini';
  const provider = PROVIDERS[providerId];
  const key = resolveAgentKey(cfg, providerId);
  const pcfg = (cfg.byProvider && cfg.byProvider[providerId]) || {};
  const model = pcfg.model;
  if (!provider || !key || !model) return res.status(400).json({ error: 'no-config', message: 'Agent provider/key/model not configured.', purged });

  try {
    const { suggestions, processed } = await triageQuestionBatch({
      db, ids: triageIds, agentProviders, providerId, provider, key, model, alog,
    });
    const sugMap = {};
    suggestions.forEach((s) => { if (s && s.id) sugMap[s.id] = s; });
    await mergeInboxRun(db, FieldValue, {
      suggestions: sugMap,
      processedIds: suggestions.map((s) => s.id).filter(Boolean),
      purgedIds: purged.map((p) => p.id),
    });
    return res.status(200).json({ suggestions, processed, purged, provider: providerId, model });
  } catch (e) {
    alog('ERROR', 'bot:inbox', { provider: providerId, model, ok: false, summary: 'inbox triage failed: ' + (e && e.message) });
    return res.status(200).json({ suggestions: [], processed: 0, purged, error: 'provider-error', message: e && e.message });
  }
});

/* ===================================================== */
/*  inboxWeekly — scheduled auto-triage (Monday 03:00 IST) */
/*  Purges junk, classifies all unprocessed inbox rows,   */
/*  persists suggestions to config/inboxRun. Logged as     */
/*  bot:inbox in AmritBot logs.                           */
/* ===================================================== */
exports.inboxWeekly = onSchedule({
  schedule: '0 3 * * 1',
  timeZone: 'Asia/Kolkata',
  timeoutSeconds: 540,
  memory: '512MiB',
}, async () => {
  await runScheduledInboxTriage({
    db, FieldValue, getAgentConfig, resolveAgentKey, PROVIDERS,
    agentProviders, checkDailyCap, getSettings, alog,
  });
});

module.exports._agentHelpers = { getAgentConfig, resolveAgentKey, resolveImageGenConfig, stripAgentConfigKeys, getSettings, db, FieldValue, verifyOwner, PROVIDERS, OWNER_EMAIL, extractJson, normalizeSuggestion };
