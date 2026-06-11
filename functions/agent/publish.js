/* Server-side publish — mirrors client fsPublish (stripKeys → published, bot
   keys → config/llm). The agent's OWN keys live in config/agent and are never
   part of content, so publish never sees or touches them. */

const { deepClone, firestoreSafeValue } = require('./content-ops');
const { archiveDraftSnapshot, archivePublishedVersion } = require('./version-history');

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

async function saveLLMConfig(db, FieldValue, content) {
  const bot = (content && content.bot) || {};
  const prov = bot.providers || {};
  const beh = bot.behavior || {};
  await db.doc('config/llm').set({
    active: prov.active || 'gemini',
    byProvider: prov.byProvider || {},
    systemPrompt: bot.systemPrompt || '',
    temperature: typeof beh.temperature === 'number' ? beh.temperature : 0.7,
    maxTokens: typeof beh.maxTokens === 'number' ? beh.maxTokens : 300,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function agentPublish({ db, FieldValue, content }) {
  if (!content || typeof content !== 'object') return { ok: false, error: 'no-content' };
  await archiveDraftSnapshot({ db, FieldValue, content, source: 'publish' });
  await archivePublishedVersion({ db, FieldValue, content, source: 'agent' });
  await saveLLMConfig(db, FieldValue, content);
  const safe = stripKeys(content);
  await db.doc('content/published').set({ content: safe, updatedAt: FieldValue.serverTimestamp() });
  await db.doc('content/draft').set({ content: firestoreSafeValue(deepClone(content)), updatedAt: FieldValue.serverTimestamp() });
  return { ok: true, published: true };
}

module.exports = { stripKeys, saveLLMConfig, agentPublish };
