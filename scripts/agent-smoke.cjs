/* =====================================================
   Admin agent — local smoke test
   -----------------------------------------------------
   Runs a REAL agent turn against a REAL provider through the Firestore EMULATOR.
   No deploy, no production impact, no HTTP/auth layer — it calls runAgentTurn
   directly so you only need to supply a key. Validates the riskiest, hardest-to-
   unit-test parts: live provider serialization, the tool-loop, content-ops
   writes, and (with --provider switches) the native multi-provider adapters.

   Prereqs:
     1) Start the Firestore emulator:   firebase emulators:start --only firestore
     2) Run this with a key:
          AGENT_PROVIDER=gemini AGENT_MODEL=gemini-2.5-flash \
          AGENT_KEY=AIza... node scripts/agent-smoke.cjs

   Try other providers to validate their native adapters:
     AGENT_PROVIDER=anthropic AGENT_MODEL=claude-3-5-haiku-latest AGENT_KEY=sk-ant-... node scripts/agent-smoke.cjs
     AGENT_PROVIDER=openai    AGENT_MODEL=gpt-4o-mini            AGENT_KEY=sk-...     node scripts/agent-smoke.cjs
   ===================================================== */

const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const PROJECT = process.env.GCLOUD_PROJECT || 'amrit-dash-portfolio';

const PROVIDER = process.env.AGENT_PROVIDER || 'gemini';
const MODEL = process.env.AGENT_MODEL || 'gemini-2.5-flash';
const KEY = process.env.AGENT_KEY || '';

// Same catalog as functions/index.js PROVIDERS.
const PROVIDERS = {
  gemini:     { endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent' },
  openai:     { endpoint: 'https://api.openai.com/v1/chat/completions' },
  anthropic:  { endpoint: 'https://api.anthropic.com/v1/messages' },
  openrouter: { endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  mistral:    { endpoint: 'https://api.mistral.ai/v1/chat/completions' },
  grok:       { endpoint: 'https://api.x.ai/v1/chat/completions' },
};

admin.initializeApp({ projectId: PROJECT });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const { runAgentTurn } = require(path.join(__dirname, '../functions/agent/loop'));

const SAMPLE = {
  hero: { handle: '@amritdash', tagline: 'I build automation, bots and delightful web things.' },
  projects: [{ id: 'genkiflow', title: 'GenkiFlow', tags: ['rag', 'automation'] }],
  bot: { providers: { byProvider: { gemini: { apiKey: 'SHOULD_NEVER_CHANGE' } } } },
};

async function showHero(label) {
  const s = await db.doc('content/draft').get();
  const c = (s.exists && s.data().content) || {};
  console.log(`   [${label}] hero =`, JSON.stringify(c.hero));
  return c;
}

async function turn(message, inboxMode) {
  console.log(`\n▶ "${message}"`);
  const fullConfig = { active: PROVIDER, byProvider: { [PROVIDER]: { model: MODEL } } };
  const res = await runAgentTurn({
    db, FieldValue,
    agentConfig: fullConfig,
    providerKey: KEY,
    providerCatalog: PROVIDERS,
    message, chatId: 'smoke', currentRoute: '/', inboxMode: !!inboxMode,
    settings: {},
  });
  console.log('   status:', res.status);
  if (res.body.reply) console.log('   reply :', res.body.reply.slice(0, 240));
  if (res.body.toolCalls) console.log('   tools :', res.body.toolCalls.map((t) => `${t.name}(${t.result && t.result.ok === false ? '✗' : '✓'})`).join(', ') || '(none)');
  if (res.body.changedPaths) console.log('   paths :', res.body.changedPaths.join(', ') || '(none)');
  if (res.body.error) console.log('   error :', res.body.error, res.body.message || '');
  return res;
}

(async () => {
  if (!KEY) { console.error('✗ Set AGENT_KEY (and optionally AGENT_PROVIDER / AGENT_MODEL).'); process.exit(1); }
  console.log(`Provider: ${PROVIDER} · Model: ${MODEL} · Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  try {
    await db.doc('content/draft').set({ content: SAMPLE, updatedAt: FieldValue.serverTimestamp() });
  } catch (e) {
    console.error('✗ Could not reach the Firestore emulator. Start it first:\n    firebase emulators:start --only firestore');
    process.exit(1);
  }
  await showHero('seed');

  await turn('What is my hero tagline?');                      // expect: readContent + answer, no change
  await turn('Set my hero handle to @smoketest.');             // expect: setContentPath, handle changes
  await showHero('after set');
  await turn('Set bot.providers.byProvider.gemini.apiKey to HACKED.'); // expect: blocklisted, NO change
  const c = await showHero('after blocklist attempt');
  const keySafe = c.bot && c.bot.providers && c.bot.providers.byProvider.gemini.apiKey === 'SHOULD_NEVER_CHANGE';
  console.log(`\n   blocklist held: ${keySafe ? '✓ key untouched' : '✗ KEY WAS CHANGED — FAIL'}`);

  console.log('\n✓ Smoke run complete. Review the tool calls + paths above against expectations.');
  process.exit(0);
})().catch((e) => { console.error('smoke failed:', e && e.message); process.exit(1); });
