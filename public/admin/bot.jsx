/* global React */
/* =====================================================
   amrit.os ADMIN — AmritBot configuration
   Context · Q&A pairs · slash-commands · behavior ·
   LLM provider/key/model routing · live test chat
   ===================================================== */
const { useState: useBState, useRef: useBRef, useEffect: useBEffect } = React;

const BOT_TABS = [
  { id: 'context', label: 'Context' },
  { id: 'qa', label: 'Q&A pairs' },
  { id: 'commands', label: 'Commands' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'providers', label: 'LLM Providers' },
  { id: 'review', label: 'Review / Inbox' },
  { id: 'test', label: 'Test bot' },
];

/* ---- local Q&A matcher (mirrors the site's matcher) ---- */
const B_STOP = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'do', 'does', 'did', 'you', 'your', 'i', 'me', 'my', 'what', 'who', 'where', 'when', 'why', 'how', 'tell', 'about', 'can', 'could', 'would', 'have', 'has', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'it', 'this', 'that', 'and', 'or', 'so']);
function bTok(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !B_STOP.has(w)).map((w) => w.replace(/(ing|tion|ed|er|ly)$/, '')); }
function bJac(a, b) { const A = new Set(bTok(a)), B = new Set(bTok(b)); if (!A.size || !B.size) return 0; const i = [...A].filter((w) => B.has(w)).length; return i / new Set([...A, ...B]).size; }
function localMatch(qa, query, threshold) {
  const pick = (v) => Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
  let best = { s: 0, a: null };
  for (const item of qa) for (const q of (item.qs || [])) { const s = bJac(query, q); if (s > best.s) best = { s, a: pick(item.as) }; }
  return best.s >= threshold ? best.a : null;
}

/* ---- live test via the deployed /chat proxy (same path visitors use) ----
   Sends the owner's Firebase ID token so the proxy bypasses the rate limit AND
   returns the real upstream error (e.g. quota/billing) instead of a silent
   fallback. Tests the ACTIVATED config — click "Activate keys" first. */
async function proxyChat(message, suggestion) {
  const base = window.FUNCTIONS_BASE;
  if (!base) throw new Error('Functions base URL not configured.');
  const headers = { 'Content-Type': 'application/json' };
  if (window.fb && window.fb.auth && window.fb.auth.currentUser) {
    headers.Authorization = 'Bearer ' + (await window.fb.auth.currentUser.getIdToken());
  }
  const res = await fetch(base + '/chat', { method: 'POST', headers, body: JSON.stringify({ message, suggestion }) });
  const d = await res.json().catch(() => ({}));
  return { ok: !!d.text, text: d.text, error: d.error, status: res.status };
}

/* ---- Test chat ---- */
function LiveTest({ bot }) {
  const { AdminIcon, Btn } = window.ADMIN_UI;
  const PROV = window.ADMIN_STORE.LLM_PROVIDERS.find((p) => p.id === bot.providers.active);
  const [msgs, setMsgs] = useBState([{ from: 'sys', text: 'Tests the live /chat proxy with your activated config. If a key fails, the real provider error shows here. Activate keys above first.' }]);
  const [input, setInput] = useBState('');
  const [busy, setBusy] = useBState(false);
  const bodyRef = useBRef(null);
  useBEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy]);

  const send = async () => {
    const q = input.trim(); if (!q || busy) return;
    setInput(''); setMsgs((m) => [...m, { from: 'usr', text: q }]); setBusy(true);
    const matched = localMatch(bot.qa, q, bot.behavior.matchThreshold);
    try {
      const r = await proxyChat(q, matched);
      if (r.ok) {
        setMsgs((m) => [...m, { from: 'bot', text: r.text }, { from: 'sys', text: 'via ' + (PROV ? PROV.label : 'proxy') + ' (live)' }]);
      } else {
        const reply = matched || "i'm offline right now — try /stats, /links, /work or /comedy.";
        setMsgs((m) => [...m, { from: 'bot', text: reply }, { from: 'sys', text: r.error ? ('⚠ ' + r.error + ' — fell back to local Q&A') : 'local Q&A (no key active)' }]);
      }
    } catch (e) {
      const reply = matched || "i'm offline right now.";
      setMsgs((m) => [...m, { from: 'bot', text: reply }, { from: 'sys', text: '⚠ ' + (e && e.message) }]);
    }
    setBusy(false);
  };

  return (
    <div className="chat">
      <div className="chat__body" ref={bodyRef}>
        {msgs.map((m, i) => <div key={i} className={'msg ' + m.from}>{m.text}</div>)}
        {busy && <div className="msg bot">…</div>}
      </div>
      <form className="chat__in" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={input} placeholder="Ask the bot something…" onChange={(e) => setInput(e.target.value)} />
        <Btn kind="primary" icon="play" type="submit" disabled={busy}>Send</Btn>
      </form>
    </div>
  );
}

/* ---- Main bot admin ---- */
function BotAdmin({ content, setAt, saveLLMConfig }) {
  const { PageHead, Panel, Field, Input, SecretInput, TextArea, Select, Btn, AdminIcon, TagInput, BulletEditor } = window.ADMIN_UI;
  const bot = content.bot;
  const [tab, setTab] = useBState('context');
  const [openQA, setOpenQA] = useBState(null);
  const PROVS = window.ADMIN_STORE.LLM_PROVIDERS;

  // ---- Providers tab: LOCAL working copy, nothing persists until Save ----
  const cloneProv = () => JSON.parse(JSON.stringify(bot.providers || { active: 'gemini', byProvider: {} }));
  const [pcfg, setPcfg] = useBState(cloneProv);
  const [fetchedModels, setFetchedModels] = useBState({}); // { providerId: [ids] }
  const [modelErr, setModelErr] = useBState({});           // { providerId: 'message' }
  const [fetching, setFetching] = useBState(null);          // providerId currently fetching
  const [saveState, setSaveState] = useBState(null);        // null | 'saving' | 'saved' | 'error'
  const provDirty = JSON.stringify(pcfg) !== JSON.stringify(bot.providers);

  const localCfg = (id) => (pcfg.byProvider && pcfg.byProvider[id]) || {};
  const setLocal = (id, key, val) => setPcfg((p) => ({ ...p, byProvider: { ...p.byProvider, [id]: { ...(p.byProvider[id] || {}), [key]: val } } }));
  const setActiveProvider = (id) => setPcfg((p) => ({ ...p, active: id }));
  // Model dropdown options: the fetched catalog if we have it, else the seed
  // list — always include the current value so a custom/saved model isn't lost.
  const modelOptions = (p, cfg) => {
    const base = (fetchedModels[p.id] || p.models || []).slice();
    if (cfg.model && !base.includes(cfg.model)) base.unshift(cfg.model);
    return base;
  };

  const authHeaders = async () => {
    const h = { 'Content-Type': 'application/json' };
    if (window.fb && window.fb.auth && window.fb.auth.currentUser) h.Authorization = 'Bearer ' + (await window.fb.auth.currentUser.getIdToken());
    return h;
  };

  const fetchModels = async (id) => {
    setFetching(id); setModelErr((m) => ({ ...m, [id]: null }));
    try {
      const r = await fetch(window.FUNCTIONS_BASE + '/models', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ provider: id, key: localCfg(id).apiKey || '' }) });
      const d = await r.json();
      if (d.models && d.models.length) setFetchedModels((m) => ({ ...m, [id]: d.models }));
      else setModelErr((m) => ({ ...m, [id]: d.error || 'No models returned' }));
    } catch (e) { setModelErr((m) => ({ ...m, [id]: (e && e.message) || 'fetch failed' })); }
    finally { setFetching(null); }
  };

  const saveProviders = async () => {
    setSaveState('saving');
    setAt('bot.providers', pcfg);                                  // persist into the draft
    const merged = { ...content, bot: { ...bot, providers: pcfg } };
    const ok = saveLLMConfig ? await saveLLMConfig(merged) : false; // activate config/llm now
    setSaveState(ok ? 'saved' : 'error');
    setTimeout(() => setSaveState(null), 3000);
  };

  // ---- Review / Inbox: visitor bot questions captured server-side ----
  const [questions, setQuestions] = useBState(null); // null = not loaded
  const [qLoading, setQLoading] = useBState(false);
  const loadQuestions = async () => {
    setQLoading(true);
    try { setQuestions(await window.ADMIN_STORE.Store.fsBotQuestions(100)); }
    catch (e) { setQuestions([]); }
    finally { setQLoading(false); }
  };
  useBEffect(() => { if (tab === 'review' && questions === null) loadQuestions(); }, [tab]);
  const addToQA = (q) => {
    const text = (q.q || '').trim();
    if (!text) return;
    setAt('bot.qa', [...(bot.qa || []), { qs: [text], as: [''] }]);
    window.ADMIN_STORE.Store.fsDeleteBotQuestion(q.id);
    setQuestions((list) => (list || []).filter((x) => x.id !== q.id));
  };
  const dismissQ = (q) => {
    window.ADMIN_STORE.Store.fsDeleteBotQuestion(q.id);
    setQuestions((list) => (list || []).filter((x) => x.id !== q.id));
  };
  const qWhen = (q) => {
    const ms = q.at && q.at.toMillis ? q.at.toMillis() : (q.at && q.at.seconds ? q.at.seconds * 1000 : 0);
    if (!ms) return '';
    const d = Math.floor((Date.now() - ms) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + 'd ago';
  };

  const setIntro = (v) => setAt('bot.intro', v);
  const setQA = (i, key, val) => setAt('bot.qa', bot.qa.map((x, j) => j === i ? { ...x, [key]: val } : x));
  const setCmd = (i, key, val) => setAt('bot.commands', bot.commands.map((x, j) => j === i ? { ...x, [key]: val } : x));
  const setBeh = (key, val) => setAt('bot.behavior.' + key, val);

  return (
    <div>
      <PageHead eyebrow="/AMRIT-BOT.AGENT" title="AmritBot configuration">Everything the hero-section assistant knows and how it answers — context, scripted Q&A, slash-commands, tuning and which LLM powers it.</PageHead>
      <div className="seg" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {BOT_TABS.map((t) => <button key={t.id} data-on={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab === 'context' && (
        <div className="canvas--narrow">
          <Panel title="System prompt / context" sub="the bot's grounding">
            <p className="helptext" style={{ marginBottom: 12 }}>This is injected as the system instruction on every reply. Keep facts here current — name, roles, stack, comedy, achievements.</p>
            <TextArea rows={16} mono value={bot.systemPrompt} onChange={(v) => setAt('bot.systemPrompt', v)} />
          </Panel>
          <Panel title="Intro messages" sub="shown when the chat opens">
            <BulletEditor items={bot.intro} onChange={setIntro} placeholder="Intro line" />
          </Panel>
        </div>
      )}

      {tab === 'qa' && (
        <div className="canvas--narrow">
          <Panel title="Predefined Q&A" sub={`${bot.qa.length} pairs`}
            actions={<Btn sm icon="plus" kind="primary" onClick={() => { const n = [...bot.qa, { qs: [], as: [] }]; setAt('bot.qa', n); setOpenQA(n.length - 1); }}>Add pair</Btn>}>
            <p className="helptext" style={{ marginBottom: 12 }}>Each pair has several phrasings of a question and several answer variants — the bot picks the closest match (and a random answer) when offline, or feeds it as a reference to the live LLM.</p>
            {bot.qa.map((x, i) => (
              <div className="item" key={i}>
                <div className="item__hd clickable" onClick={() => setOpenQA(openQA === i ? null : i)}>
                  <span className="miniico"><AdminIcon name="chat" size={15} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="item__title">{(x.qs && x.qs[0]) || '(empty question)'}</div>
                    <div className="item__sub">{(x.qs || []).length} phrasings · {(x.as || []).length} answers</div>
                  </div>
                  <span className="spacer" />
                  <span className="iconbtn iconbtn--danger" onClick={(e) => { e.stopPropagation(); setAt('bot.qa', bot.qa.filter((_, j) => j !== i)); setOpenQA(null); }}><AdminIcon name="trash" size={14} /></span>
                  <span className="chev" data-open={openQA === i}><AdminIcon name="chev" size={16} /></span>
                </div>
                {openQA === i && (
                  <div className="item__bd">
                    <Field label="Question phrasings" hint="visitor might ask any of these"><TagInput value={x.qs || []} onChange={(v) => setQA(i, 'qs', v)} placeholder="Add phrasing + Enter" /></Field>
                    <Field label="Answer variants" hint="bot picks one at random"><BulletEditor items={x.as || []} onChange={(v) => setQA(i, 'as', v)} placeholder="Answer variant" /></Field>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        </div>
      )}

      {tab === 'commands' && (
        <div className="canvas--narrow">
          <Panel title="Slash commands" sub={`${bot.commands.length} commands`}
            actions={<Btn sm icon="plus" kind="primary" onClick={() => setAt('bot.commands', [...bot.commands, { id: 'new', label: 'new', desc: '', card: '' }])}>Add command</Btn>}>
            <p className="helptext" style={{ marginBottom: 12 }}>Quick chips below the chat (<code>/stats</code>, <code>/links</code>…). The card text is the canned response shown when tapped.</p>
            {bot.commands.map((c, i) => (
              <div className="item" key={i}>
                <div className="item__bd" style={{ borderTop: 0, paddingTop: 14 }}>
                  <div className="row">
                    <Field label="Command" hint="without /"><Input value={c.id} onChange={(v) => setCmd(i, 'id', v)} /></Field>
                    <Field label="Chip label"><Input value={c.label} onChange={(v) => setCmd(i, 'label', v)} /></Field>
                    <Field label="Tooltip"><Input value={c.desc} onChange={(v) => setCmd(i, 'desc', v)} /></Field>
                    <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                      <span className="iconbtn iconbtn--danger" onClick={() => setAt('bot.commands', bot.commands.filter((_, j) => j !== i))}><AdminIcon name="trash" size={14} /></span>
                    </div>
                  </div>
                  {c.id !== 'clear' && <Field label="Response card text" hint="leave blank for built-in commands"><TextArea rows={2} value={c.card} onChange={(v) => setCmd(i, 'card', v)} /></Field>}
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {tab === 'behavior' && (
        <div className="canvas--narrow">
          <Panel title="Response tuning">
            <Field label="Temperature" hint="creativity · 0 = strict, 1 = loose">
              <div className="zoomrow" style={{ marginTop: 0 }}><span className="lbl" style={{ minWidth: 70 }}>{bot.behavior.temperature.toFixed(2)}</span><input className="rng" type="range" min="0" max="1" step="0.05" value={bot.behavior.temperature} onChange={(e) => setBeh('temperature', Number(e.target.value))} /></div>
            </Field>
            <Field label="Max tokens" hint="reply length cap">
              <div className="zoomrow" style={{ marginTop: 0 }}><span className="lbl" style={{ minWidth: 70 }}>{bot.behavior.maxTokens}</span><input className="rng" type="range" min="64" max="1024" step="16" value={bot.behavior.maxTokens} onChange={(e) => setBeh('maxTokens', Number(e.target.value))} /></div>
            </Field>
            <Field label="Q&A match threshold" hint="how close a question must be to trigger a canned answer">
              <div className="zoomrow" style={{ marginTop: 0 }}><span className="lbl" style={{ minWidth: 70 }}>{bot.behavior.matchThreshold.toFixed(2)}</span><input className="rng" type="range" min="0.1" max="0.6" step="0.02" value={bot.behavior.matchThreshold} onChange={(e) => setBeh('matchThreshold', Number(e.target.value))} /></div>
            </Field>
            <Field label="Tone"><Select value={bot.behavior.tone} options={[{ value: 'casual-lowercase', label: 'Casual · lowercase' }, { value: 'professional', label: 'Professional' }, { value: 'playful', label: 'Playful' }, { value: 'concise', label: 'Concise / terse' }]} onChange={(v) => setBeh('tone', v)} /></Field>
          </Panel>
        </div>
      )}

      {tab === 'providers' && (
        <div className="canvas--narrow">
          <div className="callout"><AdminIcon name="key" size={16} /><div>Set the key & model for each provider and choose which one is the <b>default</b>. Nothing is stored while you type — changes are held locally until you click <b>Save &amp; activate</b>. Keys are written to a private server config the proxy reads; they are <b>never</b> sent to visitors or written into the public site.</div></div>

          <div className="provbar">
            <Btn kind="primary" icon="check" onClick={saveProviders} disabled={saveState === 'saving' || !provDirty}>
              {saveState === 'saving' ? 'Saving…' : (provDirty ? 'Save & activate' : 'Saved')}
            </Btn>
            {saveState === 'saved' && <span className="dirty saved"><span className="dot" />Saved & activated ✓</span>}
            {saveState === 'error' && <span className="login__err" style={{ margin: 0 }}>Sign in required / save failed</span>}
            {provDirty && saveState !== 'saving' && <span className="helptext" style={{ color: 'var(--warn, #e0a341)' }}>unsaved changes</span>}
            <span className="helptext" style={{ marginLeft: 'auto' }}>default: <b style={{ color: 'var(--accent)' }}>{(PROVS.find((p) => p.id === pcfg.active) || {}).label || pcfg.active}</b></span>
          </div>

          {PROVS.map((p) => {
            const active = pcfg.active === p.id;
            const cfg = localCfg(p.id);
            const opts = fetchedModels[p.id] || p.models;
            return (
              <div key={p.id} className={'provcard' + (active ? ' provcard--active' : '')}>
                <div className="provcard__hd">
                  <div style={{ minWidth: 0 }}>
                    <div className="provrow__nm">{p.label}{p.tag && <span className="tag">{p.tag}</span>}{active && <span className="tag tag--accent">DEFAULT</span>}</div>
                    <div className="provrow__ep">{p.endpoint.replace('{model}', cfg.model || p.models[0])}</div>
                  </div>
                  <span className="spacer" style={{ flex: 1 }} />
                  <span className={'keystate' + (cfg.apiKey ? ' has' : '')}><span className="d" />{cfg.apiKey ? 'key set' : 'no key'}</span>
                  {active
                    ? <span className="provcard__badge">✓ default</span>
                    : <Btn sm kind="ghost" onClick={() => setActiveProvider(p.id)}>Set as default</Btn>}
                </div>
                <div className="provcard__bd">
                  <Field label="API key" hint={p.keyHint}>
                    <SecretInput name={'llm-key-' + p.id} value={cfg.apiKey || ''} placeholder={'paste your ' + p.label + ' key'} onChange={(v) => setLocal(p.id, 'apiKey', v)} />
                  </Field>
                  <Field label="Model" hint={fetchedModels[p.id] ? `${opts.length} models from ${p.label}` : 'pick a model, or refresh the list from the provider'}>
                    <div className="modelrow">
                      <Select value={cfg.model || ''} options={modelOptions(p, cfg)} onChange={(v) => setLocal(p.id, 'model', v)} />
                      <Btn icon="reset" onClick={() => fetchModels(p.id)} disabled={fetching === p.id}>{fetching === p.id ? 'Refreshing…' : 'Refresh list'}</Btn>
                    </div>
                    {modelErr[p.id] && <div className="helptext" style={{ color: '#e0a341', marginTop: 6 }}>⚠ {modelErr[p.id]}</div>}
                  </Field>
                  <a className="helptext" href={p.docs} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}><AdminIcon name="link" size={13} />Get a key from {p.label}</a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'review' && (
        <div className="canvas--narrow">
          <Panel title="Visitor questions" sub={questions ? `${questions.length} captured` : '…'}
            actions={<Btn sm icon="reset" onClick={loadQuestions} disabled={qLoading}>{qLoading ? 'Loading…' : 'Refresh'}</Btn>}>
            <p className="helptext" style={{ marginBottom: 12 }}>Every question visitors type to the bot is captured here. Turn good ones into canned answers with <b>Add to Q&amp;A</b> (then write the answer in the Q&amp;A tab), or dismiss the rest. This is how the bot gets smarter over time.</p>
            {questions === null ? <p className="helptext" style={{ margin: 0 }}>Loading…</p>
              : questions.length === 0 ? <p className="helptext" style={{ margin: 0 }}>No questions captured yet. Once visitors chat with the live bot, they show up here.</p>
              : questions.map((q) => (
                <div className="item" key={q.id}>
                  <div className="item__hd" style={{ cursor: 'default' }}>
                    <span className="miniico"><AdminIcon name="chat" size={15} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="item__title">{q.q}</div>
                      <div className="item__sub">{qWhen(q)}</div>
                    </div>
                    <span className="spacer" style={{ flex: 1 }} />
                    <Btn sm kind="primary" icon="plus" onClick={() => addToQA(q)}>Add to Q&amp;A</Btn>
                    <span className="iconbtn iconbtn--danger" onClick={() => dismissQ(q)} title="Dismiss"><AdminIcon name="trash" size={14} /></span>
                  </div>
                </div>
              ))}
          </Panel>
        </div>
      )}

      {tab === 'test' && (
        <div className="canvas--narrow">
          <Panel title="Live test" sub={'active: ' + (PROVS.find((p) => p.id === bot.providers.active) || {}).label}>
            <LiveTest bot={bot} />
          </Panel>
        </div>
      )}
    </div>
  );
}

window.ADMIN_BOT = { BotAdmin };
