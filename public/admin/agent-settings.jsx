/* global React */
/* =====================================================
   amrit.os ADMIN — Agent settings
   -----------------------------------------------------
   The admin agent runs on its OWN keys (config/agent), fully SEPARATE from the
   AmritBot's config/llm. Paste a billable key per provider, pick the model
   (filtered to tool-capable models), and choose agent + refiner defaults via
   the three-state cycle on each provider card. Keys are held locally until Save,
   written to a private owner-only doc the function reads server-side, and NEVER
   sent to the browser of any visitor or written into published content.
   ===================================================== */
const { useState, useEffect } = React;

const SCHEMA = (typeof window !== 'undefined' && window.SHARED_SCHEMA) || {};
const TOOL_MODELS = SCHEMA.AGENT_TOOL_MODELS || {};
const AGENT_DEFAULTS = SCHEMA.AGENT_CONFIG_DEFAULTS || { active: 'gemini', refinerActive: 'gemini', byProvider: {} };
const { ProviderCard, providerDefaultState, setProviderDefault } = window.ADMIN_PROVIDER_CARD || {};

function agentProviders() {
  const catalog = (window.LLM_PROVIDERS || []);
  return catalog.filter((p) => Reflect.has(TOOL_MODELS, p.id));
}

function modelOptions(providerId, currentModel, fetched) {
  const curated = (Reflect.get(TOOL_MODELS, providerId) || []).map((m) => ({
    value: m.id, label: m.label,
  }));
  const list = (fetched && fetched.length)
    ? fetched.map((id) => ({ value: id, label: id }))
    : curated;
  if (currentModel && !list.some((o) => o.value === currentModel)) {
    list.unshift({ value: currentModel, label: currentModel + ' (saved)' });
  }
  return list.length ? list : [{ value: '', label: '— pick a model —' }];
}

function normalizeAgentCfg(c) {
  const active = c.active || AGENT_DEFAULTS.active;
  const refinerActive = c.refinerActive || active || AGENT_DEFAULTS.refinerActive || AGENT_DEFAULTS.active;
  return {
    active,
    refinerActive,
    byProvider: c.byProvider || {},
    refinerModel: c.refinerModel || '',
  };
}

function AgentSettingsPage({ modal }) {
  const { PageHead, Field, Select, Btn, AdminIcon, SecretInput } = window.ADMIN_UI;
  const { Store } = window.ADMIN_STORE;
  const PROVS = agentProviders();

  const [cfg, setCfg] = useState(normalizeAgentCfg(AGENT_DEFAULTS));
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [saveErr, setSaveErr] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [fetched, setFetched] = useState({});
  const [fetching, setFetching] = useState(null);
  const [modelErr, setModelErr] = useState({});
  const [testing, setTesting] = useState(null);
  const [testRes, setTestRes] = useState({});
  const [testingVision, setTestingVision] = useState(null);
  const [visionRes, setVisionRes] = useState({});
  const [visionTick, setVisionTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      Store.fsLoadAgentConfig(),
      Store.hydrateModelCatalogs('agent'),
      Store.hydrateVisionSupport('agent'),
    ]).then(([c, catalogs]) => {
      if (cancelled) return;
      setCfg(normalizeAgentCfg(c));
      if (catalogs && Object.keys(catalogs).length) setFetched(catalogs);
      setVisionTick((t) => t + 1);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const pcfg = (id) => (cfg.byProvider && Reflect.get(cfg.byProvider, id)) || {};
  const setLocal = (id, key, val) => {
    if (key === 'model') {
      setVisionRes((r) => ({ ...r, [id]: null }));
      Store.saveModelCatalogSelection('agent', id, val);
    }
    setCfg((c) => {
      const by = { ...(c.byProvider || {}) };
      by[id] = { ...(Reflect.get(by, id) || {}), [key]: val };
      return { ...c, byProvider: by };
    });
    setDirty(true); setSaveState('idle'); setSaveErr('');
  };

  const setDefault = (id, target) => {
    setCfg((c) => setProviderDefault(id, c, target));
    setDirty(true); setSaveState('idle'); setSaveErr('');
  };

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
      if (d.models && d.models.length) {
        const cur = pcfg(id).model || '';
        const next = (cur && d.models.includes(cur)) ? cur : d.models[0];
        if (next && next !== cur) setLocal(id, 'model', next);
        await Store.saveModelCatalog('agent', id, d.models, { selectedModel: next || cur });
        setFetched((f) => ({ ...f, [id]: d.models }));
      } else setModelErr((e) => ({ ...e, [id]: d.error || 'no models returned' }));
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
  };

  const showVisionTag = (id, { defaultState, apiKey, model }) => {
    void visionTick;
    if (defaultState === 'none' || !apiKey || !model) return false;
    if (SCHEMA.supportsVision && SCHEMA.supportsVision(id, model)) return true;
    return Store.visionTestPassed(id, model, 'agent');
  };

  const testVision = async (id) => {
    setTestingVision(id); setVisionRes((r) => ({ ...r, [id]: null }));
    const c = pcfg(id);
    const model = c.model || '';
    const res = await Store.testVision({ scope: 'agent', provider: id, model, key: c.apiKey || '' });
    setTestingVision(null);
    const ok = res && res.ok;
    if (ok) {
      Store.saveVisionTest({ providerId: id, model, ok: true, scope: 'agent' });
      setVisionTick((t) => t + 1);
    } else Store.clearVisionTest({ providerId: id, model, scope: 'agent' });
    const text = ok
      ? `vision ok${res.reply ? ': ' + res.reply : ''}${res.ms ? ` (${res.ms}ms)` : ''}`
      : (res && (res.message || res.error || res.reply)) || 'failed';
    setVisionRes((r) => ({ ...r, [id]: { ok, text } }));
  };

  const save = async () => {
    if (!cfg.active) {
      setSaveErr('Choose an agent default provider (select Agent or Both on a provider card).');
      setSaveState('error');
      return;
    }
    if (!cfg.refinerActive) {
      setSaveErr('Choose a refiner default provider — select Both or Refiner on a provider card.');
      setSaveState('error');
      return;
    }
    setSaveErr('');
    setSaveState('saving');
    const ok = await Store.fsSaveAgentConfig(cfg);
    setSaveState(ok ? 'saved' : 'error');
    if (ok) setDirty(false);
    else if (!saveErr) setSaveErr('Sign in required / save failed');
  };

  if (loading) {
    return (<div>{!modal && <PageHead eyebrow="/AGENT.AI" title="Agent settings" />}<p className="helptext">Loading…</p></div>);
  }

  const agentProv = PROVS.find((p) => p.id === cfg.active);
  const refinerProv = PROVS.find((p) => p.id === cfg.refinerActive);

  return (
    <div>
      {!modal && (
        <PageHead eyebrow="/AGENT.AI" title="Agent settings">
          The portfolio agent runs on its <b>own</b> keys — separate from the AmritBot. Paste a billable key per
          provider for better models, pick a tool-capable model, and set agent + refiner defaults. Keys are private to the server and never reach visitors.
        </PageHead>
      )}

      <div className={modal ? '' : 'canvas--narrow'}>
        <div className="callout">
          <AdminIcon name="key" size={16} />
          <div>
            These keys are stored in a private <b>config/agent</b> doc — distinct from the bot's <b>config/llm</b>.
            Nothing is saved while you type; click <b>Save</b> to write them. Use the <b>Agent / Both / Refiner</b> control on each provider
            to set defaults. You must set both an agent default and a refiner default before saving.
          </div>
        </div>

        <div className="provbar">
          <Btn kind="primary" icon="check" onClick={save} disabled={saveState === 'saving' || !dirty}>
            {saveState === 'saving' ? 'Saving…' : (dirty ? 'Save' : 'Saved')}
          </Btn>
          {saveState === 'saved' && !dirty && <span className="dirty saved"><span className="dot" />Saved ✓</span>}
          {(saveState === 'error' || saveErr) && <span className="login__err" style={{ margin: 0 }}>{saveErr || 'Sign in required / save failed'}</span>}
          {dirty && saveState !== 'saving' && <span className="helptext" style={{ color: 'var(--warn, #e0a341)' }}>unsaved changes</span>}
          <span className="helptext provbar__defaults">
            agent: <b style={{ color: 'var(--accent)' }}>{(agentProv || {}).label || cfg.active || '—'}</b>
            {' · '}
            refiner: <b style={{ color: 'var(--accent)' }}>{(refinerProv || {}).label || cfg.refinerActive || '—'}</b>
          </span>
        </div>

        {PROVS.map((p) => {
          const c = pcfg(p.id);
          const curatedDefault = (Reflect.get(TOOL_MODELS, p.id)[0] || {}).id || '';
          const dState = providerDefaultState(p.id, cfg);
          return (
            <ProviderCard
              key={p.id}
              provider={p}
              apiKey={c.apiKey}
              model={c.model}
              curatedDefault={curatedDefault}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              defaultMode="three-state"
              defaultState={dState}
              onSetDefaultState={(target) => setDefault(p.id, target)}
              extraTags={showVisionTag(p.id, { defaultState: dState, apiKey: c.apiKey, model: c.model })
                ? <span className="tag" title="Supports image attachments in agent chat">vision</span>
                : null}
            >
              <Field label="API key" hint={p.keyHint ? ('e.g. ' + p.keyHint) : 'your billable key for this provider'}>
                <SecretInput name={'agent-key-' + p.id} value={c.apiKey || ''} placeholder={'paste your ' + p.label + ' key'} onChange={(v) => setLocal(p.id, 'apiKey', v)} />
              </Field>
              <Field label="Model" hint="tool-capable models only">
                <div className="modelrow">
                  <Select value={c.model || ''} options={modelOptions(p.id, c.model, Reflect.get(fetched, p.id))} onChange={(v) => setLocal(p.id, 'model', v)} />
                  <div className="modelrow__actions">
                    <Btn icon="reset" onClick={() => fetchModels(p.id)} disabled={fetching === p.id} title="Refresh model list from provider"><span className="btn__label">{fetching === p.id ? 'Refreshing…' : 'Refresh list'}</span></Btn>
                    <Btn icon="play" kind="ghost" onClick={() => testModel(p.id)} disabled={testing === p.id || !c.apiKey || !c.model} title="Send a hello to this model — result also logged in Agent logs"><span className="btn__label">{testing === p.id ? 'Testing…' : 'Test model'}</span></Btn>
                    <Btn icon="image" kind="ghost" onClick={() => testVision(p.id)} disabled={testingVision === p.id || testing === p.id || !c.apiKey || !c.model} title="Send a tiny test image — shows the vision tag when the model list has no known mapping"><span className="btn__label">{testingVision === p.id ? 'Testing…' : 'Test vision'}</span></Btn>
                  </div>
                </div>
                {Reflect.get(modelErr, p.id) && <div className="helptext" style={{ color: '#e0a341', marginTop: 6 }}>⚠ {Reflect.get(modelErr, p.id)}</div>}
                {Reflect.get(testRes, p.id) && (
                  <div className="helptext" style={{ marginTop: 6, color: Reflect.get(testRes, p.id).ok ? 'var(--accent)' : '#e0a341' }}>
                    {Reflect.get(testRes, p.id).ok ? '✓' : '⚠'} {Reflect.get(testRes, p.id).text}
                  </div>
                )}
                {Reflect.get(visionRes, p.id) && (
                  <div className="helptext" style={{ marginTop: 6, color: Reflect.get(visionRes, p.id).ok ? 'var(--accent)' : '#e0a341' }}>
                    {Reflect.get(visionRes, p.id).ok ? '✓' : '⚠'} {Reflect.get(visionRes, p.id).text}
                  </div>
                )}
              </Field>
              {p.docs && <a className="helptext" href={p.docs} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}><AdminIcon name="link" size={13} />Get a key from {p.label}</a>}
            </ProviderCard>
          );
        })}
      </div>
    </div>
  );
}

window.ADMIN_AGENT_SETTINGS = { AgentSettingsPage };
