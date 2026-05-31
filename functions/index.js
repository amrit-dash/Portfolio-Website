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

   Secrets posture: the only secrets (LLM API keys) live in Firestore
   `config/llm`, readable solely by these functions via the Admin SDK. Firestore
   rules deny all client access to that doc. See firestore.rules.
   ===================================================== */

const { onRequest } = require('firebase-functions/v2/https');
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

  // Owner (admin test panel) bypasses the rate limit entirely.
  const owner = await verifyOwner(req);
  if (!owner) {
    const settings = await getSettings();
    const limit = settings.botRatePerHour || 30;
    const limited = await rateLimited(hashIp(clientIp(req)), 'chat', limit, 3600_000);
    if (limited) return res.status(429).json({ error: 'rate-limit', message: "you've hit the chat limit for now — try again in a bit." });
  }

  // Log the question for the bot-training view (best-effort).
  db.collection('bot_questions').add({ at: FieldValue.serverTimestamp(), q: String(message).slice(0, 500) }).catch(() => {});

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
  const fail = (reason) => res.status(200).json({ text: null, fallback: true, ...(owner ? { error: reason } : {}) });

  // No key configured → tell the client to fall back to local Q&A.
  if (!provider || !key) return fail('No API key set for the active provider (' + active + '). Paste a key and click Activate.');

  const systemPrompt = (cfg && cfg.systemPrompt) || '';
  const temperature = Number(cfg && cfg.temperature) || 0.7;
  const maxTokens = Number(cfg && cfg.maxTokens) || 300;
  const userMsg = suggestion
    ? `Suggested answer from knowledge base: "${suggestion}"\n\nUser question: ${message}\n\nRespond using the suggested answer as reference. Rephrase naturally if needed. Keep to 1-2 sentences, casual lowercase, no markdown.`
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
      // OpenAI-compatible: openai, mistral, grok
      const bases = { openai: 'https://api.openai.com/v1/models', mistral: 'https://api.mistral.ai/v1/models', grok: 'https://api.x.ai/v1/models' };
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
exports.clearStats = onRequest(async (req, res) => {
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
