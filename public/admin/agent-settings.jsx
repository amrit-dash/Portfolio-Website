/* global React */
/* =====================================================
   amrit.os ADMIN — Agent settings
   -----------------------------------------------------
   The admin agent runs on its OWN keys (config/agent), fully SEPARATE from the
   AmritBot's config/llm. Paste a billable key per provider, pick the model
   (filtered to tool-capable models), and choose the default provider. Keys are
   held locally until Save, written to a private owner-only doc the function
   reads server-side, and NEVER sent to the browser of any visitor or written
   into published content.
   ===================================================== */
const { useState, useEffect } = React;

const SCHEMA = (typeof window !== 'undefined' && window.SHARED_SCHEMA) || {};
const TOOL_MODELS = SCHEMA.AGENT_TOOL_MODELS || {};
const AGENT_DEFAULTS = SCHEMA.AGENT_CONFIG_DEFAULTS || { active: 'gemini', byProvider: {} };

// Providers the agent can use = catalog entries that have a curated tool-capable
// model list. (Each is its own provider with its own native adapter server-side.)
function agentProviders() {
  const catalog = (window.LLM_PROVIDERS || []);
  return catalog.filter((p) => Reflect.has(TOOL_MODELS, p.id));
}

function modelOptions(providerId, currentModel, fetched) {
  const curated = (Reflect.get(TOOL_MODELS, providerId) || []).map((m) => ({
    value: m.id, label: m.label + (m.free ? ' · free' : ''),
  }));
  const list = (fetched && fetched.length)
    ? fetched.map((id) => ({ value: id, label: id + (curatedFree(providerId, id) ? ' · free' : '') }))
    : curated;
  if (currentModel && !list.some((o) => o.value === currentModel)) {
    list.unshift({ value: currentModel, label: currentModel + ' (saved)' });
  }
  return list.length ? list : [{ value: '', label: '— pick a model —' }];
}
function curatedFree(providerId, id) {
  return (Reflect.get(TOOL_MODELS, providerId) || []).some((m) => m.id === id && m.free);
}

function AgentSettingsPage({ modal }) {
  const { PageHead, Panel, Field, Select, Btn, AdminIcon, SecretInput } = window.ADMIN_UI;
  const { Store } = window.ADMIN_STORE;
  const PROVS = agentProviders();

  const [cfg, setCfg] = useState({ active: AGENT_DEFAULTS.active, byProvider: {}, refinerModel: '' });
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [fetched, setFetched] = useState({});   // providerId -> [modelId]
  const [fetching, setFetching] = useState(null);
  const [modelErr, setModelErr] = useState({});
  const [testing, setTesting] = useState(null);   // providerId being tested
  const [testRes, setTestRes] = useState({});      // providerId -> { ok, text }

  useEffect(() => {
    let cancelled = false;
    Store.fsLoadAgentConfig().then((c) => {
      if (cancelled) return;
      setCfg({ active: c.active || AGENT_DEFAULTS.active, byProvider: c.byProvider || {}, refinerModel: c.refinerModel || '' });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const pcfg = (id) => (cfg.byProvider && Reflect.get(cfg.byProvider, id)) || {};
  const setLocal = (id, key, val) => {
    setCfg((c) => {
      const by = { ...(c.byProvider || {}) };
      by[id] = { ...(Reflect.get(by, id) || {}), [key]: val };
      return { ...c, byProvider: by };
    });
    setDirty(true); setSaveState('idle');
  };
  const setActive = (id) => { setCfg((c) => ({ ...c, active: id })); setDirty(true); setSaveState('idle'); };
  const setRefiner = (v) => { setCfg((c) => ({ ...c, refinerModel: v })); setDirty(true); setSaveState('idle'); };

  const fetchModels = async (id) => {
    setFetching(id); setModelErr((e) => ({ ...e, [id]: null }));
    try {
      const tok = await Store._ownerToken();
      const r = await fetch(window.FUNCTIONS_BASE + '/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ provider: id, key: pcfg(id).apiKey || '' }),
      });
      const d = await r.json();
      if (d.models && d.models.length) setFetched((f) => ({ ...f, [id]: d.models }));
      else setModelErr((e) => ({ ...e, [id]: d.error || 'no models returned' }));
    } catch (e) { setModelErr((er) => ({ ...er, [id]: e.message })); }
    setFetching(null);
  };

  const testModel = async (id) => {
    setTesting(id); setTestRes((r) => ({ ...r, [id]: null }));
    const c = pcfg(id);
    const res = await Store.testModel({ scope: 'agent', provider: id, model: c.model || '', key: c.apiKey || '' });
    setTesting(null);
    const ok = res && res.ok;
    setTestRes((r) => ({ ...r, [id]: { ok, text: ok ? (res.reply || 'ok') + (res.ms ? ` (${res.ms}ms)` : '') : (res && (res.message || res.error)) || 'failed' } }));
    // Flip the Agent page to its Logs view so the test (and any error) is visible there.
    try { window.ADMIN_AGENT && window.ADMIN_AGENT.agentChat && window.ADMIN_AGENT.agentChat.openLogs && window.ADMIN_AGENT.agentChat.openLogs(); } catch (e) {}
  };

  const save = async () => {
    setSaveState('saving');
    const ok = await Store.fsSaveAgentConfig(cfg);
    setSaveState(ok ? 'saved' : 'error');
    if (ok) setDirty(false);
  };

  if (loading) {
    return (<div>{!modal && <PageHead eyebrow="/AGENT.AI" title="Agent settings" />}<p className="helptext">Loading…</p></div>);
  }

  const activeProv = PROVS.find((p) => p.id === cfg.active);

  return (
    <div>
      {!modal && (
        <PageHead eyebrow="/AGENT.AI" title="Agent settings">
          The portfolio agent runs on its <b>own</b> keys — separate from the AmritBot. Paste a billable key per
          provider for better models, pick a tool-capable model, and set the default. Keys are private to the server and never reach visitors.
        </PageHead>
      )}

      <div className={modal ? '' : 'canvas--narrow'}>
        <div className="callout">
          <AdminIcon name="key" size={16} />
          <div>
            These keys are stored in a private <b>config/agent</b> doc — distinct from the bot's <b>config/llm</b>.
            Nothing is saved while you type; click <b>Save</b> to write them. The agent calls the provider
            server-side, so your key is never exposed in the browser or the published site.
          </div>
        </div>

        <div className="provbar">
          <Btn kind="primary" icon="check" onClick={save} disabled={saveState === 'saving' || !dirty}>
            {saveState === 'saving' ? 'Saving…' : (dirty ? 'Save' : 'Saved')}
          </Btn>
          {saveState === 'saved' && !dirty && <span className="dirty saved"><span className="dot" />Saved ✓</span>}
          {saveState === 'error' && <span className="login__err" style={{ margin: 0 }}>Sign in required / save failed</span>}
          {dirty && saveState !== 'saving' && <span className="helptext" style={{ color: 'var(--warn, #e0a341)' }}>unsaved changes</span>}
          <span className="helptext" style={{ marginLeft: 'auto' }}>
            default: <b style={{ color: 'var(--accent)' }}>{(activeProv || {}).label || cfg.active}</b>
          </span>
        </div>

        {PROVS.map((p) => {
          const active = cfg.active === p.id;
          const c = pcfg(p.id);
          const curatedDefault = (Reflect.get(TOOL_MODELS, p.id)[0] || {}).id || '';
          return (
            <div key={p.id} className={'provcard' + (active ? ' provcard--active' : '')}>
              <div className="provcard__hd">
                <div style={{ minWidth: 0 }}>
                  <div className="provrow__nm">
                    {p.label}{p.tag && <span className="tag">{p.tag}</span>}
                    {active && <span className="tag tag--accent">DEFAULT</span>}
                  </div>
                  <div className="provrow__ep">{p.endpoint.replace('{model}', c.model || curatedDefault)}</div>
                </div>
                <span className="spacer" style={{ flex: 1 }} />
                <span className={'keystate' + (c.apiKey ? ' has' : '')}><span className="d" />{c.apiKey ? 'key set' : 'no key'}</span>
                {active
                  ? <span className="provcard__badge">✓ default</span>
                  : <Btn sm kind="ghost" onClick={() => setActive(p.id)}>Set as default</Btn>}
              </div>
              <div className="provcard__bd">
                <Field label="API key" hint={p.keyHint ? ('e.g. ' + p.keyHint) : 'your billable key for this provider'}>
                  <SecretInput name={'agent-key-' + p.id} value={c.apiKey || ''} placeholder={'paste your ' + p.label + ' key'} onChange={(v) => setLocal(p.id, 'apiKey', v)} />
                </Field>
                <Field label="Model" hint="tool-capable models only · free tier tagged">
                  <div className="modelrow">
                    <Select value={c.model || ''} options={modelOptions(p.id, c.model, Reflect.get(fetched, p.id))} onChange={(v) => setLocal(p.id, 'model', v)} />
                    <Btn icon="reset" onClick={() => fetchModels(p.id)} disabled={fetching === p.id}>{fetching === p.id ? 'Refreshing…' : 'Refresh list'}</Btn>
                    <Btn icon="play" kind="ghost" onClick={() => testModel(p.id)} disabled={testing === p.id || !c.apiKey || !c.model} title="Send a hello to this model — result shows in Logs">{testing === p.id ? 'Testing…' : 'Test model'}</Btn>
                  </div>
                  {Reflect.get(modelErr, p.id) && <div className="helptext" style={{ color: '#e0a341', marginTop: 6 }}>⚠ {Reflect.get(modelErr, p.id)}</div>}
                  {Reflect.get(testRes, p.id) && (
                    <div className="helptext" style={{ marginTop: 6, color: Reflect.get(testRes, p.id).ok ? 'var(--accent)' : '#e0a341' }}>
                      {Reflect.get(testRes, p.id).ok ? '✓' : '⚠'} {Reflect.get(testRes, p.id).text}
                    </div>
                  )}
                </Field>
                {p.docs && <a className="helptext" href={p.docs} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}><AdminIcon name="link" size={13} />Get a key from {p.label}</a>}
              </div>
            </div>
          );
        })}

        <Panel title="Inline refiner" sub="optional — the ✨ rewrite-this-field model" tight>
          <Field label="Refiner model" hint="defaults to the active provider's model; uses the active provider's key">
            <Select
              value={cfg.refinerModel || ''}
              options={[{ value: '', label: '(same as agent model)' }].concat(modelOptions(cfg.active, cfg.refinerModel, Reflect.get(fetched, cfg.active)))}
              onChange={setRefiner}
            />
          </Field>
        </Panel>
      </div>
    </div>
  );
}

window.ADMIN_AGENT_SETTINGS = { AgentSettingsPage };
