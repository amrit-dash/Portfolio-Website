/* global React */
/* =====================================================
   amrit.os ADMIN — Agent settings (model picker)
   Tool-capable models only; keys stay in config/llm.
   ===================================================== */
const { useState, useEffect } = React;

const SCHEMA = (typeof window !== 'undefined' && window.SHARED_SCHEMA) || {};
const AGENT_DEFAULTS = SCHEMA.AGENT_CONFIG_DEFAULTS || { provider: 'gemini', model: 'gemini-2.0-flash' };
const TOOL_MODELS = SCHEMA.AGENT_TOOL_MODELS || {
  gemini: [{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', free: true }],
};

const AGENT_PROVIDERS = (window.ADMIN_STORE && window.ADMIN_STORE.LLM_PROVIDERS || []).filter((p) =>
  Reflect.has(TOOL_MODELS, p.id)
);

function modelOptions(providerId, currentModel) {
  const list = Reflect.get(TOOL_MODELS, providerId) || [];
  const opts = list.map((m) => ({
    value: m.id,
    label: m.label + (m.free ? ' · free' : ''),
  }));
  if (currentModel && !opts.some((o) => o.value === currentModel)) {
    opts.unshift({ value: currentModel, label: currentModel + ' (saved)' });
  }
  return opts;
}

function AgentSettingsPage() {
  const { PageHead, Panel, Field, Select, Btn, AdminIcon } = window.ADMIN_UI;
  const { Store } = window.ADMIN_STORE;
  const [cfg, setCfg] = useState({ ...AGENT_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Store.fsLoadAgentConfig().then((c) => {
      if (!cancelled) {
        setCfg({ ...AGENT_DEFAULTS, ...c });
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const setField = (key, val) => {
    setCfg((c) => ({ ...c, [key]: val }));
    setDirty(true);
    setSaveState('idle');
  };

  const onProviderChange = (provider) => {
    const models = Reflect.get(TOOL_MODELS, provider) || [];
    const model = (models[0] && models[0].id) || cfg.model;
    setCfg((c) => ({ ...c, provider, model }));
    setDirty(true);
    setSaveState('idle');
  };

  const save = async () => {
    setSaveState('saving');
    const ok = await Store.fsSaveAgentConfig(cfg);
    setSaveState(ok ? 'saved' : 'error');
    if (ok) setDirty(false);
  };

  if (loading) {
    return (
      <div>
        <PageHead eyebrow="/AGENT.AI" title="Agent settings" />
        <p className="helptext">Loading…</p>
      </div>
    );
  }

  const prov = AGENT_PROVIDERS.find((p) => p.id === cfg.provider) || AGENT_PROVIDERS[0];

  return (
    <div>
      <PageHead eyebrow="/AGENT.AI" title="Agent settings">
        Pick the provider and model for portfolio edits. Only tool-capable models are listed. API keys are managed under AmritBot → LLM Providers.
      </PageHead>
      <div className="canvas--narrow">
        <div className="callout">
          <AdminIcon name="key" size={16} />
          <div>
            The agent reads keys from the shared <b>config/llm</b> store (same as the bot). Set your key under{' '}
            <b>AmritBot → LLM Providers</b> first — this page only picks which model runs agent turns.
          </div>
        </div>

        <Panel
          title="Model"
          sub="curated tool-capable list"
          actions={
            <Btn sm kind="primary" icon="check" onClick={save} disabled={saveState === 'saving' || !dirty}>
              {saveState === 'saving' ? 'Saving…' : (saveState === 'saved' && !dirty ? 'Saved ✓' : 'Save')}
            </Btn>
          }
        >
          <Field label="Provider" hint="must have a key configured in LLM Providers">
            <Select
              value={cfg.provider || 'gemini'}
              options={AGENT_PROVIDERS.map((p) => ({ value: p.id, label: p.label + (p.tag ? ' · ' + p.tag : '') }))}
              onChange={onProviderChange}
            />
          </Field>
          <Field label="Agent model" hint="tool-capable models only · free tier tagged">
            <Select
              value={cfg.model || ''}
              options={modelOptions(cfg.provider, cfg.model)}
              onChange={(v) => setField('model', v)}
            />
          </Field>
          <Field label="Refiner model (optional)" hint="inline ✨ field refiner — defaults to agent model">
            <Select
              value={cfg.refinerModel || ''}
              options={[{ value: '', label: '(same as agent model)' }].concat(modelOptions(cfg.provider, cfg.refinerModel))}
              onChange={(v) => setField('refinerModel', v || undefined)}
            />
          </Field>
          {prov && (
            <p className="helptext" style={{ marginTop: 8 }}>
              Endpoint: <span className="mono" style={{ fontSize: 10 }}>{prov.endpoint.replace('{model}', cfg.model || '')}</span>
            </p>
          )}
          {saveState === 'error' && <p className="login__err" style={{ marginTop: 8 }}>Save failed — sign in required.</p>}
        </Panel>
      </div>
    </div>
  );
}

window.ADMIN_AGENT_SETTINGS = { AgentSettingsPage };
