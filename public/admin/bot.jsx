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
  { id: 'limits', label: 'Limits' },
  { id: 'review', label: 'Review / Inbox' },
  { id: 'test', label: 'Test bot' },
  { id: 'logs', label: 'AmritBot Logs' },
];

/* ---- local Q&A matcher (mirrors the site's matcher) ---- */
const B_STOP = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'do', 'does', 'did', 'you', 'your', 'i', 'me', 'my', 'what', 'who', 'where', 'when', 'why', 'how', 'tell', 'about', 'can', 'could', 'would', 'have', 'has', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'it', 'this', 'that', 'and', 'or', 'so']);
function bTok(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !B_STOP.has(w)).map((w) => w.replace(/(ing|tion|ed|er|ly)$/, '')); }
function bJac(a, b) { const A = new Set(bTok(a)), B = new Set(bTok(b)); if (!A.size || !B.size) return 0; const i = [...A].filter((w) => B.has(w)).length; return i / new Set([...A, ...B]).size; }
function localMatch(qa, query, threshold) {
  const pick = (v) => Array.isArray(v) ? v.at(Math.floor(Math.random() * v.length)) : v;
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
  return { ok: !!d.text, text: d.text, canned: !!d.canned, error: d.error, status: res.status };
}

/* ---- Test chat ---- */
function LiveTest({ bot }) {
  const { AdminIcon, Btn, mdInline } = window.ADMIN_UI;
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
        const tag = r.canned ? 'canned greeting (no LLM call)' : 'via ' + (PROV ? PROV.label : 'proxy') + ' (live)';
        setMsgs((m) => [...m, { from: 'bot', text: r.text }, { from: 'sys', text: tag }]);
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
        {msgs.map((m, i) => <div key={i} className={'msg ' + m.from}>{m.from === 'bot' && mdInline ? mdInline(m.text) : m.text}</div>)}
        {busy && <div className="msg bot"><span className="thinking__dots"><span /><span /><span /></span></div>}
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
  const { PageHead, Panel, Field, DelBtn, Input, SecretInput, TextArea, Select, Btn, AdminIcon, TagInput, BulletEditor } = window.ADMIN_UI;
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
  const [testing, setTesting] = useBState(null);            // providerId currently being test-pinged
  const [testRes, setTestRes] = useBState({});              // { providerId: { ok, text } }
  const [saveState, setSaveState] = useBState(null);        // null | 'saving' | 'saved' | 'error'
  const provDirty = JSON.stringify(pcfg) !== JSON.stringify(bot.providers);

  const localCfg = (id) => (pcfg.byProvider && id !== '__proto__' && id !== 'constructor' && id !== 'prototype' && Reflect.get(pcfg.byProvider, id)) || {};
  const setLocal = (id, key, val) => {
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') return;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    setPcfg((p) => {
      const by = { ...p.byProvider };
      const cur = Reflect.get(by, id) || {};
      const nextItem = { ...cur };
      Reflect.set(nextItem, key, val);
      Reflect.set(by, id, nextItem);
      return { ...p, byProvider: by };
    });
  };
  const setActiveProvider = (id) => setPcfg((p) => ({ ...p, active: id }));
  // Model dropdown options: the fetched catalog if we have it, else the seed
  // list — always include the current value so a custom/saved model isn't lost.
  const modelOptions = (p, cfg) => {
    const base = ((fetchedModels && Reflect.get(fetchedModels, p.id)) || p.models || []).slice();
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

  const testModel = async (id) => {
    setTesting(id); setTestRes((m) => ({ ...m, [id]: null }));
    const cfg = localCfg(id);
    const res = await window.ADMIN_STORE.Store.testModel({ scope: 'bot', provider: id, model: cfg.model || '', key: cfg.apiKey || '' });
    setTesting(null);
    const ok = res && res.ok;
    setTestRes((m) => ({ ...m, [id]: { ok, text: ok ? (res.reply || 'ok') + (res.ms ? ` (${res.ms}ms)` : '') : (res && (res.message || res.error)) || 'failed' } }));
  };

  const saveProviders = async () => {
    setSaveState('saving');
    setAt('bot.providers', pcfg);                                  // persist into the draft
    const merged = { ...content, bot: { ...bot, providers: pcfg } };
    const ok = saveLLMConfig ? await saveLLMConfig(merged) : false; // activate config/llm now
    setSaveState(ok ? 'saved' : 'error');
    setTimeout(() => setSaveState(null), 3000);
  };

  // ---- Limits: operational settings stored in config/settings ----
  const [limits, setLimits] = useBState(null);          // null = not loaded
  const [limitsSaved, setLimitsSaved] = useBState(false);
  useBEffect(() => { if (tab === 'limits' && limits === null) window.ADMIN_STORE.Store.fsLoadSettings().then(setLimits); }, [tab]);
  const setLimit = (k, v) => { setLimits((l) => ({ ...l, [k]: v })); setLimitsSaved(false); };
  const saveLimits = async () => {
    const ok = await window.ADMIN_STORE.Store.fsSaveSettings(limits);
    setLimitsSaved(ok);
    if (ok) setTimeout(() => setLimitsSaved(false), 3000);
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

  // ---- AI triage: classify visitor questions in batches of 5 (server-side
  //      conversation), then apply suggestions by TEXT match (never a stale index).
  // Triage runs in a module-level background runner (survives page navigation +
  // reload, syncs to Firestore) instead of local component state.
  const inboxRun = window.ADMIN_INBOX.useInboxRunner();
  const suggestions = inboxRun.suggestions;   // id -> suggestion
  const aiBusy = inboxRun.running;
  const aiErr = inboxRun.error;
  const [actErr, setActErr] = useBState(null);         // errors from apply/dismiss actions
  const [openInfo, setOpenInfo] = useBState(null);     // id whose suggestion panel is open

  // Kick off background triage for every unprocessed question. The runner chunks
  // the work (5/call), keeps going after you leave this page, and persists each
  // step — so you can navigate away and come back to ready suggestions.
  const aiProcess = () => {
    if (!questions || aiBusy) return;
    const ids = questions.filter((q) => !suggestions[q.id]).map((q) => q.id);
    inboxRun.start(ids);
  };

  // Delete the inbox question only AFTER the QA write is enqueued + the delete
  // resolves; restore the row on failure.
  const removeQuestion = async (id) => {
    try {
      await window.ADMIN_STORE.Store.fsDeleteBotQuestion(id);
      setQuestions((list) => (list || []).filter((x) => x.id !== id));
      inboxRun.resolve(id);   // drop its background-run suggestion + processed mark
      setOpenInfo(null);
    } catch (e) { setActErr('could not remove question — try again'); }
  };
  const applyNew = async (q, s) => {
    const qs = (s && s.suggestedQuestions && s.suggestedQuestions.length) ? s.suggestedQuestions : [(q.q || '').trim()];
    const as = (s && s.suggestedAnswers && s.suggestedAnswers.length) ? s.suggestedAnswers : [''];
    setAt('bot.qa', [...(bot.qa || []), { qs, as }]);   // enqueue QA write first
    await removeQuestion(q.id);
  };
  const applyPhrase = async (q, s) => {
    const phrasing = ((s && s.phrasing) || (q.q || '')).trim();
    // Resolve the target by TEXT (matchQuestion), not the raw index — the Q&A list
    // may have changed since processing. Fall back to a new entry if not found.
    let idx = -1;
    if (s && typeof s.matchQuestion === 'string') {
      const t = s.matchQuestion.trim().toLowerCase();
      idx = (bot.qa || []).findIndex((x) => (((x.qs && x.qs[0]) || '').trim().toLowerCase()) === t);
    }
    if (idx < 0 && s && Number.isInteger(s.matchIndex) && bot.qa && bot.qa[s.matchIndex]) idx = s.matchIndex;
    if (idx < 0 || !bot.qa[idx]) { await applyNew(q, s); return; } // pair gone → add as new
    const cur = (bot.qa[idx].qs) || [];
    if (!cur.some((p) => p.trim().toLowerCase() === phrasing.toLowerCase())) setQA(idx, 'qs', [...cur, phrasing]);
    await removeQuestion(q.id);
  };
  const dismissQ = (q) => { removeQuestion(q.id); };
  const verdictLabel = (v) => v === 'existing_phrase' ? 'Already covered' : v === 'irrelevant' ? 'Not worth automating' : 'New question';
  const verdictLabelShort = (v) => v === 'existing_phrase' ? 'Covered' : v === 'irrelevant' ? 'Skip' : 'New';
  const unprocessedCount = () => (questions || []).filter((q) => !suggestions[q.id]).length;

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
      <div className="canvas--narrow">
        <div className="seg" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
          {BOT_TABS.map((t) => <button key={t.id} data-on={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
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
          <Panel className="panel--commands" title="Slash commands" sub={`${bot.commands.length} commands`}
            actions={<div className="panel__actions">
              <button className="btn btn--sm btn--primary" type="button" title="Add command"
                onClick={() => setAt('bot.commands', [...bot.commands, { id: 'new', label: 'new', desc: '', card: '' }])}>
                <AdminIcon name="plus" size={13} /><span className="btn__label">Add command</span>
              </button>
            </div>}>
            <p className="helptext" style={{ marginBottom: 12 }}>Quick chips below the chat (<code>/stats</code>, <code>/links</code>…). The card text is the canned response shown when tapped.</p>
            {bot.commands.map((c, i) => (
              <div className="item" key={i}>
                <div className="item__bd" style={{ borderTop: 0, paddingTop: 14 }}>
                  <div className="row">
                    <Field label="Command" hint="without /"><Input value={c.id} onChange={(v) => setCmd(i, 'id', v)} /></Field>
                    <Field label="Chip label"><Input value={c.label} onChange={(v) => setCmd(i, 'label', v)} /></Field>
                    <Field label="Tooltip"><Input value={c.desc} onChange={(v) => setCmd(i, 'desc', v)} /></Field>
                    <DelBtn onClick={() => setAt('bot.commands', bot.commands.filter((_, j) => j !== i))} />
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
            const opts = (fetchedModels && Reflect.get(fetchedModels, p.id)) || p.models;
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
                  <Field label="Model" hint={(fetchedModels && Reflect.get(fetchedModels, p.id)) ? `${opts.length} models from ${p.label}` : 'pick a model, or refresh the list from the provider'}>
                    <div className="modelrow">
                      <Select value={cfg.model || ''} options={modelOptions(p, cfg)} onChange={(v) => setLocal(p.id, 'model', v)} />
                      <div className="modelrow__actions">
                        <Btn icon="reset" onClick={() => fetchModels(p.id)} disabled={fetching === p.id} title="Refresh model list from provider"><span className="btn__label">{fetching === p.id ? 'Refreshing…' : 'Refresh list'}</span></Btn>
                        <Btn icon="play" kind="ghost" onClick={() => testModel(p.id)} disabled={testing === p.id || !cfg.apiKey || !cfg.model} title="Send a hello to this model — result also logged in AmritBot logs"><span className="btn__label">{testing === p.id ? 'Testing…' : 'Test model'}</span></Btn>
                      </div>
                    </div>
                    {modelErr && Reflect.get(modelErr, p.id) && <div className="helptext" style={{ color: '#e0a341', marginTop: 6 }}>⚠ {Reflect.get(modelErr, p.id)}</div>}
                    {testRes && Reflect.get(testRes, p.id) && (
                      <div className="helptext" style={{ marginTop: 6, color: Reflect.get(testRes, p.id).ok ? 'var(--accent)' : '#e0a341' }}>
                        {Reflect.get(testRes, p.id).ok ? '✓' : '⚠'} {Reflect.get(testRes, p.id).text}
                      </div>
                    )}
                  </Field>
                  <a className="helptext" href={p.docs} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}><AdminIcon name="link" size={13} />Get a key from {p.label}</a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'limits' && (
        <div className="canvas--narrow">
          <div className="callout"><AdminIcon name="key" size={16} /><div>Operational limits enforced server-side by the bot proxy and the analytics tracker. These protect against abuse and runaway cost. Stored in a private config the functions read.</div></div>
          {limits === null ? <p className="helptext">Loading…</p> : (
            <Panel title="Rate limits & retention" actions={<Btn sm kind="primary" icon="check" onClick={saveLimits}>{limitsSaved ? 'Saved ✓' : 'Save'}</Btn>}>
              <Field label="Bot messages per IP / hour" hint="public bot throttle; the admin test bypasses it">
                <div className="zoomrow" style={{ marginTop: 0 }}><span className="lbl" style={{ minWidth: 70 }}>{limits.botRatePerHour}</span><input className="rng" type="range" min="5" max="120" step="5" value={limits.botRatePerHour} onChange={(e) => setLimit('botRatePerHour', Number(e.target.value))} /></div>
              </Field>
              <Field label="Analytics events per IP / hour" hint="stops anyone inflating your stats">
                <div className="zoomrow" style={{ marginTop: 0 }}><span className="lbl" style={{ minWidth: 70 }}>{limits.trackRatePerHour}</span><input className="rng" type="range" min="30" max="500" step="10" value={limits.trackRatePerHour} onChange={(e) => setLimit('trackRatePerHour', Number(e.target.value))} /></div>
              </Field>
              <Field label="Event retention (days)" hint="how long the recent-activity feed keeps individual events">
                <div className="zoomrow" style={{ marginTop: 0 }}><span className="lbl" style={{ minWidth: 70 }}>{limits.eventRetentionDays}d</span><input className="rng" type="range" min="7" max="180" step="7" value={limits.eventRetentionDays} onChange={(e) => setLimit('eventRetentionDays', Number(e.target.value))} /></div>
              </Field>
              <p className="helptext" style={{ marginTop: 4 }}>Rate limits take effect immediately on save. Counters (totals) are never deleted — only the per-event feed is pruned to the retention window.</p>
            </Panel>
          )}
        </div>
      )}

      {tab === 'review' && (
        <div className="canvas--narrow">
          <Panel className="panel--inbox" title="Visitor questions" sub={questions ? `${questions.length} captured` : '…'}
            actions={<>
              <Btn sm kind="primary" icon="sparkle" onClick={aiProcess} disabled={aiBusy || !questions || !unprocessedCount()}>
                {aiBusy ? `Processing… ${inboxRun.done}/${inboxRun.total}` : 'AI process'}
              </Btn>
              <Btn sm icon="reset" onClick={loadQuestions} disabled={qLoading} title="Reload visitor questions"><span className="btn__label">{qLoading ? 'Loading…' : 'Refresh'}</span></Btn>
            </>}>
            <p className="helptext" style={{ marginBottom: 12 }}>Every question visitors type to the bot is captured here. Hit <b>AI process</b> to let the agent triage them (5 at a time) — it suggests merging a question into an existing Q&amp;A, creating a new one with answers, or dismissing junk. Triage runs in the background, so you can leave this page and come back to ready suggestions.</p>
            {(aiErr || actErr) && <div className="helptext" style={{ color: '#e0a341', marginBottom: 10 }}>⚠ {aiErr || actErr}</div>}
            {questions === null ? <p className="helptext" style={{ margin: 0 }}>Loading…</p>
              : questions.length === 0 ? <p className="helptext" style={{ margin: 0 }}>No questions captured yet. Once visitors chat with the live bot, they show up here.</p>
                : questions.map((q) => {
                  const s = suggestions[q.id];
                  const proc = aiBusy && !s;   // queued/processing in the background run
                  const open = openInfo === q.id;
                  return (
                    <div className="item" key={q.id}>
                      <div className="item__hd item__hd--inbox" style={{ cursor: 'default' }}>
                        <span className="miniico"><AdminIcon name="chat" size={15} /></span>
                        <div className="item__text">
                          <div className="item__title">{q.q}</div>
                          <div className="item__sub">{qWhen(q)}{s ? <span className={'verdicttag verdicttag--' + s.verdict} title={verdictLabel(s.verdict)}><span className="verdicttag__full">{verdictLabel(s.verdict)}</span><span className="verdicttag__short">{verdictLabelShort(s.verdict)}</span></span> : null}</div>
                        </div>
                        <span className="spacer" style={{ flex: 1 }} />
                        <div className="item__actions">
                          {proc ? <span className="helptext">processing…</span>
                            : s ? <span className={'iconbtn infobtn infobtn--' + s.verdict} onClick={() => setOpenInfo(open ? null : q.id)} title="AI suggestion — review & add"><AdminIcon name="info" size={15} /></span>
                              : <span className="helptext" style={{ fontSize: 11, opacity: .7 }}>not triaged</span>}
                          <span className="iconbtn iconbtn--danger" onClick={() => dismissQ(q)} title="Dismiss"><AdminIcon name="trash" size={14} /></span>
                        </div>
                      </div>
                      {open && s && (
                        <div className="item__bd inboxsug">
                          {s.reason && <p className="helptext" style={{ marginTop: 0 }}>{s.reason}</p>}
                          {s.verdict === 'existing_phrase' && <div className="inboxsug__match">Matches: <b>{s.matchQuestion || ('Q&A #' + s.matchIndex)}</b></div>}
                          {s.verdict === 'new_question' && (s.suggestedQuestions.length || s.suggestedAnswers.length) ? (
                            <div className="inboxsug__preview">
                              {!!s.suggestedQuestions.length && <div><span className="inboxsug__k">phrasings</span> {s.suggestedQuestions.join('  ·  ')}</div>}
                              {!!s.suggestedAnswers.length && <div><span className="inboxsug__k">answers</span> {s.suggestedAnswers.join('   /   ')}</div>}
                            </div>
                          ) : null}
                          <div className="inboxsug__actions">
                            {s.verdict === 'existing_phrase' && <Btn sm kind="primary" icon="plus" onClick={() => applyPhrase(q, s)}>Add as phrase</Btn>}
                            {s.verdict === 'new_question' && <Btn sm kind="primary" icon="plus" onClick={() => applyNew(q, s)}>Add to Q&amp;A</Btn>}
                            {s.verdict !== 'new_question' && <Btn sm kind="ghost" icon="plus" onClick={() => applyNew(q, s)}>Add as new instead</Btn>}
                            <Btn sm kind="ghost" icon="trash" onClick={() => dismissQ(q)}>Dismiss</Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {tab === 'logs' && (
        <div className="canvas--narrow">
          <Panel title="AmritBot logs" sub="chat · inbox · provider errors — newest first, live">
            <p className="helptext" style={{ marginTop: 0, marginBottom: 14 }}>
              Read-only feed from Cloud Logging — AmritBot chat replies, fallbacks, inbox triage and provider errors, newest first.
            </p>
            {window.ADMIN_LOGS
              ? <window.ADMIN_LOGS.LogsView source="bot" height={460} />
              : <p className="helptext">Logs view unavailable.</p>}
          </Panel>
        </div>
      )}
    </div>
  );
}

window.ADMIN_BOT = { BotAdmin };
