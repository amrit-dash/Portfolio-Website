/* global React */
/* =====================================================
   amrit.os ADMIN — shared UI primitives + icons
   ===================================================== */
const { useState, useRef, useEffect, useCallback } = React;

/* Resolve an image src for display in the admin console. Bundled relative
   assets (e.g. the project SVG thumbnails) live on the portfolio origin, not
   the admin origin — so a bare "assets/x.svg" 404s here. Absolute http/data/
   blob URLs (Storage uploads) pass through untouched. Mirrors the isLocal
   handling used elsewhere so it still works when serving admin locally. */
window.assetUrl = function (u) {
  if (!u || typeof u !== 'string') return u;
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  const isLocal = /^(localhost|127\.0\.0\.1)/.test(location.host);
  if (isLocal) return u;
  const base = (window.PORTFOLIO_URL || '').replace(/\/$/, '');
  return base ? base + '/' + u.replace(/^\//, '') : u;
};

/* ---------- Icons ---------- */
function AdminIcon({ name, size = 16, strokeWidth = 1.7 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'block' } };
  switch (name) {
    case 'overview': return (<svg {...p}><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/></svg>);
    case 'hero': return (<svg {...p}><path d="M4 19V9l8-5 8 5v10"/><path d="M4 19h16"/><path d="M9 19v-5h6v5"/></svg>);
    case 'about': return (<svg {...p}><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-4 3.1-7 7-7s7 3 7 7"/></svg>);
    case 'expertise': return (<svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>);
    case 'work': return (<svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 12h18"/></svg>);
    case 'projects': return (<svg {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>);
    case 'award': return (<svg {...p}><circle cx="12" cy="9" r="5"/><path d="M9 13.5L7.5 21l4.5-2.5L16.5 21 15 13.5"/></svg>);
    case 'contact': return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>);
    case 'media': return (<svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="M21 16l-5-4-7 6"/></svg>);
    case 'palette': return (<svg {...p}><path d="M12 3a9 9 0 100 18c1.2 0 2-.9 2-2 0-.6-.2-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4c0-3.9-4-6.7-9-6.7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="15.5" cy="8.5" r="1"/></svg>);
    case 'bot': return (<svg {...p}><rect x="4" y="7" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.3" fill="currentColor" stroke="none"/><path d="M12 3v4"/><circle cx="12" cy="2.6" r="1" fill="currentColor" stroke="none"/></svg>);
    case 'sync': return (<svg {...p}><path d="M21 12a9 9 0 01-9 9 9 9 0 01-7.5-4"/><path d="M3 12a9 9 0 019-9 9 9 0 017.5 4"/><path d="M21 3v4h-4"/><path d="M3 21v-4h4"/></svg>);
    case 'settings': return (<svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/></svg>);
    case 'plus': return (<svg {...p}><path d="M12 5v14M5 12h14"/></svg>);
    case 'trash': return (<svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>);
    case 'grip': return (<svg {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/></svg>);
    case 'chev': return (<svg {...p}><path d="M9 6l6 6-6 6"/></svg>);
    case 'image': return (<svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="M21 16l-5-4-7 6"/></svg>);
    case 'upload': return (<svg {...p}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 16v3a1 1 0 001 1h12a1 1 0 001-1v-3"/></svg>);
    case 'crop': return (<svg {...p}><path d="M6 2v14a2 2 0 002 2h14"/><path d="M2 6h14a2 2 0 012 2v14"/></svg>);
    case 'menu': return (<svg {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>);
    case 'chevron-down': return (<svg {...p}><path d="M6 9l6 6 6-6"/></svg>);
    case 'chevron-up': return (<svg {...p}><path d="M6 15l6-6 6 6"/></svg>);
    case 'eye': return (<svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>);
    case 'eye-off': return (<svg {...p}><path d="M2 12s3.5-7 10-7c1.6 0 3 .4 4.3 1M22 12s-3.5 7-10 7c-1.6 0-3-.4-4.3-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/><path d="M3 3l18 18"/></svg>);
    case 'check': return (<svg {...p}><path d="M5 12l5 5L20 6"/></svg>);
    case 'x': return (<svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>);
    case 'logout': return (<svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>);
    case 'rocket': return (<svg {...p}><path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2 2 0 00-3 .8z"/><path d="M9 13l-2-2c1-4 4-7 11-8-1 7-4 10-8 11z"/><circle cx="15" cy="9" r="1.4"/></svg>);
    case 'save': return (<svg {...p}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>);
    case 'link': return (<svg {...p}><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5"/></svg>);
    case 'play': return (<svg {...p}><path d="M6 4l14 8-14 8z" fill="currentColor"/></svg>);
    case 'key': return (<svg {...p}><circle cx="8" cy="8" r="5"/><path d="M11.5 11.5L21 21M17 17l2-2M15 19l2-2"/></svg>);
    case 'info': return (<svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5" /></svg>);
    case 'download': return (<svg {...p}><path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>);
    case 'sparkle': return (<svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>);
    // 'sparkles' — a multi-star twinkle (filled), for the AI refine affordance.
    case 'sparkles': return (<svg {...p}><path d="M11.5 2.6l1.7 4.8 4.8 1.7-4.8 1.7-1.7 4.8-1.7-4.8L5 9.1l4.8-1.7z" fill="currentColor" stroke="none"/><path d="M18.2 14l.85 2.35 2.35.85-2.35.85-.85 2.35-.85-2.35-2.35-.85 2.35-.85z" fill="currentColor" stroke="none"/></svg>);
    case 'chat': return (<svg {...p}><path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z"/></svg>);
    case 'reset': return (<svg {...p}><path d="M3 12a9 9 0 109-9 9 9 0 00-7.5 4M3 4v4h4"/></svg>);
    case 'doc': return (<svg {...p}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>);
    case 'desktop': return (<svg {...p}><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>);
    case 'mobile': return (<svg {...p}><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg>);
    case 'sun': return (<svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>);
    case 'terminal': return (<svg {...p}><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9.5l3 2.5-3 2.5"/><path d="M12.5 15h4.5"/></svg>);
    case 'os-window': return (<svg {...p}><rect x="2.5" y="3.5" width="19" height="17" rx="2.8"/><path d="M5.3 3.5H18.7a2.8 2.8 0 0 1 2.8 2.8V8H2.5V6.3a2.8 2.8 0 0 1 2.8-2.8Z" fill="currentColor" stroke="none"/><circle cx="5.4" cy="5.75" r=".82" fill="var(--bg-elev)" stroke="none"/><circle cx="7.8" cy="5.75" r=".82" fill="var(--bg-elev)" stroke="none"/><circle cx="10.2" cy="5.75" r=".82" fill="var(--bg-elev)" stroke="none"/><path d="M6 12.2l2.6 2-2.6 2"/><path d="M11.6 16.2H17"/></svg>);
    // 'chip' — an intelligent AI chip: CPU body with pins + a lit core spark.
    case 'chip': return (<svg {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="2.6"/><path d="M9.2 6.5V3.6M14.8 6.5V3.6M9.2 20.4v-2.9M14.8 20.4v-2.9M6.5 9.2H3.6M6.5 14.8H3.6M20.4 9.2h-2.9M20.4 14.8h-2.9"/><path d="M12 9.3l.9 1.8 1.8.9-1.8.9-.9 1.8-.9-1.8-1.8-.9 1.8-.9z" fill="currentColor" stroke="none"/></svg>);
    // 'send' — paper-plane, placed after the "Send" label.
    case 'send': return (<svg {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>);
    /* Expertise-module icons — mirror the site's set (public/app.jsx Icon) so the
       admin's module list + selects render the same glyphs the live site shows. */
    case 'automation': return (<svg {...p}><circle cx="9" cy="9" r="2.5"/><path d="M9 4v1.2M9 12.8V14M4 9h1.2M12.8 9H14M5.8 5.8l.85.85M11.35 11.35l.85.85M5.8 12.2l.85-.85M11.35 6.65l.85-.85"/><circle cx="15.5" cy="15.5" r="2"/><path d="M15.5 11.8v1M15.5 18v1M11.8 15.5h1M18 15.5h1M13.2 13.2l.7.7M17.6 17.6l.7.7M13.2 17.8l.7-.7M17.6 13.9l.7-.7"/></svg>);
    case 'rag': return (<svg {...p}><circle cx="6" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="12" cy="12" r="1.4"/><path d="M8 7l2.6 4.3M8 17l2.6-4.3M16 12h-2.6"/></svg>);
    case 'gas': return (<svg {...p}><path d="M8 4c-2 0-3 1-3 3v3c0 1-.6 2-2 2 1.4 0 2 1 2 2v3c0 2 1 3 3 3"/><path d="M16 4c2 0 3 1 3 3v3c0 1 .6 2 2 2-1.4 0-2 1-2 2v3c0 2-1 3-3 3"/></svg>);
    case 'flutter': return (<svg {...p}><rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M9 18h6"/><path d="M10 8l3 3-3 3"/></svg>);
    case 'bots': return (<svg {...p}><rect x="4" y="7" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.4" fill="currentColor" stroke="none"/><path d="M12 3v4"/><circle cx="12" cy="2.5" r="1" fill="currentColor" stroke="none"/></svg>);
    case 'shopify': return (<svg {...p}><path d="M5 8h14l-1.5 12h-11L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>);
    case 'web': return (<svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><circle cx="6.5" cy="6.5" r=".6" fill="currentColor"/><circle cx="9" cy="6.5" r=".6" fill="currentColor"/><path d="M8 13l-2 2 2 2"/><path d="M16 13l2 2-2 2"/><line x1="11" y1="17" x2="13" y2="13"/></svg>);
    case 'ios': return (<svg {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><line x1="10.5" y1="5.5" x2="13.5" y2="5.5"/><line x1="11" y1="18.5" x2="13" y2="18.5"/></svg>);
    case 'comedy': return (<svg {...p}><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M6 12.5a6 6 0 0 0 12 0"/><line x1="12" y1="18.5" x2="12" y2="21.5"/><line x1="9" y1="21.5" x2="15" y2="21.5"/></svg>);
    case 'brain': return (<svg {...p}><path d="M12 5.5a3 3 0 00-5 2.2 2.6 2.6 0 00-1.4 4.4A2.6 2.6 0 007 16.5a2.8 2.8 0 005 1.2"/><path d="M12 5.5a3 3 0 015 2.2 2.6 2.6 0 011.4 4.4A2.6 2.6 0 0117 16.5a2.8 2.8 0 01-5 1.2"/><path d="M12 5.5v12.2"/></svg>);
    default: return <svg {...p} />;
  }
}

/* ---------- Layout ---------- */
function PageHead({ eyebrow, title, children }) {
  return (
    <div className="phead">
      {eyebrow && <div className="phead__eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

function Panel({ title, sub, actions, children, tight }) {
  return (
    <div className="panel">
      {(title || actions) && (
        <div className="panel__hd">
          {title && <h3>{title}</h3>}
          {sub && <span className="sub">{sub}</span>}
          <span className="spacer" />
          {actions}
        </div>
      )}
      <div className={'panel__bd' + (tight ? ' tight' : '')}>{children}</div>
    </div>
  );
}

function Btn({ kind, sm, icon, children, onClick, type, disabled, title }) {
  const cls = ['btn'];
  if (kind === 'primary') cls.push('btn--primary');
  if (kind === 'ghost') cls.push('btn--ghost');
  if (kind === 'danger') cls.push('btn--danger');
  if (sm) cls.push('btn--sm');
  return (
    <button className={cls.join(' ')} onClick={onClick} type={type || 'button'} disabled={disabled} title={title}>
      {icon && <AdminIcon name={icon} size={sm ? 13 : 15} />}
      {children}
    </button>
  );
}

/* ---------- Form fields ---------- */
function Field({ label, hint, req, children }) {
  return (
    <div className="field">
      {label && <label>{label}{req && <span className="req">*</span>}{hint && <span style={{ marginLeft: 'auto', color: 'var(--fg-mute)', letterSpacing: 0 }}>{hint}</span>}</label>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, ...rest }) {
  const v = value == null ? '' : (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '');
  return <input className="inp" value={v} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

/* Delete button that sits inside a `.row` and lines up with sibling input
   fields (invisible label spacer + button matched to input height). Replaces
   ad-hoc flex-end delete divs that drifted below the input. */
function DelBtn({ onClick, title = 'Delete' }) {
  return (
    <div className="field field--del">
      <label aria-hidden="true">&nbsp;</label>
      <span className="iconbtn iconbtn--danger" onClick={onClick} title={title}><AdminIcon name="trash" size={14} /></span>
    </div>
  );
}

/* SecretInput — for API keys / tokens.
   Password managers (1Password, Chrome, Safari) autofill ANY type="password"
   field and ignore autocomplete=off — that clobbered the key field with a saved
   credential. The robust fix is to NOT be a password field at all: use a normal
   text input masked with CSS (-webkit-text-security), which managers leave
   alone. We also keep it readOnly until focus (defeats autofill-on-load) and
   show a non-secret fingerprint (length + last 4) so a wrong value is obvious. */
function SecretInput({ value, onChange, placeholder, name }) {
  const [show, setShow] = useState(false);
  const [ro, setRo] = useState(true); // readOnly until focus — blocks autofill-on-mount
  const v = typeof value === 'string' ? value : '';
  const masked = !show;
  const fp = v ? `${v.length} chars · ends “${v.slice(-4)}”` : 'not set';
  const looksShort = v && v.length > 0 && v.length < 20;
  return (
    <div>
      <div className="secret">
        <input
          className="inp"
          type="text"
          value={v}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setRo(false)}
          readOnly={ro}
          name={name || 'secret-field'}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          style={masked ? { WebkitTextSecurity: 'disc', textSecurity: 'disc' } : undefined}
        />
        <button type="button" className="secret__toggle" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'} aria-label={show ? 'Hide key' : 'Show key'}>
          <AdminIcon name={show ? 'eye-off' : 'eye'} size={14} />
        </button>
      </div>
      <div className="helptext" style={{ marginTop: 4, color: looksShort ? '#e0a341' : 'var(--fg-mute)' }}>
        stored: {fp}{looksShort ? ' · ⚠ looks too short for a real key' : ''}
      </div>
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, mono, ...rest }) {
  return <textarea className={'ta' + (mono ? ' mono' : '')} rows={rows} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

function Select({ value, onChange, options }) {
  return (
    <select className="sel" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

function Toggle({ value, onChange }) {
  return <button type="button" className="tog" data-on={!!value} onClick={() => onChange(!value)} aria-pressed={!!value}><i /></button>;
}

function ToggleRow({ title, sub, value, onChange }) {
  return (
    <div className="togrow">
      <div className="txt"><b>{title}</b>{sub && <span>{sub}</span>}</div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return <button key={v} type="button" data-on={value === v} onClick={() => onChange(v)}>{l}</button>;
      })}
    </div>
  );
}

/* Tag / multi-value input */
function TagInput({ value = [], onChange, placeholder = 'Add tag + Enter' }) {
  const [draft, setDraft] = useState('');
  const add = () => { const t = draft.trim(); if (t && !value.includes(t)) onChange([...value, t]); setDraft(''); };
  return (
    <div className="tags" onClick={(e) => { if (e.target.classList.contains('tags')) e.currentTarget.querySelector('input').focus(); }}>
      {value.map((t, i) => (
        <span key={i} className="tag">{t}<button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>×</button></span>
      ))}
      <input value={draft} placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)); }}
        onBlur={add} />
    </div>
  );
}

/* Curated color swatches + custom picker */
function Swatches({ value, options, onChange, allowCustom = true }) {
  const lower = (s) => String(s || '').toLowerCase();
  const known = options.some((o) => lower(o) === lower(value));
  return (
    <div className="swatches">
      {options.map((c) => (
        <button key={c} type="button" className="swatch" data-on={lower(c) === lower(value)} style={{ background: c }} onClick={() => onChange(c)} title={c} />
      ))}
      {allowCustom && (
        <label className="swatch swatch--custom" data-on={!known} title="Custom color">
          {known ? '+' : <span style={{ width: '100%', height: '100%', background: value, borderRadius: 7 }} />}
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
      )}
    </div>
  );
}

/* ---------- Reorderable list (HTML5 DnD) ---------- */
function Reorderable({ items, getKey, onReorder, renderItem }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const handleDrop = (to) => {
    if (dragIdx === null || dragIdx === to) { setDragIdx(null); setOverIdx(null); return; }
    const next = items.slice();
    const [moved] = next.splice(dragIdx, 1);
    next.splice(to, 0, moved);
    onReorder(next);
    setDragIdx(null); setOverIdx(null);
  };

  return (
    <div>
      {items.map((it, i) => (
        <div key={getKey(it, i)}
          className={'item' + (dragIdx === i ? ' dragging' : '') + (overIdx === i && dragIdx !== null && dragIdx !== i ? ' dragover' : '')}
          draggable={false}
          onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
          onDrop={(e) => { e.preventDefault(); handleDrop(i); }}>
          {renderItem(it, i, {
            gripProps: {
              draggable: true,
              onDragStart: (e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (err) {} },
              onDragEnd: () => { setDragIdx(null); setOverIdx(null); },
            },
          })}
        </div>
      ))}
    </div>
  );
}

/* Collapsible item shell with grip + delete */
function ListItem({ gripProps, num, thumb, icon, title, sub, open, onToggle, onDelete, children, headRight }) {
  return (
    <>
      <div className={'item__hd' + (onToggle ? ' clickable' : '')} onClick={onToggle}>
        <span className="item__grip" {...gripProps} onClick={(e) => e.stopPropagation()} title="Drag to reorder"><AdminIcon name="grip" size={16} /></span>
        {num != null && <span className="item__num">{num}</span>}
        {thumb && <img className="minithumb" src={window.assetUrl(thumb)} alt="" />}
        {icon && <span className="miniico">{icon}</span>}
        <div style={{ minWidth: 0 }}>
          <div className="item__title">{title}</div>
          {sub && <div className="item__sub">{sub}</div>}
        </div>
        <span className="spacer" />
        {headRight}
        {onDelete && <span className="iconbtn iconbtn--danger" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete"><AdminIcon name="trash" size={14} /></span>}
        {onToggle && <span className="chev" data-open={!!open}><AdminIcon name="chev" size={16} /></span>}
      </div>
      {open && <div className="item__bd">{children}</div>}
    </>
  );
}

/* Bullet list editor */
function BulletEditor({ items = [], onChange, placeholder = 'Bullet point' }) {
  return (
    <div>
      {items.map((b, i) => (
        <div key={i} className="bullet">
          <input className="inp" value={b} placeholder={placeholder} onChange={(e) => { const n = items.slice(); n[i] = e.target.value; onChange(n); }} />
          <span className="iconbtn iconbtn--danger" onClick={() => onChange(items.filter((_, j) => j !== i))} title="Remove"><AdminIcon name="x" size={13} /></span>
        </div>
      ))}
      <Btn sm icon="plus" kind="ghost" onClick={() => onChange([...items, ''])}>Add point</Btn>
    </div>
  );
}

/* ---------- File helpers ---------- */
function fileToDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
function fmtBytes(n) { if (!n) return ''; const u = ['B', 'KB', 'MB']; let i = 0; while (n >= 1024 && i < 2) { n /= 1024; i++; } return n.toFixed(n < 10 && i ? 1 : 0) + ' ' + u[i]; }

// Whether Storage uploads are available (Firebase loaded + owner signed in).
function storageReady() { return !!(window.fb && window.fb.storage && window.fb.auth && window.fb.auth.currentUser); }

/* Upload a File or data-URL to Firebase Storage under public/<path> and return
   the public download URL. Throws if Storage isn't ready so callers can decide
   whether to fall back (we never silently keep a huge data-URL — it would blow
   Firestore's 1MB content-doc limit). */
async function uploadToStorage(path, fileOrDataUrl, contentType) {
  if (!storageReady()) throw new Error('Sign in required to upload (Storage).');
  const ref = window.fb.storage.ref().child('public/' + path);
  let snap;
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    snap = await ref.putString(fileOrDataUrl, 'data_url');
  } else {
    snap = await ref.put(fileOrDataUrl, contentType ? { contentType } : undefined);
  }
  return await snap.ref.getDownloadURL();
}

window.ADMIN_UI = {
  AdminIcon, PageHead, Panel, Btn, Field, DelBtn, Input, SecretInput, TextArea, Select, Toggle, ToggleRow,
  Segmented, TagInput, Swatches, Reorderable, ListItem, BulletEditor, fileToDataURL, fmtBytes,
  storageReady, uploadToStorage,
};
