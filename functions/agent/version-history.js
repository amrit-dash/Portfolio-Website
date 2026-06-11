/* Published version ring (3) + single draft archive for Sync & Deploy history. */

const { deepClone, firestoreSafeValue } = require('./content-ops');

const MAX_PUBLISHED_VERSIONS = 3;

function stripKeys(content) {
  const c = deepClone(content || {});
  try {
    const by = c.bot && c.bot.providers && c.bot.providers.byProvider;
    if (by && typeof by === 'object') {
      for (const id of Object.keys(by)) {
        if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
        const item = Reflect.get(by, id);
        if (item && typeof item === 'object') item.apiKey = '';
      }
    }
  } catch (e) { /* no providers */ }
  return c;
}

async function saveLLMConfigPreserveKeys(db, FieldValue, strippedContent) {
  const llmSnap = await db.doc('config/llm').get();
  const cur = llmSnap.exists ? (llmSnap.data() || {}) : {};
  const bot = (strippedContent && strippedContent.bot) || {};
  const prov = bot.providers || {};
  const beh = bot.behavior || {};
  const curBy = (cur.byProvider && typeof cur.byProvider === 'object') ? cur.byProvider : {};
  const pubBy = (prov.byProvider && typeof prov.byProvider === 'object') ? prov.byProvider : {};
  const mergedBy = { ...pubBy };
  for (const id of Object.keys(curBy)) {
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
    const curP = Reflect.get(curBy, id) || {};
    const pubP = Reflect.get(mergedBy, id) || {};
    Reflect.set(mergedBy, id, {
      ...pubP,
      apiKey: (typeof curP.apiKey === 'string') ? curP.apiKey : '',
    });
  }
  await db.doc('config/llm').set({
    active: prov.active || cur.active || 'gemini',
    byProvider: mergedBy,
    systemPrompt: bot.systemPrompt != null ? bot.systemPrompt : (cur.systemPrompt || ''),
    temperature: typeof beh.temperature === 'number' ? beh.temperature : (typeof cur.temperature === 'number' ? cur.temperature : 0.7),
    maxTokens: typeof beh.maxTokens === 'number' ? beh.maxTokens : (typeof cur.maxTokens === 'number' ? cur.maxTokens : 300),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function tsToMs(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') { const n = Date.parse(ts); return Number.isFinite(n) ? n : null; }
  return null;
}

async function archiveDraftSnapshot({ db, FieldValue, content, source = 'autosave' }) {
  if (!content || typeof content !== 'object') return;
  await db.doc('content/draft_archive').set({
    content: firestoreSafeValue(deepClone(content)),
    updatedAt: FieldValue.serverTimestamp(),
    source,
  });
}

async function clearCurrentPublishedVersions(db, batch) {
  const existing = await db.collection('content/published_versions').get();
  existing.forEach((doc) => {
    if (doc.data().isCurrent) batch.update(doc.ref, { isCurrent: false });
  });
}

async function trimPublishedVersions(db, max = MAX_PUBLISHED_VERSIONS) {
  const all = await db.collection('content/published_versions').orderBy('publishedAt', 'desc').get();
  if (all.size <= max) return;
  const batch = db.batch();
  all.docs.slice(max).forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function archivePublishedVersion({ db, FieldValue, content, source = 'admin' }) {
  if (!content || typeof content !== 'object') return { ok: false, error: 'no-content' };
  const safe = stripKeys(content);
  const batch = db.batch();
  await clearCurrentPublishedVersions(db, batch);
  const newRef = db.collection('content/published_versions').doc();
  batch.set(newRef, {
    content: firestoreSafeValue(safe),
    publishedAt: FieldValue.serverTimestamp(),
    isCurrent: true,
    source,
  });
  await batch.commit();
  await trimPublishedVersions(db);
  return { ok: true, versionId: newRef.id };
}

async function revertToPublishedVersion({ db, FieldValue, versionId }) {
  if (!versionId) return { ok: false, error: 'no-version-id' };
  const versionRef = db.doc(`content/published_versions/${versionId}`);
  const snap = await versionRef.get();
  if (!snap.exists) return { ok: false, error: 'version-not-found' };
  const data = snap.data() || {};
  const content = deepClone(data.content || null);
  if (!content) return { ok: false, error: 'empty-version' };

  const batch = db.batch();
  const all = await db.collection('content/published_versions').get();
  all.forEach((doc) => {
    batch.update(doc.ref, { isCurrent: doc.id === versionId });
  });
  batch.set(db.doc('content/published'), {
    content: firestoreSafeValue(content),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await saveLLMConfigPreserveKeys(db, FieldValue, content);

  return {
    ok: true,
    reverted: true,
    versionId,
    content,
    publishedAt: tsToMs(data.publishedAt),
  };
}

module.exports = {
  MAX_PUBLISHED_VERSIONS,
  archiveDraftSnapshot,
  archivePublishedVersion,
  revertToPublishedVersion,
  trimPublishedVersions,
  tsToMs,
};
