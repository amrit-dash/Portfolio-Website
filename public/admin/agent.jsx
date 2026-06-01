/* global React */
/* =====================================================
   amrit.os ADMIN — Agentic AI (page + floating dock)
   Shared session, tool-call display, review links.
   ===================================================== */
const { useState: useAgState, useRef: useAgRef, useEffect: useAgEffect, useCallback: useAgCallback, createContext, useContext } = React;

/* Map changed content paths → admin routes for review links. */
const PATH_ROUTE = {
  hero: 'hero',
  about: 'about',
  expertise: 'expertise',
  experience: 'work',
  work: 'work',
  projects: 'projects',
  cards: 'cards',
  contact: 'contact',
  media: 'media',
  cosmetics: 'appearance',
  appearance: 'appearance',
  bot: 'bot',
};

function routeForPath(path) {
  const top = String(path || '').split('.')[0];
  return Reflect.get(PATH_ROUTE, top) || null;
}

function uniqueRoutes(paths) {
  const out = [];
  (paths || []).forEach((p) => {
    const r = routeForPath(p);
    if (r && !out.includes(r)) out.push(r);
  });
  return out;
}

/* ---------- API ---------- */
async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (window.fb && window.fb.auth && window.fb.auth.currentUser) {
    headers.Authorization = 'Bearer ' + (await window.fb.auth.currentUser.getIdToken());
  }
  return headers;
}

async function postAgentTurn({ chatId, message, currentRoute, attachments }) {
  const base = window.FUNCTIONS_BASE;
  if (!base) throw new Error('Functions base URL not configured.');
  const res = await fetch(base + '/agent', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ chatId, message, currentRoute, attachments: attachments || [] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Agent request failed (' + res.status + ')'));
  return data;
}

/* ---------- Shared agent session ---------- */
const AgentCtx = createContext(null);

function AgentProvider({ children, currentRoute, setAgentTurnPending, go, onPreview }) {
  const chatIdRef = useAgRef(() => 'chat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const [messages, setMessages] = useAgState([
    { role: 'sys', text: 'Agent ready — edits apply to draft. Review changes, then publish manually.' },
  ]);
  const [busy, setBusy] = useAgState(false);
  const [lastTurn, setLastTurn] = useAgState(null); // { toolCalls, changedPaths, reviewLinks }

  const send = useAgCallback(async (text) => {
    const q = String(text || '').trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: 'usr', text: q }]);
    setBusy(true);
    if (setAgentTurnPending) setAgentTurnPending(true);
    try {
      const data = await postAgentTurn({ chatId: chatIdRef.current, message: q, currentRoute });
      const reply = data.reply || '(no reply)';
      const toolCalls = data.toolCalls || [];
      const changedPaths = data.changedPaths || [];
      setLastTurn({ toolCalls, changedPaths, perPathUndo: data.perPathUndo || [] });
      setMessages((m) => [...m, { role: 'bot', text: reply, toolCalls, changedPaths }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'sys', text: '⚠ ' + ((e && e.message) || 'Agent unavailable') }]);
    } finally {
      setBusy(false);
      if (setAgentTurnPending) setAgentTurnPending(false);
    }
  }, [busy, currentRoute, setAgentTurnPending]);

  const clearChat = useAgCallback(() => {
    chatIdRef.current = 'chat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    setMessages([{ role: 'sys', text: 'New conversation started.' }]);
    setLastTurn(null);
  }, []);

  const value = {
    messages, busy, send, clearChat, lastTurn, go, onPreview, currentRoute,
  };
  return <AgentCtx.Provider value={value}>{children}</AgentCtx.Provider>;
}

function useAgent() {
  const ctx = useContext(AgentCtx);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}

/* ---------- Tool / audit chips ---------- */
function ToolChips({ toolCalls }) {
  if (!toolCalls || !toolCalls.length) return null;
  return (
    <div className="agent-tools">
      {toolCalls.map((t, i) => (
        <span key={i} className="agent-tools__chip" title={JSON.stringify(t.args || {})}>
          {t.name || t.tool || 'tool'}
        </span>
      ))}
    </div>
  );
}

function ReviewLinks({ changedPaths, go, onPreview }) {
  const routes = uniqueRoutes(changedPaths);
  if (!routes.length) return null;
  const { Btn } = window.ADMIN_UI;
  return (
    <div className="agent-review">
      {routes.map((r) => (
        <Btn key={r} sm kind="ghost" icon="link" onClick={() => go(r)}>Review {r} ↗</Btn>
      ))}
      {onPreview && <Btn sm icon="eye" onClick={onPreview}>Live preview</Btn>}
    </div>
  );
}

/* ---------- Chat panel (shared by page + dock) ---------- */
function AgentChat({ compact }) {
  const { AdminIcon, Btn } = window.ADMIN_UI;
  const { messages, busy, send, clearChat, lastTurn, go, onPreview } = useAgent();
  const [input, setInput] = useAgState('');
  const bodyRef = useAgRef(null);

  useAgEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const submit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput('');
    send(q);
  };

  return (
    <div className={'agent-chat' + (compact ? ' agent-chat--compact' : '')}>
      <div className="agent-chat__body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i}>
            <div className={'msg ' + (m.role === 'usr' ? 'usr' : m.role === 'sys' ? 'sys' : 'bot')}>{m.text}</div>
            {m.toolCalls && <ToolChips toolCalls={m.toolCalls} />}
            {m.changedPaths && m.changedPaths.length > 0 && (
              <ReviewLinks changedPaths={m.changedPaths} go={go} onPreview={onPreview} />
            )}
          </div>
        ))}
        {busy && <div className="msg bot">…</div>}
      </div>
      {lastTurn && lastTurn.changedPaths && lastTurn.changedPaths.length > 0 && (
        <div className="agent-chat__audit">
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-mute)' }}>
            Last turn · {lastTurn.changedPaths.length} path{lastTurn.changedPaths.length === 1 ? '' : 's'} changed
          </span>
          <ReviewLinks changedPaths={lastTurn.changedPaths} go={go} onPreview={onPreview} />
        </div>
      )}
      <form className="chat__in" onSubmit={submit}>
        <input value={input} placeholder="Ask the agent to edit your portfolio…" onChange={(e) => setInput(e.target.value)} disabled={busy} />
        <Btn kind="primary" icon="play" type="submit" disabled={busy || !input.trim()}>Send</Btn>
      </form>
      <div className="agent-chat__foot">
        <Btn sm kind="ghost" icon="reset" onClick={clearChat} disabled={busy}>Clear chat</Btn>
      </div>
    </div>
  );
}

/* ---------- Agent page ---------- */
function AgentPage() {
  const { PageHead, Panel, AdminIcon } = window.ADMIN_UI;
  const { currentRoute } = useAgent();
  return (
    <div className="agent-page">
      <PageHead eyebrow="/AGENT.AI" title="Portfolio agent">
        Natural-language edits applied directly to your draft — page-aware ({currentRoute || 'overview'}). Review each change, undo if needed, then publish manually.
      </PageHead>
      <div className="agent-page__grid">
        <Panel title="Conversation" sub="tool calls and audit trail appear inline">
          <AgentChat />
        </Panel>
        <Panel title="How it works" tight>
          <div className="bars">
            {[['Draft-only', 'Never auto-publishes — you ship when ready'], ['Undo', 'Turn-level undo restores the pre-turn snapshot (when backend is live)'], ['Review', 'Each changed section gets a review link + live preview'], ['Safe', 'Provider keys and bot behaviors are blocklisted']].map(([a, b]) => (
              <div className="barrow" key={a} style={{ gridTemplateColumns: '110px 1fr' }}>
                <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>{a}</span>
                <span className="helptext">{b}</span>
              </div>
            ))}
          </div>
          <div className="callout" style={{ marginTop: 14, marginBottom: 0 }}>
            <AdminIcon name="info" size={16} />
            <div>The agent shares this session with the floating dock on every screen.</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Floating dock ---------- */
function AgentDock() {
  const { AdminIcon } = window.ADMIN_UI;
  const [open, setOpen] = useAgState(false);
  const [expanded, setExpanded] = useAgState(false);

  useAgEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  return (
    <>
      <div className="agent-dock-scrim" data-open={open} onClick={() => setOpen(false)} />
      <div className={'agent-dock' + (open ? ' agent-dock--open' : '') + (expanded ? ' agent-dock--wide' : '')}>
        <button type="button" className="agent-dock__bubble" onClick={() => setOpen((o) => !o)} title="Portfolio agent" aria-expanded={open}>
          <AdminIcon name="sparkle" size={22} />
        </button>
        {open && (
          <div className="agent-dock__panel">
            <div className="agent-dock__bar">
              <AdminIcon name="sparkle" size={15} />
              <span>Agent</span>
              <span className="spacer" />
              <button type="button" className="iconbtn" onClick={() => setExpanded((e) => !e)} title={expanded ? 'Narrow' : 'Widen'}>
                <AdminIcon name={expanded ? 'chevron-down' : 'chevron-up'} size={14} />
              </button>
              <button type="button" className="iconbtn" onClick={() => setOpen(false)} aria-label="Close"><AdminIcon name="x" size={15} /></button>
            </div>
            <AgentChat compact />
          </div>
        )}
      </div>
    </>
  );
}

window.ADMIN_AGENT = { AgentProvider, AgentPage, AgentDock, useAgent, routeForPath, postAgentTurn };
