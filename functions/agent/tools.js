/* Agent tool registry — generic core + structured tools. */

const path = require('path');
const schema = require(path.join(__dirname, '../shared-schema'));
const {
  coerceImpactArray,
  normalizeImpactEntry,
  validateImpactWrite,
  normalizeProjectItem,
} = schema;
const { pathString } = require('./guards');
const { deepClone, getAtPath, undoLastChange } = require('./content-ops');
const { agentPublish } = require('./publish');
const multimodal = require('./multimodal');
const { fetchUrlText } = require('./url-fetch');
const { attachLinks } = require('./admin-links');
const {
  purgeInboxJunk,
  triageQuestionBatch,
  mergeInboxRun,
  loadInboxRun,
  extractJson,
} = require('./inbox-triage');
const { fetchAgentLogs } = require('./logs');
const {
  contentFingerprint,
  draftMatchesPublished,
  summarizeContent,
  compareDraftToPublished,
  getSiteHealth,
  searchContent,
  readAnalytics,
  getAnalyticsInsights,
  tsToMs,
} = require('./insights');

const GENERIC_TOOLS = [
  {
    name: 'readContent',
    description: [
      'Read a slice of the portfolio draft by dot-path. Always read before scoped edits.',
      'Use the Content outline (index/id/label) to pick the right path, then readContent for the full slice.',
      'Examples: hero · about.intro · about.impact · about.impact.1 · about.meta.0.value',
      'projects · projects.3 · projects.3.title · experience.0 · experience.1.roles.0.bullets',
      'expertise.2.icon · cards.1.body · bot.qa · cosmetics.theme',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Dot-path into content/draft. Arrays use numeric indices (projects.2.title). about.impact entries: {id,label,html}.',
        },
      },
      required: ['path'],
    },
    mutates: false,
  },
  {
    name: 'setContentPath',
    description: [
      'Set or merge a value at a dot-path in the portfolio draft. Blocked: bot.providers*, bot.behavior*, config.*.',
      'Scope: edit only what the user asked for. Prefer the narrowest leaf path; never replace a whole array when one entry changed.',
      'Leaf updates (safest): about.impact.1.html · about.impact.1.label · projects.3.title · projects.3.desc',
      'experience.0.company · experience.1.roles.2.name · experience.1.roles.0.bullets (pass full bullets array)',
      'Partial object at an index merges into that row (preserves siblings): about.impact.1 with {"html":"<p>…</p>"}',
      'projects.2 with {"title":"New name"} · experience.0 with {"desc":"…"} · experience.1.roles.0 with {"name":"BeGig"}',
      'about.impact root merge-by-label: path about.impact, value {"label":"Then","html":"<p>…</p>"} (matches label/id).',
      'Avoid replacing a collection root with a full array unless the user explicitly asked to rewrite the whole list.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Dot-path. Leaf: collection.N.field. Partial row: collection.N with JSON object (merged). Impact label merge: about.impact.',
        },
        value: { type: 'string', description: 'Value to write. Objects/arrays as compact JSON strings — parsed server-side.' },
      },
      required: ['path', 'value'],
    },
    mutates: true,
  },
];

const STRUCTURED_TOOLS = [
  { name: 'addItem', description: 'Append an item to a named collection (projects, expertise, experience, about.meta, about.impact, cards, contact.socials, bot.qa, bot.commands). For collection=projects, include desc (2–4 sentence summary) and tags (tech/skills array) when you know them; both are optional — add succeeds without them. Use desc not description.',
    parameters: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        item: {
          type: 'string',
          description: 'JSON string of the object to append. projects shape: {id?, title, cat?, type?, desc?, tags[]?, skills?, links?, image?, gallery?} — populate desc/tags when available.',
        },
      },
      required: ['collection', 'item'],
    },
    mutates: true },
  { name: 'removeItem', description: 'Remove an item from a collection by index or id.',
    parameters: { type: 'object', properties: { collection: { type: 'string' }, index: { type: 'number' }, id: { type: 'string' } }, required: ['collection'] }, mutates: true },
  { name: 'reorder', description: 'Reorder a collection to match the given order of ids or indices.',
    parameters: { type: 'object', properties: { collection: { type: 'string' }, order: { type: 'array', items: { type: 'string' } } }, required: ['collection', 'order'] }, mutates: true },
  { name: 'applyVibePreset', description: 'Apply a cosmetic vibe preset (classic, matrix, royal, crimson, lilac, sunset, solar, mono) to cosmetics.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, mutates: true },
  { name: 'setProjectImage', description: 'Set a project thumbnail or gallery image URL (place-only — no generation).',
    parameters: { type: 'object', properties: { id: { type: 'string' }, slot: { type: 'string', enum: ['thumb', 'gallery'] }, source: { type: 'string' } }, required: ['id', 'slot', 'source'] }, mutates: true },
  { name: 'generateImage', description: 'Generate a raster image from a text prompt (Gemini or OpenAI DALL·E), upload to Storage, attach to project thumb/gallery. Use only when owner explicitly asks to generate.',
    parameters: { type: 'object', properties: { prompt: { type: 'string' }, projectId: { type: 'string' }, slot: { type: 'string', enum: ['thumb', 'gallery'] } }, required: ['prompt', 'projectId', 'slot'] }, mutates: true, sideEffect: true },
  { name: 'setCv', description: 'Set a CV PDF path on media (light or dark slot).',
    parameters: { type: 'object', properties: { slot: { type: 'string', enum: ['light', 'dark'] }, source: { type: 'string' } }, required: ['slot', 'source'] }, mutates: true },
  { name: 'uploadAsset', description: 'Upload a base64 image or PDF to Storage. Optionally attach to a project (thumb/gallery) or CV slot (light/dark).',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'Base64 file data (optional data: URI prefix)' },
        kind: { type: 'string', enum: ['image', 'pdf', 'auto'], description: 'Sniff when auto' },
        attach: { type: 'string', enum: ['none', 'project', 'cv'], description: 'Where to place the uploaded URL' },
        projectId: { type: 'string' },
        slot: { type: 'string', description: 'project: thumb|gallery · cv: light|dark' },
      },
      required: ['data'],
    },
    mutates: true,
    sideEffect: true,
  },
  { name: 'setLimits', description: 'Update operational rate limits in config/settings (botRatePerHour, trackRatePerHour, eventRetentionDays, agentDailyTurnCap).',
    parameters: { type: 'object', properties: { botRatePerHour: { type: 'number' }, trackRatePerHour: { type: 'number' }, eventRetentionDays: { type: 'number' }, agentDailyTurnCap: { type: 'number' } } },
    mutates: false,
    sideEffect: true,
  },
  { name: 'publish', description: 'Publish the current draft to the live site. Strips API keys from the public copy. Use only when the owner explicitly asks to ship.',
    parameters: { type: 'object', properties: {} }, mutates: false, sideEffect: true },
  { name: 'undoLastChange', description: 'Restore content/draft from the most recent pre-turn snapshot.',
    parameters: { type: 'object', properties: {} }, mutates: false, sideEffect: true },
  { name: 'syncDraftFromPublished', description: 'Discard draft edits and reload content from the live published snapshot (preserves bot API keys from current draft).',
    parameters: { type: 'object', properties: {} }, mutates: true, sideEffect: true },
  { name: 'getDraftStatus', description: 'Compare draft vs published: fingerprints, timestamps, hasUnpublishedChanges.',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'getContentSummary', description: 'Structured draft outline: section counts, empty fields, missing images/CVs.',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'compareDraftToPublished', description: 'Human-readable diff of changed paths since last publish.',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'getSiteHealth', description: 'Validation: broken asset paths, projects without thumbs, empty expertise, etc.',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'getPublishInfo', description: 'Last publish time and scope of draft changes vs published.',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'searchContent', description: 'Search/filter draft content by text; optional path prefix to scope (e.g. projects).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        pathPrefix: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
    mutates: false,
  },
  { name: 'readAnalytics', description: 'Read stats/global, recent events, daily buckets (read-only).',
    parameters: { type: 'object', properties: { eventLimit: { type: 'number' } } }, mutates: false },
  { name: 'getAnalyticsInsights', description: 'Higher-level analytics: week-over-week, top referrers, trends.',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'getRecentVisitorActivity', description: 'Recent track events and bot_questions inbox slice.',
    parameters: { type: 'object', properties: { limit: { type: 'number' } } }, mutates: false },
  { name: 'readSettings', description: 'Read config/settings (rate limits, retention, agentDailyTurnCap).',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'readBotConfig', description: 'Non-secret bot config: active provider, models, systemPrompt preview (first 500 chars), qa count, behavior — NO api keys. Use readBotContext for the full system prompt.',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'readBotContext', description: 'Read the full AmritBot context tab: bot.systemPrompt (complete text) and bot.intro lines. Draft only — live /chat uses config/llm after publish.',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'setBotContext', description: 'Update bot.systemPrompt and/or bot.intro in content/draft. Does not auto-publish or touch config/llm — owner must publish (or activate providers) to go live.',
    parameters: {
      type: 'object',
      properties: {
        systemPrompt: { type: 'string', description: 'Full system instruction / context text' },
        intro: { type: 'array', items: { type: 'string' }, description: 'Intro lines shown when chat opens' },
      },
    },
    mutates: true,
  },
  { name: 'setBotBehavior', description: 'Update safe bot.behavior fields only (temperature, maxTokens, matchThreshold, tone). API keys remain blocked.',
    parameters: {
      type: 'object',
      properties: {
        temperature: { type: 'number' },
        maxTokens: { type: 'number' },
        matchThreshold: { type: 'number' },
        tone: { type: 'string', enum: ['casual-lowercase', 'professional', 'playful', 'concise'] },
      },
    },
    mutates: true,
  },
  { name: 'readAgentLogs', description: 'Recent Cloud Logging entries for agent/bot (filter source, errorsOnly).',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['agent', 'bot', 'all'] },
        errorsOnly: { type: 'boolean' },
        limit: { type: 'number' },
      },
    },
    mutates: false,
  },
  { name: 'refineField', description: 'Inline copy rewrite for a field (same as /refine). Returns a proposal — does NOT auto-apply.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        label: { type: 'string' },
        context: { type: 'string' },
        path: { type: 'string', description: 'Optional content path for context' },
        instruction: { type: 'string', description: 'Optional extra guidance' },
      },
      required: ['text'],
    },
    mutates: false,
  },
  { name: 'setConsoleTheme', description: 'Update admin console theme/accent in config/console (dark|light + hex accent).',
    parameters: {
      type: 'object',
      properties: {
        theme: { type: 'string', enum: ['dark', 'light'] },
        accent: { type: 'string', description: 'Hex accent e.g. #c8e856' },
      },
    },
    mutates: false,
    sideEffect: true,
  },
  { name: 'clearAnalytics', description: 'Wipe analytics (stats/global, stats_daily, events). Owner-only side effect.',
    parameters: { type: 'object', properties: {} }, mutates: false, sideEffect: true },
  { name: 'clearChatHistory', description: 'Clear agent chat messages for a chatId (default: default).',
    parameters: { type: 'object', properties: { chatId: { type: 'string' } } }, mutates: false, sideEffect: true },
  { name: 'listInboxQuestions', description: 'List recent visitor questions from bot_questions inbox.',
    parameters: { type: 'object', properties: { limit: { type: 'number' } } }, mutates: false },
  { name: 'runInboxTriage', description: 'LLM triage of inbox questions into suggestions (existing_phrase, new_question, irrelevant). Params: ids[] or limit for unprocessed.',
    parameters: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number', description: 'Max unprocessed to triage when ids omitted' },
      },
    },
    mutates: false,
    sideEffect: true,
  },
  { name: 'purgeInboxJunk', description: 'Rules-only junk/duplicate cleanup in bot_questions (no LLM).',
    parameters: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, limit: { type: 'number' } } }, mutates: false, sideEffect: true },
  { name: 'getInboxRunState', description: 'Read config/inboxRun triage state (suggestions, processed, timestamps).',
    parameters: { type: 'object', properties: {} }, mutates: false },
  { name: 'applyInboxSuggestion', description: 'Apply a triage suggestion: add phrase to existing Q&A, add new Q&A pair, or dismiss.',
    parameters: {
      type: 'object',
      properties: {
        inboxId: { type: 'string' },
        action: { type: 'string', enum: ['phrase', 'new_qa', 'dismiss'] },
        qs: { type: 'array', items: { type: 'string' } },
        as: { type: 'array', items: { type: 'string' } },
        phrasing: { type: 'string' },
        matchQuestion: { type: 'string' },
        matchIndex: { type: 'number' },
      },
      required: ['inboxId', 'action'],
    },
    mutates: true,
    sideEffect: true,
  },
  { name: 'generateInboxVariations', description: 'LLM-generate question phrasings and/or answer variations for an inbox question. Use before applyInboxSuggestion when owner wants options.',
    parameters: {
      type: 'object',
      properties: {
        inboxId: { type: 'string' },
        text: { type: 'string', description: 'Question text if inboxId lookup fails' },
        mode: { type: 'string', enum: ['phrases', 'answers', 'both'], description: 'What to generate' },
        instruction: { type: 'string' },
      },
    },
    mutates: false,
  },
  { name: 'dismissInboxQuestion', description: 'Delete a visitor question from the inbox without adding to Q&A.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, mutates: false, sideEffect: true },
  { name: 'acceptInboxToQA', description: 'Append a Q&A pair to bot.qa and remove the inbox question.',
    parameters: {
      type: 'object',
      properties: { inboxId: { type: 'string' }, qs: { type: 'array', items: { type: 'string' } }, as: { type: 'array', items: { type: 'string' } } },
      required: ['inboxId', 'qs', 'as'],
    },
    mutates: true,
    sideEffect: true,
  },
  { name: 'fetchUrl', description: 'Fetch a public HTTP(S) URL server-side and return a text excerpt for reasoning (size/time capped; blocks private hosts).',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Public http(s) URL to fetch' },
        maxChars: { type: 'number', description: 'Max excerpt characters (default 8000)' },
      },
      required: ['url'],
    },
    mutates: false,
  },
];

const ALL_TOOLS = GENERIC_TOOLS.concat(STRUCTURED_TOOLS);

function parseToolArgs(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return { _parseError: true, raw: raw.slice(0, 500) }; }
  }
  return { _parseError: true };
}

function coerceValue(v) {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if (!t) return v;
  if (/^[[{]/.test(t) || /^(true|false|null|-?\d)/.test(t)) {
    try { return JSON.parse(t); } catch (e) { /* leave as string */ }
  }
  return v;
}

function getCollectionArray(session, collectionName) {
  const meta = schema.validateCollection(collectionName);
  if (!meta) return { ok: false, error: 'unknown-collection', collection: collectionName };
  const arr = getAtPath(session.content, meta.path);
  if (!Array.isArray(arr)) return { ok: false, error: 'not-array', path: meta.path };
  return { ok: true, meta, arr, path: meta.path };
}

function findIndex(arr, meta, a) {
  if (typeof a.index === 'number' && a.index >= 0 && a.index < arr.length) return a.index;
  if (a.id && meta.idField) {
    const idx = arr.findIndex((item) => item && item[meta.idField] === a.id);
    if (idx >= 0) return idx;
  }
  return -1;
}

function applyRenumber(meta, arr) {
  if (meta.renumber === 'expertise') return schema.renumberExpertise(arr);
  return arr;
}

function tryMergeIndexedObject(session, pathStr, val) {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return null;
  const parts = String(pathStr).split('.').filter(Boolean);
  if (parts.length < 2 || !/^\d+$/.test(parts[parts.length - 1])) return null;
  const parentPath = parts.slice(0, -1).join('.');
  const idx = Number(parts[parts.length - 1]);
  const parent = session.readPath(parentPath);
  if (!Array.isArray(parent)) return null;
  const next = parent.slice();
  while (next.length <= idx) next.push({});
  const cur = next[idx];
  next[idx] = { ...(cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}), ...val };
  return { path: parentPath, value: next };
}

function validateNewItem(collectionName, item) {
  if (collectionName === 'expertise' && item.icon && !schema.validateExpertiseIcon(item.icon)) {
    return { ok: false, error: 'invalid-expertise-icon', icon: item.icon };
  }
  if (collectionName === 'contact.socials' && item.icon && !schema.validateSocialIcon(item.icon)) {
    return { ok: false, error: 'invalid-social-icon', icon: item.icon };
  }
  return { ok: true };
}

function execAddItem(a, session) {
  const col = getCollectionArray(session, a.collection);
  if (!col.ok) return col;
  let item = coerceValue(a.item);
  if (!item || typeof item !== 'object') return { ok: false, error: 'invalid-item' };
  if (a.collection === 'projects') {
    item = normalizeProjectItem(item);
  } else {
    const check = validateNewItem(a.collection, item);
    if (!check.ok) return check;
  }
  if (a.collection === 'about.impact') item = normalizeImpactEntry(item, col.arr.length);
  let next = col.arr.concat([deepClone(item)]);
  next = applyRenumber(col.meta, next);
  const result = session.setPath(col.path, next);
  if (a.collection === 'projects' && result.ok) {
    const missing = [];
    if (!String(item.desc || '').trim()) missing.push('desc');
    if (!item.tags.length) missing.push('tags');
    if (missing.length) {
      return {
        ...result,
        projectFieldsIncomplete: missing,
        hint: `Project added. Ask the owner to complete ${missing.join(' and ')} in the Projects editor (#projects).`,
      };
    }
  }
  return result;
}

function execRemoveItem(a, session) {
  const col = getCollectionArray(session, a.collection);
  if (!col.ok) return col;
  const idx = findIndex(col.arr, col.meta, a);
  if (idx < 0) return { ok: false, error: 'not-found' };
  let next = col.arr.filter((_, i) => i !== idx);
  next = applyRenumber(col.meta, next);
  return session.setPath(col.path, next);
}

function execReorder(a, session) {
  const col = getCollectionArray(session, a.collection);
  if (!col.ok) return col;
  const order = Array.isArray(a.order) ? a.order : [];
  const reordered = [];
  const used = new Set();
  for (const key of order) {
    let idx = -1;
    if (/^\d+$/.test(String(key))) idx = Number(key);
    else if (col.meta.idField) idx = col.arr.findIndex((item) => item && item[col.meta.idField] === key);
    if (idx >= 0 && idx < col.arr.length && !used.has(idx)) {
      used.add(idx);
      reordered.push(col.arr[idx]);
    }
  }
  for (let i = 0; i < col.arr.length; i++) {
    if (!used.has(i)) reordered.push(col.arr[i]);
  }
  return session.setPath(col.path, applyRenumber(col.meta, reordered));
}

function execApplyVibe(a, session) {
  const vibe = schema.getVibe(a.id);
  if (!vibe) return { ok: false, error: 'unknown-vibe', id: a.id };
  const cur = getAtPath(session.content, 'cosmetics') || {};
  return session.setPath('cosmetics', { ...cur, ...deepClone(vibe.cos) });
}

function execSetProjectImage(a, session) {
  const projects = getAtPath(session.content, 'projects');
  if (!Array.isArray(projects)) return { ok: false, error: 'no-projects' };
  const idx = projects.findIndex((p) => p && p.id === a.id);
  if (idx < 0) return { ok: false, error: 'project-not-found', id: a.id };
  const field = a.slot === 'gallery' ? 'gallery' : 'image';
  return session.setPath(`projects.${idx}.${field}`, String(a.source || ''));
}

function execSetCv(a, session) {
  const slot = a.slot === 'dark' ? 'cvDark' : 'cvLight';
  return session.setPath(`media.${slot}`, String(a.source || ''));
}

async function execGenerateImage(a, session, ctx) {
  if (!a.prompt || typeof a.prompt !== 'string') return { ok: false, error: 'missing-prompt' };
  if (!ctx.admin) return { ok: false, error: 'no-storage' };
  let gen;
  try {
    gen = await multimodal.generateImage({ gemini: ctx.imageGemini, openai: ctx.imageOpenai, prompt: a.prompt, prefer: ctx.imagePrefer });
  } catch (e) {
    return { ok: false, error: 'no-image-key', message: e.message };
  }
  let up;
  try { up = await multimodal.uploadImage({ admin: ctx.admin, buffer: gen.buffer }); }
  catch (e) { return { ok: false, error: 'upload-failed', message: e.message }; }
  const set = execSetProjectImage({ id: a.projectId, slot: a.slot, source: up.url }, session);
  if (!set.ok) {
    return { ok: true, url: up.url, path: up.path, provider: gen.provider, model: gen.model, warning: 'generated but not attached: ' + (set.error || '') };
  }
  return { ok: true, url: up.url, path: up.path, provider: gen.provider, model: gen.model, attached: `projects/${a.projectId}/${a.slot}` };
}

async function execUploadAsset(a, session, ctx) {
  if (!a.data) return { ok: false, error: 'missing-data' };
  if (!ctx.admin) return { ok: false, error: 'no-storage' };
  let buf;
  try { buf = multimodal.decodeBase64Asset(a.data); }
  catch (e) { return { ok: false, error: 'invalid-base64' }; }
  const kind = a.kind === 'pdf' ? 'pdf' : (a.kind === 'image' ? 'image' : 'auto');
  let up;
  try {
    up = await multimodal.uploadAsset({ admin: ctx.admin, buffer: buf, kind: kind === 'auto' ? undefined : kind });
  } catch (e) {
    return { ok: false, error: e.message || 'upload-failed' };
  }
  const attach = a.attach || 'none';
  if (attach === 'project' && a.projectId) {
    const slot = a.slot === 'gallery' ? 'gallery' : 'thumb';
    const set = execSetProjectImage({ id: a.projectId, slot, source: up.url }, session);
    if (!set.ok) return { ok: true, url: up.url, path: up.path, warning: 'uploaded but not attached: ' + set.error };
    return { ok: true, url: up.url, path: up.path, attached: `projects/${a.projectId}/${slot}` };
  }
  if (attach === 'cv') {
    const slot = a.slot === 'dark' ? 'dark' : 'light';
    execSetCv({ slot, source: up.url }, session);
    return { ok: true, url: up.url, path: up.path, attached: `media.cv${slot === 'dark' ? 'Dark' : 'Light'}` };
  }
  return { ok: true, url: up.url, path: up.path, mime: up.mime };
}

const LIMIT_RANGES = {
  botRatePerHour: [5, 120],
  trackRatePerHour: [30, 500],
  eventRetentionDays: [7, 180],
  agentDailyTurnCap: [10, 500],
};

async function execSetLimits(a, ctx) {
  const { db, FieldValue } = ctx;
  const snap = await db.doc('config/settings').get();
  const cur = snap.exists ? snap.data() : {};
  const patch = {};
  for (const [k, [min, max]] of Object.entries(LIMIT_RANGES)) {
    if (typeof a[k] === 'number') patch[k] = Math.max(min, Math.min(max, a[k]));
  }
  if (!Object.keys(patch).length) return { ok: false, error: 'no-fields' };
  patch.updatedAt = FieldValue.serverTimestamp();
  await db.doc('config/settings').set(patch, { merge: true });
  const limits = {};
  for (const k of Object.keys(LIMIT_RANGES)) limits[k] = patch[k] != null ? patch[k] : cur[k];
  return { ok: true, limits };
}

async function execPublish(ctx) {
  const { session, db, FieldValue } = ctx;
  return agentPublish({ db, FieldValue, content: session.content });
}

async function execUndo(ctx) {
  const { session, db, FieldValue, chatId } = ctx;
  const result = await undoLastChange({ db, FieldValue, chatId });
  if (result.ok) await session.load();
  return result;
}

async function loadPublishedContent(db) {
  try {
    const snap = await db.doc('content/published').get();
    if (!snap.exists) return null;
    return deepClone((snap.data() || {}).content || null);
  } catch (e) { return null; }
}

function mergeDraftApiKeys(target, source) {
  const next = deepClone(target);
  try {
    const curBy = source && source.bot && source.bot.providers && source.bot.providers.byProvider;
    const nextProv = next.bot && next.bot.providers;
    if (curBy && nextProv) {
      const by = { ...(nextProv.byProvider || {}) };
      for (const id of Object.keys(by)) {
        if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
        const curP = Reflect.get(curBy, id);
        const nextP = Reflect.get(by, id) || {};
        Reflect.set(by, id, { ...nextP, apiKey: (curP && typeof curP.apiKey === 'string') ? curP.apiKey : '' });
      }
      nextProv.byProvider = by;
    }
  } catch (e) { /* keep published as-is */ }
  return next;
}

async function execSyncDraftFromPublished(session, db) {
  const published = await loadPublishedContent(db);
  if (!published) return { ok: false, error: 'no-published' };
  const merged = mergeDraftApiKeys(published, session.content);
  session.content = merged;
  session.dirty = true;
  session.changedPaths.push('(sync-from-published)');
  return { ok: true, synced: true };
}

async function execGetDraftStatus(session, db) {
  const published = await loadPublishedContent(db);
  let pubSnap;
  let pubAt = null;
  try {
    pubSnap = await db.doc('content/published').get();
    if (pubSnap.exists) pubAt = pubSnap.data().updatedAt;
  } catch (e) { /* none */ }
  let draftAt = null;
  try {
    const d = await db.doc('content/draft').get();
    if (d.exists) draftAt = d.data().updatedAt;
  } catch (e) { /* none */ }
  const differs = published ? !draftMatchesPublished(session.content, published) : true;
  const draftMs = tsToMs(draftAt);
  const pubMs = tsToMs(pubAt);
  const hasUnpublishedChanges = differs || (draftMs && pubMs && draftMs > pubMs);
  return attachLinks({
    ok: true,
    hasUnpublishedChanges: !!hasUnpublishedChanges,
    draftDiffersFromPublished: differs,
    draftFingerprint: contentFingerprint(session.content).slice(0, 16) + '…',
    publishedFingerprint: published ? contentFingerprint(published).slice(0, 16) + '…' : null,
    draftUpdatedAt: draftMs,
    publishedUpdatedAt: pubMs,
  }, ['sync']);
}

async function execGetPublishInfo(session, db) {
  const published = await loadPublishedContent(db);
  let pubAt = null;
  try {
    const s = await db.doc('content/published').get();
    if (s.exists) pubAt = s.data().updatedAt;
  } catch (e) { /* none */ }
  const diff = published ? compareDraftToPublished(session.content, published) : { changedCount: 0, changes: [] };
  return attachLinks({
    ok: true,
    publishedAt: tsToMs(pubAt),
    hasPublished: !!published,
    pendingChanges: diff.changedCount,
    changePreview: diff.changes.slice(0, 15),
  }, ['sync']);
}

function execSetBotBehavior(a, session) {
  const beh = { ...(getAtPath(session.content, 'bot.behavior') || {}) };
  const ranges = { temperature: [0, 1], maxTokens: [64, 1024], matchThreshold: [0.1, 0.6] };
  const tones = new Set(['casual-lowercase', 'professional', 'playful', 'concise']);
  let changed = false;
  for (const [k, [min, max]] of Object.entries(ranges)) {
    if (typeof a[k] === 'number') { beh[k] = Math.max(min, Math.min(max, a[k])); changed = true; }
  }
  if (typeof a.tone === 'string' && tones.has(a.tone)) { beh.tone = a.tone; changed = true; }
  if (!changed) return { ok: false, error: 'no-fields' };
  session.content = setAtPathDirect(session.content, 'bot.behavior', beh);
  session.dirty = true;
  if (!session.changedPaths.includes('bot.behavior')) session.changedPaths.push('bot.behavior');
  return { ok: true, behavior: beh };
}

function setAtPathDirect(obj, dotPath, value) {
  const keys = String(dotPath).split('.').filter(Boolean);
  if (!keys.length) return value;
  const root = deepClone(obj);
  let node = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!node[k] || typeof node[k] !== 'object') node[k] = {};
    node = node[k];
  }
  node[keys[keys.length - 1]] = value;
  return root;
}

function readBotConfigSafe(content) {
  const bot = (content && content.bot) || {};
  const prov = bot.providers || {};
  const by = {};
  const src = prov.byProvider || {};
  for (const id of Object.keys(src)) {
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
    const p = Reflect.get(src, id) || {};
    by[id] = { model: p.model || null };
  }
  return {
    activeProvider: prov.active || null,
    byProvider: by,
    systemPrompt: (bot.systemPrompt || '').slice(0, 500),
    qaCount: Array.isArray(bot.qa) ? bot.qa.length : 0,
    commandCount: Array.isArray(bot.commands) ? bot.commands.length : 0,
    behavior: bot.behavior || {},
  };
}

const BOT_CONTEXT_MAX_PROMPT = 32000;
const BOT_CONTEXT_MAX_INTRO_LINES = 20;
const BOT_CONTEXT_MAX_INTRO_LINE = 500;

function readBotContextSafe(content) {
  const bot = (content && content.bot) || {};
  const systemPrompt = typeof bot.systemPrompt === 'string' ? bot.systemPrompt : '';
  const intro = Array.isArray(bot.intro)
    ? bot.intro.filter((s) => typeof s === 'string')
    : [];
  return {
    systemPrompt,
    systemPromptLength: systemPrompt.length,
    intro,
    qaCount: Array.isArray(bot.qa) ? bot.qa.length : 0,
    commandCount: Array.isArray(bot.commands) ? bot.commands.length : 0,
  };
}

function execSetBotContext(a, session) {
  let changed = false;
  if (typeof a.systemPrompt === 'string') {
    const sp = a.systemPrompt.slice(0, BOT_CONTEXT_MAX_PROMPT);
    session.content = setAtPathDirect(session.content, 'bot.systemPrompt', sp);
    if (!session.changedPaths.includes('bot.systemPrompt')) session.changedPaths.push('bot.systemPrompt');
    changed = true;
  }
  if (Array.isArray(a.intro)) {
    const intro = a.intro
      .filter((s) => typeof s === 'string')
      .map((s) => s.slice(0, BOT_CONTEXT_MAX_INTRO_LINE))
      .slice(0, BOT_CONTEXT_MAX_INTRO_LINES);
    session.content = setAtPathDirect(session.content, 'bot.intro', intro);
    if (!session.changedPaths.includes('bot.intro')) session.changedPaths.push('bot.intro');
    changed = true;
  }
  if (!changed) return { ok: false, error: 'no-fields' };
  session.dirty = true;
  const ctx = readBotContextSafe(session.content);
  return {
    ok: true,
    systemPromptLength: ctx.systemPromptLength,
    introCount: ctx.intro.length,
    hint: 'Draft updated. Use publish when the owner wants this live (copies to config/llm + content/published).',
  };
}

async function execListInbox(a, ctx) {
  const limit = Math.min(Number(a.limit) || 20, 50);
  const snap = await ctx.db.collection('bot_questions').orderBy('at', 'desc').limit(limit).get();
  return attachLinks({
    ok: true,
    items: snap.docs.map((d) => ({ id: d.id, q: d.data().q, at: d.data().at })),
  }, ['inbox']);
}

async function execDismissInbox(a, ctx) {
  if (!a.id) return { ok: false, error: 'missing-id' };
  await ctx.db.collection('bot_questions').doc(a.id).delete().catch(() => {});
  await mergeInboxRun(ctx.db, ctx.FieldValue, { purgedIds: [a.id] });
  return { ok: true, dismissed: a.id };
}

async function execAcceptInbox(a, session, ctx) {
  if (!a.inboxId || !Array.isArray(a.qs) || !Array.isArray(a.as)) return { ok: false, error: 'missing-fields' };
  const qs = a.qs.filter((s) => typeof s === 'string' && s.trim());
  const as = a.as.filter((s) => typeof s === 'string' && s.trim());
  if (qs.length === 0 || as.length === 0) return { ok: false, error: 'empty-qa-arrays' };
  const col = getCollectionArray(session, 'bot.qa');
  if (!col.ok) return col;
  const setResult = session.setPath(col.path, col.arr.concat([{ qs, as }]));
  if (!setResult.ok) return setResult;
  await ctx.db.collection('bot_questions').doc(a.inboxId).delete().catch(() => {});
  await mergeInboxRun(ctx.db, ctx.FieldValue, { purgedIds: [a.inboxId] });
  return attachLinks({ ok: true, added: true, inboxId: a.inboxId }, ['bot']);
}

async function execRunInboxTriage(a, ctx) {
  const { db, FieldValue, agentProviders, providerId, provider, providerKey, model } = ctx;
  if (!provider || !providerKey || !model) return { ok: false, error: 'no-config' };

  let ids = Array.isArray(a.ids) ? a.ids.filter((x) => typeof x === 'string') : [];
  if (!ids.length) {
    const run = await loadInboxRun(db);
    const processed = run.processed || {};
    const lim = Math.min(Number(a.limit) || 25, 25);
    const snap = await db.collection('bot_questions').orderBy('at', 'desc').limit(200).get();
    ids = snap.docs.map((d) => d.id).filter((id) => !processed[id]).slice(0, lim);
  }
  if (!ids.length) return attachLinks({ ok: true, suggestions: [], processed: 0, message: 'nothing-to-triage' }, ['inbox']);

  const purged = await purgeInboxJunk(db, { ids });
  const purgedSet = new Set(purged.map((p) => p.id));
  const triageIds = ids.filter((id) => !purgedSet.has(id));
  if (!triageIds.length) {
    if (purged.length) await mergeInboxRun(db, FieldValue, { purgedIds: purged.map((p) => p.id) });
    return attachLinks({ ok: true, suggestions: [], processed: 0, purged }, ['inbox']);
  }

  const { suggestions, processed } = await triageQuestionBatch({
    db, ids: triageIds, agentProviders, providerId, provider, key: providerKey, model,
  });
  const sugMap = {};
  suggestions.forEach((s) => { if (s && s.id) sugMap[s.id] = s; });
  await mergeInboxRun(db, FieldValue, {
    suggestions: sugMap,
    processedIds: suggestions.map((s) => s.id).filter(Boolean),
    purgedIds: purged.map((p) => p.id),
  });
  return attachLinks({ ok: true, suggestions, processed, purged, provider: providerId, model }, ['inbox']);
}

async function execPurgeInboxJunkTool(a, ctx) {
  const purged = await purgeInboxJunk(ctx.db, {
    ids: Array.isArray(a.ids) && a.ids.length ? a.ids : null,
    limit: a.limit || 300,
  });
  if (purged.length) await mergeInboxRun(ctx.db, ctx.FieldValue, { purgedIds: purged.map((p) => p.id) });
  return attachLinks({ ok: true, purged, count: purged.length }, ['inbox']);
}

async function execGetInboxRunState(ctx) {
  const run = await loadInboxRun(ctx.db);
  const sugCount = Object.keys(run.suggestions || {}).length;
  const procCount = Object.keys(run.processed || {}).length;
  return attachLinks({
    ok: true,
    suggestionCount: sugCount,
    processedCount: procCount,
    updatedAt: tsToMs(run.updatedAt),
    lastAutoRun: tsToMs(run.lastAutoRun),
    lastWeeklyRun: tsToMs(run.lastWeeklyRun),
  }, ['inbox']);
}

async function fetchInboxQuestion(db, id) {
  try {
    const s = await db.collection('bot_questions').doc(id).get();
    if (!s.exists) return null;
    return { id, q: String((s.data() || {}).q || '').trim() };
  } catch (e) { return null; }
}

async function execApplyInboxSuggestion(a, session, ctx) {
  if (!a.inboxId || !a.action) return { ok: false, error: 'missing-fields' };
  const qDoc = await fetchInboxQuestion(ctx.db, a.inboxId);
  if (!qDoc && a.action !== 'dismiss') return { ok: false, error: 'inbox-not-found' };

  if (a.action === 'dismiss') {
    await ctx.db.collection('bot_questions').doc(a.inboxId).delete().catch(() => {});
    await mergeInboxRun(ctx.db, ctx.FieldValue, { purgedIds: [a.inboxId] });
    return attachLinks({ ok: true, dismissed: a.inboxId }, ['inbox']);
  }

  const run = await loadInboxRun(ctx.db);
  const sug = (run.suggestions || {})[a.inboxId] || {};

  if (a.action === 'new_qa') {
    const qs = Array.isArray(a.qs) && a.qs.length ? a.qs : (sug.suggestedQuestions || [qDoc.q]);
    const as = Array.isArray(a.as) && a.as.length ? a.as : (sug.suggestedAnswers || ['']);
    return execAcceptInbox({ inboxId: a.inboxId, qs, as }, session, ctx);
  }

  if (a.action === 'phrase') {
    const phrasing = (a.phrasing || sug.phrasing || qDoc.q || '').trim();
    const botQa = getAtPath(session.content, 'bot.qa') || [];
    let idx = -1;
    const matchQ = (a.matchQuestion || sug.matchQuestion || '').trim().toLowerCase();
    if (matchQ) idx = botQa.findIndex((x) => (((x.qs && x.qs[0]) || '').trim().toLowerCase()) === matchQ);
    if (idx < 0 && Number.isInteger(a.matchIndex)) idx = a.matchIndex;
    else if (idx < 0 && Number.isInteger(sug.matchIndex)) idx = sug.matchIndex;
    if (idx < 0 || !botQa[idx]) {
      const qs = sug.suggestedQuestions || [qDoc.q];
      const as = sug.suggestedAnswers || [''];
      return execAcceptInbox({ inboxId: a.inboxId, qs, as }, session, ctx);
    }
    const cur = botQa[idx].qs || [];
    if (!cur.some((p) => p.trim().toLowerCase() === phrasing.toLowerCase())) {
      const next = botQa.slice();
      next[idx] = { ...next[idx], qs: [...cur, phrasing] };
      const setResult = session.setPath('bot.qa', next);
      if (!setResult.ok) return setResult;
    }
    await ctx.db.collection('bot_questions').doc(a.inboxId).delete().catch(() => {});
    await mergeInboxRun(ctx.db, ctx.FieldValue, { purgedIds: [a.inboxId] });
    return attachLinks({ ok: true, applied: 'phrase', inboxId: a.inboxId, qaIndex: idx }, ['bot']);
  }

  return { ok: false, error: 'unknown-action' };
}

async function execGenerateInboxVariations(a, ctx) {
  const { agentProviders, providerId, provider, providerKey, model, db } = ctx;
  if (!provider || !providerKey || !model) return { ok: false, error: 'no-config' };

  let text = String(a.text || '').trim();
  if (a.inboxId) {
    const q = await fetchInboxQuestion(db, a.inboxId);
    if (q && q.q) text = q.q;
    const run = await loadInboxRun(db);
    const sug = (run.suggestions || {})[a.inboxId];
    if (sug && sug.suggestedQuestions && sug.suggestedQuestions.length && a.mode !== 'answers') {
      return attachLinks({
        ok: true,
        inboxId: a.inboxId,
        fromTriage: true,
        suggestedQuestions: sug.suggestedQuestions,
        suggestedAnswers: sug.suggestedAnswers || [],
      }, ['inbox']);
    }
  }
  if (!text) return { ok: false, error: 'empty-text' };

  const mode = a.mode || 'both';
  const qa = getAtPath(ctx.session.content, 'bot.qa') || [];
  const qaList = qa.map((x, i) => `${i}: ${((x.qs && x.qs[0]) || '').slice(0, 100)}`).slice(0, 40).join('\n');
  const systemPrompt = [
    'You help expand a portfolio chatbot Q&A knowledge base.',
    'Given a visitor question and existing Q&A context, suggest variations.',
    mode === 'phrases' ? 'Return ONLY question phrasings (2-5 casual lowercase variants).' : '',
    mode === 'answers' ? 'Return ONLY short answer variants (1-3 casual lowercase answers, no markdown).' : '',
    mode === 'both' ? 'Return question phrasings AND answer variants.' : '',
    a.instruction ? `Owner guidance: ${String(a.instruction).slice(0, 300)}` : '',
    'Reply with ONLY JSON: {"suggestedQuestions":string[],"suggestedAnswers":string[]}. No fences.',
  ].filter(Boolean).join(' ');

  const userMsg = `EXISTING Q&A:\n${qaList || '(none)'}\n\nVisitor question:\n${text}`;

  const gen = await agentProviders.generate(providerId, {
    endpoint: provider.endpoint, model, key: providerKey,
    systemPrompt,
    messages: [{ role: 'user', text: userMsg, toolCalls: [], toolResults: [] }],
    tools: [], temperature: 0.5, maxTokens: 900,
  });

  const parsed = extractJson(gen.text);
  const strArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim().slice(0, 400)).slice(0, 6) : []);
  const suggestedQuestions = parsed ? strArr(parsed.suggestedQuestions) : [];
  const suggestedAnswers = parsed ? strArr(parsed.suggestedAnswers) : [];
  if (!suggestedQuestions.length && !suggestedAnswers.length) {
    return { ok: false, error: 'empty-variations', raw: (gen.text || '').slice(0, 200) };
  }
  return attachLinks({
    ok: true,
    inboxId: a.inboxId || null,
    text,
    suggestedQuestions: mode === 'answers' ? [] : suggestedQuestions,
    suggestedAnswers: mode === 'phrases' ? [] : suggestedAnswers,
    provider: providerId,
    model,
  }, ['inbox']);
}

async function execRefineField(a, ctx) {
  const { agentProviders, agentConfig, providerCatalog, refinerProviderId, refinerProviderKey } = ctx;
  const providerId = refinerProviderId || (agentConfig && agentConfig.active) || 'gemini';
  const provider = providerCatalog && providerCatalog[providerId];
  const providerKey = refinerProviderKey;
  if (!provider || !providerKey) return { ok: false, error: 'no-config' };
  const pcfg = (agentConfig && agentConfig.byProvider && agentConfig.byProvider[providerId]) || {};
  const model = (agentConfig && agentConfig.refinerModel) || pcfg.model;
  if (!model) return { ok: false, error: 'no-model' };

  const text = String(a.text || '').slice(0, 4000);
  const emTag = 'When a field supports inline HTML, wrap accent words in <em>...</em>. Return plain text/HTML only — no wrapping quotes.';
  const systemPrompt = [
    'You are an inline copy editor for a portfolio admin console.',
    'Rewrite ONLY the provided field text — tighter, clearer, on-voice. No new facts.',
    emTag,
    a.instruction ? `Extra instruction: ${String(a.instruction).slice(0, 300)}` : '',
    'Return ONLY the rewritten text.',
  ].filter(Boolean).join(' ');

  const pathCtx = a.path ? `\nContent path: ${a.path}` : '';
  const userMsg = `Field: ${a.label || a.path || '(unlabeled)'}${pathCtx}\n${a.context ? 'Context: ' + a.context + '\n' : ''}\nText:\n${text}`;

  const gen = await agentProviders.generate(providerId, {
    endpoint: provider.endpoint, model, key: providerKey,
    systemPrompt,
    messages: [{ role: 'user', text: userMsg, toolCalls: [], toolResults: [] }],
    tools: [], temperature: 0.6, maxTokens: 700,
  });
  const proposal = (gen.text || '').trim();
  if (!proposal) return { ok: false, error: 'empty' };
  return { ok: true, proposal, provider: providerId, model, applyHint: 'Use setContentPath to apply if the owner confirms.' };
}

async function execReadSettings(ctx) {
  try {
    const s = await ctx.db.doc('config/settings').get();
    const d = s.exists ? s.data() : {};
    return {
      ok: true,
      botRatePerHour: d.botRatePerHour,
      trackRatePerHour: d.trackRatePerHour,
      eventRetentionDays: d.eventRetentionDays,
      agentDailyTurnCap: d.agentDailyTurnCap,
      updatedAt: tsToMs(d.updatedAt),
    };
  } catch (e) {
    return { ok: false, error: 'read-failed' };
  }
}

async function execSetConsoleTheme(a, ctx) {
  const patch = {};
  if (a.theme === 'dark' || a.theme === 'light') patch.theme = a.theme;
  if (typeof a.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(a.accent.trim())) patch.accent = a.accent.trim();
  if (!Object.keys(patch).length) return { ok: false, error: 'no-fields' };
  patch.updatedAt = ctx.FieldValue.serverTimestamp();
  await ctx.db.doc('config/console').set(patch, { merge: true });
  return { ok: true, ...patch, updatedAt: undefined };
}

async function deleteCollection(db, collPath, batchSize) {
  while (true) {
    const snap = await db.collection(collPath).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < batchSize) break;
  }
}

async function execClearAnalytics(ctx) {
  await deleteCollection(ctx.db, 'events', 400);
  await deleteCollection(ctx.db, 'stats_daily', 400);
  await ctx.db.doc('stats/global').delete().catch(() => {});
  return attachLinks({ ok: true, cleared: true }, ['analytics']);
}

async function execClearChatHistory(a, ctx) {
  const cid = a.chatId || ctx.chatId || 'default';
  const col = ctx.db.collection(`agent_chats/${cid}/messages`);
  const snap = await col.limit(400).get();
  const batch = ctx.db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return { ok: true, chatId: cid, deleted: snap.size };
}

async function execFetchUrl(a) {
  try {
    const fetched = await fetchUrlText(a.url, { maxChars: a.maxChars });
    return {
      ok: true,
      url: fetched.url,
      marker: fetched.marker,
      bytes: fetched.bytes,
      excerpt: fetched.excerpt,
      chars: fetched.chars,
    };
  } catch (e) {
    return { ok: false, error: 'fetch-failed', message: e.message };
  }
}

async function execReadAgentLogs(a) {
  try {
    const data = await fetchAgentLogs({
      source: a.source || 'agent',
      errorsOnly: !!a.errorsOnly,
      limit: a.limit || 60,
    });
    return attachLinks({ ok: true, ...data }, ['logs']);
  } catch (e) {
    return { ok: false, error: 'logs-failed', message: e.message };
  }
}

async function execRecentVisitorActivity(a, ctx) {
  const lim = Math.min(Number(a.limit) || 20, 50);
  let events = [];
  let questions = [];
  try {
    const ev = await ctx.db.collection('events').orderBy('at', 'desc').limit(lim).get();
    events = ev.docs.map((d) => {
      const data = d.data() || {};
      return { id: d.id, type: data.type, source: data.source, at: tsToMs(data.at), meta: data.meta };
    });
  } catch (e) { /* empty */ }
  try {
    const q = await ctx.db.collection('bot_questions').orderBy('at', 'desc').limit(lim).get();
    questions = q.docs.map((d) => ({ id: d.id, q: d.data().q, at: tsToMs(d.data().at) }));
  } catch (e) { /* empty */ }
  return attachLinks({ ok: true, events, botQuestions: questions }, ['analytics', 'inbox']);
}

async function executeTool(name, args, ctx) {
  const a = parseToolArgs(args);
  if (a._parseError) return { ok: false, error: 'malformed-args' };
  const session = ctx.session;

  if (name === 'readContent') {
    if (!a.path || typeof a.path !== 'string') return { ok: false, error: 'missing-path' };
    return { ok: true, path: pathString(a.path), data: session.readPath(a.path) };
  }

  if (name === 'setContentPath') {
    if (!a.path || typeof a.path !== 'string') return { ok: false, error: 'missing-path' };
    if (!('value' in a)) return { ok: false, error: 'missing-value' };
    let val = coerceValue(a.value);
    let path = a.path;
    const parts = String(path).split('.').filter(Boolean);
    if (parts[0] === 'about' && parts[1] === 'impact' && parts.length === 2) {
      const impactErr = validateImpactWrite(val);
      if (impactErr) return { ok: false, ...impactErr };
      val = coerceImpactArray(val, session.readPath('about.impact'));
    } else {
      const merged = tryMergeIndexedObject(session, path, val);
      if (merged) {
        path = merged.path;
        val = merged.value;
        if (path === 'about.impact') val = coerceImpactArray(val, session.readPath('about.impact'));
      }
    }
    const result = session.setPath(path, val);
    return result.ok ? { ok: true, path: result.path } : result;
  }

  const handlers = {
    addItem: () => execAddItem(a, session),
    removeItem: () => execRemoveItem(a, session),
    reorder: () => execReorder(a, session),
    applyVibePreset: () => execApplyVibe(a, session),
    setProjectImage: () => execSetProjectImage(a, session),
    generateImage: () => execGenerateImage(a, session, ctx),
    setCv: () => execSetCv(a, session),
    uploadAsset: () => execUploadAsset(a, session, ctx),
    setLimits: () => execSetLimits(a, ctx),
    publish: () => execPublish(ctx),
    undoLastChange: () => execUndo(ctx),
    syncDraftFromPublished: () => execSyncDraftFromPublished(session, ctx.db),
    getDraftStatus: () => execGetDraftStatus(session, ctx.db),
    getContentSummary: () => attachLinks({ ok: true, ...summarizeContent(session.content) }, ['sync']),
    compareDraftToPublished: async () => {
      const pub = await loadPublishedContent(ctx.db);
      const diff = pub ? compareDraftToPublished(session.content, pub) : { changedCount: 0, changes: [], note: 'no-published' };
      return attachLinks({ ok: true, ...diff }, ['sync']);
    },
    getSiteHealth: () => attachLinks({ ok: true, ...getSiteHealth(session.content) }, ['projects']),
    getPublishInfo: () => execGetPublishInfo(session, ctx.db),
    searchContent: () => searchContent(session.content, a.query, a.pathPrefix, a.limit),
    readAnalytics: async () => attachLinks({ ok: true, ...(await readAnalytics(ctx.db, { eventLimit: a.eventLimit })) }, ['analytics']),
    getAnalyticsInsights: async () => attachLinks({ ok: true, ...(await getAnalyticsInsights(ctx.db)) }, ['analytics']),
    getRecentVisitorActivity: () => execRecentVisitorActivity(a, ctx),
    readSettings: () => execReadSettings(ctx),
    readBotConfig: () => attachLinks({ ok: true, config: readBotConfigSafe(session.content) }, ['bot']),
    readBotContext: () => attachLinks({ ok: true, context: readBotContextSafe(session.content) }, ['bot']),
    setBotContext: () => attachLinks(execSetBotContext(a, session), ['bot']),
    setBotBehavior: () => execSetBotBehavior(a, session),
    readAgentLogs: () => execReadAgentLogs(a),
    refineField: () => execRefineField(a, ctx),
    setConsoleTheme: () => execSetConsoleTheme(a, ctx),
    clearAnalytics: () => execClearAnalytics(ctx),
    clearChatHistory: () => execClearChatHistory(a, ctx),
    listInboxQuestions: () => execListInbox(a, ctx),
    runInboxTriage: () => execRunInboxTriage(a, ctx),
    purgeInboxJunk: () => execPurgeInboxJunkTool(a, ctx),
    getInboxRunState: () => execGetInboxRunState(ctx),
    applyInboxSuggestion: () => execApplyInboxSuggestion(a, session, ctx),
    generateInboxVariations: () => execGenerateInboxVariations(a, ctx),
    dismissInboxQuestion: () => execDismissInbox(a, ctx),
    acceptInboxToQA: () => execAcceptInbox(a, session, ctx),
    fetchUrl: () => execFetchUrl(a),
  };

  if (handlers[name]) return handlers[name]();
  return { ok: false, error: 'unknown-tool', name };
}

module.exports = {
  GENERIC_TOOLS,
  STRUCTURED_TOOLS,
  ALL_TOOLS,
  parseToolArgs,
  coerceValue,
  executeTool,
};
