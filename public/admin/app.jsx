/* global React, ReactDOM */
/* =====================================================
   amrit.os ADMIN — app shell
   Login · sidebar · routing · overview/analytics ·
   live-preview drawer · publish · sync & deploy
   ===================================================== */
const { useState: useAState, useEffect: useAEffect, useRef: useARef, useMemo: useAMemo } = React;

// The single Google account allowed into the console. Mirrors OWNER_EMAIL in
// functions/index.js and the isOwner() checks in firestore.rules / storage.rules.
const OWNER_EMAIL = 'amrit.dash60@gmail.com';

/* ---------- Login (Firebase Auth, Google, owner-only) ---------- */
function Login({ onGoogle, error, busy }) {
  return (
    <div className="login">
      <div className="login__crt">
        <div className="login__bar">
          <div className="login__lights"><span /><span /><span /></div>
          <span style={{ flex: 1, textAlign: 'center' }}>~/system/admin — authenticate</span>
          <span style={{ opacity: .5 }}>secure</span>
        </div>
        <form className="login__body" onSubmit={(e) => e.preventDefault()}>
          <pre className="login__ascii">{`  ▄▀█ █▀▄ █▀▄▀█ █ █▄░█
  █▀█ █▄▀ █░▀░█ █ █░▀█   . os`}</pre>
          <div className="login__head"><b>RESTRICTED</b> — amrit.os control panel</div>
          <div className="login__lead">Not linked from the site. Sign in with the owner Google account.<span className="login__cursor" /></div>
          <button className="login__btn" type="button" onClick={onGoogle} disabled={busy}>
            {busy ? 'AUTHENTICATING…' : 'SIGN IN WITH GOOGLE →'}
          </button>
          {error && <div className="login__err">✕ {error}</div>}
          <div className="login__hint">access restricted to <b style={{ color: 'var(--accent)' }}>{OWNER_EMAIL}</b> · Firebase Auth</div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Overview / analytics ---------- */
function Stat({ icon, label, num, delta, down }) {
  const { AdminIcon } = window.ADMIN_UI;
  return (
    <div className="stat">
      <span className="stat__ico"><AdminIcon name={icon} size={20} /></span>
      <div className="stat__lbl">{label}</div>
      <div className="stat__num">{num}</div>
      {delta && <div className={'stat__delta' + (down ? ' down' : '')}>{down ? '▼' : '▲'} {delta}</div>}
    </div>
  );
}

function Overview({ content, analytics, dirty, publishedAt, onPublish, onPreview, onDiscard, onResetAnalytics, go }) {
  const { PageHead, Panel, Btn, AdminIcon } = window.ADMIN_UI;
  const hasData = (analytics.totalEvents || 0) > 0;
  const max = Math.max(1, ...analytics.history);
  const maxProj = Math.max(1, ...analytics.topProjects.map((p) => p.opens));
  return (
    <div>
      <PageHead eyebrow="/DASHBOARD" title="Overview">Live snapshot of the portfolio — real event counts captured from the live site since the last reset.</PageHead>

      {dirty && (
        <div className="callout" style={{ borderLeftColor: 'var(--warn)' }}>
          <AdminIcon name="info" size={16} />
          <div style={{ flex: 1 }}><b>You have unpublished changes.</b> They're saved to your draft but not live yet. Preview, then publish to push them to the site.</div>
          <Btn sm kind="ghost" icon="reset" onClick={onDiscard}>Discard</Btn>
          <Btn sm icon="eye" onClick={onPreview}>Preview</Btn>
          <Btn sm kind="primary" icon="rocket" onClick={onPublish}>Publish</Btn>
        </div>
      )}

      {!hasData && (
        <div className="callout">
          <AdminIcon name="info" size={16} />
          <div style={{ flex: 1 }}>No analytics yet. Open the <a href="index.html" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>live portfolio</a> in another tab — page views, CV downloads, project opens and bot chats are logged client-side to <code>localStorage.amritos.events</code> and aggregated here.</div>
        </div>
      )}

      <div className="stats">
        <Stat icon="eye"       label="PAGE VIEWS"    num={analytics.pageViews.toLocaleString()} />
        <Stat icon="download"  label="CV DOWNLOADS"  num={analytics.cvDownloads.toLocaleString()} />
        <Stat icon="chat"      label="BOT CHATS"     num={analytics.botChats.toLocaleString()} />
        <Stat icon="projects"  label="PROJECT OPENS" num={analytics.projectOpens.toLocaleString()} />
      </div>

      <div className="grid2">
        <Panel title="Traffic" sub="last 14 days">
          {hasData ? (
            <div className="spark">
              {analytics.history.map((v, i) => <div key={i} className="bar" style={{ height: Math.max(2, v / max * 100) + '%' }} title={v + ' views'} />)}
            </div>
          ) : (
            <p className="helptext" style={{ margin: 0 }}>Waiting for visits. Reload the live site to seed a data point.</p>
          )}
        </Panel>
        <Panel title="Most-opened projects">
          {analytics.topProjects.length === 0 ? (
            <p className="helptext" style={{ margin: 0 }}>No project opens yet.</p>
          ) : (
            <div className="bars">
              {analytics.topProjects.map((p, i) => (
                <div className="barrow" key={i}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  <span className="track"><span className="fill" style={{ width: (p.opens / maxProj * 100) + '%' }} /></span>
                  <span className="v">{p.opens}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Recent activity" sub="latest 5" actions={<Btn sm kind="ghost" onClick={() => go('analytics')}>View all →</Btn>}>
          {analytics.activity.length === 0 ? (
            <p className="helptext" style={{ margin: 0 }}>No activity captured yet.</p>
          ) : (
            <ul className="activity">
              {analytics.activity.slice(0, 5).map((a, i) => (
                <li key={i}><span className="when">{a.when}</span><span className="dot" /><span>{a.what}</span><span className="who">{a.who}</span></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Content summary">
          <div className="bars">
            {[['expertise', 'Expertise modules', 'expertise'], ['work', 'Work entries', 'experience'], ['projects', 'Projects', 'projects'], ['contact', 'Social links', 'contact.socials'], ['bot', 'Bot Q&A pairs', 'bot.qa']].map(([icon, label, path]) => {
              const arr = path.split('.').reduce((o, k) => (o && k !== '__proto__' && k !== 'constructor' && k !== 'prototype' ? Reflect.get(o, k) : null), content);
              const n = Array.isArray(arr) ? arr.length : 0;
              const route = Reflect.get({ expertise: 'expertise', experience: 'work', projects: 'projects', 'contact.socials': 'contact', 'bot.qa': 'bot' }, path);
              return (
                <div className="barrow" key={path} style={{ gridTemplateColumns: '24px 1fr 70px' }}>
                  <AdminIcon name={icon} size={16} />
                  <span>{label}</span>
                  <Btn sm kind="ghost" onClick={() => go(route)}>{n} →</Btn>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Analytics (dedicated page) ---------- */
const ACT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'view', label: 'Views' },
  { value: 'project:open', label: 'Projects' },
  { value: 'cv:download', label: 'CV' },
  { value: 'bot:chat', label: 'Bot' },
  { value: 'social:click', label: 'Social' },
  { value: 'link:click', label: 'Links' },
  { value: 'cta:click', label: 'CTA' },
];

function AnalyticsPage({ analytics, onReset }) {
  const { PageHead, Panel, Btn, AdminIcon, Segmented } = window.ADMIN_UI;
  const a = analytics;
  const daily = a.daily || [];
  const [actFilter, setActFilter] = useAState('all');
  const [actExpanded, setActExpanded] = useAState(false);

  // Aggregate map-style breakdowns across the loaded day-buckets.
  const agg = (field) => {
    const out = {};
    if (field === '__proto__' || field === 'constructor' || field === 'prototype') return [];
    daily.forEach((d) => {
      const m = Reflect.get(d, field) || {};
      for (const k in m) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        Reflect.set(out, k, (Reflect.get(out, k) || 0) + Reflect.get(m, k));
      }
    });
    return Object.entries(out).sort((x, y) => y[1] - x[1]);
  };
  // Aggregate a label off the recent event feed (region/city aren't in daily buckets).
  const aggEvents = (key) => {
    const out = {};
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return [];
    a.activity.forEach((e) => {
      const v = Reflect.get(e, key);
      if (v && typeof v === 'string' && v !== '__proto__' && v !== 'constructor' && v !== 'prototype') {
        Reflect.set(out, v, (Reflect.get(out, v) || 0) + 1);
      }
    });
    return Object.entries(out).sort((x, y) => y[1] - x[1]);
  };
  const bySource = agg('bySource');
  const byCountry = agg('byCountry');
  const bySocial = agg('bySocial');
  const byCity = aggEvents('city');
  const byRegion = aggEvents('region');
  const eventMix = [
    ['Page views', a.pageViews], ['Project opens', a.projectOpens], ['CV downloads', a.cvDownloads],
    ['Bot chats', a.botChats], ['Social clicks', a.socialClicks || 0], ['Link clicks', a.linkClicks || 0],
    ['CTA clicks', a.ctaClicks || 0],
  ].filter((r) => r[1] > 0).sort((x, y) => y[1] - x[1]);
  const maxHist = Math.max(1, ...a.history);
  const hasData = (a.totalEvents || 0) > 0;

  const filteredActivity = actFilter === 'all' ? a.activity : a.activity.filter((e) => e.type === actFilter);
  const shownActivity = actExpanded ? filteredActivity : filteredActivity.slice(0, 8);

  const Bars = ({ rows, label, empty, sub }) => {
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return (
      <Panel title={label} sub={sub}>
        {rows.length === 0 ? <p className="helptext" style={{ margin: 0 }}>{empty}</p> : (
          <div className="bars">
            {rows.slice(0, 8).map(([name, n]) => (
              <div className="barrow" key={name}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                <span className="track"><span className="fill" style={{ width: (n / max * 100) + '%' }} /></span>
                <span className="v">{n}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  };

  return (
    <div>
      <PageHead eyebrow="/ANALYTICS" title="Analytics" actions={hasData ? <Btn sm kind="ghost" icon="trash" onClick={onReset}>Clear all</Btn> : null}>
        Real visitor activity captured from the live site — last 30 days. Counts update in real time as events come in.
      </PageHead>

      {!hasData && (
        <div className="callout"><AdminIcon name="info" size={16} /><div>No analytics captured yet. Open the <a href="index.html" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>live portfolio</a> and interact — views, project opens, CV downloads, bot chats, social/link/CTA clicks all flow in here.</div></div>
      )}

      <div className="stats">
        <Stat icon="eye" label="PAGE VIEWS" num={a.pageViews.toLocaleString()} />
        <Stat icon="projects" label="PROJECT OPENS" num={a.projectOpens.toLocaleString()} />
        <Stat icon="download" label="CV DOWNLOADS" num={a.cvDownloads.toLocaleString()} />
        <Stat icon="chat" label="BOT CHATS" num={a.botChats.toLocaleString()} />
        <Stat icon="contact" label="SOCIAL CLICKS" num={(a.socialClicks || 0).toLocaleString()} />
        <Stat icon="link" label="LINK CLICKS" num={(a.linkClicks || 0).toLocaleString()} />
        <Stat icon="hero" label="CTA CLICKS" num={(a.ctaClicks || 0).toLocaleString()} />
        <Stat icon="overview" label="TOTAL EVENTS" num={(a.totalEvents || 0).toLocaleString()} />
      </div>

      <Panel title="Traffic" sub="page views · last 14 days">
        {hasData ? (
          <div className="spark">
            {a.history.map((v, i) => <div key={i} className="bar" style={{ height: Math.max(2, v / maxHist * 100) + '%' }} title={v + ' views'} />)}
          </div>
        ) : <p className="helptext" style={{ margin: 0 }}>Waiting for visits.</p>}
      </Panel>

      <div className="grid2">
        <Bars rows={eventMix} label="Engagement mix" sub="by event type" empty="No events yet." />
        <Bars rows={a.topProjects.map((p) => [p.name, p.opens])} label="Most-opened projects" empty="No project opens yet." />
      </div>
      <div className="grid2">
        <Bars rows={bySource} label="Traffic sources" empty="No referrers captured yet." />
        <Bars rows={bySocial} label="Social link clicks" empty="No social clicks yet." />
      </div>
      <div className="grid2">
        <Bars rows={byCountry} label="By country" empty="No location data yet." />
        <Bars rows={byCity} label="By city" sub="recent visitors" empty="No city data yet." />
      </div>
      {byRegion.length > 0 && (
        <Bars rows={byRegion} label="By region" sub="recent visitors" empty="No region data yet." />
      )}

      <Panel
        title="Recent activity"
        sub={filteredActivity.length + (actFilter === 'all' ? ' events' : ' matching')}
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Segmented value={actFilter} options={ACT_FILTERS} onChange={(v) => { setActFilter(v); setActExpanded(false); }} />
          </div>
        }>
        {filteredActivity.length === 0 ? <p className="helptext" style={{ margin: 0 }}>No matching activity.</p> : (
          <>
            <ul className="activity">
              {shownActivity.map((ev, i) => (
                <li key={i}><span className="when">{ev.when}</span><span className="dot" /><span>{ev.what}</span><span className="who">{ev.who}</span></li>
              ))}
            </ul>
            {filteredActivity.length > 8 && (
              <Btn sm kind="ghost" icon={actExpanded ? 'chevron-up' : 'chevron-down'} onClick={() => setActExpanded((s) => !s)}>
                {actExpanded ? 'Show less' : `Show all ${filteredActivity.length}`}
              </Btn>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

/* ---------- Sync & deploy ---------- */
function SyncPage({ publishedAt, dirty, onPublish, onReset, onPreview }) {
  const { PageHead, Panel, Btn, Field, Input, AdminIcon } = window.ADMIN_UI;
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/SYSTEM.SYNC" title="Sync & deploy">How the dashboard talks to the live site — today via the browser store, and the recommended Firebase wiring for the IDE migration.</PageHead>

      <Panel title="Publish state">
        <div className="bars">
          <div className="barrow" style={{ gridTemplateColumns: '160px 1fr auto' }}><span className="mono" style={{ color: 'var(--fg-mute)' }}>DRAFT</span><span>{dirty ? 'has unpublished edits' : 'in sync with live'}</span><span className={'dirty' + (dirty ? '' : ' saved')}><span className="dot" />{dirty ? 'dirty' : 'clean'}</span></div>
          <div className="barrow" style={{ gridTemplateColumns: '160px 1fr auto' }}><span className="mono" style={{ color: 'var(--fg-mute)' }}>PUBLISHED</span><span>{publishedAt ? new Date(publishedAt).toLocaleString() : 'never published'}</span></div>
        </div>
        <div className="divider" />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn icon="eye" onClick={onPreview}>Preview draft</Btn>
          <Btn kind="primary" icon="rocket" onClick={onPublish}>Publish to site</Btn>
          <span className="spacer" style={{ flex: 1 }} />
          <Btn kind="danger" icon="reset" onClick={() => { if (confirm('Reset draft to the original site content? This discards unpublished edits.')) onReset(); }}>Reset draft</Btn>
        </div>
      </Panel>

      <Panel title="How sync works" sub="recommended">
        <p className="helptext" style={{ marginBottom: 14 }}>
          The dashboard edits a <b style={{ color: 'var(--fg)' }}>draft</b>; <b style={{ color: 'var(--fg)' }}>Publish</b> promotes it to a <b style={{ color: 'var(--fg)' }}>published snapshot</b> that the live site reads. This keeps work-in-progress off the site until you ship it. Today both live in the browser; the migration maps them 1:1 onto Firebase:
        </p>
        <div className="bars">
          {[['Admin login', 'Firebase Auth', 'replaces the demo passphrase'], ['Draft + published content', 'Cloud Firestore', 'content/draft + content/published docs'], ['Images & CV PDFs', 'Firebase Storage', 'store download URL on the field'], ['Live site read', 'Firestore listener', 'real-time — no rebuild/redeploy needed'], ['LLM keys', 'Cloud Function proxy', 'keys never reach the browser']].map(([a, b, c]) => (
            <div className="barrow" key={a} style={{ gridTemplateColumns: '180px 170px 1fr' }}>
              <span>{a}</span><span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>{b}</span><span className="helptext">{c}</span>
            </div>
          ))}
        </div>
        <div className="callout" style={{ marginTop: 16, marginBottom: 0 }}>
          <AdminIcon name="info" size={16} />
          <div>Firestore beats a re-deployed static JSON here: edits go live the instant you publish (a snapshot listener), with no hosting rebuild. Storage handles the cropped images. The data shapes in this prototype already match that structure, so the swap is mostly wiring, not rework.</div>
        </div>
      </Panel>

      <Panel title="Where content lives today" sub="all client-side">
        <div className="bars">
          {[
            ['amritos.draft',     'localStorage', 'in-progress edits, autosaved on every change'],
            ['amritos.published', 'localStorage', 'the snapshot the live site reads'],
            ['amritos.preview',   'localStorage', 'transient — written by Preview, cleared on close/publish'],
            ['amritos.events',    'localStorage', 'live analytics — written by the portfolio'],
            ['amritos.theme',     'localStorage', 'last-used theme of the visitor'],
            ['admin session',     'Firebase Auth', 'Google sign-in, restricted to the owner account'],
          ].map(([k, store, note]) => (
            <div className="barrow" key={k} style={{ gridTemplateColumns: '200px 130px 1fr' }}>
              <span className="mono" style={{ fontSize: 11 }}>{k}</span><span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>{store}</span><span className="helptext">{note}</span>
            </div>
          ))}
        </div>
        <p className="helptext" style={{ marginTop: 12, marginBottom: 0 }}>Wiring Firebase swaps each row above one-for-one — Auth for the gate, Firestore listeners for the content + events, Storage for media. No UI changes required.</p>
      </Panel>
    </div>
  );
}

/* ---------- Live preview drawer ----------
   The preview iframe is the real portfolio loaded with ?adminpreview. It can be
   a *different origin* than this console, so localStorage can't hand it the
   draft. Instead we stream the current snapshot to it over postMessage: the
   iframe announces 'amritos:preview-ready', we reply with the draft (or the
   published snapshot), and we re-push on every edit — so theme/accent/font/copy
   changes show live and never revert to the last published copy. */
function PreviewDrawer({ open, mode, onClose, onMode, content, publishedContent, dirty, onDiscard }) {
  const { AdminIcon } = window.ADMIN_UI;
  const [device, setDevice] = useAState('desktop');
  const [nonce, setNonce] = useAState(0);
  const frameRef = useARef(null);
  useAEffect(() => { if (open) setNonce((n) => n + 1); }, [open, mode]);

  const post = React.useCallback(() => {
    try {
      const win = frameRef.current && frameRef.current.contentWindow;
      if (!win) return;
      const snap = mode === 'published' ? (publishedContent || content) : content;
      win.postMessage({ type: 'amritos:preview', content: snap }, '*');
    } catch (e) { /* cross-origin guard */ }
  }, [mode, content, publishedContent]);

  // Reply to the iframe's ready handshake (covers initial load + every reload).
  useAEffect(() => {
    const onMsg = (ev) => { if (ev && ev.data && ev.data.type === 'amritos:preview-ready') post(); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [post]);
  // Re-push whenever the draft, mode, or drawer state changes (no reload needed).
  useAEffect(() => { if (open) post(); }, [open, content, mode, nonce, post]);

  // Target the site ROOT (not index.html): hosts redirect /index.html → /
  // (Firebase, and `serve` locally) and that 301 *drops the query string*, so
  // ?adminpreview would be lost and the preview iframe would never enter preview
  // mode (no postMessage handshake → shows published, never the draft).
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const portfolioBase = isLocal ? '/' : ((window.PORTFOLIO_URL || '').replace(/\/$/, '') + '/');
  const previewSrc = portfolioBase + '?adminpreview=' + nonce;
  const openHref = portfolioBase;
  return (
    <>
      <div className="preview-scrim" data-open={open} onClick={onClose} />
      <div className="preview-drawer" data-open={open}>
        <div className="preview-drawer__bar">
          <AdminIcon name="eye" size={15} />
          <span>Live preview</span>
          <div className="seg" style={{ padding: 2 }}>
            <button data-on={mode === 'draft'} onClick={() => onMode('draft')} style={{ fontSize: 11, padding: '4px 10px' }}>Draft</button>
            <button data-on={mode === 'published'} onClick={() => onMode('published')} style={{ fontSize: 11, padding: '4px 10px' }}>Published</button>
          </div>
          <span className="spacer" />
          <div className="devicebar">
            <button data-on={device === 'desktop'} onClick={() => setDevice('desktop')} title="Desktop"><AdminIcon name="desktop" size={15} /></button>
            <button data-on={device === 'mobile'} onClick={() => setDevice('mobile')} title="Mobile"><AdminIcon name="mobile" size={15} /></button>
          </div>
          {dirty && <button className="btn btn--sm btn--danger" onClick={onDiscard} title="Discard unpublished changes and revert to the published version"><AdminIcon name="reset" size={13} />Discard draft</button>}
          <a className="btn btn--sm" href={openHref} target="_blank" rel="noreferrer"><AdminIcon name="link" size={13} />Open</a>
          <button className="iconbtn" onClick={onClose}><AdminIcon name="x" size={15} /></button>
        </div>
        {open && (
          device === 'mobile'
            ? <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: '#060704', overflow: 'auto' }}>
                <iframe ref={frameRef} key={nonce} title="preview" src={previewSrc} style={{ width: 390, height: 760, border: '1px solid var(--line-2)', borderRadius: 14, background: '#000' }} />
              </div>
            : <iframe ref={frameRef} key={nonce} title="preview" src={previewSrc} />
        )}
      </div>
    </>
  );
}

/* ---------- Sidebar ---------- */
const NAV = [
  { group: 'DASHBOARD', items: [{ id: 'overview', label: 'Overview', icon: 'overview' }, { id: 'analytics', label: 'Analytics', icon: 'eye' }] },
  { group: 'CONTENT', items: [
    { id: 'hero', label: 'Hero & intro', icon: 'hero' },
    { id: 'about', label: 'About', icon: 'about' },
    { id: 'expertise', label: 'Expertise', icon: 'expertise', count: 'expertise' },
    { id: 'work', label: 'Work history', icon: 'work', count: 'experience' },
    { id: 'projects', label: 'Projects', icon: 'projects', count: 'projects' },
    { id: 'cards', label: 'Education & awards', icon: 'award', count: 'cards' },
    { id: 'contact', label: 'Contact', icon: 'contact', count: 'contact.socials' },
  ] },
  { group: 'ASSETS & LOOK', items: [
    { id: 'media', label: 'CV & media', icon: 'media' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
  ] },
  { group: 'ASSISTANT', items: [
    { id: 'agent', label: 'Agent', icon: 'sparkle' },
    { id: 'agent-settings', label: 'Agent settings', icon: 'key' },
    { id: 'bot', label: 'AmritBot', icon: 'bot', count: 'bot.qa' },
  ] },
  { group: 'SYSTEM', items: [{ id: 'sync', label: 'Sync & deploy', icon: 'sync' }] },
];

const TITLES = { overview: 'Overview', analytics: 'Analytics', hero: 'Hero & intro', about: 'About', expertise: 'Expertise', work: 'Work history', projects: 'Projects', cards: 'Education & awards', contact: 'Contact', media: 'CV & media', appearance: 'Appearance', agent: 'Agent', 'agent-settings': 'Agent settings', bot: 'AmritBot', sync: 'Sync & deploy' };

function Sidebar({ route, go, content, onLogout, open, onClose, adminTheme, setAdminTheme, adminAccent, setAdminAccent }) {
  const { AdminIcon } = window.ADMIN_UI;
  return (
    <aside className={'side' + (open ? ' side--open' : '')}>
      <div className="side__brand">
        <span className="side__mark"><AdminIcon name="os-window" size={30} /></span>
        <span className="side__name">amrit.os<small>ADMIN CONSOLE</small></span>
        <ConsoleThemeMenu theme={adminTheme} setTheme={setAdminTheme} accent={adminAccent} setAccent={setAdminAccent} />
        <button className="side__close" onClick={onClose} aria-label="Close menu"><AdminIcon name="x" size={16} /></button>
      </div>
      <nav className="side__nav">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="side__group">{g.group}</div>
            {g.items.map((it) => {
              let cnt = null;
              if (it.count) {
                const arr = it.count.split('.').reduce((o, k) => (o != null && k !== '__proto__' && k !== 'constructor' && k !== 'prototype' ? Reflect.get(o, k) : undefined), content);
                cnt = Array.isArray(arr) ? arr.length : null;
              }
              return (
                <button key={it.id} className="navitem" data-active={route === it.id} onClick={() => go(it.id)}>
                  <AdminIcon name={it.icon} size={16} />
                  <span>{it.label}</span>
                  {cnt != null && <span className="cnt">{cnt}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="side__foot">
        <div className="side__user">
          <span className="side__avatar">AD</span>
          <div><div style={{ fontSize: 12, color: 'var(--fg)' }}>Amrit Dash</div><div className="mono" style={{ fontSize: 10, color: 'var(--fg-mute)' }}>administrator</div></div>
          <button className="side__logout" onClick={onLogout} title="Sign out"><AdminIcon name="logout" size={14} /></button>
        </div>
      </div>
    </aside>
  );
}

/* ---------- Console-theme menu (header) ----------
   A glowing rounded-square icon in the topbar. Opens a popover that adjusts the
   ADMIN CONSOLE's own theme + accent only — it never touches the portfolio's
   cosmetics (owned by the Appearance editor). Persisted per-owner so it follows
   across sessions and devices. */
const CONSOLE_ACCENTS = ['#c8e856', '#ff7a3d', '#7a9eff', '#ffd25a', '#9d7cff'];
function ConsoleThemeMenu({ theme, setTheme, accent, setAccent }) {
  const { Segmented, Swatches } = window.ADMIN_UI;
  const [open, setOpen] = useAState(false);
  const ref = useARef(null);
  useAEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);
  return (
    <div className="cthm" ref={ref}>
      <button className="cthm__btn" data-on={open} onClick={() => setOpen((o) => !o)} title="Console theme" aria-label="Console theme" aria-expanded={open} />

      {open && (
        <div className="cthm__pop">
          <div className="qa__lbl">Console mode</div>
          <Segmented value={theme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} onChange={setTheme} />
          <div className="qa__lbl" style={{ marginTop: 13 }}>Console accent</div>
          <Swatches value={accent} options={CONSOLE_ACCENTS} onChange={setAccent} allowCustom={true} />
          <p className="helptext" style={{ marginTop: 11, marginBottom: 0, fontSize: 11 }}>Styles this console only — the portfolio's look lives in <b style={{ color: 'var(--fg)' }}>Appearance</b>. Saved to your account.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- App ---------- */
function AdminApp() {
  // Firebase Auth state. `authReady` gates the first render until we know
  // whether there's a signed-in session; `user` is set only for the owner.
  const [user, setUser] = useAState(null);
  const [authReady, setAuthReady] = useAState(false);
  const [authError, setAuthError] = useAState(null);
  const [authBusy, setAuthBusy] = useAState(false);
  const [navOpen, setNavOpen] = useAState(false); // mobile sidebar drawer

  // Console-only theme + accent (separate from the portfolio's cosmetics). The
  // portfolio is styled via the Appearance editor; this only restyles the
  // admin shell and its terminal-window favicon.
  const [adminTheme, setAdminTheme] = useAState(() => { try { return localStorage.getItem('amritos.admin.theme') || 'dark'; } catch (e) { return 'dark'; } });
  const [adminAccent, setAdminAccent] = useAState(() => { try { return localStorage.getItem('amritos.admin.accent') || '#c8e856'; } catch (e) { return '#c8e856'; } });
  const consoleHydrated = useARef(false);
  // Apply + persist (localStorage for instant per-device, Firestore for cross-device).
  useAEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = adminTheme === 'light' ? 'light' : 'dark';
    root.style.setProperty('--accent-raw', adminAccent);
    try { localStorage.setItem('amritos.admin.theme', adminTheme); localStorage.setItem('amritos.admin.accent', adminAccent); } catch (e) {}
    if (window.applyFavicon) window.applyFavicon(adminAccent, 'os-window'); // admin keeps the terminal-window mark
    // Only push to the cloud once we've hydrated from it, so the initial local
    // default doesn't clobber a value saved on another device.
    if (consoleHydrated.current) window.ADMIN_STORE.Store.fsSaveConsole(adminTheme, adminAccent);
  }, [adminTheme, adminAccent]);
  // Once signed in, hydrate the console theme from Firestore so it follows the
  // owner across devices. Falls back to the local value if nothing is stored.
  useAEffect(() => {
    if (!user) return;
    let cancelled = false;
    window.ADMIN_STORE.Store.fsLoadConsole().then((c) => {
      if (cancelled) return;
      if (c && (c.theme === 'dark' || c.theme === 'light')) setAdminTheme(c.theme);
      if (c && typeof c.accent === 'string') setAdminAccent(c.accent);
      consoleHydrated.current = true;
    });
    return () => { cancelled = true; };
  }, [user]);

  useAEffect(() => {
    if (!window.fb || !window.fb.auth) { setAuthError('Firebase failed to load.'); setAuthReady(true); return; }
    const unsub = window.fb.auth.onAuthStateChanged((u) => {
      if (u && (u.email || '').toLowerCase() === OWNER_EMAIL) {
        setUser(u); setAuthError(null);
      } else if (u) {
        // Signed in, but not the owner — reject and sign back out.
        setAuthError("That account isn't authorized for this console.");
        window.fb.auth.signOut();
        setUser(null);
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const signInGoogle = async () => {
    setAuthBusy(true); setAuthError(null);
    try { await window.fb.auth.signInWithPopup(window.fb.googleProvider()); }
    catch (e) { setAuthError((e && e.message) || 'sign-in failed'); }
    finally { setAuthBusy(false); }
  };
  const signOut = () => { try { window.fb.auth.signOut(); } catch (e) {} };

  const [route, setRoute] = useAState(() => (location.hash || '').replace('#', '') || 'overview');
  const [preview, setPreview] = useAState(false);
  const [previewMode, setPreviewMode] = useAState('draft');
  const [flash, setFlash] = useAState(null);
  const { content, setAt, replace, publish, reset, discardDraft, previewDraft, dirty, publishedAt, saveLLMConfig, setAgentTurnPending, registerFieldFocus, unregisterFieldFocus } = window.ADMIN_STORE.useContent();
  // Real-time analytics from Firestore (counters + recent feed + daily buckets).
  const analytics = window.ADMIN_STORE.useAnalytics();
  const resetAnalytics = async () => {
    if (!confirm('Clear ALL analytics? This deletes the counters, per-day buckets and the recent-events feed. Cannot be undone.')) return;
    const ok = await window.ADMIN_STORE.Store.fsClearStats();
    if (ok) { setFlash('Analytics cleared'); setTimeout(() => setFlash(null), 2600); analytics.refreshDaily(); }
  };
  const { AdminIcon, Btn } = window.ADMIN_UI;

  useAEffect(() => { const onHash = () => setRoute((location.hash || '').replace('#', '') || 'overview'); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);
  const go = (r) => { setRoute(r); location.hash = r; setNavOpen(false); document.querySelector('.canvas')?.scrollTo(0, 0); };

  const openPreview = (mode = 'draft') => {
    setPreviewMode(mode);
    if (mode === 'draft') previewDraft(); else window.ADMIN_STORE.Store.clearPreview();
    setPreview(true);
  };
  const changePreviewMode = (mode) => { setPreviewMode(mode); if (mode === 'draft') previewDraft(); else window.ADMIN_STORE.Store.clearPreview(); };

  const doPublish = () => { publish(); setFlash('Published to site ✓'); setTimeout(() => setFlash(null), 2600); };
  const doDiscard = async () => {
    if (!dirty) return;
    if (!confirm('Discard all unpublished changes and revert to the published version? This cannot be undone.')) return;
    await discardDraft();
    window.ADMIN_STORE.Store.clearPreview();
    setFlash('Draft discarded — reverted to published ✓'); setTimeout(() => setFlash(null), 2800);
  };

  if (!authReady) return <div className="login"><div className="login__crt"><div className="login__body" style={{ textAlign: 'center', color: 'var(--fg-mute)' }}>Checking session…</div></div></div>;
  if (!user) return <Login onGoogle={signInGoogle} error={authError} busy={authBusy} />;

  const E = window.ADMIN_EDITORS, WP = window.ADMIN_EDITORS_WP, BOT = window.ADMIN_BOT, AGENT = window.ADMIN_AGENT, AGSET = window.ADMIN_AGENT_SETTINGS;
  const fieldProps = { registerFieldFocus, unregisterFieldFocus };
  const renderRoute = () => {
    switch (route) {
      case 'overview': return <Overview content={content} analytics={analytics} dirty={dirty} publishedAt={publishedAt} onPublish={doPublish} onPreview={() => openPreview('draft')} onDiscard={doDiscard} onResetAnalytics={resetAnalytics} go={go} />;
      case 'analytics': return <AnalyticsPage analytics={analytics} onReset={resetAnalytics} />;
      case 'hero': return <E.HeroEditor content={content} setAt={setAt} {...fieldProps} />;
      case 'about': return <E.AboutEditor content={content} setAt={setAt} {...fieldProps} />;
      case 'expertise': return <E.ExpertiseEditor content={content} setAt={setAt} {...fieldProps} />;
      case 'work': return <WP.WorkEditor content={content} setAt={setAt} {...fieldProps} />;
      case 'projects': return <WP.ProjectsEditor content={content} setAt={setAt} {...fieldProps} />;
      case 'cards': return <E.CardsEditor content={content} setAt={setAt} {...fieldProps} />;
      case 'contact': return <E.ContactEditor content={content} setAt={setAt} {...fieldProps} />;
      case 'media': return <E.MediaEditor content={content} setAt={setAt} analytics={analytics} {...fieldProps} />;
      case 'appearance': return <E.AppearanceEditor content={content} setAt={setAt} {...fieldProps} />;
      case 'agent': return <AGENT.AgentPage />;
      case 'agent-settings': return AGSET ? <AGSET.AgentSettingsPage /> : null;
      case 'bot': return <BOT.BotAdmin content={content} setAt={setAt} saveLLMConfig={saveLLMConfig} {...fieldProps} />;
      case 'sync': return <SyncPage publishedAt={publishedAt} dirty={dirty} onPublish={doPublish} onReset={reset} onPreview={() => openPreview('draft')} />;
      default: return <Overview content={content} analytics={analytics} dirty={dirty} publishedAt={publishedAt} onPublish={doPublish} onPreview={() => openPreview('draft')} onDiscard={doDiscard} onResetAnalytics={resetAnalytics} go={go} />;
    }
  };

  return (
    <AGENT.AgentProvider currentRoute={route} setAgentTurnPending={setAgentTurnPending} go={go} onPreview={() => openPreview('draft')}>
    <div className="shell">
      <div className="nav-scrim" data-open={navOpen} onClick={() => setNavOpen(false)} />
      <Sidebar route={route} go={go} content={content} onLogout={signOut} open={navOpen} onClose={() => setNavOpen(false)}
        adminTheme={adminTheme} setAdminTheme={setAdminTheme} adminAccent={adminAccent} setAdminAccent={setAdminAccent} />
      <div className="main">
        <div className="topbar">
          <button className="hamburger" onClick={() => setNavOpen(true)} aria-label="Open menu"><AdminIcon name="menu" size={18} /></button>
          <span className="topbar__crumb">amrit.os / <b>{Reflect.get(TITLES, route) || route}</b></span>
          <span className="topbar__spacer" />
          {flash
            ? <span className="dirty saved"><span className="dot" />{flash}</span>
            : <span className={'dirty topbar__hide-sm' + (dirty ? '' : ' saved')}><span className="dot" />{dirty ? 'Draft · unpublished changes' : 'All changes published'}</span>}
          <span className="topbar__hide-sm"><Btn icon="eye" onClick={() => openPreview('draft')}>Preview</Btn></span>
          <Btn kind="primary" icon="rocket" onClick={doPublish} disabled={!dirty}>Publish</Btn>
        </div>
        <div className="canvas">{renderRoute()}</div>
      </div>
      <PreviewDrawer open={preview} mode={previewMode} onClose={() => { setPreview(false); window.ADMIN_STORE.Store.clearPreview(); }} onMode={changePreviewMode}
        content={content} publishedContent={window.ADMIN_STORE.Store.loadPublished()} dirty={dirty} onDiscard={doDiscard} />
      <AGENT.AgentDock />
    </div>
    </AGENT.AgentProvider>
  );
}

/* ---------- Error boundary ----------
   Without this, any uncaught render error unmounts the whole admin tree and
   the page goes blank — easy to misread as "everything went away". This catches
   the error, surfaces the message + stack, and lets you recover without a
   reload-and-lose-your-draft cycle. */
class AdminErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null, info: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('[admin] render error', err, info);
  }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = (this.state.err && this.state.err.message) || String(this.state.err);
    const stack = (this.state.err && this.state.err.stack) || '';
    const componentStack = (this.state.info && this.state.info.componentStack) || '';
    const reset = () => this.setState({ err: null, info: null });
    const wipe = () => { try { localStorage.removeItem('amritos.draft'); } catch (e) {} window.location.reload(); };
    return (
      <div style={{ padding: 32, fontFamily: 'JetBrains Mono, monospace', color: '#f6f4ef', background: '#0c0d0a', minHeight: '100vh' }}>
        <h2 style={{ color: '#ff7a59', marginBottom: 8 }}>admin crashed</h2>
        <p style={{ opacity: .8, marginBottom: 16 }}>An error was thrown during render. The draft is still safe in localStorage; you can keep working after dismissing.</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#1a1b15', padding: 16, borderRadius: 8, fontSize: 12, lineHeight: 1.5, maxHeight: 280, overflow: 'auto' }}>{msg}{stack ? '\n\n' + stack : ''}{componentStack ? '\n--- component stack ---' + componentStack : ''}</pre>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button onClick={reset} style={{ padding: '8px 14px', background: '#c8e856', color: '#0c0d0a', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Dismiss & continue</button>
          <button onClick={wipe} style={{ padding: '8px 14px', background: 'transparent', color: '#f6f4ef', border: '1px solid #444', borderRadius: 6, cursor: 'pointer' }}>Wipe draft & reload</button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AdminErrorBoundary><AdminApp /></AdminErrorBoundary>
);
