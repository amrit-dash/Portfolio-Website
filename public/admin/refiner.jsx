/* global React */
/* =====================================================
   amrit.os ADMIN — Inline field refiner (✨)
   -----------------------------------------------------
   A low-friction "tighten this" affordance for large text fields. Calls /refine
   (single-shot, no tools, the agent's own key + refinerModel), shows the proposal,
   and lets the owner Accept (writes via the field's normal onChange — autosave-
   covered, undoable) or Discard. No agent session, no tool loop.
   ===================================================== */
const { useState: useRState, useRef: useRRef } = React;

function RefineSpark({ busy, onClick, disabled, title }) {
  const { AdminIcon } = window.ADMIN_UI;
  return (
    <button
      type="button"
      className={'refine__spark' + (busy ? ' refine__spark--busy' : '')}
      title={title || 'Refine with AI'}
      aria-label={title || 'Refine with AI'}
      aria-busy={busy || undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
    >
      {busy ? <span className="refine__spin" aria-hidden="true" /> : <AdminIcon name="sparkles" size={20} />}
    </button>
  );
}

function RefineProposalPanel({ title, children, onAccept, onRetry, onDiscard, retryBusy }) {
  const { AdminIcon, Btn } = window.ADMIN_UI;
  return (
    <div className="refine__panel">
      <div className="refine__panelhd"><AdminIcon name="sparkle" size={13} /> {title || 'Suggested rewrite'}</div>
      {children}
      <div className="refine__actions">
        <Btn sm kind="primary" icon="check" onClick={onAccept}>Accept</Btn>
        <Btn sm kind="ghost" onClick={onRetry} disabled={retryBusy}>Retry</Btn>
        <Btn sm kind="ghost" icon="x" onClick={onDiscard}>Discard</Btn>
      </div>
    </div>
  );
}

/* Drop-in replacement for a labeled TextArea that adds the ✨ refine control.
   Props: label, value, onChange, rows, mono, context, placeholder. */
function RefineField({ label, value, onChange, rows = 3, mono, context, placeholder }) {
  const { TextArea } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;
  const [state, setState] = useRState('idle'); // idle | working | proposed | error
  const [proposal, setProposal] = useRState('');
  const [err, setErr] = useRState('');
  const snapRef = useRRef('');

  const refine = async () => {
    const snap = String(value == null ? '' : value);
    if (!snap.trim()) return;
    snapRef.current = snap;
    setState('working'); setErr('');
    const res = await Store.refineText({ text: snap, label, context });
    if (res && res.proposal && typeof res.proposal === 'string') {
      setProposal(res.proposal);
      setState('proposed');
    } else {
      setErr((res && res.message) || 'refine failed');
      setState('error');
    }
  };
  const accept = () => { onChange(proposal); setState('idle'); setProposal(''); snapRef.current = ''; };
  const discard = () => { setState('idle'); setProposal(''); snapRef.current = ''; };

  const displayValue = state === 'working' || state === 'proposed' ? (snapRef.current || value) : value;

  return (
    <div className="refine">
      <div className="refine__wrap">
        <TextArea value={displayValue} onChange={onChange} rows={rows} mono={mono} placeholder={placeholder} readOnly={state === 'working' || state === 'proposed'} />
        <RefineSpark
          busy={state === 'working'}
          onClick={refine}
          disabled={state === 'working' || !String(value || '').trim()}
        />
      </div>

      {state === 'working' && <div className="refine__status"><span className="refine__spin" aria-hidden="true" /> Refining…</div>}
      {state === 'error' && <div className="helptext" style={{ color: '#e0a341', marginTop: 6 }}>⚠ {err}</div>}

      {state === 'proposed' && (
        <RefineProposalPanel onAccept={accept} onRetry={refine} onDiscard={discard} retryBusy={state === 'working'}>
          <TextArea value={proposal} onChange={setProposal} rows={rows} mono={mono} />
        </RefineProposalPanel>
      )}
    </div>
  );
}

/* Impact timeline entry — one ✨ refines label + description together. */
function RefineImpactEntry({ label, html, onLabelChange, onHtmlChange, onAccept, onDelete, context }) {
  const { TextArea, Input, Field, DelBtn } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;
  const [state, setState] = useRState('idle');
  const [proposal, setProposal] = useRState(null); // { label, html }
  const [err, setErr] = useRState('');
  const snapRef = useRRef({ label: '', html: '' });

  const hasContent = () => String(label || '').trim() || String(html || '').trim();

  const refine = async () => {
    const snap = { label: String(label == null ? '' : label), html: String(html == null ? '' : html) };
    if (!snap.label.trim() && !snap.html.trim()) return;
    snapRef.current = snap;
    setState('working'); setErr('');
    const res = await Store.refineText({
      fields: snap,
      label: 'Impact timeline entry',
      context: context || 'A short label and description line in the About impact timeline.',
    });
    if (res && res.proposal && typeof res.proposal === 'object') {
      setProposal({
        label: typeof res.proposal.label === 'string' ? res.proposal.label : snap.label,
        html: typeof res.proposal.html === 'string' ? res.proposal.html : snap.html,
      });
      setState('proposed');
    } else {
      setErr((res && res.message) || 'refine failed');
      setState('error');
    }
  };

  const accept = () => {
    if (proposal) onAccept(proposal);
    setState('idle'); setProposal(null); snapRef.current = { label: '', html: '' };
  };
  const discard = () => { setState('idle'); setProposal(null); snapRef.current = { label: '', html: '' }; };

  const frozen = state === 'working' || state === 'proposed';
  const showLabel = frozen ? snapRef.current.label : label;
  const showHtml = frozen ? snapRef.current.html : html;

  const setProposalLabel = (v) => setProposal((p) => (p ? { ...p, label: v } : p));
  const setProposalHtml = (v) => setProposal((p) => (p ? { ...p, html: v } : p));

  return (
    <div className="refine refine--entry">
      <div className="row refine-entry__label-row">
        <Field label="Label">
          <Input value={showLabel} onChange={onLabelChange} readOnly={frozen} />
        </Field>
        {onDelete && <DelBtn onClick={onDelete} />}
      </div>
      <Field label="Description" hint="<em> for accent · ✨ refines label + description">
        <div className="refine__wrap">
          <TextArea value={showHtml} onChange={onHtmlChange} rows={2} readOnly={frozen} />
          <RefineSpark
            busy={state === 'working'}
            onClick={refine}
            disabled={state === 'working' || !hasContent()}
            title="Refine label and description with AI"
          />
        </div>
      </Field>

      {state === 'working' && <div className="refine__status"><span className="refine__spin" aria-hidden="true" /> Refining label and description…</div>}
      {state === 'error' && <div className="helptext" style={{ color: '#e0a341', marginTop: 6 }}>⚠ {err}</div>}

      {state === 'proposed' && proposal && (
        <RefineProposalPanel
          title="Suggested label and description"
          onAccept={accept}
          onRetry={refine}
          onDiscard={discard}
          retryBusy={state === 'working'}
        >
          <div className="refine__proposal-block">
            <div className="refine__proposal-lbl">Label</div>
            <Input value={proposal.label} onChange={setProposalLabel} />
          </div>
          <div className="refine__proposal-block">
            <div className="refine__proposal-lbl">Description</div>
            <TextArea value={proposal.html} onChange={setProposalHtml} rows={2} />
          </div>
        </RefineProposalPanel>
      )}
    </div>
  );
}

window.ADMIN_REFINER = { RefineField, RefineImpactEntry };
