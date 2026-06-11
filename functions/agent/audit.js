/* Agent turn audit persistence — key-safe, size-capped before/after values.

   Audit docs are owner-readable, so they must NEVER carry a secret: a full-doc
   recursive scan redacts any apiKey/secret/token field, and large values are
   replaced with a hash stub to stay well under the 1 MB Firestore doc limit. */

const crypto = require('crypto');
const { deepClone, firestoreSafeValue } = require('./content-ops');

const MAX_VALUE_BYTES = 8000;
const KEY_PATTERN = /apiKey|api_key|secret|token/i;

function stripKeyFields(obj, depth) {
  if (obj === undefined) return null;
  if (depth > 12 || obj == null) return obj;
  if (Array.isArray(obj)) return obj.map((v) => stripKeyFields(v, depth + 1));
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const k of Object.keys(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (KEY_PATTERN.test(k)) {
      out[k] = '[redacted]';
      continue;
    }
    out[k] = stripKeyFields(Reflect.get(obj, k), depth + 1);
  }
  return out;
}

function capAuditValue(val) {
  if (val === undefined) return null;
  const cleaned = stripKeyFields(val, 0);
  let json;
  try { json = JSON.stringify(cleaned); } catch (e) { return { _error: 'non-serializable' }; }
  if (json == null) return cleaned;
  if (json.length <= MAX_VALUE_BYTES) return firestoreSafeValue(cleaned);
  const hash = crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
  return { _truncated: true, _bytes: json.length, _hash: hash };
}

function sanitizeToolLog(toolLog) {
  return (toolLog || []).map((t) => ({
    name: t.name,
    args: capAuditValue(t.args || {}),
    result: capAuditValue(t.result || {}),
  }));
}

async function persistAudit(db, FieldValue, {
  chatId,
  turnId,
  provider,
  model,
  toolLog,
  changedPaths,
  perPathUndo,
}) {
  const id = 'audit_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  const doc = {
    chatId: chatId || 'default',
    turnId: turnId || null,
    provider: provider || null,
    model: model || null,
    tools: sanitizeToolLog(toolLog),
    changedPaths: changedPaths || [],
    perPathUndo: (perPathUndo || []).map((p) => ({
      path: p.path,
      before: capAuditValue(p.before),
      after: capAuditValue(p.after),
    })),
    createdAt: FieldValue.serverTimestamp(),
  };
  await db.doc(`agent_audit/${id}`).set(doc);
  return id;
}

module.exports = {
  MAX_VALUE_BYTES,
  stripKeyFields,
  capAuditValue,
  sanitizeToolLog,
  persistAudit,
};
