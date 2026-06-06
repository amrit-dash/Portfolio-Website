/* Provider-neutral canonical message format for agent chat history.

   History is persisted ONCE in this shape and each provider adapter serializes
   canonical → native at turn start. tool-call ids correlate a call with its
   result so a thread survives a provider switch (see providers/*). */

const crypto = require('crypto');

function newId(prefix) {
  return prefix + '_' + crypto.randomBytes(8).toString('hex');
}

function makeUserMessage(text, attachments) {
  return {
    role: 'user',
    text: String(text || ''),
    toolCalls: [],
    toolResults: [],
    attachments: attachments || null,
    ts: Date.now(),
  };
}

function makeAssistantMessage(text, toolCalls, turnMeta, providerParts) {
  const msg = {
    role: 'assistant',
    text: String(text || ''),
    toolCalls: Array.isArray(toolCalls) ? toolCalls : [],
    toolResults: [],
    attachments: null,
    ts: Date.now(),
  };
  if (turnMeta && typeof turnMeta === 'object') msg.turnMeta = turnMeta;
  if (providerParts && typeof providerParts === 'object') msg.providerParts = providerParts;
  return msg;
}

function makeToolResultMessage(toolResults) {
  return {
    role: 'tool',
    text: '',
    toolCalls: [],
    toolResults: Array.isArray(toolResults) ? toolResults : [],
    attachments: null,
    ts: Date.now(),
  };
}

/* Normalize persisted Firestore docs back to canonical shape. */
function fromFirestore(doc) {
  if (!doc) return null;
  return {
    role: doc.role || 'user',
    text: doc.text || '',
    toolCalls: Array.isArray(doc.toolCalls) ? doc.toolCalls : [],
    toolResults: Array.isArray(doc.toolResults) ? doc.toolResults : [],
    attachments: doc.attachments || null,
    turnMeta: doc.turnMeta && typeof doc.turnMeta === 'object' ? doc.turnMeta : null,
    ts: doc.ts || (doc.createdAt && doc.createdAt.toMillis ? doc.createdAt.toMillis() : Date.now()),
  };
}

/* Persist attachment metadata only — never store base64 blobs in Firestore. */
function attachmentsMeta(attachments) {
  if (!attachments || !attachments.length) return null;
  return attachments.map((a) => ({
    mime: a.mime || null,
    bytes: Number(a.bytes) || (a.data ? Buffer.byteLength(String(a.data), 'base64') : 0) || null,
  }));
}

function toFirestore(msg) {
  const out = {
    role: msg.role,
    text: msg.text || '',
    toolCalls: msg.toolCalls || [],
    toolResults: msg.toolResults || [],
    attachments: attachmentsMeta(msg.attachments),
    ts: msg.ts || Date.now(),
  };
  if (msg.turnMeta && typeof msg.turnMeta === 'object') out.turnMeta = msg.turnMeta;
  if (Number.isFinite(msg.seq)) out.seq = msg.seq;
  return out;
}

function createdAtMs(doc) {
  const c = doc && doc.createdAt;
  if (!c) return 0;
  if (typeof c.toMillis === 'function') return c.toMillis();
  if (typeof c === 'number') return c;
  return 0;
}

/* Stable chronological order: ts, then createdAt, then role (user → assistant → tool). */
function sortCanonicalMessages(msgs) {
  const roleOrder = { user: 0, assistant: 1, tool: 2 };
  return [...(msgs || [])].sort((a, b) => {
    const ta = Number(a.ts) || 0;
    const tb = Number(b.ts) || 0;
    if (ta !== tb) return ta - tb;
    const ca = createdAtMs(a);
    const cb = createdAtMs(b);
    if (ca !== cb) return ca - cb;
    const sa = Number(a.seq);
    const sb = Number(b.seq);
    if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
    return (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
  });
}

/* Each persist batch stamps monotonic ts (+ role order) so Firestore orderBy('ts')
   never shuffles user / assistant / tool within a turn. */
function stampPersistOrder(messages) {
  const base = Date.now();
  (messages || []).forEach((msg, i) => {
    msg.ts = base + i;
    msg.seq = i;
  });
  return messages;
}

module.exports = {
  newId,
  makeUserMessage,
  makeAssistantMessage,
  makeToolResultMessage,
  fromFirestore,
  toFirestore,
  attachmentsMeta,
  createdAtMs,
  sortCanonicalMessages,
  stampPersistOrder,
};
