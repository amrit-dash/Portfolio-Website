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

function makeAssistantMessage(text, toolCalls, turnMeta) {
  const msg = {
    role: 'assistant',
    text: String(text || ''),
    toolCalls: Array.isArray(toolCalls) ? toolCalls : [],
    toolResults: [],
    attachments: null,
    ts: Date.now(),
  };
  if (turnMeta && typeof turnMeta === 'object') msg.turnMeta = turnMeta;
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

function toFirestore(msg) {
  const out = {
    role: msg.role,
    text: msg.text || '',
    toolCalls: msg.toolCalls || [],
    toolResults: msg.toolResults || [],
    attachments: msg.attachments || null,
    ts: msg.ts || Date.now(),
  };
  if (msg.turnMeta && typeof msg.turnMeta === 'object') out.turnMeta = msg.turnMeta;
  return out;
}

module.exports = {
  newId,
  makeUserMessage,
  makeAssistantMessage,
  makeToolResultMessage,
  fromFirestore,
  toFirestore,
};
