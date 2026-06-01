/* Agent tool loop — provider-agnostic, canonical messages, sequential mutating
   tools, per-turn + daily caps.

   The loop never speaks a provider's wire format directly: it builds canonical
   messages and hands them to providers.generate(providerId, …), which picks the
   native adapter. Content-mutating tools run SEQUENTIALLY against one in-memory
   draft copy, written back once at the end behind an updatedAt precondition. */

const { ALL_TOOLS, executeTool } = require('./tools');
const { DraftSession, buildOutline } = require('./content-ops');
const { filterToolsForMode, INBOX_SYSTEM_GUARD, wrapVisitorText } = require('./guards');
const { persistAudit } = require('./audit');
const {
  makeUserMessage,
  makeAssistantMessage,
  makeToolResultMessage,
  fromFirestore,
  toFirestore,
  newId,
} = require('./messages');
const providers = require('./providers');

const MAX_TOOL_ITERS = 25;

const BASE_SYSTEM = [
  'You are the amrit.os admin agent. You edit the portfolio draft via tools only.',
  'Never claim a change was made unless a mutating tool returned ok:true.',
  'Use readContent to inspect a path before editing it. Prefer setContentPath for leaf updates.',
  'You cannot change the bot LLM provider, API keys, or behavior toggles — those paths are blocked.',
  'Use publish() only when the owner explicitly asks to ship changes to the live site.',
  'Structured tools (addItem, removeItem, reorder, applyVibePreset, setProjectImage, setCv) handle arrays and presets safely.',
  'For setContentPath/addItem, pass objects and arrays as compact JSON strings.',
].join(' ');

async function loadChatMeta(db, chatId) {
  const snap = await db.doc(`agent_chats/${chatId}`).get();
  return snap.exists ? (snap.data() || {}) : {};
}

async function loadChatHistory(db, chatId) {
  const snap = await db.collection(`agent_chats/${chatId}/messages`).orderBy('ts', 'asc').limit(100).get();
  return snap.docs.map((d) => fromFirestore(d.data())).filter(Boolean);
}

/* When the provider changed since the last turn, foreign tool-call structures
   must not replay into the new API (Gemini ids ≠ OpenAI tool_call_ids → 400).
   Keep the conversational text, drop the tool turns. (Plan KD7.) */
function sanitizeHistoryForProvider(history, providerChanged) {
  if (!providerChanged) return history;
  return history
    .filter((m) => m.role !== 'tool')
    .map((m) => ({ ...m, toolCalls: [], toolResults: [] }))
    .filter((m) => m.text);
}

async function persistMessages(db, FieldValue, chatId, provider, messages) {
  const batch = db.batch();
  const chatRef = db.doc(`agent_chats/${chatId}`);
  batch.set(chatRef, { updatedAt: FieldValue.serverTimestamp(), lastProvider: provider }, { merge: true });
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

  const providerId = agentConfig.active || 'gemini';
  const provider = providerCatalog[providerId];
  const pcfg = (agentConfig.byProvider && agentConfig.byProvider[providerId]) || {};
  const model = pcfg.model;
  const key = providerKey;

  if (!provider || !key || !model) {
    return { status: 400, body: { error: 'no-config', message: `Agent ${providerId} provider/key/model not configured.` } };
  }

  const cid = chatId || 'default';
  const turnId = newId('turn');
  const session = new DraftSession({ db, FieldValue, chatId: cid });
  await session.load();
  await session.saveSnapshot(turnId);

  const outline = buildOutline(session.content);
  const meta = await loadChatMeta(db, cid);
  const providerChanged = !!meta.lastProvider && meta.lastProvider !== providerId;
  const rawHistory = await loadChatHistory(db, cid);
  const history = sanitizeHistoryForProvider(rawHistory, providerChanged);

  const tools = filterToolsForMode(ALL_TOOLS, { inboxMode });
  const toolCtx = { session, db, FieldValue, chatId: cid };
  const userText = inboxMode ? wrapVisitorText(message) : String(message || '');

  let systemPrompt = BASE_SYSTEM;
  if (inboxMode) systemPrompt += ' ' + INBOX_SYSTEM_GUARD;
  systemPrompt += `\nCurrent admin route: ${currentRoute || '/'}.\nContent outline: ${JSON.stringify(outline)}`;

  const messages = history.concat([makeUserMessage(userText)]);
  const toolLog = [];
  let reply = '';
  let iter = 0;

  while (iter < MAX_TOOL_ITERS) {
    iter++;
    let gen;
    try {
      gen = await providers.generate(providerId, {
        endpoint: provider.endpoint,
        model,
        key,
        systemPrompt,
        messages,
        tools,
        temperature: 0.4,
        maxTokens: 2048,
      });
    } catch (e) {
      return { status: 502, body: { error: 'provider-error', provider: providerId, message: e.message } };
    }

    reply = gen.text || reply;
    const calls = gen.toolCalls || [];

    // Record the assistant turn (text + any tool calls) in canonical form.
    messages.push(makeAssistantMessage(gen.text || '', calls.map((c) => ({ id: c.id, name: c.name, args: c.args }))));

    if (!calls.length) break;

    const toolResults = [];
    for (const tc of calls) {
      const toolDef = tools.find((t) => t.name === tc.name);
      let result;
      if (!toolDef) result = { ok: false, error: 'unknown-tool', name: tc.name };
      else result = await executeTool(tc.name, tc.args, toolCtx);
      toolLog.push({ name: tc.name, args: tc.args, result });
      toolResults.push({ id: tc.id, name: tc.name, result });
    }
    messages.push(makeToolResultMessage(toolResults));
  }

  if (iter >= MAX_TOOL_ITERS && toolLog.length) {
    reply = (reply ? reply + '\n\n' : '') + '(Turn stopped: tool iteration limit reached.)';
  }

  const commitResult = await session.commit();
  if (!commitResult.ok && commitResult.reason === 'stale-precondition') {
    return { status: 409, body: { error: 'stale-draft', message: 'Draft changed during the turn — retry.' } };
  }

  // Persist only the user + final-state canonical messages for this turn.
  // (The intermediate per-iteration assistant/tool messages stay in-memory; we
  //  store the user message, the assistant reply, and a flattened tool log so a
  //  reload reconstructs a coherent thread.)
  const newMessages = [
    makeUserMessage(message),
    makeAssistantMessage(reply, toolLog.map((t) => ({ id: newId('tc'), name: t.name, args: t.args }))),
  ];
  if (toolLog.length) {
    newMessages.push(makeToolResultMessage(toolLog.map((t, i) => ({ id: 'tr_' + i, name: t.name, result: t.result }))));
  }
  await persistMessages(db, FieldValue, cid, providerId, newMessages);

  const perPathUndo = session.perPathRevertData();
  const auditId = await persistAudit(db, FieldValue, {
    chatId: cid,
    turnId,
    provider: providerId,
    model,
    toolLog,
    changedPaths: session.changedPaths,
    perPathUndo,
  });

  return {
    status: 200,
    body: {
      reply,
      provider: providerId,
      model,
      turnId,
      auditId,
      toolCalls: toolLog,
      changedPaths: session.changedPaths,
      perPathUndo,
      reviewLinks: session.changedPaths.slice(0, 10).map((p) => ({ path: p })),
      bounded: iter >= MAX_TOOL_ITERS,
      providerSwitched: providerChanged,
    },
  };
}

module.exports = {
  MAX_TOOL_ITERS,
  runAgentTurn,
  loadChatHistory,
  sanitizeHistoryForProvider,
  checkDailyCap,
};
