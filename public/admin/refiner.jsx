/* global React */
/* =====================================================
   amrit.os ADMIN — Inline field refiner (✨)
   -----------------------------------------------------
   A low-friction "tighten this" affordance for large text fields. Calls /refine
   (single-shot, no tools, the agent's own key + refinerModel), shows the proposal,
   and lets the owner Accept (writes via the field's normal onChange — autosave-
   covered, undoable) or Discard. No agent session, no tool loop.
   ===================================================== */
const { useState: useRState } = React;

/* Drop-in replacement for a labeled TextArea that adds the ✨ refine control.
   Props: label, value, onChange, rows, mono, context (extra grounding), placeholder. */
function RefineField({ label, value, onChange, rows = 3, mono, context, placeholder }) {
  const { TextArea, AdminIcon, Btn } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;
  const [state, setState] = useRState('idle'); // idle | working | proposed | error
  const [proposal, setProposal] = useRState('');
  const [err, setErr] = useRState('');

  const refine = async () => {
    if (!value || !String(value).trim()) return;
    setState('working'); setErr('');
    const res = await Store.refineText({ text: value, label, context });
    if (res && res.proposal) { setProposal(res.proposal); setState('proposed'); }
    else { setErr((res && res.message) || 'refine failed'); setState('error'); }
  };
  const accept = () => { onChange(proposal); setState('idle'); setProposal(''); };
  const discard = () => { setState('idle'); setProposal(''); };

  return (
    <div className="refine">
      <div className="refine__wrap">
        <TextArea value={value} onChange={onChange} rows={rows} mono={mono} placeholder={placeholder} />
        <button
          type="button"
          className={'refine__spark' + (state === 'working' ? ' refine__spark--busy' : '')}
          title="Refine this field with AI"
          aria-label="Refine this field with AI"
          onClick={refine}
          disabled={state === 'working' || !String(value || '').trim()}
        >
          <AdminIcon name="sparkle" size={15} />
        </button>
      </div>

      {state === 'error' && <div className="helptext" style={{ color: '#e0a341', marginTop: 6 }}>⚠ {err}</div>}

      {state === 'proposed' && (
        <div className="refine__panel">
          <div className="refine__panelhd"><AdminIcon name="sparkle" size={13} /> Suggested rewrite</div>
          <div className="refine__proposal">{proposal}</div>
          <div className="refine__actions">
            <Btn sm kind="primary" icon="check" onClick={accept}>Accept</Btn>
            <Btn sm kind="ghost" onClick={refine}>Retry</Btn>
            <Btn sm kind="ghost" icon="x" onClick={discard}>Discard</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

window.ADMIN_REFINER = { RefineField };
