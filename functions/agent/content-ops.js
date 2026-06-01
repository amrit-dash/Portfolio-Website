/* Draft mutation core: array-aware path ops, blocklist, snapshots, undo.

   This is the safety-critical heart of the agent. Key properties:
   - setAtPath is ARRAY-AWARE: an index segment (e.g. about.meta.1.value) keeps
     the array an array, unlike the client copyIn/setAt which coerces it to an
     object. Do NOT "simplify" this back to the client shape.
   - Prototype-pollution guarded (__proto__/constructor/prototype rejected).
   - Every write path is checked against the blocklist before it lands.
   - commit() writes content/draft once per turn behind an updatedAt precondition
     so a stale client whole-doc .set() cannot silently clobber the agent. */

const { isBlocklisted, normalizePath, pathString, UNSAFE_KEY } = require('./guards');

const SNAPSHOT_RING = 10;

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function getAtPath(obj, path) {
  const keys = normalizePath(path);
  let node = obj;
  for (const k of keys) {
    if (node == null || UNSAFE_KEY(k)) return undefined;
    node = Array.isArray(node) && /^\d+$/.test(k) ? node[Number(k)] : node[k];
  }
  return node;
}

/* Array-aware set — index paths preserve arrays (unlike client setAt). */
function setAtPath(obj, path, value) {
  const keys = normalizePath(path);
  if (!keys.length) return value;
  if (isBlocklisted(keys)) {
    throw Object.assign(new Error('blocklisted-path'), { code: 'blocklisted', path: pathString(keys) });
  }

  function apply(node, depth) {
    if (depth === keys.length) return value;
    const k = keys[depth];
    if (UNSAFE_KEY(k)) return node;
    const nextK = keys[depth + 1];
    const nextIsIndex = nextK != null && /^\d+$/.test(nextK);

    if (Array.isArray(node)) {
      const idx = Number(k);
      const arr = node.slice();
      while (arr.length <= idx) arr.push(undefined);
      arr[idx] = apply(arr[idx], depth + 1);
      return arr;
    }

    const child = node && typeof node === 'object' ? node[k] : undefined;
    const base = node && typeof node === 'object' && !Array.isArray(node) ? { ...node } : {};
    if (nextIsIndex) {
      const seed = Array.isArray(child) ? child.slice() : [];
      base[k] = apply(seed, depth + 1);
    } else {
      base[k] = apply(child, depth + 1);
    }
    return base;
  }

  return apply(obj, 0);
}

/* Compact map of the draft for the system prompt — top-level keys, array
   lengths + ids, object key lists — so the model can target readContent without
   us shipping the whole document every turn (keeps per-turn tokens bounded). */
function buildOutline(content) {
  if (!content || typeof content !== 'object') return {};
  const outline = {};
  for (const key of Object.keys(content)) {
    if (UNSAFE_KEY(key)) continue;
    const val = content[key];
    if (Array.isArray(val)) {
      outline[key] = { type: 'array', length: val.length, ids: val.slice(0, 20).map((item, i) => (item && item.id) || String(i)) };
    } else if (val && typeof val === 'object') {
      outline[key] = { type: 'object', keys: Object.keys(val).slice(0, 30) };
    } else {
      outline[key] = { type: typeof val };
    }
  }
  return outline;
}

class DraftSession {
  constructor({ db, FieldValue, chatId }) {
    this.db = db;
    this.FieldValue = FieldValue;
    this.chatId = chatId || 'default';
    this.draftRef = db.doc('content/draft');
    this.content = null;
    this.priorUpdateTime = null;
    this.changedPaths = [];
    this.pathBefore = {};
    this.dirty = false;
    this.snapshotId = null;
  }

  async load() {
    const snap = await this.draftRef.get();
    const data = snap.exists ? snap.data() : {};
    this.content = deepClone(data.content || {});
    this.priorUpdateTime = data.updatedAt || null;
    return this.content;
  }

  readPath(path) {
    return getAtPath(this.content, path);
  }

  setPath(path, value) {
    const p = pathString(path);
    if (isBlocklisted(path)) {
      return { ok: false, error: 'blocklisted', path: p };
    }
    if (!(p in this.pathBefore)) {
      this.pathBefore[p] = deepClone(getAtPath(this.content, path));
    }
    try {
      this.content = setAtPath(this.content, path, value);
      if (!this.changedPaths.includes(p)) this.changedPaths.push(p);
      this.dirty = true;
      return { ok: true, path: p };
    } catch (e) {
      return { ok: false, error: e.code || 'set-failed', path: p, message: e.message };
    }
  }

  async saveSnapshot(turnId) {
    const id = turnId || ('turn_' + Date.now());
    this.snapshotId = id;
    const ref = this.db.doc(`agent_snapshots/${this.chatId}/turns/${id}`);
    await ref.set({
      content: deepClone(this.content),
      priorUpdateTime: this.priorUpdateTime,
      createdAt: this.FieldValue.serverTimestamp(),
    });
    await this.evictOldSnapshots();
    return id;
  }

  async evictOldSnapshots() {
    const col = this.db.collection(`agent_snapshots/${this.chatId}/turns`);
    const snap = await col.orderBy('createdAt', 'desc').offset(SNAPSHOT_RING).limit(50).get();
    if (snap.empty) return;
    const batch = this.db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async commit() {
    if (!this.dirty) return { ok: true, changed: false };
    const next = { content: this.content, updatedAt: this.FieldValue.serverTimestamp() };
    if (this.priorUpdateTime) {
      const result = await this.db.runTransaction(async (tx) => {
        const snap = await tx.get(this.draftRef);
        const cur = snap.exists ? snap.data().updatedAt : null;
        if (cur && this.priorUpdateTime && !timestampsEqual(cur, this.priorUpdateTime)) {
          return { ok: false, reason: 'stale-precondition' };
        }
        tx.set(this.draftRef, next);
        return { ok: true };
      });
      return { ...result, changed: result.ok };
    }
    await this.draftRef.set(next);
    return { ok: true, changed: true };
  }

  perPathRevertData() {
    return this.changedPaths.map((p) => ({
      path: p,
      before: this.pathBefore[p],
      after: deepClone(getAtPath(this.content, p)),
    }));
  }
}

function timestampsEqual(a, b) {
  if (!a || !b) return false;
  const ams = a.toMillis ? a.toMillis() : (a.seconds ? a.seconds * 1000 : Number(a));
  const bms = b.toMillis ? b.toMillis() : (b.seconds ? b.seconds * 1000 : Number(b));
  return ams === bms;
}

async function undoLastChange({ db, FieldValue, chatId }) {
  const col = db.collection(`agent_snapshots/${chatId || 'default'}/turns`);
  const snap = await col.orderBy('createdAt', 'desc').limit(1).get();
  if (snap.empty) return { ok: false, error: 'no-snapshot' };
  const doc = snap.docs[0];
  const { content, priorUpdateTime } = doc.data();
  const draftRef = db.doc('content/draft');
  await draftRef.set({ content: deepClone(content), updatedAt: FieldValue.serverTimestamp() });
  await doc.ref.delete();
  return { ok: true, restoredFrom: doc.id, priorUpdateTime };
}

async function revertPath({ db, FieldValue, path, beforeValue }) {
  const draftRef = db.doc('content/draft');
  const snap = await draftRef.get();
  const data = snap.exists ? snap.data() : {};
  let content = deepClone(data.content || {});
  content = setAtPath(content, path, beforeValue);
  await draftRef.set({ content, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true, path: pathString(path) };
}

module.exports = {
  SNAPSHOT_RING,
  deepClone,
  getAtPath,
  setAtPath,
  buildOutline,
  DraftSession,
  undoLastChange,
  revertPath,
  timestampsEqual,
};
