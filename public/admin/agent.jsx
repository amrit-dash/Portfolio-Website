/* global React */
/* =====================================================
   amrit.os ADMIN — Agentic AI surface
   -----------------------------------------------------
   ONE agent, dual surface (FR1): a full-width Agent page and a floating dock on
   every screen, sharing a SINGLE chat session via a module-level store. The
   agent posts to /agent (owner token; key stays server-side), writes only to
   content/draft, and the editor adopts those writes live via U14. Each turn
   shows tool-call chips, per-path revert + turn-level undo, and review links.
   Settings live in a MODAL opened from the composer (no separate page).
   ===================================================== */
const { useState, useEffect, useRef } = React;

const AGENT_UI_CACHE_KEY = 'amritos.agentTurnMeta';
const ATTACH_MAX_DIM = 1920;
const ATTACH_MAX_BYTES = 4 * 1024 * 1024;
const ATTACH_MAX_COUNT = 4;

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image.')); };
    img.src = url;
  });
}

async function prepareImageAttachment(file) {
  const img = await loadImageFromFile(file);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const scale = Math.min(1, ATTACH_MAX_DIM / Math.max(w, h, 1));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  const mime = 'image/jpeg';
  let quality = 0.92;
  let blob = null;
  for (let i = 0; i < 10; i++) {
    blob = await new Promise((r) => canvas.toBlob(r, mime, quality));
    if (blob && blob.size <= ATTACH_MAX_BYTES) break;
    quality -= 0.1;
    if (quality < 0.35) break;
  }
  if (!blob || blob.size > ATTACH_MAX_BYTES) throw new Error('Image is too large — try a smaller file.');
  const data = bufToBase64(await blob.arrayBuffer());
  return { mime, data, bytes: blob.size, preview: URL.createObjectURL(blob) };
}

/* Flatten server turnMeta + local undo/revert state onto a UI message. */
function applyTurnMeta(msg, cache) {
  if (!msg || msg.role !== 'assistant') return msg;
  const tm = msg.turnMeta || (msg.turnId && cache && cache[msg.turnId]) || null;
  if (!tm) return msg;
  const cached = (msg.turnId && cache && cache[msg.turnId]) || {};
  const out = {
    ...msg,
    turnId: tm.turnId || msg.turnId,
    auditId: tm.auditId || msg.auditId,
    changedPaths: tm.changedPaths || msg.changedPaths || [],
    perPathUndo: tm.perPathUndo || msg.perPathUndo || [],
    provider: tm.provider || msg.provider,
    model: tm.model || msg.model,
    durationMs: tm.durationMs != null ? tm.durationMs : msg.durationMs,
    repliedAt: tm.repliedAt != null ? tm.repliedAt : msg.repliedAt,
    bounded: tm.bounded != null ? tm.bounded : msg.bounded,
    quickReplies: tm.quickReplies || msg.quickReplies,
    undone: cached.undone != null ? cached.undone : msg.undone,
    revertedPaths: cached.revertedPaths || msg.revertedPaths || {},
  };
  delete out.turnMeta;
  return out;
}

function readTurnMetaCache() {
  try { return JSON.parse(localStorage.getItem(AGENT_UI_CACHE_KEY) || '{}'); }
  catch (e) { return {}; }
}

function createdAtMs(doc) {
  const c = doc && doc.createdAt;
  if (!c) return 0;
  if (typeof c.toMillis === 'function') return c.toMillis();
  if (typeof c === 'number') return c;
  return 0;
}

/* Match server sortCanonicalMessages — fixes legacy rows that share the same ts. */
function sortRawMessages(raw) {
  const roleOrder = { user: 0, assistant: 1, tool: 2 };
  return [...(raw || [])].sort((a, b) => {
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

function formatMsgTime(ts) {
  if (!ts) return '';
  try {
    return new Date(Number(ts)).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) { return ''; }
}

function formatDurationSec(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  return Math.round(ms / 1000) + 's';
}

/* True when this turn successfully cleared persisted chat history. */
function turnClearedHistory(toolCalls) {
  return (toolCalls || []).some(
    (t) => t.name === 'clearChatHistory' && t.result && t.result.ok !== false,
  );
}

/* Collect unique admin deep links from tool results (server attachLinks helper). */
function collectToolLinks(toolCalls) {
  const seen = new Set();
  const out = [];
  for (const tc of toolCalls || []) {
    const links = tc && tc.result && tc.result.links;
    if (!Array.isArray(links)) continue;
    for (const l of links) {
      if (!l || !l.adminLink || seen.has(l.adminLink)) continue;
      seen.add(l.adminLink);
      out.push(l);
    }
  }
  return out;
}

function assistantUiFromRaw(assistant, toolMsg) {
  const tm = assistant.turnMeta || {};
  const toolResults = toolMsg && Array.isArray(toolMsg.toolResults) ? toolMsg.toolResults : [];
  const toolCalls = (assistant.toolCalls || []).map((tc, j) => ({
    name: tc.name,
    args: tc.args,
    result: (toolResults[j] && toolResults[j].result)
      || (toolResults.find((tr) => tr.name === tc.name) || {}).result,
  }));
  return {
    role: 'assistant',
    text: assistant.text || '',
    restored: true,
    ts: assistant.ts,
    turnId: tm.turnId,
    turnMeta: assistant.turnMeta || null,
    provider: tm.provider,
    model: tm.model,
    durationMs: tm.durationMs,
    repliedAt: tm.repliedAt,
    quickReplies: tm.quickReplies || assistant.quickReplies || undefined,
    toolCalls: toolCalls.length ? toolCalls : undefined,
  };
}

function hasUserContent(m) {
  return m && m.role === 'user' && ((m.text || '').trim() || (m.attachments || []).length);
}

function hasAssistantContent(m) {
  return m && m.role === 'assistant' && ((m.text || '').trim() || (m.toolCalls || []).length);
}

/* Drop duplicate assistant bubbles (same turnId or same ts+text). */
function dedupeUiMessages(ui) {
  const seenTurn = new Set();
  const seenTextTs = new Set();
  return (ui || []).filter((m) => {
    if (m.role !== 'assistant') return true;
    if (m.turnId) {
      if (seenTurn.has(m.turnId)) return false;
      seenTurn.add(m.turnId);
      return true;
    }
    const key = String(m.ts || 0) + '\0' + (m.text || '').slice(0, 200);
    if (seenTextTs.has(key)) return false;
    seenTextTs.add(key);
    return true;
  });
}

/* Group each user message with the assistant/tool rows before the next user —
   tolerant of Firestore returning a turn's rows out of order (same-ts legacy). */
function buildUiFromRaw(raw) {
  const sorted = sortRawMessages(raw);
  const ui = [];
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    if (hasUserContent(m)) {
      ui.push({
        role: 'user',
        text: m.text || '',
        attachments: m.attachments || null,
        restored: true,
        ts: m.ts,
      });
      let assistant = null;
      let tool = null;
      let lastJ = i;
      for (let j = i + 1; j < sorted.length && sorted[j].role !== 'user'; j++) {
        if (!assistant && hasAssistantContent(sorted[j])) assistant = sorted[j];
        if (!tool && sorted[j].role === 'tool') tool = sorted[j];
        lastJ = j;
      }
      if (assistant) {
        ui.push(assistantUiFromRaw(assistant, tool));
        i = lastJ;
      }
      continue;
    }
    if (hasAssistantContent(m)) {
      const next = sorted[i + 1];
      const tool = next && next.role === 'tool' ? next : null;
      ui.push(assistantUiFromRaw(m, tool));
      if (tool) i++;
    }
  }
  return dedupeUiMessages(ui);
}

/* Match legacy assistant turns (no turnMeta) to audit docs by chronological order. */
async function enrichWithAudits(ui, chatId) {
  const need = ui.filter((m) => m.role === 'assistant' && m.toolCalls && m.toolCalls.length && !(m.turnMeta && m.turnMeta.changedPaths && m.turnMeta.changedPaths.length));
  if (!need.length) return ui;
  try {
    const audits = await window.ADMIN_STORE.Store.fsLoadAgentAudits(chatId || 'default', 80);
    audits.reverse();
    let ai = 0;
    return ui.map((m) => {
      if (m.role !== 'assistant' || !(m.toolCalls && m.toolCalls.length) || (m.turnMeta && m.turnMeta.changedPaths && m.turnMeta.changedPaths.length)) return m;
      const audit = audits[ai++];
      if (!audit) return m;
      return {
        ...m,
        turnMeta: {
          turnId: audit.turnId,
          auditId: audit.id,
          changedPaths: audit.changedPaths || [],
          perPathUndo: audit.perPathUndo || [],
          provider: audit.provider,
          model: audit.model,
        },
      };
    });
  } catch (e) { return ui; }
}

/* Index of the latest assistant turn that still has undoable draft changes. */
function latestUndoableIndex(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'assistant' && m.changedPaths && m.changedPaths.length && !m.undone) return i;
  }
  return -1;
}

/* ---------- shared chat store (page + dock see the same conversation) ---------- */
const agentChat = {
  messages: [],
  sending: false,
  listeners: new Set(),
  push(msg) { this.messages = this.messages.concat([msg]); this.emit(); },
  patchLast(patch) {
    if (!this.messages.length) return;
    const i = this.messages.length - 1;
    this.patchMessage(i, patch);
  },
  patchMessage(index, patch) {
    if (index < 0 || index >= this.messages.length) return;
    this.messages = this.messages.slice(0, index).concat([{ ...this.messages[index], ...patch }]).concat(this.messages.slice(index + 1));
    this.emit();
  },
  removeMessage(index) {
    if (index < 0 || index >= this.messages.length) return;
    this.messages = this.messages.slice(0, index).concat(this.messages.slice(index + 1));
    this.emit();
  },
  setSending(b) { this.sending = b; this.emit(); },
  reset() {
    this.messages = [];
    this.hydrated = true;
    try { localStorage.removeItem(AGENT_UI_CACHE_KEY); } catch (e) { /* quota */ }
    this.emit();
  },
  /* After clearChatHistory, keep only the triggering user turn + assistant reply. */
  collapseToCurrentTurn(assistantMsg) {
    const userMsg = this.messages.length >= 2 ? this.messages[this.messages.length - 2] : null;
    this.messages = (userMsg && userMsg.role === 'user')
      ? [userMsg, assistantMsg]
      : [assistantMsg];
    this.hydrated = true;
    try { localStorage.removeItem(AGENT_UI_CACHE_KEY); } catch (e) { /* quota */ }
    this.emit();
  },
  _persistUi() {
    const meta = {};
    this.messages.forEach((m) => {
      if (!m.turnId) return;
      if (!(m.changedPaths && m.changedPaths.length) && !m.undone) return;
      meta[m.turnId] = {
        changedPaths: m.changedPaths || [],
        perPathUndo: m.perPathUndo || [],
        auditId: m.auditId,
        undone: !!m.undone,
        revertedPaths: m.revertedPaths || {},
        provider: m.provider,
        model: m.model,
        bounded: m.bounded,
      };
    });
    try { localStorage.setItem(AGENT_UI_CACHE_KEY, JSON.stringify(meta)); } catch (e) { /* quota */ }
  },
  emit() { this._persistUi(); this.listeners.forEach((l) => l()); },

  // Restore the persisted conversation once per session so a reload doesn't look
  // like a blank chat. The server keeps the canonical history (agent_chats/
  // {chatId}/messages) and uses it for multi-turn context; here we just rebuild
  // the visible user/assistant bubbles. Clearing the chat marks it hydrated so
  // it won't repopulate.
  hydrated: false,
  async hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    // Never clobber an in-flight or live session (fixes race where async load
    // overwrote turn action state after the user clicked or sent a message).
    if (this.messages.length) return;
    try {
      const raw = await window.ADMIN_STORE.Store.fsLoadAgentMessages('default', 100);
      if (this.messages.length) return;
      let ui = buildUiFromRaw(raw);
      ui = await enrichWithAudits(ui, 'default');
      if (this.messages.length) return;
      const cache = readTurnMetaCache();
      ui = ui.map((m) => applyTurnMeta(m, cache));
      if (this.messages.length) return;
      if (ui.length) { this.messages = ui; this.emit(); }
    } catch (e) { /* offline / no history */ }
  },
};

// Rough context-size signal so we can nudge the owner to clear before a turn
// gets expensive or hits the model's window. Counts chars across the thread.
function agentContextChars(messages) {
  return (messages || []).reduce((n, m) => n + ((m.text || '').length), 0);
}
const AGENT_CONTEXT_WARN = 14000;   // ~3.5k tokens of visible text → suggest clearing

function useAgentChat() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    agentChat.listeners.add(l);
    return () => agentChat.listeners.delete(l);
  }, []);
  return agentChat;
}

/* Serialize a path value for the inline diff panel. */
function formatDiffValue(val) {
  if (val == null || val === '') return '(empty)';
  if (typeof val === 'object') {
    if (val._truncated) return `(too large to display — ${val._bytes || '?'} bytes; audit only)`;
    try { return JSON.stringify(val, null, 2); } catch (e) { return String(val); }
  }
  return String(val);
}

/* Collapse long model echoes of rewritten copy when the diff panel carries the truth. */
function assistantBubbleText(msg) {
  const text = (msg.text || '').trim();
  const hasChanges = !!(msg.changedPaths && msg.changedPaths.length);
  if (!hasChanges || !text) return text;
  if (text.length <= 160 && !text.includes('\n\n') && !/^>\s/m.test(text)) return text;
  const first = text.split('\n').map((l) => l.trim()).find(Boolean) || '';
  if (first.length <= 120 && !/^>\s/.test(first)) return first;
  return 'Changes applied to your draft — see the diff below.';
}

/* Map a changed dot-path to the admin route that edits it. */
function pathToRoute(path) {
  const p = String(path || '');
  if (p.startsWith('hero')) return 'hero';
  if (p.startsWith('about')) return 'about';
  if (p.startsWith('expertise')) return 'expertise';
  if (p.startsWith('experience')) return 'work';
  if (p.startsWith('projects')) return 'projects';
  if (p.startsWith('cards')) return 'cards';
  if (p.startsWith('contact')) return 'contact';
  if (p.startsWith('media')) return 'media';
  if (p.startsWith('cosmetics')) return 'appearance';
  if (p.startsWith('bot')) return 'bot';
  return null;
}

/* Human-readable agent failure copy — never surface raw JSON.parse errors. */
function agentErrorText(res, fallback) {
  if (res && res.message != null && String(res.message).trim()) return String(res.message);
  if (res && res.error != null && String(res.error).trim()) return String(res.error);
  return fallback || 'Request failed — try again.';
}

function turnAttachmentsForApi(attachments) {
  if (!attachments || !attachments.length) return undefined;
  const out = attachments
    .filter((a) => a && a.data && a.mime)
    .map((a) => ({ mime: a.mime, data: a.data }));
  return out.length ? out : undefined;
}

function applyAgentTurnResult(res, patchFn) {
  if (res && res.error) {
    patchFn({
      pending: false,
      text: '',
      error: agentErrorText(res),
      errorCode: res.error,
      quickReplies: undefined,
    });
    return;
  }
  const assistantMsg = {
    role: 'assistant',
    pending: false,
    text: (res && res.reply) || '(no reply)',
    toolCalls: (res && res.toolCalls) || [],
    changedPaths: (res && res.changedPaths) || [],
    perPathUndo: (res && res.perPathUndo) || [],
    turnId: res && res.turnId,
    provider: res && res.provider,
    model: res && res.model,
    durationMs: res && res.durationMs,
    repliedAt: res && res.repliedAt,
    bounded: res && res.bounded,
    quickReplies: (res && res.quickReplies) || undefined,
    ts: Date.now(),
    error: undefined,
    errorCode: undefined,
  };
  if (turnClearedHistory(res.toolCalls)) {
    agentChat.collapseToCurrentTurn(assistantMsg);
  } else {
    patchFn(assistantMsg);
  }
}

/* ---------- the send action (shared) ---------- */
async function sendAgentMessage({ text, attachments, route, setAgentBusy }) {
  const Store = window.ADMIN_STORE.Store;
  const hasText = !!(text && text.trim());
  const hasAttach = !!(attachments && attachments.length);
  if ((!hasText && !hasAttach) || agentChat.sending) return;
  const ts = Date.now();
  agentChat.push({
    role: 'user',
    text: text || '',
    attachments: hasAttach
      ? attachments.map((a) => ({ mime: a.mime, preview: a.preview, data: a.data }))
      : null,
    ts,
  });
  agentChat.push({ role: 'assistant', text: '', pending: true, ts: ts + 1 });
  agentChat.setSending(true);
  if (setAgentBusy) setAgentBusy(true);
  try {
    const res = await Store.agentTurn({
      message: text || '',
      attachments: turnAttachmentsForApi(attachments),
      currentRoute: route,
      chatId: 'default',
    });
    applyAgentTurnResult(res, (patch) => agentChat.patchLast(patch));
    if (!(res && res.error)) {
      try {
        const remote = await Store.fsLoadDraft();
        if (remote) await Store.adoptRemoteDraft(remote);
      } catch (e) { /* offline */ }
    }
  } catch (e) {
    agentChat.patchLast({
      pending: false,
      text: '',
      error: agentErrorText(null, (e && e.message) || 'Request failed — try again.'),
    });
  } finally {
    agentChat.setSending(false);
    if (setAgentBusy) setAgentBusy(false);
  }
}

/* Re-send the user turn before a failed assistant bubble — no duplicate user row. */
async function retryAgentMessage({ failedIndex, route, setAgentBusy }) {
  const Store = window.ADMIN_STORE.Store;
  if (agentChat.sending || failedIndex < 1 || failedIndex >= agentChat.messages.length) return;
  const failed = agentChat.messages[failedIndex];
  if (!failed || failed.role !== 'assistant' || failed.pending) return;
  const userMsg = agentChat.messages[failedIndex - 1];
  if (!userMsg || userMsg.role !== 'user') return;
  const hasText = !!(userMsg.text || '').trim();
  const hasAttach = !!(userMsg.attachments && userMsg.attachments.length);
  if (!hasText && !hasAttach) return;

  agentChat.removeMessage(failedIndex);
  agentChat.push({ role: 'assistant', text: '', pending: true, ts: Date.now() });
  agentChat.setSending(true);
  if (setAgentBusy) setAgentBusy(true);
  try {
    const res = await Store.agentTurn({
      message: userMsg.text || '',
      attachments: turnAttachmentsForApi(userMsg.attachments),
      currentRoute: route,
      chatId: 'default',
    });
    applyAgentTurnResult(res, (patch) => agentChat.patchLast(patch));
    if (!(res && res.error)) {
      try {
        const remote = await Store.fsLoadDraft();
        if (remote) await Store.adoptRemoteDraft(remote);
      } catch (e) { /* offline */ }
    }
  } catch (e) {
    agentChat.patchLast({
      pending: false,
      text: '',
      error: agentErrorText(null, (e && e.message) || 'Request failed — try again.'),
    });
  } finally {
    agentChat.setSending(false);
    if (setAgentBusy) setAgentBusy(false);
  }
}

/* ---------- settings modal (replaces the separate settings page) ---------- */
function AgentSettingsModal({ open, onClose }) {
  if (!open) return null;
  const { AdminIcon } = window.ADMIN_UI;
  const Page = window.ADMIN_AGENT_SETTINGS && window.ADMIN_AGENT_SETTINGS.AgentSettingsPage;
  return (
    <div className="agentmodal" onMouseDown={onClose}>
      <div className="agentmodal__panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="agentmodal__hd">
          <span className="agentmodal__title"><AdminIcon name="settings" size={15} /> Agent settings</span>
          <button className="agentmodal__close" onClick={onClose} aria-label="Close"><AdminIcon name="x" size={16} /></button>
        </div>
        <div className="agentmodal__body">{Page ? <Page modal /> : <p className="helptext">Settings unavailable.</p>}</div>
      </div>
    </div>
  );
}

/* Animated thinking indicator — bouncing dots + live elapsed seconds, so a long
   agent tool-loop reads as active rather than a frozen "working…". */
function Thinking() {
  const [s, setS] = useState(0);
  useEffect(() => { const id = setInterval(() => setS((x) => x + 1), 1000); return () => clearInterval(id); }, []);
  return (
    <span className="thinking">
      <span className="thinking__dots"><span /><span /><span /></span>
      <span className="thinking__t">{s < 1 ? 'working…' : `working… ${s}s`}</span>
    </span>
  );
}

/* ---------- one turn's message bubble ---------- */
function MessageBubble({ msg, msgIndex, canUndoTurn, go, openPreview, compact, onQuickReply, onRetry, quickReplyDisabled, publish, canPublish, publishing }) {
  const { AdminIcon, Btn, mdInline } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;
  const [diffOpen, setDiffOpen] = useState(false);
  const [publishErr, setPublishErr] = useState('');

  if (msg.role === 'assistant' && msg.publishNotice) {
    return (
      <div className="agentmsg agentmsg--bot agentmsg--notice">
        <div className="agentmsg__body">
          <div className="agentmsg__reveal">{msg.text}</div>
        </div>
        {!!msg.ts && (
          <div className="agentchat__meta">
            <span />
            <span>{formatMsgTime(msg.ts)}</span>
          </div>
        )}
      </div>
    );
  }

  if (msg.role === 'user') {
    const atts = msg.attachments || [];
    return (
      <div className="agentmsg agentmsg--user">
        {!!atts.length && (
          <div className="agentattach agentattach--sent">
            {atts.map((a, i) => (
              a.preview || a.data
                ? <img key={i} className="agentattach__thumb" src={a.preview || ('data:' + a.mime + ';base64,' + a.data)} alt="" />
                : <span key={i} className="agentattach__chip agentattach__chip--meta">{a.mime || 'image'}</span>
            ))}
          </div>
        )}
        {!!(msg.text || '').trim() && <div className="agentmsg__body">{msg.text}</div>}
        {!!msg.ts && !msg.pending && (
          <div className="agentchat__meta">
            <span />
            <span>{formatMsgTime(msg.ts)}</span>
          </div>
        )}
      </div>
    );
  }

  const routes = [...new Set((msg.changedPaths || []).map(pathToRoute).filter(Boolean))];
  const reverted = msg.revertedPaths || {};
  const hasChanges = !!(msg.changedPaths && msg.changedPaths.length);

  const displayText = assistantBubbleText(msg);
  const diffEntries = msg.perPathUndo || (msg.changedPaths || []).map((p) => ({ path: p }));
  const quickReplies = Array.isArray(msg.quickReplies) ? msg.quickReplies : [];
  const toolLinks = collectToolLinks(msg.toolCalls);

  const revertOne = async (pu, i) => {
    if (!('before' in pu) || (pu.before && pu.before._truncated)) return;
    const r = await Store.agentRevertPath(pu.path, pu.before);
    if (r && r.ok) {
      agentChat.patchMessage(msgIndex, {
        revertedPaths: { ...reverted, [i]: true },
      });
      try {
        const remote = await Store.fsLoadDraft();
        if (remote) await Store.adoptRemoteDraft(remote);
      } catch (e) { /* offline */ }
    }
  };
  const undoTurn = async () => {
    const r = await Store.agentUndo('default');
    if (r && r.ok) {
      agentChat.patchMessage(msgIndex, { undone: true });
      try {
        const remote = await Store.fsLoadDraft();
        if (remote) await Store.adoptRemoteDraft(remote);
      } catch (e) { /* offline */ }
    }
  };
  const publishFromTurn = async () => {
    if (!publish || publishing || !canPublish) return;
    setPublishErr('');
    try {
      const ok = await publish();
      if (ok) {
        agentChat.push({
          role: 'assistant',
          text: 'Published to site ✓',
          publishNotice: true,
          ts: Date.now(),
        });
      } else {
        setPublishErr('Publish failed — try again');
      }
    } catch (e) {
      setPublishErr((e && e.message) || 'Publish failed — try again');
    }
  };
  const hasTools = !!(msg.toolCalls && msg.toolCalls.length);
  const showPublish = hasChanges && !msg.undone;
  const shipped = showPublish && !canPublish && !publishing;

  return (
    <div className="agentmsg agentmsg--bot">
      <div className="agentmsg__body">
        {msg.pending ? <Thinking />
          : msg.error ? <span className="login__err">⚠ {msg.error}</span>
            : <div className="agentmsg__reveal">{mdInline ? mdInline(displayText) : displayText}</div>}
        {msg.bounded && <div className="helptext" style={{ marginTop: 4 }}>⚠ stopped at the tool-iteration limit.</div>}

        {!!msg.error && !msg.pending && (
          <div className="agentmsg__retry" onMouseDown={(e) => e.stopPropagation()}>
            <Btn sm kind="ghost" icon="reset" disabled={quickReplyDisabled} onClick={() => onRetry && onRetry(msgIndex)}>
              Retry
            </Btn>
          </div>
        )}

        {hasTools && !msg.pending && (
          <div className="agenttools-section">
            <div className="agenttools__hd">Tool calls</div>
            <div className="agenttools">
              {msg.toolCalls.map((t, i) => (
                <span key={i} className={'toolchip' + (t.result && t.result.ok === false ? ' toolchip--err' : '')}>
                  <AdminIcon name="sparkle" size={11} />{t.name}{t.result && t.result.ok === false ? ' ✗' : ''}
                </span>
              ))}
            </div>
            {!!toolLinks.length && (
              <div className="agenttoollinks">
                {toolLinks.map((l, i) => (
                  <a key={i} className="agenttoollinks__a" href={l.adminLink}>{l.label || 'Open admin'}</a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!!quickReplies.length && !msg.pending && !msg.error && (
        <div className="agentchat__quickreplies" onMouseDown={(e) => e.stopPropagation()}>
          {quickReplies.map((qr, i) => (
            <button
              key={i}
              type="button"
              className="agentchat__quickreply"
              disabled={quickReplyDisabled}
              title={qr.value !== qr.label ? qr.value : undefined}
              onClick={() => onQuickReply && onQuickReply(qr.value, qr)}
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {hasChanges && !msg.undone && (
        <div className="agentchanges" onMouseDown={(e) => e.stopPropagation()}>
          <div className="agentchanges__hd">
            {msg.changedPaths.length} change{msg.changedPaths.length === 1 ? '' : 's'} · applied to draft
            <span className="spacer" style={{ flex: 1 }} />
            {canUndoTurn && (
              <Btn sm kind="ghost" icon="reset" onClick={undoTurn}>Undo turn</Btn>
            )}
          </div>
          <ul className="agentchanges__list">
            {(msg.perPathUndo || msg.changedPaths.map((p) => ({ path: p }))).map((pu, i) => (
              <li key={i}>
                <code>{pu.path}</code>
                {'before' in pu && !pu.before?._truncated && (
                  reverted[i]
                    ? <span className="helptext"> reverted ✓</span>
                    : <button type="button" className="linkbtn" onClick={() => revertOne(pu, i)}>revert</button>
                )}
                {'before' in pu && pu.before && pu.before._truncated && (
                  <span className="helptext" title="Before-value too large to restore from audit"> · audit only</span>
                )}
              </li>
            ))}
          </ul>
          <div className="agentreview">
            <Btn
              sm
              kind="ghost"
              icon={diffOpen ? 'chevron-up' : 'chevron-down'}
              onClick={() => setDiffOpen((o) => !o)}
            >
              {diffOpen ? 'Hide changes' : 'View changes'}
            </Btn>
            {routes.map((r) => (
              <button key={r} type="button" className="linkbtn agentreview__page" onClick={() => go && go(r)}>{r}</button>
            ))}
            <Btn sm kind="ghost" icon="eye" onClick={() => openPreview && openPreview('draft')}>Preview ↗</Btn>
            {showPublish && (
              shipped
                ? <span className="helptext agentreview__shipped">Live on site ✓</span>
                : (
                  <Btn
                    sm
                    kind="primary"
                    icon="publish"
                    onClick={publishFromTurn}
                    disabled={!canPublish || publishing}
                  >
                    {publishing ? 'Publishing…' : 'Publish'}
                  </Btn>
                )
            )}
          </div>
          {!!publishErr && <div className="login__err" style={{ marginTop: 6 }}>⚠ {publishErr}</div>}
          {diffOpen && (
            <div className={'agentdiff' + (compact ? ' agentdiff--stacked' : '')}>
              {diffEntries.map((pu, i) => (
                <div key={pu.path || i} className="agentdiff__section">
                  <div className="agentdiff__path"><code>{pu.path}</code></div>
                  {'before' in pu || 'after' in pu ? (
                    <div className="agentdiff__pair">
                      <div className="agentdiff__col agentdiff__col--old">
                        <span className="agentdiff__label">Before</span>
                        <pre className="agentdiff__val">{formatDiffValue(pu.before)}</pre>
                      </div>
                      <div className="agentdiff__col agentdiff__col--new">
                        <span className="agentdiff__label">After</span>
                        <pre className="agentdiff__val">{formatDiffValue(pu.after)}</pre>
                      </div>
                    </div>
                  ) : (
                    <p className="helptext">Diff unavailable for this path.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {msg.undone && <div className="helptext" style={{ marginTop: 6 }}>↩ turn undone.</div>}
      {!msg.pending && !msg.error && (msg.provider || msg.durationMs || msg.repliedAt || msg.ts) && (
        <div className="agentchat__meta">
          <span>{msg.provider ? `${msg.provider} · ${msg.model || ''}` : ''}</span>
          <span>
            {[
              msg.durationMs != null ? formatDurationSec(msg.durationMs) : '',
              formatMsgTime(msg.repliedAt || msg.ts),
            ].filter(Boolean).join('  .  ')}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- the shared chat surface (used by page + dock) ---------- */
function AgentChat({ route, go, openPreview, setAgentBusy, compact, publish, canPublish, publishing }) {
  const { AdminIcon } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;
  const chat = useAgentChat();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachErr, setAttachErr] = useState('');
  const [visionOk, setVisionOk] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroller = useRef(null);
  const fileInput = useRef(null);

  const refreshVision = async () => {
    await Store.hydrateVisionSupport('agent');
    try {
      const cfg = await Store.fsLoadAgentConfig();
      setVisionOk(Store.agentSupportsVision(cfg));
    } catch (e) { setVisionOk(false); }
  };

  useEffect(() => { refreshVision(); }, []);
  useEffect(() => {
    if (!settingsOpen) refreshVision();
  }, [settingsOpen]);

  // Clear is only offered when there's a conversation to clear; once cleared it
  // hides until the next message lands (driven by chat.messages.length).
  const clearChat = async () => {
    if (!chat.messages.length || chat.sending) return;
    await Store.fsClearAgentChat('default');
    chat.reset();
  };

  // Restore persisted history once on first mount.
  useEffect(() => { chat.hydrate(); }, []);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [chat.messages.length, chat.sending]);

  const overContext = agentContextChars(chat.messages) > AGENT_CONTEXT_WARN;
  const undoIdx = latestUndoableIndex(chat.messages);

  const addFiles = async (files) => {
    if (!visionOk || !files || !files.length) return;
    setAttachErr('');
    const next = attachments.slice();
    for (const file of files) {
      if (next.length >= ATTACH_MAX_COUNT) {
        setAttachErr(`At most ${ATTACH_MAX_COUNT} images per message.`);
        break;
      }
      if (!file.type || !file.type.startsWith('image/')) {
        setAttachErr('Only image files are supported.');
        continue;
      }
      try {
        const prep = await prepareImageAttachment(file);
        next.push({ id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), ...prep });
      } catch (err) {
        setAttachErr((err && err.message) || 'Could not attach image.');
      }
    }
    setAttachments(next);
  };

  const removeAttachment = (id) => {
    setAttachments((list) => {
      const hit = list.find((a) => a.id === id);
      if (hit && hit.preview) URL.revokeObjectURL(hit.preview);
      return list.filter((a) => a.id !== id);
    });
  };

  const onPaste = (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    let hasImage = false;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        hasImage = true;
        const f = items[i].getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (!hasImage) return;
    e.preventDefault();
    if (!visionOk) {
      setAttachErr('This model does not support images — switch to a vision-capable model in settings.');
      return;
    }
    addFiles(imageFiles);
  };

  const submit = (e) => {
    if (e) e.preventDefault();
    const t = input;
    const atts = attachments;
    setInput('');
    setAttachments([]);
    setAttachErr('');
    sendAgentMessage({ text: t, attachments: atts, route, setAgentBusy });
  };

  const canSend = !chat.sending && (input.trim() || attachments.length > 0);

  const onQuickReply = (value) => {
    if (chat.sending || !value) return;
    sendAgentMessage({ text: String(value), attachments: [], route, setAgentBusy });
  };

  const onRetry = (failedIndex) => {
    if (chat.sending) return;
    retryAgentMessage({ failedIndex, route, setAgentBusy });
  };

  return (
    <div className={'agentchat' + (compact ? ' agentchat--compact' : '')}>
      <div className="agentchat__scroll" ref={scroller}>
        {chat.messages.length === 0 && (
          <div className="agentchat__empty">
            <p>Ask me to edit the portfolio — “tighten my hero”, “add a project for X with these tags”,
              “add two Q&amp;A pairs about my stack”. I write to the <b>draft</b>; you review and publish.</p>
          </div>
        )}
        {chat.messages.map((m, i) => (
          <MessageBubble
            key={m.turnId ? ('turn_' + m.turnId) : ('ui_' + i + '_' + m.role)}
            msg={m}
            msgIndex={i}
            canUndoTurn={i === undoIdx}
            go={go}
            openPreview={openPreview}
            compact={compact}
            onQuickReply={onQuickReply}
            onRetry={onRetry}
            quickReplyDisabled={chat.sending}
            publish={publish}
            canPublish={canPublish}
            publishing={publishing}
          />
        ))}
      </div>

      {overContext && (
        <div className="agentwarn">
          <AdminIcon name="info" size={14} />
          <span>This conversation is getting long — clearing it keeps the agent fast and within its context window.</span>
          <button type="button" className="linkbtn" onClick={clearChat} disabled={chat.sending}>Clear now</button>
        </div>
      )}

      <form className="composer" onSubmit={submit}>
        {!visionOk && (
          <div className="composer__vision-warn" role="status">
            <AdminIcon name="info" size={14} />
            <span>This model does not support images — switch to a vision-capable model in settings, or run <b>Test vision</b> there.</span>
          </div>
        )}
        {!!attachments.length && (
          <div className="composer__attachments">
            {attachments.map((a) => (
              <span key={a.id} className="agentattach__chip">
                <img className="agentattach__thumb" src={a.preview} alt="" />
                <button type="button" className="agentattach__remove" aria-label="Remove image" onClick={() => removeAttachment(a.id)}>
                  <AdminIcon name="x" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        {attachErr && <div className="composer__vision-err">⚠ {attachErr}</div>}
        <textarea
          className="composer__input"
          rows={compact ? 2 : 3}
          value={input}
          placeholder={visionOk ? 'message the agent… (paste or attach images)' : 'message the agent…'}
          onChange={(e) => setInput(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }}
        />
        <div className="composer__bar">
          <button type="button" className="composer__tool" title="Agent settings (keys & model)" onClick={() => setSettingsOpen(true)}>
            <AdminIcon name="settings" size={16} />
          </button>
          {visionOk && (
            <>
              <input
                ref={fileInput}
                className="composer__attach"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
              />
              <button
                type="button"
                className="composer__tool"
                title="Attach image"
                disabled={chat.sending || attachments.length >= ATTACH_MAX_COUNT}
                onClick={() => fileInput.current && fileInput.current.click()}
              >
                <AdminIcon name="image" size={16} />
              </button>
            </>
          )}
          <span className="spacer" style={{ flex: 1 }} />
          {chat.messages.length > 0 && (
            <button type="button" className="composer__tool" title="Clear conversation" aria-label="Clear conversation" disabled={chat.sending} onClick={clearChat}>
              <AdminIcon name="trash" size={16} />
            </button>
          )}
          <button className="composer__send" type="submit" disabled={!canSend} title="Send (⌘/Ctrl + Enter)">
            <span>{chat.sending ? 'Working…' : 'Send'}</span>
            <AdminIcon name="send" size={15} />
          </button>
        </div>
      </form>

      <AgentSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

/* ---------- dedicated Agent page ---------- */
function AgentPage({ route, go, openPreview, setAgentBusy, publish, canPublish, publishing }) {
  const { PageHead, Segmented } = window.ADMIN_UI;
  const LogsView = window.ADMIN_LOGS && window.ADMIN_LOGS.LogsView;
  const [mode, setMode] = useState('chat');
  const isLogs = mode === 'logs';

  return (
    <div>
      <PageHead
        eyebrow={isLogs ? '/AGENT.AI/LOGS' : '/AGENT.AI'}
        title={isLogs ? 'Agent logs' : 'Agent'}
        actions={LogsView ? <Segmented value={mode} options={[{ value: 'chat', label: 'Chat' }, { value: 'logs', label: 'Logs' }]} onChange={setMode} /> : null}>
        {isLogs
          ? 'Live agent + refine activity from Cloud Logging — model calls, successes and errors, newest first. Cached locally for instant reopen.'
          : 'Drive every admin control by chatting. Changes apply to the draft and appear live in the editors; nothing publishes until you say so.'}
      </PageHead>
      <div className="agentpage">
        {isLogs && LogsView
          ? <LogsView source="agent" height={520} />
          : <AgentChat route={route} go={go} openPreview={openPreview} setAgentBusy={setAgentBusy} publish={publish} canPublish={canPublish} publishing={publishing} />}
      </div>
    </div>
  );
}

/* ---------- floating dock (every screen) ---------- */
function AgentDock({ route, go, openPreview, setAgentBusy, publish, canPublish, publishing }) {
  const { AdminIcon } = window.ADMIN_UI;
  const [open, setOpen] = useState(false);
  const chat = useAgentChat();

  // Hide the dock on the dedicated Agent page (the page IS the surface).
  if (route === 'agent') return null;

  return (
    <div className={'agentdock' + (open ? ' agentdock--open' : '')}>
      {open ? (
        <div className="agentdock__panel">
          <div className="agentdock__hd">
            <span className="agentdock__title"><AdminIcon name="chip" size={15} /> Agent</span>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="agentdock__btn" title="Open full page" onClick={() => { setOpen(false); go && go('agent'); }}><AdminIcon name="link" size={14} /></button>
            <button className="agentdock__btn" title="Collapse" onClick={() => setOpen(false)}><AdminIcon name="x" size={14} /></button>
          </div>
          <AgentChat route={route} go={go} openPreview={openPreview} setAgentBusy={setAgentBusy} compact publish={publish} canPublish={canPublish} publishing={publishing} />
        </div>
      ) : (
        <button className="agentdock__bubble" title="Ask the agent" onClick={() => setOpen(true)}>
          <AdminIcon name="chip" size={28} strokeWidth={2.2} />
          {chat.sending && <span className="agentdock__pulse" />}
        </button>
      )}
    </div>
  );
}

window.ADMIN_AGENT = { AgentPage, AgentDock, useAgentChat, agentChat };
