/* Agent tool loop — canonical messages, sequential mutating tools, caps. */

const { GENERIC_TOOLS, executeTool } = require('./tools');
const { DraftSession, buildOutline } = require('./content-ops');
const { filterToolsForMode, INBOX_SYSTEM_GUARD, wrapVisitorText } = require('./guards');
const {
  makeUserMessage,
  makeAssistantMessage,
  makeToolResultMessage,
  fromFirestore,
  toFirestore,
  newId,
} = require('./messages');
const { geminiGenerate, canonicalToGeminiContents } = require('./providers');

const MAX_TOOL_ITERS = 25;

const BASE_SYSTEM = [
  'You are the amrit.os admin agent. You edit the portfolio draft via tools only.',
  'Never claim changes were made unless a mutating tool succeeded.',
  'Use readContent to inspect paths before editing. Prefer setContentPath for leaf updates.',
  'You cannot change bot LLM providers, API keys, or behavior toggles.',
  'Publishing is not available in this mode — edits land in draft for owner review.',
].join(' ');

async function loadChatHistory(db, chatId) {
  const snap = await db.collection(`agent_chats/${chatId}/messages`).orderBy('ts', 'asc').limit(100).get();
  return snap.docs.map((d) => fromFirestore(d.data()));
}

async function persistMessages(db, FieldValue, chatId, messages) {
  const batch = db.batch();
  const chatRef = db.doc(`agent_chats/${chatId}`);
  batch.set(chatRef, { updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  for (const msg of messages) {
    const ref = db.collection(`agent_chats/${chatId}/messages`).doc(newId('msg'));
    batch.set(ref, { ...toFirestore(msg), createdAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
}

async function checkDailyCap(db, FieldValue, settings) {
  const today = new Date().toISOString().slice(0, 10);
  const ref = db.doc(`agent_daily/${today}`);
  const max = Number(settings.agentDailyTurnCap) || 200;
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (Number(snap.data().count) || 0) : 0;
    if (count >= max) return { ok: false, count, max };
    tx.set(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, count: count + 1, max };
  });
}

async function runAgentTurn({
  db,
  FieldValue,
  agentConfig,
  providerKey,
  providerCatalog,
  message,
  chatId,
  currentRoute,
  inboxMode,
  settings,
}) {
  const cap = await checkDailyCap(db, FieldValue, settings);
  if (!cap.ok) {
    return { status: 429, body: { error: 'daily-cap', message: 'Daily agent turn limit reached.', count: cap.count, max: cap.max } };
  }

  const providerId = agentConfig.provider || 'gemini';
  const provider = providerCatalog[providerId];
  const model = agentConfig.model;
  const key = providerKey;

  if (!provider || !key || !model) {
    return { status: 400, body: { error: 'no-config', message: 'Agent provider/key/model not configured.' } };
  }

  const turnId = newId('turn');
  const session = new DraftSession({ db, FieldValue, chatId: chatId || 'default' });
  await session.load();
  await session.saveSnapshot(turnId);

  const outline = buildOutline(session.content);
  const history = await loadChatHistory(db, chatId || 'default');
  const tools = filterToolsForMode(GENERIC_TOOLS, { inboxMode });
  const userText = inboxMode ? wrapVisitorText(message) : String(message || '');

  let systemPrompt = BASE_SYSTEM;
  if (inboxMode) systemPrompt += ' ' + INBOX_SYSTEM_GUARD;
  systemPrompt += `\nCurrent admin route: ${currentRoute || '/'}.\nContent outline: ${JSON.stringify(outline)}`;

  const toolLog = [];
  let reply = '';
  let iter = 0;
  let contents = canonicalToGeminiContents(history, userText);

  while (iter < MAX_TOOL_ITERS) {
    iter++;
    let gen;
    try {
      gen = await geminiGenerate({
        endpoint: provider.endpoint,
        model,
        key,
        systemPrompt,
        contents,
        tools,
        temperature: 0.4,
        maxTokens: 2048,
      });
    } catch (e) {
      return { status: 502, body: { error: 'provider-error', message: e.message } };
    }

    reply = gen.text || reply;
    const calls = gen.toolCalls || [];

    if (!calls.length) break;

    const modelParts = [];
    if (gen.text) modelParts.push({ text: gen.text });
    for (const tc of calls) {
      modelParts.push({ functionCall: { name: tc.name, args: tc.args || {} } });
    }
    contents = contents.concat([{ role: 'model', parts: modelParts }]);

    const responseParts = [];
    for (const tc of calls) {
      const toolDef = tools.find((t) => t.name === tc.name);
      let result;
      if (!toolDef) {
        result = { ok: false, error: 'unknown-tool' };
      } else {
        result = executeTool(tc.name, tc.args, session);
      }
      toolLog.push({ name: tc.name, args: tc.args, result });
      responseParts.push({
        functionResponse: { name: tc.name, response: result },
      });
    }
    contents = contents.concat([{ role: 'user', parts: responseParts }]);
  }

  if (iter >= MAX_TOOL_ITERS && toolLog.length) {
    reply = (reply ? reply + '\n\n' : '') + '(Turn stopped: tool iteration limit reached.)';
  }

  const commitResult = await session.commit();
  if (!commitResult.ok && commitResult.reason === 'stale-precondition') {
    return { status: 409, body: { error: 'stale-draft', message: 'Draft changed during the turn — retry.' } };
  }

  const newMessages = [
    makeUserMessage(message),
    makeAssistantMessage(reply, toolLog.map((t) => ({ id: newId('tc'), name: t.name, args: t.args }))),
  ];
  if (toolLog.length) {
    newMessages.push(makeToolResultMessage(toolLog.map((t, i) => ({
      id: 'tr_' + i,
      name: t.name,
      result: t.result,
    }))));
  }

  await persistMessages(db, FieldValue, chatId || 'default', newMessages);

  const perPathUndo = session.perPathRevertData();

  return {
    status: 200,
    body: {
      reply,
      turnId,
      toolCalls: toolLog,
      changedPaths: session.changedPaths,
      perPathUndo,
      reviewLinks: session.changedPaths.slice(0, 10).map((p) => ({ path: p })),
      bounded: iter >= MAX_TOOL_ITERS,
    },
  };
}

module.exports = {
  MAX_TOOL_ITERS,
  runAgentTurn,
  loadChatHistory,
  checkDailyCap,
};
