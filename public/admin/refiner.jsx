/* global React */
/* =====================================================
   amrit.os ADMIN — Inline field refiner (✨)
   Single-shot /refine — no tools; accept or discard.
   ===================================================== */
const { useState, useRef, useEffect } = React;

async function proxyRefine({ text, label, context }) {
  const base = window.FUNCTIONS_BASE;
  if (!base) throw new Error('Functions base URL not configured.');
  const headers = { 'Content-Type': 'application/json' };
  if (window.fb && window.fb.auth && window.fb.auth.currentUser) {
    headers.Authorization = 'Bearer ' + (await window.fb.auth.currentUser.getIdToken());
  }
  const res = await fetch(base + '/refine', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, label: label || '', context: context || '' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Refine failed (' + res.status + ')'));
  return data;
}

/** Textarea with ✨ refine affordance — proposal popover with accept/discard. */
function RefinableTextArea({
  value, onChange, label, context, rows = 3, mono, fieldPath,
  registerFieldFocus, unregisterFieldFocus, placeholder,
}) {
  const { AdminIcon, Btn, TextArea } = window.ADMIN_UI;
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [err, setErr] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!proposal) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setProposal(null); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [proposal]);

  const refine = async () => {
    const text = String(value || '').trim();
    if (!text || busy) return;
    setBusy(true); setErr(null); setProposal(null);
    try {
      const data = await proxyRefine({ text, label, context });
      const next = data.text || data.proposal || '';
      if (!next.trim()) { setErr('Refiner returned empty text.'); return; }
      setProposal(next);
    } catch (e) {
      setErr((e && e.message) || 'Refine unavailable');
    } finally {
      setBusy(false);
    }
  };

  const accept = () => { if (proposal != null) { onChange(proposal); setProposal(null); } };
  const discard = () => { setProposal(null); setErr(null); };

  const focusProps = {
    fieldPath,
    registerFieldFocus,
    unregisterFieldFocus,
  };

  return (
    <div className="refine-wrap" ref={wrapRef}>
      <div className="refine-wrap__row">
        <TextArea
          value={value}
          onChange={onChange}
          rows={rows}
          mono={mono}
          placeholder={placeholder}
          {...focusProps}
        />
        <button
          type="button"
          className="refine-wrap__btn"
          onClick={refine}
          disabled={busy || !String(value || '').trim()}
          title={'Refine' + (label ? ': ' + label : '')}
          aria-label="Refine text"
        >
          <AdminIcon name="sparkle" size={16} />
        </button>
      </div>
      {err && <div className="helptext" style={{ color: 'var(--warn)', marginTop: 6 }}>{err}</div>}
      {proposal != null && (
        <div className="refine-pop">
          <div className="refine-pop__lbl">Proposed rewrite</div>
          <div className="refine-pop__body">{proposal}</div>
          <div className="refine-pop__acts">
            <Btn sm kind="primary" icon="check" onClick={accept}>Accept</Btn>
            <Btn sm kind="ghost" icon="x" onClick={discard}>Discard</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

window.ADMIN_REFINER = { RefinableTextArea, proxyRefine };
