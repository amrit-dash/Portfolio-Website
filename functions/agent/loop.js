/* Agent tool loop — provider-agnostic, canonical messages, sequential mutating
   tools, per-turn + daily caps.

   The loop never speaks a provider's wire format directly: it builds canonical
   messages and hands them to providers.generate(providerId, …), which picks the
   native adapter. Content-mutating tools run SEQUENTIALLY against one in-memory
   draft copy, written back once at the end behind an updatedAt precondition. */

const { ALL_TOOLS, executeTool } = require('./tools');
const { DraftSession, buildOutline } = require('./content-ops');
const { archiveDraftSnapshot } = require('./version-history');
const { filterToolsForMode, INBOX_SYSTEM_GUARD, wrapVisitorText } = require('./guards');
const { persistAudit } = require('./audit');
const {
  makeUserMessage,
  makeAssistantMessage,
  makeToolResultMessage,
  fromFirestore,
  toFirestore,
  newId,
  sortCanonicalMessages,
  stampPersistOrder,
} = require('./messages');
const providers = require('./providers');
const agentProviders = providers;
const { inferQuickReplies } = require('./quick-replies');

const MAX_TOOL_ITERS = 25;

const BASE_SYSTEM = [
  'You are the amrit.os admin agent. You edit the portfolio draft via tools only.',
  'Never claim a change was made unless a mutating tool returned ok:true.',
  'Content outline lists array entries with index/id/label — use it to target the right row, then readContent before editing.',
  'Prefer setContentPath leaf paths for nitty-gritty edits: about.impact.1.html, about.impact.1.label, projects.3.title, experience.0.company, experience.1.roles.0.name.',
  'Partial row merge: setContentPath at collection.N with a JSON object updates only that index (siblings preserved). about.impact also merges by label at the collection root.',
  'Match the user\'s scope exactly: if they name one item (by label, id, or position), edit only that item — never rewrite sibling entries or whole arrays unless they explicitly ask.',
  'You cannot change the bot LLM provider, API keys, or behavior toggles — those paths are blocked.',
  'Use publish() only when the owner explicitly asks to ship changes to the live site.',
  'Structured tools (addItem, removeItem, reorder, applyVibePreset, applyCustomVibe, saveCustomVibe, listCustomVibes, readCustomVibe, readAppearanceConfig, updateAppearance, setProjectImage, setCv) handle arrays and presets safely.',
  'Appearance lives under cosmetics.* — animated wallpapers (circuits, waves, aurora, cosmos, matrixrain, particles, lightning, rain, binarystream, nebula, morphgeo, fluidcore, honeycombGlow, snowinteractive, ripplepool, fireflies), static patterns (3dgrid, honeycomb, padgrid), honeycombStyle (outline|fill), honeycombGlowDensity (honeycombGlow max simultaneous glow), interactive params (cursorInteractStrength, cursorTrailLength, cursorParticleDensity, cursorSweepRadius), global cursorEffect (none|trail|comet|ripple|spark|glow) with trail/comet/ripple sub-fields (cursorEffectTrailStyle, cursorEffectTrailLength, cursorEffectIntensity, cursorEffectRippleCount, cursorEffectRippleSpeed, cursorEffectCometDirection, cursorEffectCometIntensity, cursorEffectCometSpeed), wallpaperColor + wallpaperUseAccent (multi-tone looks), wallpaperAnimSpeed (global canvas/CSS motion), wallpaperRandomness, vignetteIntensity/Direction, 48 built-in vibe presets (20 core visible · 28 extended hidden in admin), unlimited customVibes slots (custom-* ids). Read: readAppearanceConfig. Write: updateAppearance (batch), setContentPath (single field), applyVibePreset / applyCustomVibe, saveCustomVibe.',
  'When addItem collection=projects, include desc (2–4 sentences: purpose, stack, outcome) and tags (relevant tech/skills) whenever you know them — both are optional and the add still succeeds without them. If omitted, nudge the owner to complete them in the Projects editor (#projects). Use field name desc, not description.',
  'generateImage creates raster art (Gemini or OpenAI DALL·E); setProjectImage places an existing URL or assets/ SVG — do not generate SVGs.',
  'For setContentPath/addItem, pass objects and arrays as compact JSON strings.',
  'Response format: Conversational replies use lightweight markdown only (**bold**, *italic*, `-` or `1.` lists) — never HTML.',
  'When offering choices (projects, thumb vs gallery, yes/no, or any pick-one prompt), list one option per line as `- option` or a numbered list — the admin UI renders these as quick-reply chips.',
  'After content edits, one short confirmation only (e.g. "I\'ve made the requested changes to your draft"); do NOT repeat rewritten field values, blockquotes, or long detail — the diff panel shows changes.',
  'Only include full rewritten copy when the user explicitly asks to see it.',
  'When the owner attaches images inline, you receive them — you CAN see and describe them; never claim you cannot analyze uploaded images.',
  'Tool JSON args stay plain text — never use markdown inside tool arguments.',
  'Many read/ops tools return links[] with adminLink + label — mention these when helpful so the owner can jump to the right admin screen.',
  'Inbox workflow: runInboxTriage → generateInboxVariations (optional) → applyInboxSuggestion. Use refineField for copy tweaks before applying.',
].join(' ');

async function loadChatMeta(db, chatId) {
  const snap = await db.doc(`agent_chats/${chatId}`).get();
  return snap.exists ? (snap.data() || {}) : {};
}

async function loadChatHistory(db, chatId) {
  const snap = await db.collection(`agent_chats/${chatId}/messages`).orderBy('ts', 'asc').limit(100).get();
  const raw = snap.docs.map((d) => fromFirestore({ ...d.data(), createdAt: d.data().createdAt }));
  return sortCanonicalMessages(raw.filter(Boolean));
}

/* When the provider changed since the last turn, foreign tool-call structures
   must not replay into the new API (Gemini ids ≠ OpenAI tool_call_ids → 400).
   Keep the conversational text, drop the tool turns. (Plan KD7.) */
function sanitizeHistoryForProvider(history, providerChanged) {
  if (!providerChanged) return history;
  return history
    .filter((m) => m.role !== 'tool')
    .map((m) => ({ ...m, toolCalls: [], toolResults: [], providerParts: null }))
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
  admin,
  agentConfig,
  providerKey,
  refinerProviderId,
  refinerProviderKey,
  imageGemini,
  imageOpenai,
  imagePrefer,
  providerCatalog,
  message,
  attachments,
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
  const turnStartedAt = Date.now();
  const session = new DraftSession({ db, FieldValue, chatId: cid });
  await session.load();
  await session.saveSnapshot(turnId);

  const outline = buildOutline(session.content);
  const meta = await loadChatMeta(db, cid);
  const providerChanged = !!meta.lastProvider && meta.lastProvider !== providerId;
  const rawHistory = await loadChatHistory(db, cid);
  const history = sanitizeHistoryForProvider(rawHistory, providerChanged);

  const tools = filterToolsForMode(ALL_TOOLS, { inboxMode });
  const toolCtx = {
    session, db, FieldValue, chatId: cid, admin, imageGemini, imageOpenai, imagePrefer,
    agentProviders,
    agentConfig: agentConfig,
    providerCatalog,
    providerId,
    provider,
    providerKey: key,
    refinerProviderId: refinerProviderId || providerId,
    refinerProviderKey: refinerProviderKey || key,
    model,
  };
  const userText = inboxMode ? wrapVisitorText(message) : String(message || '');

  let systemPrompt = BASE_SYSTEM;
  if (inboxMode) systemPrompt += ' ' + INBOX_SYSTEM_GUARD;
  systemPrompt += `\nCurrent admin route: ${currentRoute || '/'}.\nContent outline: ${JSON.stringify(outline)}`;

  const messages = history.concat([makeUserMessage(userText, attachments)]);
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
      const msg = (e && e.message) ? String(e.message) : 'Provider request failed';
      return { status: 502, body: { error: 'provider-error', provider: providerId, message: msg } };
    }

    reply = gen.text || reply;
    const calls = gen.toolCalls || [];

    // Record the assistant turn (text + any tool calls) in canonical form.
    // Gemini modelParts carry thoughtSignature — required for multi-step tool loops.
    const providerParts = gen.modelParts?.length ? { gemini: gen.modelParts } : null;
    messages.push(makeAssistantMessage(
      gen.text || '',
      calls.map((c) => ({
        id: c.id,
        name: c.name,
        args: c.args,
        thoughtSignature: c.thoughtSignature || null,
      })),
      null,
      providerParts,
    ));

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
  if (commitResult.ok && commitResult.changed) {
    await archiveDraftSnapshot({ db, FieldValue, content: session.content, source: 'agent' });
  }

  // Persist only the user + final-state canonical messages for this turn.
  // (The intermediate per-iteration assistant/tool messages stay in-memory; we
  //  store the user message, the assistant reply, and a flattened tool log so a
  //  reload reconstructs a coherent thread.)
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
  const quickReplies = inferQuickReplies({ reply, toolLog, outline });
  const repliedAt = Date.now();
  const durationMs = repliedAt - turnStartedAt;
  const turnMeta = {
    turnId,
    auditId,
    changedPaths: session.changedPaths,
    perPathUndo,
    provider: providerId,
    model,
    durationMs,
    repliedAt,
    bounded: iter >= MAX_TOOL_ITERS,
    ...(quickReplies.length ? { quickReplies } : {}),
  };
  const newMessages = [
    makeUserMessage(message, attachments),
    makeAssistantMessage(
      reply,
      toolLog.map((t) => ({ id: newId('tc'), name: t.name, args: t.args })),
      turnMeta,
    ),
  ];
  if (toolLog.length) {
    newMessages.push(makeToolResultMessage(toolLog.map((t, i) => ({ id: 'tr_' + i, name: t.name, result: t.result }))));
  }
  stampPersistOrder(newMessages);
  await persistMessages(db, FieldValue, cid, providerId, newMessages);

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
      durationMs,
      repliedAt,
      providerSwitched: providerChanged,
      quickReplies: quickReplies.length ? quickReplies : undefined,
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
