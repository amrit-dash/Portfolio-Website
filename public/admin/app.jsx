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

function Overview({ content, analytics, dirty, publishedAt, onPublish, onPreview, onResetAnalytics, go }) {
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
        <Panel title="Recent activity" actions={hasData && onResetAnalytics ? <Btn sm kind="ghost" icon="trash" onClick={onResetAnalytics}>Reset</Btn> : null}>
          {analytics.activity.length === 0 ? (
            <p className="helptext" style={{ margin: 0 }}>No activity captured yet.</p>
          ) : (
            <ul className="activity">
              {analytics.activity.map((a, i) => (
                <li key={i}><span className="when">{a.when}</span><span className="dot" /><span>{a.what}</span><span className="who">{a.who}</span></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Content summary">
          <div className="bars">
            {[['expertise', 'Expertise modules', 'expertise'], ['work', 'Work entries', 'experience'], ['projects', 'Projects', 'projects'], ['contact', 'Social links', 'contact.socials'], ['bot', 'Bot Q&A pairs', 'bot.qa']].map(([icon, label, path]) => {
              const arr = path.split('.').reduce((o, k) => (o ? o[k] : null), content);
              const n = Array.isArray(arr) ? arr.length : 0;
              const route = { expertise: 'expertise', experience: 'work', projects: 'projects', 'contact.socials': 'contact', 'bot.qa': 'bot' }[path];
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

/* ---------- Live preview drawer ---------- */
function PreviewDrawer({ open, mode, onClose, onMode }) {
  const { AdminIcon, Btn } = window.ADMIN_UI;
  const [device, setDevice] = useAState('desktop');
  const [nonce, setNonce] = useAState(0);
  useAEffect(() => { if (open) setNonce((n) => n + 1); }, [open, mode]);
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
          <a className="btn btn--sm" href="index.html" target="_blank" rel="noreferrer"><AdminIcon name="link" size={13} />Open</a>
          <button className="iconbtn" onClick={onClose}><AdminIcon name="x" size={15} /></button>
        </div>
        {open && (
          device === 'mobile'
            ? <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: '#060704', overflow: 'auto' }}>
                <iframe key={nonce} title="preview" src={'index.html?adminpreview=' + nonce} style={{ width: 390, height: 760, border: '1px solid var(--line-2)', borderRadius: 14, background: '#000' }} />
              </div>
            : <iframe key={nonce} title="preview" src={'index.html?adminpreview=' + nonce} />
        )}
      </div>
    </>
  );
}

/* ---------- Sidebar ---------- */
const NAV = [
  { group: 'DASHBOARD', items: [{ id: 'overview', label: 'Overview', icon: 'overview' }] },
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
  { group: 'ASSISTANT', items: [{ id: 'bot', label: 'AmritBot', icon: 'bot', count: 'bot.qa' }] },
  { group: 'SYSTEM', items: [{ id: 'sync', label: 'Sync & deploy', icon: 'sync' }] },
];

const TITLES = { overview: 'Overview', hero: 'Hero & intro', about: 'About', expertise: 'Expertise', work: 'Work history', projects: 'Projects', cards: 'Education & awards', contact: 'Contact', media: 'CV & media', appearance: 'Appearance', bot: 'AmritBot', sync: 'Sync & deploy' };

function Sidebar({ route, go, content, onLogout }) {
  const { AdminIcon } = window.ADMIN_UI;
  return (
    <aside className="side">
      <div className="side__brand">
        <span className="side__mark" />
        <span className="side__name">amrit.os<small>ADMIN CONSOLE</small></span>
      </div>
      <nav className="side__nav">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="side__group">{g.group}</div>
            {g.items.map((it) => {
              let cnt = null;
              if (it.count) {
                const arr = it.count.split('.').reduce((o, k) => (o != null ? o[k] : undefined), content);
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

/* ---------- App ---------- */
function AdminApp() {
  // Firebase Auth state. `authReady` gates the first render until we know
  // whether there's a signed-in session; `user` is set only for the owner.
  const [user, setUser] = useAState(null);
  const [authReady, setAuthReady] = useAState(false);
  const [authError, setAuthError] = useAState(null);
  const [authBusy, setAuthBusy] = useAState(false);

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
  const { content, setAt, replace, publish, reset, previewDraft, dirty, publishedAt, saveLLMConfig } = window.ADMIN_STORE.useContent();
  // Recompute analytics whenever the user lands on the overview route or
  // returns the tab to focus — keeps stats in sync with the live site without
  // a manual reload.
  const [analyticsTick, setAnalyticsTick] = useAState(0);
  const analytics = useAMemo(() => window.ADMIN_STORE.Store.analytics(), [analyticsTick, route]);
  useAEffect(() => {
    const refresh = () => setAnalyticsTick((n) => n + 1);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', (e) => { if (e.key === 'amritos.events') refresh(); });
    return () => window.removeEventListener('focus', refresh);
  }, []);
  const resetAnalytics = () => { window.ADMIN_STORE.Store.resetAnalytics(); setAnalyticsTick((n) => n + 1); };
  const { AdminIcon, Btn } = window.ADMIN_UI;

  useAEffect(() => { const onHash = () => setRoute((location.hash || '').replace('#', '') || 'overview'); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);
  const go = (r) => { setRoute(r); location.hash = r; document.querySelector('.canvas')?.scrollTo(0, 0); };

  const openPreview = (mode = 'draft') => {
    setPreviewMode(mode);
    if (mode === 'draft') previewDraft(); else window.ADMIN_STORE.Store.clearPreview();
    setPreview(true);
  };
  const changePreviewMode = (mode) => { setPreviewMode(mode); if (mode === 'draft') previewDraft(); else window.ADMIN_STORE.Store.clearPreview(); };

  const doPublish = () => { publish(); setFlash('Published to site ✓'); setTimeout(() => setFlash(null), 2600); };

  if (!authReady) return <div className="login"><div className="login__crt"><div className="login__body" style={{ textAlign: 'center', color: 'var(--fg-mute)' }}>Checking session…</div></div></div>;
  if (!user) return <Login onGoogle={signInGoogle} error={authError} busy={authBusy} />;

  const E = window.ADMIN_EDITORS, WP = window.ADMIN_EDITORS_WP, BOT = window.ADMIN_BOT;
  const renderRoute = () => {
    switch (route) {
      case 'overview': return <Overview content={content} analytics={analytics} dirty={dirty} publishedAt={publishedAt} onPublish={doPublish} onPreview={() => openPreview('draft')} onResetAnalytics={resetAnalytics} go={go} />;
      case 'hero': return <E.HeroEditor content={content} setAt={setAt} />;
      case 'about': return <E.AboutEditor content={content} setAt={setAt} />;
      case 'expertise': return <E.ExpertiseEditor content={content} setAt={setAt} />;
      case 'work': return <WP.WorkEditor content={content} setAt={setAt} />;
      case 'projects': return <WP.ProjectsEditor content={content} setAt={setAt} />;
      case 'cards': return <E.CardsEditor content={content} setAt={setAt} />;
      case 'contact': return <E.ContactEditor content={content} setAt={setAt} />;
      case 'media': return <E.MediaEditor content={content} setAt={setAt} analytics={analytics} />;
      case 'appearance': return <E.AppearanceEditor content={content} setAt={setAt} />;
      case 'bot': return <BOT.BotAdmin content={content} setAt={setAt} saveLLMConfig={saveLLMConfig} />;
      case 'sync': return <SyncPage publishedAt={publishedAt} dirty={dirty} onPublish={doPublish} onReset={reset} onPreview={() => openPreview('draft')} />;
      default: return <Overview content={content} analytics={analytics} dirty={dirty} publishedAt={publishedAt} onPublish={doPublish} onPreview={() => openPreview('draft')} onResetAnalytics={resetAnalytics} go={go} />;
    }
  };

  return (
    <div className="shell">
      <Sidebar route={route} go={go} content={content} onLogout={signOut} />
      <div className="main">
        <div className="topbar">
          <span className="topbar__crumb">amrit.os / <b>{TITLES[route] || route}</b></span>
          <span className="topbar__spacer" />
          {flash
            ? <span className="dirty saved"><span className="dot" />{flash}</span>
            : <span className={'dirty' + (dirty ? '' : ' saved')}><span className="dot" />{dirty ? 'Draft · unpublished changes' : 'All changes published'}</span>}
          <Btn icon="eye" onClick={() => openPreview('draft')}>Preview</Btn>
          <Btn kind="primary" icon="rocket" onClick={doPublish} disabled={!dirty}>Publish</Btn>
        </div>
        <div className="canvas">{renderRoute()}</div>
      </div>
      <PreviewDrawer open={preview} mode={previewMode} onClose={() => { setPreview(false); window.ADMIN_STORE.Store.clearPreview(); }} onMode={changePreviewMode} />
    </div>
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
