/* Agent tool registry — generic core + structured tools.

   Hybrid catalog (resolves OQ1): a generic readContent/setContentPath core does
   the bulk of edits (server-validated against the blocklist + enums), and a small
   set of structured tools handles what a generic setter does poorly — array
   add/remove/reorder, presets, images, publish/undo, and inbox triage. ~15 tools
   instead of ~50 → better tool-selection on weaker models, bounded context. */

const path = require('path');
const schema = require(path.join(__dirname, '../shared-schema'));
const { coerceImpactArray } = schema;
const { pathString } = require('./guards');
const { deepClone, getAtPath, undoLastChange } = require('./content-ops');
const { agentPublish } = require('./publish');
const multimodal = require('./multimodal');

const GENERIC_TOOLS = [
  {
    name: 'readContent',
    description: 'Read a slice of the portfolio draft by dot-path (e.g. hero, about.meta, projects.0, about.impact). Always read before scoped edits — use it to resolve array index and label/id when the user names a single entry.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Dot-path into content/draft' } },
      required: ['path'],
    },
    mutates: false,
  },
  {
    name: 'setContentPath',
    description: [
      'Set a value at a dot-path in the portfolio draft. Blocked paths include bot.providers*, bot.behavior*, config.*.',
      'Scope: edit only what the user asked for. Prefer the narrowest path; never replace a whole array when one entry changed.',
      'Impact timeline (about.impact) — each entry is {id, label, html}. Partial updates (preserve siblings):',
      '  • Leaf field: path about.impact.1.html, value "<p>New copy</p>" (index from readContent).',
      '  • One entry, multi-field: path about.impact.1, value {"label":"Then","html":"<p>…</p>"} (merges into that index).',
      '  • Match by label: path about.impact, value {"label":"Then","html":"<p>…</p>"} (server merges by label/id, keeps other entries).',
      'Avoid: path about.impact with a full array or a single entry object when the user only wanted one timeline row rewritten — that drops or overwrites siblings.',
      'Same pattern for other arrays: projects.2.title, experience.0.html, or collection root with one {id,…} object for merge-by-id.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Dot-path to set. For one array item use index segments (about.impact.1.html) or merge-by-label at collection root (about.impact).',
        },
        value: { type: 'string', description: 'Value to write. For objects/arrays pass a JSON string; it is parsed server-side.' },
      },
      required: ['path', 'value'],
    },
    mutates: true,
  },
];

const STRUCTURED_TOOLS = [
  {
    name: 'addItem',
    description: 'Append an item to a named collection (projects, expertise, experience, about.meta, about.impact, cards.items, contact.socials, bot.qa, bot.commands).',
    parameters: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        item: { type: 'string', description: 'JSON string of the object to append' },
      },
      required: ['collection', 'item'],
    },
    mutates: true,
  },
  {
    name: 'removeItem',
    description: 'Remove an item from a collection by index or id.',
    parameters: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        index: { type: 'number', description: 'Zero-based index' },
        id: { type: 'string', description: 'Item id (alternative to index)' },
      },
      required: ['collection'],
    },
    mutates: true,
  },
  {
    name: 'reorder',
    description: 'Reorder a collection to match the given order of ids or indices.',
    parameters: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of ids or index strings' },
      },
      required: ['collection', 'order'],
    },
    mutates: true,
  },
  {
    name: 'applyVibePreset',
    description: 'Apply a cosmetic vibe preset (classic, matrix, royal, crimson, lilac, sunset, solar, mono) to cosmetics.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    mutates: true,
  },
  {
    name: 'setProjectImage',
    description: 'Set a project thumbnail or gallery image URL (place-only — no generation).',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project id' },
        slot: { type: 'string', enum: ['thumb', 'gallery'] },
        source: { type: 'string', description: 'Image URL or assets/ path' },
      },
      required: ['id', 'slot', 'source'],
    },
    mutates: true,
  },
  {
    name: 'generateImage',
    description: 'Generate an image from a text prompt (Gemini image model), upload it, and attach it as a project thumbnail or gallery image. Use ONLY when the owner explicitly asks to generate/create an image — it costs model spend.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'What to generate' },
        projectId: { type: 'string', description: 'Project id to attach the result to' },
        slot: { type: 'string', enum: ['thumb', 'gallery'] },
      },
      required: ['prompt', 'projectId', 'slot'],
    },
    mutates: true,
    sideEffect: true,
  },
  {
    name: 'setCv',
    description: 'Set a CV PDF path on media (light or dark slot).',
    parameters: {
      type: 'object',
      properties: {
        slot: { type: 'string', enum: ['light', 'dark'] },
        source: { type: 'string', description: 'PDF URL or assets/ path' },
      },
      required: ['slot', 'source'],
    },
    mutates: true,
  },
  {
    name: 'setLimits',
    description: 'Update operational rate limits in config/settings.',
    parameters: {
      type: 'object',
      properties: {
        botRatePerHour: { type: 'number' },
        trackRatePerHour: { type: 'number' },
        eventRetentionDays: { type: 'number' },
        agentDailyTurnCap: { type: 'number' },
      },
    },
    mutates: false,
    sideEffect: true,
  },
  {
    name: 'publish',
    description: 'Publish the current draft to the live site. Strips API keys from the public copy. Use only when the owner explicitly asks to ship.',
    parameters: { type: 'object', properties: {} },
    mutates: false,
    sideEffect: true,
  },
  {
    name: 'undoLastChange',
    description: 'Restore content/draft from the most recent pre-turn snapshot.',
    parameters: { type: 'object', properties: {} },
    mutates: false,
    sideEffect: true,
  },
  {
    name: 'listInboxQuestions',
    description: 'List recent visitor questions from bot_questions inbox.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max items (default 20)' } },
    },
    mutates: false,
  },
  {
    name: 'dismissInboxQuestion',
    description: 'Delete a visitor question from the inbox without adding to Q&A.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    mutates: false,
    sideEffect: true,
  },
  {
    name: 'validateInboxQuestion',
    description: 'Classify a visitor question as greeting, real question, or injection attempt.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' }, text: { type: 'string' } },
    },
    mutates: false,
  },
  {
    name: 'acceptInboxToQA',
    description: 'Append a Q&A pair to bot.qa and remove the inbox question.',
    parameters: {
      type: 'object',
      properties: {
        inboxId: { type: 'string' },
        qs: { type: 'array', items: { type: 'string' } },
        as: { type: 'array', items: { type: 'string' } },
      },
      required: ['inboxId', 'qs', 'as'],
    },
    mutates: true,
    sideEffect: true,
  },
  {
    name: 'generateQAVariations',
    description: 'Suggest question phrasings for a visitor question (returns variations only).',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
    mutates: false,
  },
];

const ALL_TOOLS = GENERIC_TOOLS.concat(STRUCTURED_TOOLS);

/* Args arrive as objects (Gemini/Anthropic) or JSON strings (OpenAI). A few
   fields (item, value) are documented as JSON strings to stay schema-portable
   across providers that reject untyped/object params — parse them defensively. */
function parseToolArgs(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return { _parseError: true, raw: raw.slice(0, 500) }; }
  }
  return { _parseError: true };
}

/* A field that may arrive as a JSON string OR already-parsed value. */
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
  const item = coerceValue(a.item);
  if (!item || typeof item !== 'object') return { ok: false, error: 'invalid-item' };
  const check = validateNewItem(a.collection, item);
  if (!check.ok) return check;
  let next = col.arr.concat([deepClone(item)]);
  next = applyRenumber(col.meta, next);
  return session.setPath(col.path, next);
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
  if (!ctx.imageKey) return { ok: false, error: 'no-image-key', message: 'Set a Gemini key in Agent settings to generate images.' };
  if (!ctx.admin) return { ok: false, error: 'no-storage' };
  let buf;
  try { buf = await multimodal.geminiGenerateImage({ key: ctx.imageKey, model: ctx.imageModel, prompt: a.prompt }); }
  catch (e) { return { ok: false, error: 'gen-failed', message: e.message }; }
  let up;
  try { up = await multimodal.uploadImage({ admin: ctx.admin, buffer: buf }); }
  catch (e) { return { ok: false, error: 'upload-failed', message: e.message }; }
  const set = execSetProjectImage({ id: a.projectId, slot: a.slot, source: up.url }, session);
  if (!set.ok) return { ok: true, url: up.url, path: up.path, warning: 'generated but not attached: ' + (set.error || '') };
  return { ok: true, url: up.url, path: up.path, attached: `projects/${a.projectId}/${a.slot}` };
}

async function execSetLimits(a, ctx) {
  const { db, FieldValue } = ctx;
  const snap = await db.doc('config/settings').get();
  const cur = snap.exists ? snap.data() : {};
  const next = { ...cur };
  const ranges = {
    botRatePerHour: [5, 120],
    trackRatePerHour: [30, 500],
    eventRetentionDays: [7, 180],
    agentDailyTurnCap: [10, 500],
  };
  for (const [k, [min, max]] of Object.entries(ranges)) {
    if (typeof a[k] === 'number') next[k] = Math.max(min, Math.min(max, a[k]));
  }
  next.updatedAt = FieldValue.serverTimestamp();
  await db.doc('config/settings').set(next, { merge: true });
  return { ok: true, limits: next };
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

async function execListInbox(a, ctx) {
  const limit = Math.min(Number(a.limit) || 20, 50);
  const snap = await ctx.db.collection('bot_questions').orderBy('at', 'desc').limit(limit).get();
  return {
    ok: true,
    items: snap.docs.map((d) => ({ id: d.id, q: d.data().q, at: d.data().at })),
  };
}

async function execDismissInbox(a, ctx) {
  if (!a.id) return { ok: false, error: 'missing-id' };
  await ctx.db.collection('bot_questions').doc(a.id).delete().catch(() => {});
  return { ok: true, dismissed: a.id };
}

function execValidateInbox(a) {
  const text = String(a.text || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
  const greetings = new Set(['hi', 'hello', 'hey', 'yo', 'namaste', 'test', 'ping']);
  if (!text || greetings.has(text)) return { ok: true, verdict: 'greeting', action: 'discard' };
  if (/publish\s*\(|undoLastChange|ignore.*instruction|system prompt/i.test(String(a.text || ''))) {
    return { ok: true, verdict: 'injection', action: 'discard' };
  }
  return { ok: true, verdict: 'question', action: 'process' };
}

function execGenerateVariations(a) {
  const base = String(a.text || '').trim();
  if (!base) return { ok: false, error: 'empty-text' };
  const variations = [
    base,
    base.endsWith('?') ? base : base + '?',
    'tell me about ' + base.replace(/\?+$/, ''),
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  return { ok: true, variations: variations.slice(0, 3) };
}

async function execAcceptInbox(a, session, ctx) {
  if (!a.inboxId || !Array.isArray(a.qs) || !Array.isArray(a.as)) {
    return { ok: false, error: 'missing-fields' };
  }
  const col = getCollectionArray(session, 'bot.qa');
  if (!col.ok) return col;
  const setResult = session.setPath(col.path, col.arr.concat([{ qs: a.qs, as: a.as }]));
  if (!setResult.ok) return setResult;
  await ctx.db.collection('bot_questions').doc(a.inboxId).delete().catch(() => {});
  return { ok: true, added: true, inboxId: a.inboxId };
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
    const parts = String(a.path).split('.').filter(Boolean);
    if (parts[0] === 'about' && parts[1] === 'impact') {
      if (parts.length === 2) {
        val = coerceImpactArray(val, session.readPath('about.impact'));
      } else if (parts.length === 3 && /^\d+$/.test(parts[2]) && val && typeof val === 'object' && !Array.isArray(val)) {
        const idx = Number(parts[2]);
        const arr = coerceImpactArray(session.readPath('about.impact'), []);
        while (arr.length <= idx) arr.push({ id: 'imp_' + idx, label: '', html: '' });
        arr[idx] = { ...arr[idx], ...val };
        val = arr;
        a.path = 'about.impact';
      }
    }
    const result = session.setPath(a.path, val);
    return result.ok ? { ok: true, path: result.path } : result;
  }

  if (name === 'addItem') return execAddItem(a, session);
  if (name === 'removeItem') return execRemoveItem(a, session);
  if (name === 'reorder') return execReorder(a, session);
  if (name === 'applyVibePreset') return execApplyVibe(a, session);
  if (name === 'setProjectImage') return execSetProjectImage(a, session);
  if (name === 'generateImage') return execGenerateImage(a, session, ctx);
  if (name === 'setCv') return execSetCv(a, session);
  if (name === 'setLimits') return execSetLimits(a, ctx);
  if (name === 'publish') return execPublish(ctx);
  if (name === 'undoLastChange') return execUndo(ctx);
  if (name === 'listInboxQuestions') return execListInbox(a, ctx);
  if (name === 'dismissInboxQuestion') return execDismissInbox(a, ctx);
  if (name === 'validateInboxQuestion') return execValidateInbox(a);
  if (name === 'generateQAVariations') return execGenerateVariations(a);
  if (name === 'acceptInboxToQA') return execAcceptInbox(a, session, ctx);

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
