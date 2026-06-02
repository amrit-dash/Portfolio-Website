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

/* ---------- shared chat store (page + dock see the same conversation) ---------- */
const agentChat = {
  messages: [],
  sending: false,
  listeners: new Set(),
  push(msg) { this.messages = this.messages.concat([msg]); this.emit(); },
  patchLast(patch) {
    if (!this.messages.length) return;
    const i = this.messages.length - 1;
    this.messages = this.messages.slice(0, i).concat([{ ...this.messages[i], ...patch }]);
    this.emit();
  },
  setSending(b) { this.sending = b; this.emit(); },
  reset() { this.messages = []; this.emit(); },
  emit() { this.listeners.forEach((l) => l()); },
};

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
async function sendAgentMessage({ text, route, inboxMode, setAgentBusy }) {
  const Store = window.ADMIN_STORE.Store;
  if (!text.trim() || agentChat.sending) return;
  agentChat.push({ role: 'user', text });
  agentChat.push({ role: 'assistant', text: '', pending: true });
  agentChat.setSending(true);
  if (setAgentBusy) setAgentBusy(true);
  try {
    const res = await Store.agentTurn({ message: text, currentRoute: route, inboxMode, chatId: 'default' });
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

/* ---------- one turn's message bubble ---------- */
function MessageBubble({ msg, go, openPreview }) {
  const { AdminIcon, Btn } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;
  const [reverted, setReverted] = useState({});

  if (msg.role === 'user') {
    return <div className="agentmsg agentmsg--user"><div className="agentmsg__body">{msg.text}</div></div>;
  }

  const routes = [...new Set((msg.changedPaths || []).map(pathToRoute).filter(Boolean))];

  const revertOne = async (pu, i) => {
    const r = await Store.agentRevertPath(pu.path, pu.before);
    if (r && r.ok) setReverted((s) => ({ ...s, [i]: true }));
  };
  const undoTurn = async () => {
    const r = await Store.agentUndo('default');
    if (r && r.ok) agentChat.patchLast({ undone: true });
  };

  return (
    <div className="agentmsg agentmsg--bot">
      <div className="agentmsg__body">
        {msg.pending ? <span className="agentmsg__typing">working…</span>
          : msg.error ? <span className="login__err">⚠ {msg.error}</span>
            : <span>{msg.text}</span>}
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

      {!!(msg.changedPaths && msg.changedPaths.length) && !msg.undone && (
        <div className="agentchanges">
          <div className="agentchanges__hd">
            {msg.changedPaths.length} change{msg.changedPaths.length === 1 ? '' : 's'} · applied to draft
            <span className="spacer" style={{ flex: 1 }} />
            <Btn sm kind="ghost" icon="reset" onClick={undoTurn}>Undo turn</Btn>
          </div>
          <ul className="agentchanges__list">
            {(msg.perPathUndo || msg.changedPaths.map((p) => ({ path: p }))).map((pu, i) => (
              <li key={i}>
                <code>{pu.path}</code>
                {'before' in pu && (
                  reverted[i]
                    ? <span className="helptext"> reverted ✓</span>
                    : <button className="linkbtn" onClick={() => revertOne(pu, i)}>revert</button>
                )}
              </li>
            ))}
          </ul>
          <div className="agentreview">
            {routes.map((r) => <Btn key={r} sm kind="ghost" onClick={() => go && go(r)}>Review {r} ↗</Btn>)}
            <Btn sm kind="ghost" icon="eye" onClick={() => openPreview && openPreview('draft')}>Live preview ↗</Btn>
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
  const chat = useAgentChat();
  const [input, setInput] = useState('');
  const [inbox, setInbox] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [chat.messages.length, chat.sending]);

  const submit = (e) => {
    if (e) e.preventDefault();
    const t = input;
    setInput('');
    sendAgentMessage({ text: t, route, inboxMode: inbox, setAgentBusy });
  };

  return (
    <div className={'agentchat' + (compact ? ' agentchat--compact' : '')}>
      <div className="agentchat__scroll" ref={scroller}>
        {chat.messages.length === 0 && (
          <div className="agentchat__empty">
            <p>Ask me to edit the portfolio — “tighten my hero”, “add a project for X with these tags”,
              “validate the inbox and turn the good ones into Q&amp;A”. I write to the <b>draft</b>; you review and publish.</p>
          </div>
        )}
        {chat.messages.map((m, i) => <MessageBubble key={i} msg={m} go={go} openPreview={openPreview} />)}
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea
          className="composer__input"
          rows={compact ? 2 : 3}
          value={input}
          placeholder={inbox ? 'inbox triage — describe how to handle visitor questions…' : 'message the agent…'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }}
        />
        <div className="composer__bar">
          <button
            type="button"
            className="composer__tool"
            data-on={inbox}
            title="Inbox triage mode — runs the turn over visitor questions (bot_questions) with a restricted, injection-guarded tool set (no publish/undo)."
            onClick={() => setInbox((v) => !v)}
          >
            <AdminIcon name="chat" size={14} /> Inbox{inbox ? ' on' : ''}
          </button>
          <span className="spacer" style={{ flex: 1 }} />
          <button type="button" className="composer__tool" title="Agent settings (keys & model)" onClick={() => setSettingsOpen(true)}>
            <AdminIcon name="settings" size={15} />
          </button>
          <button className="composer__send" type="submit" disabled={chat.sending || !input.trim()} title="Send (⌘/Ctrl + Enter)">
            <AdminIcon name="rocket" size={14} />
            <span>{chat.sending ? 'Working…' : 'Send'}</span>
          </button>
        </div>
      </form>

      <AgentSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

/* ---------- dedicated Agent page ---------- */
function AgentPage({ route, go, openPreview, setAgentBusy }) {
  const { PageHead, Btn } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;
  const chat = useAgentChat();
  const clear = async () => { await Store.fsClearAgentChat('default'); chat.reset(); };
  return (
    <div>
      <PageHead eyebrow="/AGENT.AI" title="Agent">
        Drive every admin control by chatting. Changes apply to the draft and appear live in the editors; nothing publishes until you say so.
      </PageHead>
      <div className="agentpage canvas--narrow">
        {chat.messages.length > 0 && (
          <div className="agentpage__bar">
            <span className="spacer" style={{ flex: 1 }} />
            <Btn sm kind="ghost" icon="trash" onClick={clear}>Clear conversation</Btn>
          </div>
        )}
        <AgentChat route={route} go={go} openPreview={openPreview} setAgentBusy={setAgentBusy} />
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
          <AdminIcon name="chip" size={22} />
          {chat.sending && <span className="agentdock__pulse" />}
        </button>
      )}
    </div>
  );
}

window.ADMIN_AGENT = { AgentPage, AgentDock, useAgentChat, agentChat };
