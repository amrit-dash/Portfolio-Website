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

/* ---- live provider call ---- */
async function callProvider(providerId, cfg, systemPrompt, behavior, userText, hint) {
  const PROV = window.ADMIN_STORE.LLM_PROVIDERS.find((p) => p.id === providerId);
  const model = cfg.model;
  const key = cfg.apiKey;
  if (!key) throw new Error('no-key');
  const userMsg = hint ? `Reference answer: "${hint}"\n\nUser: ${userText}\n\nUse the reference, rephrase naturally, 1-2 sentences.` : userText;

  if (providerId === 'gemini') {
    const url = PROV.endpoint.replace('{model}', model) + '?key=' + key;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts: [{ text: userMsg }] }], generationConfig: { temperature: behavior.temperature, maxOutputTokens: behavior.maxTokens } }) });
    const d = await res.json();
    const t = d.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!t) throw new Error('empty'); return t.trim();
  }
  if (providerId === 'anthropic') {
    const res = await fetch(PROV.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: behavior.maxTokens, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] }) });
    const d = await res.json();
    const t = d.content?.[0]?.text; if (!t) throw new Error('empty'); return t.trim();
  }
  // OpenAI-compatible: openai, openrouter, mistral, grok
  const res = await fetch(PROV.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], temperature: behavior.temperature, max_tokens: behavior.maxTokens }) });
  const d = await res.json();
  const t = d.choices?.[0]?.message?.content; if (!t) throw new Error('empty'); return t.trim();
}

/* ---- Test chat ---- */
function LiveTest({ bot }) {
  const { AdminIcon, Btn } = window.ADMIN_UI;
  const PROV = window.ADMIN_STORE.LLM_PROVIDERS.find((p) => p.id === bot.providers.active);
  const cfg = bot.providers.byProvider[bot.providers.active] || {};
  const [msgs, setMsgs] = useBState([{ from: 'sys', text: 'Test session — replies use the config above. Without a live API key it answers from your Q&A pairs.' }]);
  const [input, setInput] = useBState('');
  const [busy, setBusy] = useBState(false);
  const bodyRef = useBRef(null);
  useBEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy]);

  const send = async () => {
    const q = input.trim(); if (!q || busy) return;
    setInput(''); setMsgs((m) => [...m, { from: 'usr', text: q }]); setBusy(true);
    const matched = localMatch(bot.qa, q, bot.behavior.matchThreshold);
    let reply, via;
    try {
      reply = await callProvider(bot.providers.active, cfg, bot.systemPrompt, bot.behavior, q, matched);
      via = PROV.label;
    } catch (e) {
      reply = matched || "i'm offline right now — try /stats, /links, /work or /comedy.";
      via = e.message === 'no-key' ? 'local Q&A (no key set)' : 'local Q&A (API unreachable)';
    }
    setMsgs((m) => [...m, { from: 'bot', text: reply }, { from: 'sys', text: 'via ' + via }]);
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
  const [keyStatus, setKeyStatus] = useBState(null); // null | 'saving' | 'saved' | 'error'
  const PROVS = window.ADMIN_STORE.LLM_PROVIDERS;

  const activateKeys = async () => {
    setKeyStatus('saving');
    const ok = saveLLMConfig ? await saveLLMConfig() : false;
    setKeyStatus(ok ? 'saved' : 'error');
    setTimeout(() => setKeyStatus(null), 3000);
  };

  const setIntro = (v) => setAt('bot.intro', v);
  const setQA = (i, key, val) => setAt('bot.qa', bot.qa.map((x, j) => j === i ? { ...x, [key]: val } : x));
  const setCmd = (i, key, val) => setAt('bot.commands', bot.commands.map((x, j) => j === i ? { ...x, [key]: val } : x));
  const setBeh = (key, val) => setAt('bot.behavior.' + key, val);
  const setProvCfg = (pid, key, val) => setAt('bot.providers.byProvider.' + pid + '.' + key, val);

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
          <div className="callout"><AdminIcon name="key" size={16} /><div>Pick the active provider and set its key & model. Edits autosave to your private draft as you type. To make a key live for the bot, click <b>Activate keys</b> below (or Publish) — keys are stored server-side in a private config the proxy reads; they are <b>never</b> sent to visitors or written into the public site.</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
            <Btn kind="primary" icon="check" onClick={activateKeys} disabled={keyStatus === 'saving'}>
              {keyStatus === 'saving' ? 'Activating…' : 'Activate keys (sync to live bot)'}
            </Btn>
            {keyStatus === 'saved' && <span className="dirty saved"><span className="dot" />Keys activated ✓</span>}
            {keyStatus === 'error' && <span className="login__err" style={{ margin: 0 }}>Sign in required / save failed</span>}
            <span className="helptext" style={{ marginLeft: 'auto' }}>also runs automatically on Publish</span>
          </div>
          {PROVS.map((p) => {
            const active = bot.providers.active === p.id;
            const cfg = bot.providers.byProvider[p.id] || { apiKey: '', model: p.models[0] };
            return (
              <div key={p.id}>
                <div className="provrow" data-on={active} onClick={() => setAt('bot.providers.active', p.id)}>
                  <span className="provrow__radio" />
                  <div style={{ minWidth: 0 }}>
                    <div className="provrow__nm">{p.label}{p.tag && <span className="tag">{p.tag}</span>}</div>
                    <div className="provrow__ep">{p.endpoint.replace('{model}', cfg.model)}</div>
                  </div>
                  <span className={'keystate' + (cfg.apiKey ? ' has' : '')}><span className="d" />{cfg.apiKey ? 'key set' : 'no key'}</span>
                </div>
                {active && (
                  <div className="item" style={{ marginTop: -4 }}>
                    <div className="item__bd" style={{ borderTop: 0, paddingTop: 14 }}>
                      <div className="row">
                        <Field label="API key" hint={p.keyHint}><SecretInput name={'llm-key-' + p.id} value={cfg.apiKey} placeholder={'paste your ' + p.label + ' key'} onChange={(v) => setProvCfg(p.id, 'apiKey', v)} /></Field>
                        <Field label="Model"><Select value={cfg.model} options={p.models} onChange={(v) => setProvCfg(p.id, 'model', v)} /></Field>
                      </div>
                      <a className="helptext" href={p.docs} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}><AdminIcon name="link" size={13} />Get a key from {p.label}</a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
