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
    bounded: tm.bounded != null ? tm.bounded : msg.bounded,
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

function buildUiFromRaw(raw) {
  const ui = [];
  for (let i = 0; i < (raw || []).length; i++) {
    const m = raw[i];
    if (m.role === 'user' && (m.text || '').trim()) {
      ui.push({ role: 'user', text: m.text, restored: true, ts: m.ts });
      continue;
    }
    if (m.role === 'assistant' && ((m.text || '').trim() || (m.toolCalls || []).length)) {
      const next = raw[i + 1];
      const toolResults = next && next.role === 'tool' && Array.isArray(next.toolResults) ? next.toolResults : [];
      const toolCalls = (m.toolCalls || []).map((tc, j) => ({
        name: tc.name,
        args: tc.args,
        result: (toolResults[j] && toolResults[j].result)
          || (toolResults.find((tr) => tr.name === tc.name) || {}).result,
      }));
      ui.push({
        role: 'assistant',
        text: m.text || '',
        restored: true,
        ts: m.ts,
        turnMeta: m.turnMeta || null,
        toolCalls: toolCalls.length ? toolCalls : undefined,
      });
      if (next && next.role === 'tool') i++;
    }
  }
  return ui;
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
  setSending(b) { this.sending = b; this.emit(); },
  reset() {
    this.messages = [];
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
      const cache = readTurnMetaCache();
      ui = ui.map((m) => applyTurnMeta(m, cache));
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

/* Map a changed dot-path to the admin route that edits it, for "Review ↗". */
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

/* ---------- the send action (shared) ---------- */
async function sendAgentMessage({ text, route, setAgentBusy }) {
  const Store = window.ADMIN_STORE.Store;
  if (!text.trim() || agentChat.sending) return;
  agentChat.push({ role: 'user', text });
  agentChat.push({ role: 'assistant', text: '', pending: true });
  agentChat.setSending(true);
  if (setAgentBusy) setAgentBusy(true);
  try {
    const res = await Store.agentTurn({ message: text, currentRoute: route, chatId: 'default' });
    if (res && res.error) {
      agentChat.patchLast({ pending: false, text: '', error: res.message || res.error });
    } else {
      agentChat.patchLast({
        pending: false,
        text: res.reply || '(no reply)',
        toolCalls: res.toolCalls || [],
        changedPaths: res.changedPaths || [],
        perPathUndo: res.perPathUndo || [],
        turnId: res.turnId,
        provider: res.provider,
        model: res.model,
        bounded: res.bounded,
      });
      // Pull the server draft immediately so open editors update even when the
      // agent composer (or another non-content field) still has focus.
      try {
        const remote = await Store.fsLoadDraft();
        if (remote) await Store.adoptRemoteDraft(remote);
      } catch (e) { /* offline */ }
    }
  } catch (e) {
    agentChat.patchLast({ pending: false, error: e.message });
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
function MessageBubble({ msg, msgIndex, canUndoTurn, go, openPreview }) {
  const { AdminIcon, Btn, mdInline } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;

  if (msg.role === 'user') {
    return <div className="agentmsg agentmsg--user"><div className="agentmsg__body">{msg.text}</div></div>;
  }

  const routes = [...new Set((msg.changedPaths || []).map(pathToRoute).filter(Boolean))];
  const reverted = msg.revertedPaths || {};
  const hasChanges = !!(msg.changedPaths && msg.changedPaths.length);

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
  const viewChanges = () => {
    if (routes.length && go) go(routes[0]);
  };

  return (
    <div className="agentmsg agentmsg--bot">
      <div className="agentmsg__body">
        {msg.pending ? <Thinking />
          : msg.error ? <span className="login__err">⚠ {msg.error}</span>
            : <span className="agentmsg__reveal">{mdInline ? mdInline(msg.text) : msg.text}</span>}
        {msg.bounded && <div className="helptext" style={{ marginTop: 4 }}>⚠ stopped at the tool-iteration limit.</div>}
      </div>

      {!!(msg.toolCalls && msg.toolCalls.length) && (
        <div className="agenttools">
          {msg.toolCalls.map((t, i) => (
            <span key={i} className={'toolchip' + (t.result && t.result.ok === false ? ' toolchip--err' : '')}>
              <AdminIcon name="sparkle" size={11} />{t.name}{t.result && t.result.ok === false ? ' ✗' : ''}
            </span>
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
            {routes.length > 0 && (
              <Btn sm kind="ghost" icon="link" onClick={viewChanges}>View changes ↗</Btn>
            )}
            {routes.map((r) => <Btn key={r} sm kind="ghost" onClick={() => go && go(r)}>{r} ↗</Btn>)}
            <Btn sm kind="ghost" icon="eye" onClick={() => openPreview && openPreview('draft')}>Preview ↗</Btn>
          </div>
        </div>
      )}
      {msg.undone && <div className="helptext" style={{ marginTop: 6 }}>↩ turn undone.</div>}
      {msg.provider && <div className="agentmeta">{msg.provider} · {msg.model}</div>}
    </div>
  );
}

/* ---------- the shared chat surface (used by page + dock) ---------- */
function AgentChat({ route, go, openPreview, setAgentBusy, compact }) {
  const { AdminIcon } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;
  const chat = useAgentChat();
  const [input, setInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroller = useRef(null);

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

  const submit = (e) => {
    if (e) e.preventDefault();
    const t = input;
    setInput('');
    sendAgentMessage({ text: t, route, setAgentBusy });
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
            key={m.turnId || ('msg_' + i + '_' + (m.ts || 0))}
            msg={m}
            msgIndex={i}
            canUndoTurn={i === undoIdx}
            go={go}
            openPreview={openPreview}
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
        <textarea
          className="composer__input"
          rows={compact ? 2 : 3}
          value={input}
          placeholder="message the agent…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }}
        />
        <div className="composer__bar">
          <button type="button" className="composer__tool" title="Agent settings (keys & model)" onClick={() => setSettingsOpen(true)}>
            <AdminIcon name="settings" size={16} />
          </button>
          <span className="spacer" style={{ flex: 1 }} />
          {chat.messages.length > 0 && (
            <button type="button" className="composer__tool" title="Clear conversation" aria-label="Clear conversation" disabled={chat.sending} onClick={clearChat}>
              <AdminIcon name="trash" size={16} />
            </button>
          )}
          <button className="composer__send" type="submit" disabled={chat.sending || !input.trim()} title="Send (⌘/Ctrl + Enter)">
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
function AgentPage({ route, go, openPreview, setAgentBusy }) {
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
          : <AgentChat route={route} go={go} openPreview={openPreview} setAgentBusy={setAgentBusy} />}
      </div>
    </div>
  );
}

/* ---------- floating dock (every screen) ---------- */
function AgentDock({ route, go, openPreview, setAgentBusy }) {
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
          <AgentChat route={route} go={go} openPreview={openPreview} setAgentBusy={setAgentBusy} compact />
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
