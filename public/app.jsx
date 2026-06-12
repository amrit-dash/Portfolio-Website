/* global React, ReactDOM */
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const CONTENT = window.PORTFOLIO_CONTENT || {};
const { EXPERIENCE, EXPERTISE, PROJECTS, SOCIALS } = window.PORTFOLIO_DATA;
const { useTime, useReveal, useActiveSection } = window.PORTFOLIO_HOOKS;

/* Live content context — App subscribes to Firestore content/published via
   window.subscribeContent() and provides the latest snapshot here, so the
   visible content sections (hero, about, expertise, work, projects, cards,
   contact) update in place when you publish from the admin — no refresh.
   Defaults to the synchronous CONTENT for instant first paint and for any
   component rendered outside the provider. */
const ContentCtx = React.createContext(CONTENT);
const useSiteContent = () => React.useContext(ContentCtx) || CONTENT;

/* tiny rich-text helper — admin text fields use <b>/<em>/<br/>; rendering via
   dangerouslySetInnerHTML is fine because the source is the portfolio owner. */
const rt = (html) => ({ __html: String(html == null ? '' : html) });

/* Bot markdown renderer — shared module (md.jsx): lists, bold, italic, code.
   Capture impl before a local wrapper; global `function mdInline` overwrites window.mdInline. */
const _mdInlineImpl = window.mdInline;
function renderMd(text) {
  const fn = _mdInlineImpl;
  return (typeof fn === 'function' ? fn : (t) => [String(t == null ? '' : t)])(text);
}

/* =====================================================
   ANALYTICS — fire-and-forget POST to the /track function,
   which writes Firestore counters + per-day buckets + a
   recent-events feed (with geo/source enrichment). The
   admin dashboard reads those back in real time.
   ===================================================== */
function logEvent(type, meta) {
  try {
    const base = window.FUNCTIONS_BASE;
    if (!base) return;
    fetch(base + '/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, meta, referrer: (typeof document !== 'undefined' && document.referrer) || '' }),
      keepalive: true, // survive page navigation (e.g. CV download / external link)
    }).catch(() => { });
  } catch (e) { /* never let analytics break the UX */ }
}

/* Cross-origin `download` on <a> is ignored (Firebase Storage). Fetch the PDF
   bytes (bucket CORS must allow GET — see storage.cors.json) and blob-save so
   the file lands in Downloads instead of navigating to the Storage URL. */
async function downloadCv(url, filename) {
  const name = filename || 'Amrit-Dash-CV.pdf';
  const saveBlob = (blob) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  };
  const fetchUrl = /^https?:\/\//i.test(url) ? url : new URL(url, location.href).href;
  try {
    const res = await fetch(fetchUrl, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    saveBlob(await res.blob());
    return { ok: true };
  } catch (e) {
    console.warn('[downloadCv]', e);
    return { ok: false };
  }
}

/* =====================================================
   ICONS — consistent inline SVGs for expertise + UI
   ===================================================== */

function Icon({ name, size = 18 }) {
  const s = { width: size, height: size, display: 'block' };
  // Custom uploaded SVG icons (admin → Expertise → Add Icon), stored in
  // content.icons and published. Resolved here so the live site shows them.
  if (typeof name === 'string' && name.indexOf('custom_') === 0) {
    const lib = (typeof window !== 'undefined' && window.__SKILL_ICONS) || (CONTENT && CONTENT.icons) || [];
    const hit = Array.isArray(lib) ? lib.find((ic) => ic && ic.id === name) : null;
    if (hit && hit.svg) return (<span className="skillicon" style={s} dangerouslySetInnerHTML={{ __html: hit.svg }} />);
    return <span style={s} />;
  }
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: '1.6',
    strokeLinecap: 'round', strokeLinejoin: 'round'
  };
  switch (name) {
    case 'brain':
      return (
        <span style={{
          display: 'block',
          width: size,
          height: size,
          backgroundColor: 'currentColor',
          WebkitMaskImage: 'url(assets/icons/brain.svg)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: 'url(assets/icons/brain.svg)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          flexShrink: 0,
        }} />);

    case 'automation': // interlocking gears
      return (
        <svg {...common} data-comment-anchor="6a39bb8af3-svg-20-9">
          <circle cx="9" cy="9" r="2.5" />
          <path d="M9 4v1.2M9 12.8V14M4 9h1.2M12.8 9H14M5.8 5.8l.85.85M11.35 11.35l.85.85M5.8 12.2l.85-.85M11.35 6.65l.85-.85" />
          <circle cx="15.5" cy="15.5" r="2" />
          <path d="M15.5 11.8v1M15.5 18v1M11.8 15.5h1M18 15.5h1M13.2 13.2l.7.7M17.6 17.6l.7.7M13.2 17.8l.7-.7M17.6 13.9l.7-.7" />
        </svg>);

    case 'rag': // brain / nodes
      return (
        <svg {...common}>
          <circle cx="6" cy="7" r="2" />
          <circle cx="6" cy="17" r="2" />
          <circle cx="18" cy="12" r="2" />
          <circle cx="12" cy="12" r="1.4" />
          <path d="M8 7l2.6 4.3M8 17l2.6-4.3M16 12h-2.6" />
        </svg>);

    case 'gas': // braces { }
      return (
        <svg {...common}>
          <path d="M8 4c-2 0-3 1-3 3v3c0 1-.6 2-2 2 1.4 0 2 1 2 2v3c0 2 1 3 3 3" />
          <path d="M16 4c2 0 3 1 3 3v3c0 1 .6 2 2 2-1.4 0-2 1-2 2v3c0 2-1 3-3 3" />
        </svg>);

    case 'flutter': // phone with chevron
      return (
        <svg {...common}>
          <rect x="6" y="3" width="12" height="18" rx="2.5" />
          <path d="M9 18h6" />
          <path d="M10 8l3 3-3 3" />
        </svg>);

    case 'bots': // friendly bot face
      return (
        <svg {...common} data-comment-anchor="aa1cf25a2a-svg-51-9">
          <rect x="4" y="7" width="16" height="12" rx="3" />
          <circle cx="9" cy="13" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="15" cy="13" r="1.4" fill="currentColor" stroke="none" />
          <path d="M12 3v4" />
          <circle cx="12" cy="2.5" r="1" fill="currentColor" stroke="none" />
        </svg>);

    case 'shopify': // bag
      return (
        <svg {...common}>
          <path d="M5 8h14l-1.5 12h-11L5 8z" />
          <path d="M9 8V6a3 3 0 016 0v2" />
        </svg>);

    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
        </svg>);

    case 'moon':
      return (
        <svg {...common}>
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>);

    case 'arrow-up':
      return (
        <svg {...common}>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>);

    case 'arrow-ne':
      return (
        <svg {...common}>
          <path d="M7 17L17 7M9 7h8v8" />
        </svg>);

    case 'home':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" style={{ display: 'block' }} data-comment-anchor="06bd0db7ed-svg-94-9">
          <path d="M12 3.2 3 11h2v9h5v-6h4v6h5v-9h2z" />
        </svg>);

    case 'send':
      return (
        <svg {...common}>
          <path d="M3 12L21 3l-7 18-2-7-9-2z" />
        </svg>);

    case 'github':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.69-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.93 10.93 0 015.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55C20.21 21.38 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5z" />
        </svg>);

    case 'linkedin':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
          <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v15H.22V8zm7.62 0H12v2.06h.06c.62-1.18 2.13-2.43 4.39-2.43 4.7 0 5.56 3.09 5.56 7.11V23h-4.6v-7.07c0-1.69-.03-3.86-2.36-3.86-2.36 0-2.72 1.85-2.72 3.75V23H7.84V8z" />
        </svg>);

    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".9" fill="currentColor" stroke="none" />
        </svg>);

    case 'whatsapp':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" data-comment-anchor="add17625c2-path-127-11" />
        </svg>);

    case 'clear':
      return (
        <svg {...common}>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>);

    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>);

    case 'aboutme':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20c0-4 3.1-7 7-7s7 3 7 7" />
        </svg>);

    case 'email':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>);

    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>);

    case 'web':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <circle cx="6.5" cy="6.5" r=".6" fill="currentColor" />
          <circle cx="9" cy="6.5" r=".6" fill="currentColor" />
          <path d="M8 13l-2 2 2 2" />
          <path d="M16 13l2 2-2 2" />
          <line x1="11" y1="17" x2="13" y2="13" />
        </svg>);

    case 'ios':
      return (
        <svg {...common} data-comment-anchor="b866a9365b-svg-158-9">
          <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
          <line x1="10.5" y1="5.5" x2="13.5" y2="5.5" strokeLinecap="round" strokeWidth="1.6" />
          <line x1="11" y1="18.5" x2="13" y2="18.5" />
        </svg>);

    case 'comedy':
      return (
        <svg {...common}>
          <rect x="9" y="2.5" width="6" height="11" rx="3" />
          <path d="M6 12.5a6 6 0 0 0 12 0" />
          <line x1="12" y1="18.5" x2="12" y2="21.5" />
          <line x1="9" y1="21.5" x2="15" y2="21.5" />
        </svg>);

    default:
      return <svg style={s} />;
  }
}

window.Icon = Icon;

const BOOT_LINES = [
  { text: '', delay: 60 },
  { text: 'AMRIT.OS v5.0.0 (build 26.05.28)', color: 'acc', delay: 120 },
  { text: 'Copyright (c) 2017—2026 amrit dash & co.', color: 'dim', delay: 80 },
  { text: '', delay: 80 },
  { text: 'self-test ........... PASS', delay: 90 },
  { text: 'mem check ........... 16384k OK', delay: 90 },
  { text: 'init devices ........ keyboard, mouse, retina', delay: 90 },
  { text: 'mount /home/amrit ... ok', delay: 90 },
  { text: 'load profile ........ software-engineer.cfg', delay: 90 },
  { text: 'loading modules ..... [automation] [rag] [flutter] [gas]', delay: 110 },
  { text: 'compile portfolio ... done', delay: 90 },
  { text: '', delay: 60 },
  { text: '> launching desktop session ...', color: 'acc', delay: 140 }];


function BootSequence({ onDone }) {
  const [visible, setVisible] = useState(0);
  const [phase, setPhase] = useState('booting'); // booting → logo → fading
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  // line-by-line reveal
  useEffect(() => {
    if (phase !== 'booting') return;
    if (visible >= BOOT_LINES.length) {
      const t = setTimeout(() => setPhase('logo'), 200);
      return () => clearTimeout(t);
    }
    const line = BOOT_LINES[visible];
    const id = setTimeout(() => {
      setVisible((v) => v + 1);
      setProgress(Math.min(100, Math.round((visible + 1) / BOOT_LINES.length * 100)));
    }, line.delay || 80);
    return () => clearTimeout(id);
  }, [visible, phase]);

  // Logo hold — then transition to fade. Skip/auto-advance handled below.
  useEffect(() => {
    if (phase !== 'logo') return;
    const HOLD = 1900;   // visible "press any key" window
    const t = setTimeout(() => setPhase('fading'), HOLD);
    return () => clearTimeout(t);
  }, [phase]);

  // Finish after fade-out (separate effect so the timer isn't cleared when phase flips).
  useEffect(() => {
    if (phase !== 'fading') return;
    const FADE_MS = 460;
    const t = setTimeout(() => finish(), FADE_MS);
    return () => clearTimeout(t);
  }, [phase, finish]);

  // Skip only after SYSTEM BOOT completes — early clicks/keys must not dismiss the splash.
  useEffect(() => {
    if (phase !== 'logo' && phase !== 'fading') return;
    const skip = () => finish();
    document.addEventListener('keydown', skip);
    document.addEventListener('click', skip);
    return () => {
      document.removeEventListener('keydown', skip);
      document.removeEventListener('click', skip);
    };
  }, [phase, finish]);

  const handleFadeEnd = useCallback((e) => {
    if (e.target !== e.currentTarget) return;
    if (phase === 'fading' && e.animationName === 'fadeBoot') finish();
  }, [phase, finish]);

  // Never leave the splash stuck if timers or CSS animation fail.
  useEffect(() => {
    const t = setTimeout(() => finish(), 14000);
    return () => clearTimeout(t);
  }, [finish]);

  return (
    <div
      className={'boot ' + (phase === 'fading' ? 'boot--fading' : '')}
      onAnimationEnd={handleFadeEnd}
      aria-live="polite"
    >
      <div className="boot__crt-frame">
        {phase === 'booting' &&
          <div className="boot__panel">
            <div className="boot__header">
              <span className="acc">●</span> <span>system boot</span>
              <span className="boot__progress-num">[ {progress.toString().padStart(3, ' ')}% ]</span>
            </div>
            <div className="boot__progress">
              <div className="boot__progress-fill" style={{ width: progress + '%' }} />
            </div>
            <div className="boot__lines">
              {BOOT_LINES.slice(0, visible).map((line, i) =>
                <div key={i} className="crt__line">
                  <span className={line.color || ''}>{line.text || '\u00A0'}</span>
                </div>
              )}
              {visible < BOOT_LINES.length && <span className="boot__cursor" />}
            </div>
          </div>
        }

        {(phase === 'logo' || phase === 'fading') &&
          <div className="boot__logo">
            <pre className="boot__ascii">{`   █████╗ ███╗   ███╗██████╗ ██╗████████╗
  ██╔══██╗████╗ ████║██╔══██╗██║╚══██╔══╝
  ███████║██╔████╔██║██████╔╝██║   ██║
  ██╔══██║██║╚██╔╝██║██╔══██╗██║   ██║
  ██║  ██║██║ ╚═╝ ██║██║  ██║██║   ██║
  ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝
              .  O  S`}</pre>
            <div className="boot__tagline">a software engineer's portfolio</div>
            <div className="boot__hint mono">press any key or click to continue_</div>
          </div>
        }
      </div>
    </div>);
}

/* =====================================================
   MENU BAR
   ===================================================== */

function CvThemeTip({ theme, nonce, onDismiss }) {
  const [fading, setFading] = useState(false);
  const dismiss = useCallback(() => {
    setFading(true);
    setTimeout(onDismiss, 380);
  }, [onDismiss]);

  useEffect(() => {
    if (!nonce) return undefined;
    setFading(false);
    const t = setTimeout(dismiss, 6500);
    return () => clearTimeout(t);
  }, [nonce, dismiss]);

  if (!nonce) return null;
  const msg = theme === 'dark'
    ? 'Switch mode to download light schema CV.'
    : 'Switch mode to download dark schema CV.';
  return (
    <div className={'cv-theme-tip' + (fading ? ' cv-theme-tip--out' : '')} role="status">
      <p>{msg}</p>
      <button type="button" className="cv-theme-tip__close" onClick={dismiss} aria-label="Dismiss">×</button>
    </div>);
}

function MenuBar({ theme, onToggleTheme, active, cvThemeTipNonce, onCvThemeTipDismiss }) {
  const now = useTime();
  const t = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const d = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const items = [
    { id: 'intro', label: 'intro' },
    { id: 'about', label: 'about' },
    { id: 'work', label: 'work' },
    { id: 'projects', label: 'projects' },
    { id: 'contact', label: 'contact' }];

  return (
    <header className="menubar" data-comment-anchor="25c503c02a-header-216-5">
      <div className="menubar__logo">
        <a href="#intro" className="pixel-home" title="Back to top" aria-label="Back to top">
          <span className="pixel-mark" data-comment-anchor="32ef46f7b4-span-70-9"><Icon name="home" size={11} /></span>
        </a>
        <span>amrit.os</span>
      </div>
      <nav className="menubar__items">
        {items.map((it) =>
          <a key={it.id} href={'#' + it.id} className={active === it.id ? 'active' : ''}>{it.label}</a>
        )}
      </nav>
      <div className="menubar__right">
        <button
          className="pill pill--btn"
          title="Chat with amrit-bot"
          data-comment-anchor="dafd2ad3a1-span-229-9"
          onClick={() => {
            const root = document.querySelector('.os-root');
            const bot = document.querySelector('.hero__bot');
            if (root && bot) root.scrollTo({ top: bot.offsetTop - 80, behavior: 'smooth' });
            setTimeout(() => { const inp = document.querySelector('.console__input input'); if (inp) inp.focus(); }, 600);
          }}>
          <span className="dot" /> amrit-bot</button>
        <span className="menubar__clock">{d}  ·  {t}</span>
        <div className="menubar__theme-wrap">
          <CvThemeTip theme={theme} nonce={cvThemeTipNonce} onDismiss={onCvThemeTipDismiss} />
          <button className="icon-btn" onClick={onToggleTheme} title={'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'} aria-label="Toggle theme" data-comment-anchor="ccd391eba6-button-231-9">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
          </button>
        </div>
      </div>
    </header>);

}

/* =====================================================
   AMRITBOT CONSOLE — interactive replacement for the CRT
   ===================================================== */

// Bot content — all sourced from CONTENT.bot (data.jsx defaults + admin
// override). System prompt, Q&A pairs, quick-chip commands and LLM provider
// config flow through here. Edit them at /admin.html → AmritBot.
const BOT = (CONTENT && CONTENT.bot) || {};
const PROVIDERS = (typeof window !== 'undefined' && window.LLM_PROVIDERS) || [];
const BOT_SCRIPT = Array.isArray(BOT.qa) ? BOT.qa : [];
const QUICK_PROMPTS = (Array.isArray(BOT.commands) ? BOT.commands : [])
  .filter((c) => c && c.id && c.id !== 'clear' && c.id !== 'help' && c.id !== 'commands')
  .slice(0, 6)
  .map((c) => ({ id: c.id, label: c.label || c.id }));
const BOT_INTRO = (Array.isArray(BOT.intro) ? BOT.intro : [
  "Hey 👋 I'm amrit-bot. ask me anything.",
  'Try /stats, /links, /work — or /help for all commands.',
]);
const BOT_BEHAVIOR = BOT.behavior || { temperature: 0.7, maxTokens: 300, matchThreshold: 0.28 };

// ─── Local Q&A matcher — fallback when no API key is set; also used as a
// suggested-answer hint to the LLM when a key is present. ─────────────────
const STOPWORDS = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'do', 'does', 'did', 'you', 'your', 'i', 'me', 'my', 'what', 'who', 'where', 'when', 'why', 'how', 'tell', 'about', 'some', 'any', 'can', 'could', 'would', 'have', 'has', 'had', 'will', 'be', 'been', 'being', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'it', 'its', 'this', 'that', 'these', 'those', 'he', 'she', 'they', 'we', 'or', 'and', 'but', 'if', 'so', 'than', 'too', 'very', 'just', 'get', 'into']);
function qaStem(w) { return w.replace(/(ing|tion|tions|ed|er|ly)$/, '').replace(/ies$/, 'y'); }
function qaTokenize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w)).map(qaStem); }
function qaJaccard(a, b) { const A = new Set(qaTokenize(a)), B = new Set(qaTokenize(b)); if (!A.size || !B.size) return 0; const inter = [...A].filter(w => B.has(w)).length; return inter / new Set([...A, ...B]).size; }
function findBestMatch(query, threshold) {
  const th = typeof threshold === 'number' ? threshold : (BOT_BEHAVIOR.matchThreshold != null ? BOT_BEHAVIOR.matchThreshold : 0.28);
  const pick = (v) => Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
  let best = { score: 0, answer: null };
  for (const item of BOT_SCRIPT) {
    const qs = Array.isArray(item.qs) ? item.qs : (item.q ? [item.q] : []);
    for (const q of qs) { const s = qaJaccard(query, q); if (s > best.score) best = { score: s, answer: pick(item.as || item.a) }; }
  }
  return best.score >= th ? best.answer : null;
}

// Call the active provider configured in admin → AmritBot → LLM Providers.
// Throws on missing key or empty response; the caller falls back to local Q&A.
async function callBot(query, suggestion) {
  // The bot never holds a key in the browser. It POSTs to the /chat Cloud
  // Function, which reads the active provider + key from the private config/llm
  // doc server-side and calls the LLM. Throwing here makes the caller fall back
  // to the local Q&A matcher (offline-friendly + zero-cost).
  const base = window.FUNCTIONS_BASE;
  if (!base) throw new Error('no-proxy');
  const headers = { 'Content-Type': 'application/json' };
  // When the owner is signed in (admin "Test bot"), attach the ID token so the
  // proxy skips the per-IP rate limit.
  try {
    if (window.fb && window.fb.auth && window.fb.auth.currentUser) {
      headers.Authorization = 'Bearer ' + (await window.fb.auth.currentUser.getIdToken());
    }
  } catch (e) { /* anonymous visitor — rate-limited path */ }
  const res = await fetch(base + '/chat', { method: 'POST', headers, body: JSON.stringify({ message: query, suggestion }) });
  if (res.status === 429) { const e = new Error('rate-limit'); e.rate = true; throw e; }
  const d = await res.json().catch(() => null);
  if (!d || d.fallback || !d.text) throw new Error('fallback');
  return d.text;
}

function BotMsg({ children, typing }) {
  return (
    <div className="bot-msg">
      <span className="bot-msg__avatar"><Icon name="bots" size={12} /></span>
      <div className="bot-msg__bubble">
        {typing ?
          <span className="bot-typing"><span /><span /><span /></span> :
          children}
      </div>
    </div>);

}

function UserMsg({ children }) {
  return (
    <div className="user-msg">
      <div className="user-msg__bubble">{children}</div>
    </div>);

}

function EduCard() {
  return (
    <div className="bot-card">
      <div className="bot-card__row"><b>B.Tech CSE</b> &mdash; KIIT University, Bhubaneswar</div>
      <div className="bot-card__row"><b>Class 11&ndash;12</b> &mdash; DAV Pokhariput, BBSR</div>
      <div className="bot-card__row"><b>School</b> &mdash; St. Joseph's High School, BBSR</div>
      <div className="bot-card__row"><b>Hack DAV</b> &mdash; co-organised India's first high-school hackathon</div>
    </div>);
}

function OriginCard() {
  return (
    <div className="bot-card">
      <div className="bot-card__row">always been into tech &mdash; tinkering through school, built websites early on</div>
      <div className="bot-card__row"><b>spark:</b> managing interns at HighRadius, wrote Apps Script to auto-generate their daily task lists</div>
      <div className="bot-card__row">that one script became a company-wide toolkit. never stopped automating after that.</div>
    </div>);
}

function ComedyCard() {
  return (
    <div className="bot-card">
      <div className="bot-card__row"><b>Style</b> &mdash; observational, tech &amp; work-life edge</div>
      <div className="bot-card__row"><b>Currently</b> &mdash; Underground Comedy Club &middot; Big Pitcher &middot; Bloom (Bangalore)</div>
      <div className="bot-card__row"><b>Cities</b> &mdash; BBSR &rarr; Guwahati &rarr; Zoom &rarr; Delhi &rarr; Lucknow &rarr; Bangalore + Chandigarh, Kolkata, Kochi, Chennai</div>
      <div className="bot-card__row"><b>Opened for</b> &mdash; Harsh Gujral &middot; Devesh Dikshit &middot; Vipul Goyal &middot; Manik Mahna &amp; more</div>
    </div>);
}

function ProjectsCard() {
  return (
    <div className="bot-card">
      <div className="bot-card__row"><b>Test Made Easy</b> — AI question extractor &amp; LaTeX formatter for teachers</div>
      <div className="bot-card__row"><b>GenkiFlow IDE</b> — web IDE with Google Genkit AI baked in</div>
      <div className="bot-card__row"><b>Rx Workspace</b> — SaaS prescription generator for doctors</div>
      <div className="bot-card__row"><b>Overlay Recorder</b> — SwiftUI iOS screen recorder with PiP camera</div>
      <div className="bot-card__row"><b>Nothing BOT Comedy</b> — WhatsApp spot-booking bot, 150+ users</div>
      <div className="bot-card__row"><b>Coffee Mapper</b> — Flutter field-agent app, live on Play Store</div>
    </div>);
}

function StackCard() {
  return (
    <div className="bot-card">
      <div className="bot-card__row"><b>Automation</b> — Make · Zapier · n8n · Apps Script</div>
      <div className="bot-card__row"><b>AI / RAG</b> — Genkit · Vertex AI · LLMs · Firebase</div>
      <div className="bot-card__row"><b>Mobile</b> — Flutter · SwiftUI · Android · iOS</div>
      <div className="bot-card__row"><b>Web / Bots</b> — React · Next.js · Twilio · Shopify Liquid</div>
    </div>);

}

function StatsCard() {
  return (
    <div className="bot-card">
      <div className="bot-card__row"><b>5 yrs</b> building automation</div>
      <div className="bot-card__row"><b>8</b> projects shipped &amp; live</div>
      <div className="bot-card__row"><b>4</b> CAA clients gone live</div>
      <div className="bot-card__row"><b>150+</b> users on shipped bots</div>
      <div className="bot-card__row"><b>AIR 1</b> Digit CTC VI</div>
    </div>);

}

function LinksCard() {
  const links = [
    { name: 'linkedin', href: 'https://linkedin.com/in/amritdash60', label: 'LinkedIn' },
    { name: 'github', href: 'https://github.com/amrit-dash', label: 'GitHub' },
    { name: 'instagram', href: 'https://www.instagram.com/_amrit_dash_', label: 'Instagram' },
    { name: 'whatsapp', href: 'https://wa.me/917978416962', label: 'WhatsApp' },
    { name: 'email', href: 'mailto:amrit.dash60@gmail.com', label: 'Email' },
    { name: 'aboutme', href: 'https://about.me/amritdash', label: 'About.me' }];

  return (
    <div className="bot-links">
      {links.map((l) =>
        <a key={l.name} className="bot-link" href={l.href} target="_blank" rel="noreferrer">
          <Icon name={l.name} size={14} />
          <span>{l.label}</span>
        </a>
      )}
    </div>);

}

function WorkCard() {
  return (
    <div className="bot-card">
      <div className="bot-card__row">
        <b>Contour Education</b><br />
        Automation Engineer · Aug 2025 → now
      </div>
      <div className="bot-card__row">
        <b>HighRadius</b><br />
        Script Automation Lead · CAA consultant
      </div>
      <div className="bot-card__row">
        <b>Axelerant</b><br />
        Business Automation Engineer
      </div>
    </div>);

}

function AmritBotConsole({ botIcon, botIconColor }) {
  const MAX_MSG = 10;
  const trim = (msgs) => msgs.length > MAX_MSG ? msgs.slice(msgs.length - MAX_MSG) : msgs;
  const [thread, setThread] = useState([]);
  const [phase, setPhase] = useState('intro'); // intro | scripted | idle
  const [scriptIdx, setScriptIdx] = useState(0);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread, thinking]);

  // Intro sequence then scripted Q&A cycling
  useEffect(() => {
    if (phase !== 'intro') return;
    const intro = BOT_INTRO.map((text, i) => ({ type: 'bot', text, delay: i === 0 ? 600 : 600 }));

    let t = 0;
    const timers = intro.map((m, i) => {
      t += m.delay;
      return setTimeout(() => {
        setThread((prev) => [...prev, { from: 'bot', body: m.text }]);
        if (i === intro.length - 1) setPhase('scripted');
      }, t);
    });
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // After intro, cycle scripted Q&A
  useEffect(() => {
    if (phase !== 'scripted') return;
    const item = BOT_SCRIPT[scriptIdx % BOT_SCRIPT.length];
    const delay = scriptIdx === 0 ? 7500 : 10000;
    // Pick a random variation if arrays are provided
    const pick = (v) => Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;
    const q = pick(item.qs || item.q);
    const a = pick(item.as || item.a);
    const t1 = setTimeout(() => {
      setThread((prev) => trim([...prev, { from: 'user', body: q }]));
    }, delay);
    const t2 = setTimeout(() => setThinking(true), delay + 900);
    const t3 = setTimeout(() => {
      setThinking(false);
      setThread((prev) => trim([...prev, { from: 'bot', body: a }]));
      setScriptIdx((i) => i + 1);
    }, delay + 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase, scriptIdx]);

  const runCommand = useCallback((cmd) => {
    setPhase('idle'); // stop auto-cycle once user interacts
    if (cmd !== 'clear') logEvent('bot:chat', { command: cmd }); // slash commands count as bot chats
    setThread((prev) => [...prev, { from: 'user', body: '/' + cmd }]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      let body;
      switch (cmd) {
        case 'whoami':
          body = <>Amrit Dash — AI &amp; Automation Engineer based in Bangalore. Specializing in process automation + RAG / agentic AI workflows.</>;
          break;
        case 'stats': body = <StatsCard />; break;
        case 'links': body = <LinksCard />; break;
        case 'work': body = <WorkCard />; break;
        case 'stack': body = <StackCard />; break;
        case 'projects': body = <ProjectsCard />; break;
        case 'edu': body = <EduCard />; break;
        case 'origin': body = <OriginCard />; break;
        case 'comedy': body = <ComedyCard />; break;
        case 'help':
        case 'commands':
          body = (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '2px' }}>
              {(Array.isArray(BOT.commands) ? BOT.commands : []).map((c) =>
                <button key={c.id} className="console__chip" onClick={() => runCommand(c.id)} title={c.desc || ''}>/{c.id}</button>
              )}
            </div>);
          break;
        case 'clear':
          setThread([]);
          setPhase('intro');
          setScriptIdx(0);
          return;
        default: body = <em>command not found: /{cmd}</em>;
      }
      setThread((prev) => [...prev, { from: 'bot', body }]);
    }, 480);
  }, []);

  const sendInput = useCallback(async () => {
    const q = input.trim();
    if (!q) return;
    setPhase('idle');
    setInput('');
    // Slash-commands shortcut — runCommand adds the user message itself
    if (q.startsWith('/')) {
      runCommand(q.slice(1).trim());
      return;
    }
    setThread((prev) => [...prev, { from: 'user', body: q }]);
    logEvent('bot:chat');
    setThinking(true);
    const matched = findBestMatch(q);
    try {
      const text = await callBot(q, matched);
      setThinking(false);
      setThread((prev) => [...prev, { from: 'bot', body: text }]);
    } catch (e) {
      setThinking(false);
      const fallback = e && e.rate
        ? "you've sent a lot of messages — give it a few minutes and try again."
        : (matched || "i'm offline right now — try /stats, /links, /work or /comedy.");
      setThread((prev) => [...prev, { from: 'bot', body: fallback }]);
    }
  }, [input, runCommand]);

  return (
    <div className="console" data-comment-anchor="107d543fe3-div-108-5">
      <div className="console__head">
        <span className="console__avatar"><BotAvatarIcon icon={botIcon} size={24} iconColor={botIconColor} /></span>
        <div>
          <div className="console__name">amrit-bot</div>
          <div className="console__sub"><span className="console__dot" /> online · agent v1.0</div>
        </div>
        <button className="console__clear" onClick={() => setThread([])} title="Clear chat" aria-label="Clear chat">
          <Icon name="clear" size={14} />
        </button>
      </div>

      <div className="console__body" ref={bodyRef} data-comment-anchor="9ae4af3e04-div-552-7">
        {thread.map((m, i) =>
          m.from === 'bot' ?
            // Slash-commands store React elements (StatsCard, LinksCard, …) as
            // body; only string bodies (LLM/Q&A replies) go through the inline
            // markdown renderer — otherwise String(element) prints "[object Object]".
            <BotMsg key={i}>{typeof m.body === 'string' ? renderMd(m.body) : m.body}</BotMsg> :
            <UserMsg key={i}>{m.body}</UserMsg>
        )}
        {thinking && <BotMsg typing />}
      </div>

      <div className="console__chips" data-comment-anchor="e4fa8aa953-div-515-7">
        {QUICK_PROMPTS.map((p) =>
          <button key={p.id} className="console__chip" onClick={() => runCommand(p.id)}>
            /{p.label}
          </button>
        )}
      </div>

      <form
        className="console__input"
        onSubmit={(e) => { e.preventDefault(); sendInput(); }}>
        <span className="console__prompt">›</span>
        <input
          type="text"
          placeholder="ask amrit-bot anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="console__send" aria-label="Send">
          <Icon name="send" size={14} />
        </button>
      </form>
    </div>);

}

/* =====================================================
   HERO
   ===================================================== */

function Hero({ botIcon, botIconColor }) {
  const h = useSiteContent().hero || {};
  const ctas = Array.isArray(h.ctas) ? h.ctas : [];
  return (
    <section id="intro" className="hero">
      <div className="hero__intro">
        <div className="hero__handle" data-reveal data-reveal-type="left">{h.handle}</div>
        <h1 className="hero__name" data-reveal data-reveal-type="up" data-reveal-delay="1">
          {h.name}&nbsp;<em>{h.nameEm}</em>.
        </h1>
        <div className="hero__subtitle" data-reveal data-reveal-type="up" data-reveal-delay="1" style={{ fontFamily: "Manrope" }}>
          {h.subtitle}
        </div>
        <p className="hero__role" data-reveal data-reveal-type="up" data-reveal-delay="2" dangerouslySetInnerHTML={rt(h.role)} />
        <div className="hero__cta-row" data-reveal data-reveal-type="up" data-reveal-delay="3">
          {ctas.map((c, i) => (
            <a key={i} href={c.href || '#'} className={'btn' + (c.primary ? ' btn--primary' : '')}
              onClick={() => logEvent('cta:click', { label: c.label, href: c.href || '' })}>
              {c.label}{c.primary && <span className="btn__arrow"> ↗</span>}
            </a>
          ))}
        </div>
      </div>
      <div className="hero__bot" data-reveal data-reveal-type="scale" data-reveal-delay="2">
        <AmritBotConsole botIcon={botIcon} botIconColor={botIconColor} />
      </div>
    </section>);

}

/* =====================================================
   ABOUT WINDOW
   ===================================================== */

function AboutWindow({ cvUrl, cvVariant, cvFileName, onCvDownloaded }) {
  const a = useSiteContent().about || {};
  const meta = Array.isArray(a.meta) ? a.meta : [];
  const impact = Array.isArray(a.impact) ? a.impact : [];
  const photoStamp = String(
    a.photoStamp
    || (window.PORTFOLIO_DEFAULTS && window.PORTFOLIO_DEFAULTS.about && window.PORTFOLIO_DEFAULTS.about.photoStamp)
    || ''
  ).trim();
  const [cvBusy, setCvBusy] = useState(false);
  const [cvErr, setCvErr] = useState(false);
  const onCvClick = async (e) => {
    e.preventDefault();
    if (cvBusy) return;
    setCvErr(false);
    setCvBusy(true);
    logEvent('cv:download', cvVariant);
    const result = await downloadCv(cvUrl, cvFileName);
    setCvBusy(false);
    if (result.ok) {
      if (onCvDownloaded) onCvDownloaded();
    } else {
      setCvErr(true);
    }
  };
  return (
    <section id="about" className="section">
      <div className="section__label" data-reveal data-reveal-type="left">/ABOUT.ME</div>
      <div className="window" data-reveal data-reveal-type="window">
        <div className="window__titlebar">
          <div className="window__lights"><span /><span /><span /></div>
          <div className="window__title">~/about/amrit.dash — readme.md</div>
          <div className="window__meta">88×42</div>
        </div>
        <div className="window__body">
          <div className="about-grid">
            <div>
              <div className="about-photo-stack" data-reveal data-reveal-type="scale">
                {photoStamp ? (
                  <div className="about-stamp-header">
                    <span className="about-stamp-label">
                      <span className="about-stamp-label__bracket" aria-hidden="true">[</span>
                      {photoStamp}
                      <span className="about-stamp-label__bracket" aria-hidden="true">]</span>
                    </span>
                    <span className="about-stamp-rule" aria-hidden="true" />
                  </div>
                ) : null}
                <div className="about-photo">
                  <img src={a.photo || 'assets/about-photo.jpg'} alt="Amrit Dash" />
                </div>
              </div>
              <div className="about-meta" data-reveal data-reveal-delay="1">
                {meta.map((m, i) => <span key={i}><b>{m.label}</b> {m.value}</span>)}
              </div>
            </div>
            <div className="about-text">
              <h2 data-reveal data-reveal-type="up" dangerouslySetInnerHTML={rt(a.heading)} />
              <p data-reveal data-reveal-type="up" data-reveal-delay="1" dangerouslySetInnerHTML={rt(a.intro)} />
              <ul className="about-impact" data-reveal data-reveal-type="up" data-reveal-delay="2">
                {impact.map((m, i) => <li key={i}><b>{m.label}</b> &mdash; <span dangerouslySetInnerHTML={rt(m.html)} /></li>)}
              </ul>
              <div className="hero__cta-row" data-reveal data-reveal-type="up" data-reveal-delay="3" style={{ marginTop: '24px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="button" onClick={onCvClick} className="btn btn--primary" disabled={cvBusy} aria-busy={cvBusy}>
                  {cvBusy ? 'Downloading…' : 'Download CV'}
                </button>
                {cvErr && <span className="cv-download-err mono" role="alert">Couldn&apos;t download — try again.</span>}
                <a href="https://about.me/amritdash" target="_blank" rel="noreferrer" className="btn">About.me <span className="btn__arrow">↗</span></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);

}

/* =====================================================
   EXPERTISE
   ===================================================== */

function ExpertiseWindow() {
  const EXPERTISE = useSiteContent().expertise || [];
  const [activeSkill, setActiveSkill] = useState(null);

  // Sync with the projects-side clear event so the active highlight resets if
  // the user dismisses the filter pill in the Projects section.
  useEffect(() => {
    const onClear = () => setActiveSkill(null);
    window.addEventListener('skill-filter-clear', onClear);
    return () => window.removeEventListener('skill-filter-clear', onClear);
  }, []);

  const handleClick = (icon) => {
    const next = activeSkill === icon ? null : icon;
    setActiveSkill(next);
    window.dispatchEvent(new CustomEvent('skill-filter', { detail: next }));
    if (next) {
      const root = document.querySelector('.os-root');
      const projects = document.getElementById('projects');
      if (root && projects) {
        setTimeout(() => root.scrollTo({ top: projects.offsetTop - 80, behavior: 'smooth' }), 120);
      }
    }
  };

  return (
    <section id="expertise" className="section" style={{ paddingTop: '40px' }}>
      <div className="section__label" data-reveal data-reveal-type="left">/EXPERTISE.SYS</div>
      <div className="window" data-reveal data-reveal-type="window">
        <div className="window__titlebar">
          <div className="window__lights"><span /><span /><span /></div>
          <div className="window__title">system/expertise — installed_modules.list</div>
          <div className="window__meta">{EXPERTISE.length.toString().padStart(2, '0')} modules<span className="meta-hint"> · click to filter</span></div>
        </div>
        <div className="window__body" data-comment-anchor="fe2f9673c1-div-233-9">
          <div className="expertise-grid">
            {EXPERTISE.map((e, i) =>
              <button
                type="button"
                key={e.num}
                className="expertise-card"
                data-reveal
                data-reveal-type="up"
                data-reveal-delay={Math.min(i, 5)}
                data-active={activeSkill === e.icon}
                onClick={() => handleClick(e.icon)}
                aria-pressed={activeSkill === e.icon}
                title={activeSkill === e.icon ? 'Click again to clear filter' : 'Filter projects by ' + e.title}>
                <div className="expertise-card__head">
                  <div className="expertise-card__icon"><Icon name={e.icon} size={18} /></div>
                  <div className="expertise-card__num">MOD_{e.num}</div>
                </div>
                <div className="expertise-card__title">{e.title}</div>
                <div className="expertise-card__sub">{e.sub}</div>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>);

}

/* =====================================================
   EXPERIENCE FOLDER (tabs)
   ===================================================== */

function ExperienceFolder() {
  const EXPERIENCE = useSiteContent().experience || [];
  const [active, setActive] = useState(() => (EXPERIENCE[0] && EXPERIENCE[0].id));
  const [activeRole, setActiveRole] = useState({});
  if (!EXPERIENCE.length) return null;
  const current = EXPERIENCE.find((x) => x.id === active) || EXPERIENCE[0];
  const currentRole = current.roles ?
    current.roles.find((r) => r.id === activeRole[current.id]) || current.roles[0] :
    null;
  const displayBullets = currentRole ? currentRole.bullets : current.bullets;
  const formatExpDates = (entry) => (window.SHARED_SCHEMA && window.SHARED_SCHEMA.formatExperienceDateRange(entry)) || entry.date || '';
  const displayDate = currentRole ? currentRole.date : formatExpDates(current);
  const displayPath = currentRole ? `~/work/${current.id}/${currentRole.id}/` : `~/work/${current.id}/`;
  return (
    <section id="work" className="section">
      <div className="section__label" data-reveal data-reveal-type="left">/WORK.HISTORY</div>
      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: 'clamp(26px, 3.4vw, 44px)',
        fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.15, margin: '8px 0 32px',
        textWrap: 'balance'
      }} data-reveal data-reveal-type="up" data-comment-anchor="d6ce5d953f-h2-443-7">
        {EXPERIENCE.length === 1 ? 'One role' : `${['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][EXPERIENCE.length - 1] || EXPERIENCE.length} roles`},&nbsp;
        <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>one throughline</em> &mdash; automate the boring, ship the rest.
      </h2>

      <div className="exp-folder" data-reveal data-reveal-type="window">
        <div className="window__titlebar">
          <div className="window__lights"><span /><span /><span /></div>
          <div className="window__title">~/work/experience — {EXPERIENCE.length} entries</div>
          <div className="window__meta">timeline</div>
        </div>
        <div className="exp-folder__body">
          <div className="exp-sidebar">
            {EXPERIENCE.map((e) =>
              <button
                key={e.id}
                className="exp-tab"
                data-active={e.id === active}
                data-current={!!e.current}
                onClick={() => setActive(e.id)}>

                <span className="exp-tab__name">{e.short}</span>
                <span className="exp-tab__date">
                  {e.current && <span className="exp-tab__dot" aria-hidden="true" />}
                  {formatExpDates(e)}
                </span>
              </button>
            )}
          </div>
          <div className="exp-detail" key={current.id}>
            <div className="exp-detail__path">{displayPath}</div>
            <div className="exp-detail__role">{current.role}</div>
            <div className="exp-detail__company">{current.company}</div>
            <div className="exp-detail__date">{displayDate}</div>
            <div className="exp-detail__desc" data-comment-anchor="f7f62644aa-div-705-13">{current.desc}</div>
            {current.roles &&
              <div className="exp-roles">
                {current.roles.map((r) =>
                  <button
                    key={r.id}
                    className="exp-role-tab"
                    data-active={r.id === currentRole.id}
                    onClick={() => setActiveRole((s) => ({ ...s, [current.id]: r.id }))}>

                    {r.name}
                  </button>
                )}
              </div>
            }
            {displayBullets &&
              <ul className="exp-bullets">
                {displayBullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            }
            {current.clients &&
              <ul className="exp-clients">
                {current.clients.map((c) =>
                  <li key={c.name}>
                    <span className="exp-clients__name">{c.name}</span>
                    <span className="exp-clients__detail">{c.detail}</span>
                  </li>
                )}
              </ul>
            }
            <div className="exp-detail__stack">
              {current.stack.map((s) => <span key={s} className="stack-chip">{s}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Education / Awards / Certs */}
      <div className="dual-col">
        {(useSiteContent().cards || []).map((c, i) => (
          <div key={c.id || i} className="info-card" data-reveal data-reveal-type="up" data-reveal-delay={String(i + 1)}>
            <div className="info-card__head"><span>{c.eyebrow}</span><b>{c.meta}</b></div>
            <h3>{c.title}</h3>
            {c.sub && <div className="info-card__sub">{c.sub}</div>}
            {c.body && <p dangerouslySetInnerHTML={rt(c.body)} />}
            {Array.isArray(c.items) && c.items.length > 0 && (
              <ul>{c.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={rt(it)} />)}</ul>
            )}
            {Array.isArray(c.scores) && c.scores.length > 0 && (
              <div className="score-row" style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--line-2)' }}>
                {c.scores.map((s, k) => <span key={k}><b>{s.label}</b> {s.value}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>);

}

/* =====================================================
   PROJECTS DESKTOP
   ===================================================== */

function FolderIcon({ project, onOpen }) {
  const handleClick = () => {
    if (project.directLink) {
      window.open(project.directLink, '_blank', 'noopener,noreferrer');
    } else {
      onOpen(project);
    }
  };
  return (
    <button className="folder-icon" onClick={handleClick} aria-label={'Open ' + project.title} title={project.title}>
      <div className="folder-icon__art">
        <img src={project.image} alt="" />
        {project.directLink &&
          <span className="folder-icon__ext-badge" title="Opens external link">↗</span>
        }
      </div>
      <div className="folder-icon__label">{project.title}</div>
      <div className="folder-icon__type">{project.type}</div>
    </button>);

}

function ProjectModal({ project, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  if (!project) return null;
  return (
    <div className="project-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="project-modal window">
        <div className="window__titlebar">
          <button className="modal-close" onClick={onClose} aria-label="Close" title="Close">
            <Icon name="close" size={16} />
          </button>
          <div className="window__lights">
            <span style={{ cursor: 'pointer' }} onClick={onClose} title="close" />
            <span /><span />
          </div>
          <div className="window__title">~/projects/{project.id}.{project.type.replace('.', '')}</div>
          <div className="window__meta">open</div>
        </div>
        <div className="project-modal__body">
          <div className="project-modal__art" data-comment-anchor="3dd5f705f5-div-805-11">
            <img src={project.gallery || project.image} alt={project.title} />
          </div>
          <div className="project-modal__info">
            <div className="project-modal__cat">{project.cat}</div>
            <div className="project-modal__title">{project.title}</div>
            <div className="project-modal__desc">{project.desc}</div>
            <div className="project-modal__tags">
              {project.tags.map((t) => <span key={t} className="stack-chip">{t}</span>)}
            </div>
            <div className="project-modal__buttons" data-comment-anchor="bb9fb0b309-div-929-13">
              {project.links.map((l) =>
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="btn btn--primary"
                  onClick={() => logEvent('link:click', { label: l.label, href: l.href, project: project.id })}>
                  {l.label} <span className="btn__arrow">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);

}

function ProjectsDesktop() {
  const PROJECTS = useSiteContent().projects || [];
  const EXPERTISE = useSiteContent().expertise || [];
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState(null);

  useEffect(() => {
    const onFilter = (e) => setFilter(e.detail || null);
    window.addEventListener('skill-filter', onFilter);
    return () => window.removeEventListener('skill-filter', onFilter);
  }, []);

  const filtered = filter ?
    PROJECTS.filter((p) => Array.isArray(p.skills) && p.skills.includes(filter)) :
    PROJECTS;
  const filterModule = filter ? EXPERTISE.find((e) => e.icon === filter) : null;

  const clearFilter = () => {
    setFilter(null);
    window.dispatchEvent(new CustomEvent('skill-filter-clear'));
  };

  return (
    <section id="projects" className="section">
      <div className="section__label" data-reveal data-reveal-type="left">/PROJECTS.DIR</div>
      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: 'clamp(32px, 4.4vw, 56px)',
        fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.1, margin: '8px 0 14px'
      }} data-reveal data-reveal-type="up" data-comment-anchor="a78875ae98-h2-622-7">
        Selected work — <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>click</em> any folder to inspect.
      </h2>
      <p style={{
        color: 'var(--fg-mute)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
        letterSpacing: '.08em', marginBottom: filterModule ? '16px' : '32px'
      }} data-reveal data-reveal-type="up" data-reveal-delay="1">
        {filtered.length} {filtered.length === 1 ? 'ITEM' : 'ITEMS'} · {filterModule ? `FILTERED BY ${filterModule.title.toUpperCase()}` : 'SORTED BY RECENCY · TOTAL 12.4 MB'}
      </p>

      {filterModule &&
        <div className="filter-pill" role="status" aria-live="polite">
          <Icon name={filterModule.icon} size={13} />
          <span>Filtered by <b>{filterModule.title}</b></span>
          <button className="filter-pill__close" onClick={clearFilter} aria-label="Clear filter">×</button>
        </div>
      }

      <div className="projects-desktop" data-reveal data-reveal-type="window" data-comment-anchor="a60579f3f5-div-430-7">
        {filtered.length === 0 ?
          <div className="projects-empty">No projects tagged with {filterModule?.title} yet.</div> :
          filtered.map((p, i) =>
            <div key={p.id} data-reveal data-reveal-type="scale" data-reveal-delay={Math.min(i, 5)}>
              <FolderIcon project={p} onOpen={(proj) => { logEvent('project:open', { id: proj.id, title: proj.title }); setOpen(proj); }} />
            </div>
          )}
      </div>

      {open && <ProjectModal project={open} onClose={() => setOpen(null)} />}
    </section>);

}

/* =====================================================
   CONTACT
   ===================================================== */

function ContactWindow() {
  const c = useSiteContent().contact || {};
  const email = c.email || '';
  const phone = c.phone || '';
  const socials = Array.isArray(c.socials) ? c.socials : SOCIALS;
  const telHref = phone ? 'tel:' + phone.replace(/[^+\d]/g, '') : '';
  return (
    <section id="contact" className="section">
      <div className="section__label" data-reveal data-reveal-type="left">/CONTACT.SH</div>
      <div className="window contact-window" data-reveal data-reveal-type="window">
        <div className="window__titlebar">
          <div className="window__lights"><span /><span /><span /></div>
          <div className="window__title">~/mailbox/new_message — compose</div>
          <div className="window__meta">to: amrit</div>
        </div>
        <div className="window__body">
          <div className="contact-grid">
            <div>
              <h2 data-reveal data-reveal-type="up" dangerouslySetInnerHTML={rt(c.heading)} />
              <p data-reveal data-reveal-type="up" data-reveal-delay="1" dangerouslySetInnerHTML={rt(c.intro)} />
            </div>
            <div className="contact-card" data-reveal data-reveal-type="up" data-reveal-delay="2">
              <div>
                <label>REACH ME AT</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {email && <a href={'mailto:' + email}>{email}</a>}
                  {phone && <a href={telHref}>{phone}</a>}
                </div>
              </div>
              <div>
                <label>SOCIAL</label>
                <div className="links-row">
                  {socials.map((s, i) => (
                    <a key={s.label || i} href={s.href} target="_blank" rel="noreferrer"
                      onClick={() => logEvent('social:click', { label: s.label || s.icon, href: s.href })}>
                      <Icon name={s.icon} size={13} />
                      <span>{s.label}</span>
                    </a>
                  ))}
                </div>
              </div>
              {email && (
                <a href={'mailto:' + email} className="btn btn--primary contact-card__say-hello">
                  <span>Say hello via email.</span> <span className="btn__arrow">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>);

}

/* =====================================================
   DOCK / FOOTER
   ===================================================== */

function Dock() {
  const goTop = () => {
    const root = document.querySelector('.os-root');
    if (root) root.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <footer className="dock-wrap">
      <div className="dock-top">
        <div className="signal"><span className="dot" /> SESSION_ACTIVE</div>
        <button className="dock-go-top" onClick={goTop} title="Back to top">
          <Icon name="arrow-up" size={12} />
          <span>TOP</span>
        </button>
      </div>
      <div className="dock-rail">
        <div className="dock-copy"><span style={{ color: 'var(--accent)' }}>©</span> <span style={{ color: 'var(--accent)' }}>AMRIT DASH</span> <span style={{ color: 'var(--accent)' }}>2026</span></div>
        <div className="dock-built">BUILT WITH STACKS OF RED BULLS</div>
      </div>
    </footer>);

}

/* =====================================================
   APP ROOT
   ===================================================== */

const BOT_ICON_OPTIONS = [
  { value: 'brain-computer', label: 'Brain + Computer' },
  { value: 'brain', label: 'Brain (original)' },
  { value: 'brain14', label: 'Brain Outline' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'bot-ai', label: 'Bot AI' },
  { value: 'brain-pc2', label: 'Brain + Computer 2' },
  { value: 'brain-pc', label: 'Brain + Computer 3' },
];

const BOT_ICON_SRCS = {
  'brain-computer': 'assets/icons/brain-computer.svg',
  brain14: 'assets/icons/brain-14.svg',
  intelligence: 'https://www.svgrepo.com/download/173302/intelligence.svg',
  'bot-ai': 'https://www.svgrepo.com/download/416376/artificial-bot-intelligence.svg',
  'brain-pc2': 'https://www.svgrepo.com/download/416385/artificial-brain-computer-2.svg',
  'brain-pc': 'https://www.svgrepo.com/download/416386/artificial-brain-computer.svg',
};

function BotAvatarIcon({ icon, size = 24, iconColor = 'white' }) {
  if (icon === 'brain' || !icon) return <Icon name="brain" size={size} />;
  const src = BOT_ICON_SRCS[icon];
  if (!src) return <Icon name="brain" size={size} />;
  if (iconColor === 'accent') {
    return (
      <span style={{
        display: 'block', width: size, height: size,
        WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        backgroundColor: 'var(--accent)',
        filter: 'drop-shadow(0 0 6px var(--accent))',
      }} />
    );
  }
  return <img src={src} width={size} height={size} className="bot-avatar-img" alt="" />;
}

/* TWEAK_DEFAULTS is the base for the host-editable Tweaks panel; it's merged
   with CONTENT.cosmetics (published from /admin.html → Appearance) so admin
   edits actually move the live site. */
const _COSMETICS_BASE = /*EDITMODE-BEGIN*/{
  "accent": "#c8e856",
  "accentTone": 50,
  "scanlines": true,
  "cursorStyle": "ring",
  "cursorColor": "#c8e856",
  "botIcon": "brain-computer",
  "botIconColor": "accent",
  "type": "default",
  "fontScale": 100,
  "headingFont": "match",
  "tracking": "normal",
  "bgPattern": "grid",
  "wallpaperBrightness": 50,
  "wallpaperIntensity": 50,
  "wallpaperAnimSpeed": 50,
  "wallpaperRandomness": 40,
  "rainDirection": "down",
  "starSize": 50,
  "cometDensity": 40,
  "nightSkyBrightness": 50,
  "cometDirection": "right-down",
  "particleSize": 45,
  "particleDensity": 35,
  "particleOpacity": 70,
  "particleDrift": "up",
  "morphStyle": "spin",
  "numberFormat": "binary",
  "binaryFontSize": 50,
  "wallpaperUseAccent": true,
  "wallpaperColor": "",
  "vignetteIntensity": 45,
  "vignetteDirection": "center",
  "glow": 100,
  "radius": "soft"
} /*EDITMODE-END*/;

window.applyWallpaperCosmetics = function applyWallpaperCosmetics(root, cos, tonedAccent) {
  const schema = window.SHARED_SCHEMA || {};
  if (schema.applyWallpaperVarsToRoot) {
    schema.applyWallpaperVarsToRoot(root, cos, tonedAccent);
  } else {
    const bright = typeof cos.wallpaperBrightness === 'number' ? cos.wallpaperBrightness : 50;
    const intense = typeof cos.wallpaperIntensity === 'number' ? cos.wallpaperIntensity : 50;
    const useAccent = cos.wallpaperUseAccent !== false;
    const wpColor = useAccent ? tonedAccent : (cos.wallpaperColor || tonedAccent);
    root.style.setProperty('--wallpaper-color', wpColor);
    root.style.setProperty('--wp-opacity', (0.12 + (bright / 100) * 0.88).toString());
    root.style.setProperty('--wp-size', Math.round(56 - (intense / 100) * 44) + 'px');
    const fieldSize = (cos.bgPattern === 'starfield')
      ? Math.round(520 + (1 - intense / 100) * 480)
      : Math.round(480 - (intense / 100) * 360);
    root.style.setProperty('--wp-field-size', fieldSize + 'px');
  }
};

/* Canvas + CSS-anim wallpaper layer — cosmos, matrix rain, aurora, particles, pulse. */
function hexToRgb(hex) {
  try {
    const m = (hex || '#c8e856').replace('#', '');
    const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
    return { r: parseInt(f.slice(0, 2), 16), g: parseInt(f.slice(2, 4), 16), b: parseInt(f.slice(4, 6), 16) };
  } catch (e) { return { r: 200, g: 232, b: 86 }; }
}

function AnimatedWallpaper({ pattern, color, brightness, intensity, animSpeed, randomness, theme, cos }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const propsRef = useRef({});
  const schema = window.SHARED_SCHEMA || {};
  const cosInput = cos || {
    bgPattern: pattern,
    wallpaperBrightness: brightness,
    wallpaperIntensity: intensity,
    wallpaperAnimSpeed: animSpeed,
    wallpaperRandomness: randomness,
  };
  const wp = schema.resolveWallpaperCosmetics
    ? schema.resolveWallpaperCosmetics(cosInput)
    : { opacity: 0.7, starCount: 40, cometInterval: 8, columnCount: 30, speedSec: 20, speedMult: 1, particleCount: 20, rand: 0, cometIntervalVar: 0 };
  const canvasPatterns = schema.CANVAS_WALLPAPERS || ['cosmos', 'matrixrain'];
  const cssPatterns = schema.CSS_ANIM_WALLPAPERS || ['aurora', 'particles', 'pulse', 'smoke', 'morphgeo'];
  const isCanvas = canvasPatterns.includes(pattern);
  const isCssAnim = cssPatterns.includes(pattern);
  const active = isCanvas || isCssAnim;

  const rgb = hexToRgb(color);
  const alpha = wp.opacity || 0.7;
  propsRef.current = {
    pattern, brightness, intensity, animSpeed, randomness, theme, rgb, alpha, wp,
    speedMult: wp.speedMult || 1,
    rand: wp.rand || 0,
  };

  useEffect(() => {
    if (!isCanvas) return undefined;
    let cancelled = false;
    let teardown = null;

    const boot = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        requestAnimationFrame(boot);
        return;
      }

    const getProps = () => propsRef.current;
    const ctx = canvas.getContext('2d');
    let w = 0; let h = 0;
    let stars = [];
    let columns = [];
    let comets = [];
    let lastComet = 0;
    const glyphs = 'アイウエオカキクケコ0123456789ABCDEF<>{}[]';
    const speedMult = () => getProps().speedMult || 1;
    const randAmt = () => getProps().rand || 0;
    const intenseNorm = () => {
      const v = getProps().intensity;
      return (v == null ? 50 : v) / 100;
    };
    const ink = () => {
      const p = getProps();
      return (p.wp && schema.resolveWallpaperCanvasInk)
        ? schema.resolveWallpaperCanvasInk(p.theme, p.rgb, p.intensity, p.pattern)
        : { r: p.rgb.r, g: p.rgb.g, b: p.rgb.b, hi: [255, 255, 255], flash: 0.12, alphaBoost: 1 };
    };
    const vary = (base, spread) => base * (1 + (Math.random() - 0.5) * 2 * randAmt() * spread);
    const baseColSpeed = () => vary(1.2 + Math.random() * (2.5 + randAmt() * 4), 0.35);
    const baseTwSpd = () => vary(0.015 + Math.random() * 0.03, 0.5);

    const seedStars = () => {
      stars = [];
      const p = getProps();
      const n = p.wp.starCount || 40;
      const scale = p.wp.starScale || 1;
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (1.2 + Math.random() * (2.8 + randAmt() * 1.6)) * scale,
          tw: Math.random() * Math.PI * 2,
          twSpd: baseTwSpd(),
          bright: 0.35 + Math.random() * (0.65 + randAmt() * 0.25),
          respawn: Math.random() * 6000,
        });
      }
    };

    const seedColumns = () => {
      columns = [];
      const cols = getProps().wp.columnCount || 30;
      const gap = w / cols;
      for (let i = 0; i < cols; i++) {
        columns.push({
          x: i * gap + gap * 0.5 + (Math.random() - 0.5) * gap * randAmt() * 0.35,
          // Spread across the viewport so intensity/speed slider changes paint immediately.
          y: Math.random() * (h * (1.1 + randAmt() * 0.35)) - h * (0.12 + randAmt() * 0.28),
          speed: baseColSpeed(),
          len: 8 + Math.floor(Math.random() * (14 + randAmt() * 10)),
          chars: Array.from({ length: 24 }, () => glyphs[Math.floor(Math.random() * glyphs.length)]),
          swapAt: Math.random() * 120,
        });
      }
    };

    let rainDrops = [];
    let binaryRows = [];
    let nebulaBlobs = [];
    let lastLightning = 0;
    let lastFrame = 0;
    let nextStrikeGap = null;
    let lightningFlash = 0;
    let boltFade = 0;
    let lightningBolts = [];

    const seedRain = () => {
      rainDrops = [];
      const n = getProps().wp.rainDropCount || 120;
      for (let i = 0; i < n; i++) {
        rainDrops.push({
          x: Math.random() * w,
          y: Math.random() * h,
          len: 6 + Math.random() * (14 + intenseNorm() * 12),
          speed: vary(3.5 + Math.random() * (6 + intenseNorm() * 4), 0.45),
          w: 0.5 + Math.random() * (0.9 + intenseNorm() * 0.6),
        });
      }
    };

    const seedBinary = () => {
      binaryRows = [];
      const p = getProps();
      const rows = p.wp.binaryRowCount || 20;
      const rowH = h / rows;
      const glyphs = p.wp.numberGlyphs || '01';
      for (let i = 0; i < rows; i++) {
        binaryRows.push({
          y: i * rowH + rowH * 0.5,
          x: Math.random() * w,
          speed: vary(1.2 + Math.random() * (2.5 + intenseNorm() * 2), 0.4),
          len: 24 + Math.floor(Math.random() * (40 + intenseNorm() * 24)),
          chars: Array.from({ length: 64 }, () => glyphs[Math.floor(Math.random() * glyphs.length)]),
        });
      }
    };

    const seedNebula = () => {
      nebulaBlobs = [];
      const n = getProps().wp.nebulaBlobCount || 4;
      for (let i = 0; i < n; i++) {
        nebulaBlobs.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.min(w, h) * (0.16 + Math.random() * (0.24 + intenseNorm() * 0.12)),
          phase: Math.random() * Math.PI * 2,
          driftX: (Math.random() - 0.5) * (0.35 + randAmt() * 0.55),
          driftY: (Math.random() - 0.5) * (0.22 + randAmt() * 0.35),
        });
      }
    };

    const reseed = () => {
      const pat = getProps().pattern;
      if (pat === 'cosmos') seedStars();
      else if (pat === 'matrixrain') seedColumns();
      else if (pat === 'rain') seedRain();
      else if (pat === 'binarystream') seedBinary();
      else if (pat === 'nebula') seedNebula();
    };

    let seedSignature = '';
    const syncSeed = () => {
      const p = getProps();
      const sig = [
        p.pattern, p.wp.starCount, p.wp.starScale, p.wp.columnCount, p.wp.rainDropCount, p.wp.rainTilt,
        p.wp.binaryRowCount, p.wp.numberFormat, p.wp.binaryFontPx, p.wp.nebulaBlobCount,
        p.wp.cometDirection, p.wp.cometDensity,
      ].join('|');
      if (sig === seedSignature) return;
      seedSignature = sig;
      comets = [];
      reseed();
    };

    const measure = () => {
      const parent = canvas.parentElement;
      w = window.innerWidth || (parent && parent.clientWidth) || 800;
      h = window.innerHeight || (parent && parent.clientHeight) || 600;
      if (w < 2) w = window.innerWidth || 800;
      if (h < 2) h = window.innerHeight || 600;
      canvas.width = w;
      canvas.height = h;
      reseed();
    };

    const computeStrikeGap = () => {
      const baseMs = Math.max(240, ((getProps().wp.lightningInterval || 4) * 1000) / speedMult());
      return baseMs * (1 + (Math.random() - 0.5) * randAmt() * 0.55);
    };

    const lightningStrikeCount = () => getProps().wp.lightningStrikeCount || 1;
    const lightningBranchDepth = () => getProps().wp.lightningBranchDepth || 1;
    const lightningBranchChance = () => getProps().wp.lightningBranchChance != null ? getProps().wp.lightningBranchChance : 0.12;
    const lightningMaxBranches = () => getProps().wp.lightningMaxBranches || 2;

    const spawnLightningBranches = (startX, startY, depth, maxDepth, branchBudget, drift) => {
      const paths = [];
      const main = [{ x: startX, y: startY }];
      let px = startX;
      let py = startY;
      const jag = 18 + randAmt() * 24 + intenseNorm() * 18;
      const stepY = 12 + Math.random() * (28 + randAmt() * 22);
      const endY = startY + (h - startY) * (0.32 + Math.random() * (0.48 + randAmt() * 0.14));
      const branchProb = lightningBranchChance() * (0.55 + depth * 0.22);
      let branchesLeft = branchBudget;

      while (py < endY) {
        px += drift + (Math.random() - 0.5) * jag;
        py += stepY * (0.75 + Math.random() * 0.55);
        main.push({ x: px, y: py });

        if (depth < maxDepth && branchesLeft > 0 && Math.random() < branchProb) {
          branchesLeft -= 1;
          const childDrift = (Math.random() - 0.5) * jag * (1.2 + intenseNorm() * 0.8);
          const childBudget = Math.max(1, Math.ceil(branchesLeft * (0.35 + Math.random() * 0.45)));
          paths.push(...spawnLightningBranches(px, py, depth + 1, maxDepth, childBudget, childDrift));
        }
        if (py > h * 0.92) break;
      }
      paths.unshift({ points: main, depth });
      return paths;
    };

    const spawnLightningBoltAt = (sx) => spawnLightningBranches(
      sx,
      0,
      0,
      lightningBranchDepth(),
      lightningMaxBranches(),
      0,
    );

    const spawnLightningStrike = () => {
      const count = lightningStrikeCount();
      const bolts = [];
      const usedX = [];
      for (let i = 0; i < count; i++) {
        let sx;
        let tries = 0;
        do {
          sx = w * (0.04 + Math.random() * 0.92);
          tries += 1;
        } while (tries < 8 && usedX.some((ux) => Math.abs(ux - sx) < w * 0.08));
        usedX.push(sx);
        bolts.push(spawnLightningBoltAt(sx));
      }
      return bolts;
    };

    const drawLightningBranch = (branch, colors, aBase, alphaScale, maxDepth) => {
      const points = branch.points;
      const depth = branch.depth;
      if (!points || points.length < 2 || alphaScale <= 0) return;
      const depthScale = 1 - (depth / (maxDepth + 1)) * 0.42;
      const coreW = (2 + intenseNorm() * 2.4) * depthScale;
      const glowW = (5 + intenseNorm() * 5) * depthScale;
      const coreAlpha = (0.82 + intenseNorm() * 0.16) * depthScale;
      const glowAlpha = (0.45 + intenseNorm() * 0.32) * depthScale;
      ctx.beginPath();
      points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.strokeStyle = `rgba(${colors.hi[0]},${colors.hi[1]},${colors.hi[2]},${coreAlpha})`;
      ctx.lineWidth = coreW;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(${colors.r},${colors.g},${colors.b},0.95)`;
      ctx.shadowBlur = (16 + intenseNorm() * 20) * depthScale;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${colors.r},${colors.g},${colors.b},${glowAlpha})`;
      ctx.lineWidth = glowW;
      ctx.shadowBlur = (32 + intenseNorm() * 26) * depthScale;
      ctx.stroke();
    };

    const drawLightningBolts = (colors, aBase, alphaScale) => {
      if (!lightningBolts.length || alphaScale <= 0) return;
      const maxDepth = lightningBranchDepth();
      ctx.save();
      ctx.globalAlpha = aBase * alphaScale;
      lightningBolts.forEach((bolt) => {
        bolt.forEach((branch) => drawLightningBranch(branch, colors, aBase, alphaScale, maxDepth));
      });
      ctx.restore();
    };

    measure();
    let nextCometGap = (getProps().wp.cometInterval || 8) * 1000;
    lastComet = performance.now() - nextCometGap * 0.7;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener('resize', measure);

    const drawMoon = () => {
      const p = getProps();
      const sky = p.wp.skyBright != null ? p.wp.skyBright : 0.5;
      const mx = w * 0.82;
      const my = h * 0.14;
      const mr = Math.min(w, h) * 0.055;
      ctx.save();
      ctx.globalAlpha = p.alpha * (0.45 + sky * 0.55);
      const grd = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      grd.addColorStop(0, `rgba(255,255,240,${p.alpha})`);
      grd.addColorStop(0.7, `rgba(${p.rgb.r},${p.rgb.g},${p.rgb.b},${p.alpha * 0.35})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const cometSpawnPos = (dir) => {
      const r = randAmt();
      switch (dir) {
        case 'left-down':
          return {
            x: w * (0.45 + Math.random() * (0.55 + r * 0.12)),
            y: Math.random() * h * (0.3 + r * 0.15),
          };
        case 'right':
          return {
            x: -20 - Math.random() * w * 0.12,
            y: Math.random() * h,
          };
        case 'left':
          return {
            x: w + 20 + Math.random() * w * 0.12,
            y: Math.random() * h,
          };
        case 'up-right':
          return {
            x: Math.random() * w * (0.5 + r * 0.2),
            y: h * (0.55 + Math.random() * (0.4 + r * 0.1)),
          };
        case 'right-down':
        default:
          return {
            x: Math.random() * w * (0.5 + r * 0.2),
            y: Math.random() * h * (0.3 + r * 0.15),
          };
      }
    };

    const cometOffScreen = (c) => {
      const m = 120;
      if (c.vx > 0.05 && c.x > w + m) return true;
      if (c.vx < -0.05 && c.x < -m) return true;
      if (c.vy > 0.05 && c.y > h + m) return true;
      if (c.vy < -0.05 && c.y < -m) return true;
      return false;
    };

    const spawnComet = (now) => {
      if (now - lastComet < nextCometGap) return;
      lastComet = now;
      const iv = (getProps().wp.cometInterval || 8) * 1000;
      const varAmt = getProps().wp.cometIntervalVar || randAmt() * 0.55;
      nextCometGap = iv * (1 + (Math.random() - 0.5) * 2 * varAmt);
      const p = getProps();
      const dir = p.wp.cometDirection || 'right-down';
      const cvx = (p.wp.cometVecX != null ? p.wp.cometVecX : 1) * 4.5;
      const cvy = (p.wp.cometVecY != null ? p.wp.cometVecY : 0.35) * 4.5;
      const pos = cometSpawnPos(dir);
      comets.push({
        x: pos.x,
        y: pos.y,
        vx: vary(cvx + Math.random() * 2 * Math.sign(cvx || 1), 0.35),
        vy: vary(cvy + Math.random() * 1.2 * Math.sign(cvy || 1), 0.3),
        life: 1,
      });
    };

    const frame = (now) => {
      if (cancelled) return;
      syncSeed();
      const p = getProps();
      const activePattern = p.pattern;
      const colors = ink();
      const aBase = Math.min(1, p.alpha * colors.alphaBoost);
      const sm = speedMult();
      ctx.clearRect(0, 0, w, h);
      if (activePattern === 'cosmos') {
        drawMoon();
        stars.forEach((s) => {
          s.tw += s.twSpd * sm;
          if (randAmt() > 0.05) {
            s.respawn -= 16;
            if (s.respawn <= 0) {
              s.x = Math.random() * w;
              s.y = Math.random() * h;
              s.twSpd = baseTwSpd();
              s.respawn = 4000 + Math.random() * 8000 * (1 - randAmt() * 0.35);
            }
          }
          const flicker = 0.55 + Math.sin(s.tw + s.r) * 0.45;
          const a = aBase * s.bright * flicker;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${colors.r},${colors.g},${colors.b},${a})`;
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
          if (s.r > 2.2) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(${colors.hi[0]},${colors.hi[1]},${colors.hi[2]},${a * 0.25})`;
            ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        spawnComet(now);
        comets = comets.filter((c) => {
          c.x += c.vx * sm;
          c.y += c.vy * sm;
          c.life -= 0.012 * sm;
          if (c.life <= 0 || cometOffScreen(c)) return false;
          const len = 60 + (p.intensity == null ? 50 : p.intensity);
          const spd = Math.hypot(c.vx, c.vy) || 1;
          const tailX = c.x - (c.vx / spd) * len;
          const tailY = c.y - (c.vy / spd) * len;
          const grd = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
          grd.addColorStop(0, `rgba(${colors.hi[0]},${colors.hi[1]},${colors.hi[2]},${aBase * c.life * 0.9})`);
          grd.addColorStop(0.4, `rgba(${colors.r},${colors.g},${colors.b},${aBase * c.life * 0.5})`);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.strokeStyle = grd;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
          return true;
        });
      } else if (activePattern === 'matrixrain') {
        ctx.font = '14px "JetBrains Mono", monospace';
        columns.forEach((col) => {
          col.y += col.speed * sm;
          if (randAmt() > 0.05) {
            col.swapAt -= 1;
            if (col.swapAt <= 0) {
              const idx = Math.floor(Math.random() * col.chars.length);
              col.chars[idx] = glyphs[Math.floor(Math.random() * glyphs.length)];
              col.swapAt = 8 + Math.random() * (40 - randAmt() * 20);
            }
          }
          if (col.y - col.len * 16 > h) {
            col.y = Math.random() * -200 * (1 + randAmt() * 0.5);
            col.speed = baseColSpeed();
          }
          for (let j = 0; j < col.len; j++) {
            const cy = col.y - j * 16;
            if (cy < -20 || cy > h + 20) continue;
            const fade = j === 0 ? 1 : Math.max(0.08, 1 - j / col.len);
            ctx.fillStyle = j === 0
              ? `rgba(${colors.hi[0]},${colors.hi[1]},${colors.hi[2]},${aBase * fade})`
              : `rgba(${colors.r},${colors.g},${colors.b},${aBase * fade * 0.75})`;
            const ch = col.chars[(Math.floor(col.y / 16) + j) % col.chars.length];
            ctx.fillText(ch, col.x, cy);
          }
        });
      } else if (activePattern === 'rain') {
        ctx.lineCap = 'round';
        rainDrops.forEach((d) => {
          d.y += d.speed * sm;
          if (d.y > h + d.len) {
            d.y = -d.len - Math.random() * 40 * (1 + randAmt());
            d.x = Math.random() * w;
            if (randAmt() > 0.1) d.speed = vary(3.5 + Math.random() * (6 + intenseNorm() * 4), 0.45);
          }
          const tilt = getProps().wp.rainTilt != null ? getProps().wp.rainTilt : 1.5;
          ctx.strokeStyle = `rgba(${colors.r},${colors.g},${colors.b},${aBase * (0.55 + intenseNorm() * 0.35)})`;
          ctx.lineWidth = d.w;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + tilt, d.y + d.len);
          ctx.stroke();
        });
      } else if (activePattern === 'binarystream') {
        const fontPx = getProps().wp.binaryFontPx || 13;
        ctx.font = fontPx + 'px "JetBrains Mono", monospace';
        const charW = Math.max(7, Math.round(fontPx * 0.62));
        binaryRows.forEach((row) => {
          row.x += row.speed * sm;
          if (row.x > w + row.len * charW) row.x = -row.len * charW;
          for (let j = 0; j < row.len; j++) {
            const cx = row.x + j * charW;
            if (cx < -10 || cx > w + 10) continue;
            const fade = 0.25 + (j / row.len) * 0.75;
            ctx.fillStyle = j === row.len - 1
              ? `rgba(${colors.hi[0]},${colors.hi[1]},${colors.hi[2]},${aBase * fade * 0.9})`
              : `rgba(${colors.r},${colors.g},${colors.b},${aBase * fade * 0.65})`;
            ctx.fillText(row.chars[j % row.chars.length], cx, row.y);
          }
        });
      } else if (activePattern === 'nebula') {
        const lightNebula = p.theme === 'light';
        nebulaBlobs.forEach((b) => {
          b.phase += (0.004 + randAmt() * 0.006) * sm;
          b.x += b.driftX * sm;
          b.y += b.driftY * sm;
          if (b.x < -b.r) b.x = w + b.r * 0.5;
          if (b.x > w + b.r) b.x = -b.r * 0.5;
          if (b.y < -b.r) b.y = h + b.r * 0.5;
          if (b.y > h + b.r) b.y = -b.r * 0.5;
          const pulse = 0.72 + Math.sin(b.phase) * (0.28 + randAmt() * 0.12);
          const rad = b.r * pulse;
          const coreA = aBase * (lightNebula ? 0.56 + intenseNorm() * 0.34 : 0.46 + intenseNorm() * 0.3);
          const midA = aBase * (lightNebula ? 0.3 + intenseNorm() * 0.22 : 0.2 + intenseNorm() * 0.16);
          const edgeA = aBase * (lightNebula ? 0.12 + intenseNorm() * 0.1 : 0.07 + intenseNorm() * 0.06);
          const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rad);
          grd.addColorStop(0, `rgba(${colors.hi[0]},${colors.hi[1]},${colors.hi[2]},${coreA})`);
          grd.addColorStop(0.34, `rgba(${colors.r},${colors.g},${colors.b},${midA})`);
          grd.addColorStop(0.72, `rgba(${colors.r},${colors.g},${colors.b},${edgeA})`);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(b.x, b.y, rad, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activePattern === 'lightning') {
        const dt = lastFrame ? Math.min(48, now - lastFrame) : 16;
        lastFrame = now;

        const stormAlpha = aBase * (0.1 + intenseNorm() * 0.14);
        const stormGrd = ctx.createLinearGradient(0, 0, 0, h);
        stormGrd.addColorStop(0, `rgba(${colors.r},${colors.g},${colors.b},${stormAlpha * 0.42})`);
        stormGrd.addColorStop(0.35, `rgba(${colors.r},${colors.g},${colors.b},${stormAlpha * 0.12})`);
        stormGrd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = stormGrd;
        ctx.fillRect(0, 0, w, h);

        if (lightningFlash > 0) lightningFlash = Math.max(0, lightningFlash - dt / 340);
        if (boltFade > 0) boltFade = Math.max(0, boltFade - dt / 520);

        if (nextStrikeGap == null) nextStrikeGap = computeStrikeGap();
        const overdue = now - lastLightning > nextStrikeGap * 1.8;
        const strikeChance = Math.min(0.72, 0.1 + intenseNorm() * 0.38 + randAmt() * 0.18);
        if (now - lastLightning > nextStrikeGap && (Math.random() < strikeChance || overdue)) {
          lastLightning = now;
          nextStrikeGap = computeStrikeGap();
          const flashBoost = 0.75 + lightningStrikeCount() * 0.08;
          lightningFlash = Math.min(1, flashBoost);
          boltFade = 1;
          lightningBolts = spawnLightningStrike();
        }

        if (lightningFlash > 0) {
          ctx.save();
          const flashAlpha = colors.flash * lightningFlash * aBase * (0.85 + intenseNorm() * 0.35);
          ctx.fillStyle = `rgba(${colors.hi[0]},${colors.hi[1]},${colors.hi[2]},${flashAlpha})`;
          ctx.fillRect(0, 0, w, h);
          drawLightningBolts(colors, aBase, lightningFlash);
          ctx.restore();
        } else if (boltFade > 0) {
          drawLightningBolts(colors, aBase, boltFade * 0.55);
        }
      }
      animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
    teardown = () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    };

    boot();
    return () => {
      cancelled = true;
      if (teardown) teardown();
    };
  }, [pattern, isCanvas]);

  const animLayerKey = isCssAnim
    ? pattern + '-d' + wp.animDur + '-s' + wp.speedSec + '-r' + (randomness == null ? 40 : randomness)
      + (pattern === 'morphgeo' ? '-v' + (wp.morphVariant == null ? 0 : wp.morphVariant) + '-m' + (wp.morphStyle || 'spin') : '')
      + (pattern === 'particles'
        ? '-p' + wp.particleCount
          + '-z' + (wp.particleSize == null ? 45 : wp.particleSize)
          + '-o' + (wp.particleOpacity == null ? 70 : wp.particleOpacity)
          + '-d' + (wp.particleDrift || 'up')
        : '')
    : pattern;

  const canvasOpacity = (theme === 'light' && (pattern === 'nebula' || pattern === 'rain' || pattern === 'matrixrain'))
    ? Math.min(1, alpha * (pattern === 'rain' ? 1.08 : pattern === 'matrixrain' ? 1.06 : 1.1))
    : alpha;

  if (!active) return null;

  return (
    <>
      {isCanvas && (
        <canvas
          ref={canvasRef}
          className="wp-canvas"
          aria-hidden="true"
          data-theme={theme || 'dark'}
          data-wallpaper={pattern}
          style={{ opacity: canvasOpacity }}
        />
      )}
      {isCssAnim && (
        <div
          key={animLayerKey}
          className={'wp-anim wp-anim--' + pattern}
          aria-hidden="true"
          data-theme={theme || 'dark'}
          data-morph-variant={pattern === 'morphgeo' ? String(wp.morphVariant == null ? 0 : wp.morphVariant) : undefined}
          data-morph-style={pattern === 'morphgeo' ? (wp.morphStyle || 'spin') : undefined}
          style={{
            '--wp-opacity': String(alpha),
            '--wp-intense': String((intensity == null ? 50 : intensity) / 100),
            '--wp-particle-count': wp.particleCount,
            '--wp-particle-size': String(wp.particleSizeScale || 1),
            '--wp-p-opacity': String(wp.particleOpacityNorm == null ? 0.7 : wp.particleOpacityNorm),
            '--wp-p-drift-x': String(wp.particleDriftX == null ? 0 : wp.particleDriftX),
            '--wp-p-drift-y': String(wp.particleDriftY == null ? -1 : wp.particleDriftY),
            '--wp-anim-dur': wp.animDur,
            '--wp-speed': String(wp.speedSec),
            '--wp-rand': String(wp.rand),
            '--wp-rand-delay': wp.randDelay,
            '--wp-rand-dur': wp.randDurScale,
            '--wp-morph-phase': (wp.morphPhase || '0') + 'deg',
          }}
        />
      )}
    </>
  );
}
const TWEAK_DEFAULTS = (() => {
  const c = (CONTENT && CONTENT.cosmetics) || {};
  return {
    accent: typeof c.accent === 'string' ? c.accent : _COSMETICS_BASE.accent,
    accentTone: typeof c.accentTone === 'number' ? c.accentTone : _COSMETICS_BASE.accentTone,
    scanlines: c.scanlines == null ? _COSMETICS_BASE.scanlines : !!c.scanlines,
    cursorStyle: typeof c.cursorStyle === 'string' ? c.cursorStyle : _COSMETICS_BASE.cursorStyle,
    cursorColor: typeof c.cursorColor === 'string' ? c.cursorColor : _COSMETICS_BASE.cursorColor,
    botIcon: typeof c.botIcon === 'string' ? c.botIcon : _COSMETICS_BASE.botIcon,
    botIconColor: typeof c.botIconColor === 'string' ? c.botIconColor : _COSMETICS_BASE.botIconColor,
    type: typeof c.type === 'string' ? c.type : _COSMETICS_BASE.type,
    fontScale: typeof c.fontScale === 'number' ? c.fontScale : _COSMETICS_BASE.fontScale,
    headingFont: typeof c.headingFont === 'string' ? c.headingFont : _COSMETICS_BASE.headingFont,
    tracking: typeof c.tracking === 'string' ? c.tracking : _COSMETICS_BASE.tracking,
    bgPattern: typeof c.bgPattern === 'string' ? c.bgPattern : _COSMETICS_BASE.bgPattern,
    wallpaperBrightness: typeof c.wallpaperBrightness === 'number' ? c.wallpaperBrightness : _COSMETICS_BASE.wallpaperBrightness,
    wallpaperIntensity: typeof c.wallpaperIntensity === 'number' ? c.wallpaperIntensity : _COSMETICS_BASE.wallpaperIntensity,
    wallpaperAnimSpeed: typeof c.wallpaperAnimSpeed === 'number' ? c.wallpaperAnimSpeed : _COSMETICS_BASE.wallpaperAnimSpeed,
    wallpaperRandomness: typeof c.wallpaperRandomness === 'number' ? c.wallpaperRandomness : _COSMETICS_BASE.wallpaperRandomness,
    rainDirection: typeof c.rainDirection === 'string' ? c.rainDirection : _COSMETICS_BASE.rainDirection,
    starSize: typeof c.starSize === 'number' ? c.starSize : _COSMETICS_BASE.starSize,
    cometDensity: typeof c.cometDensity === 'number' ? c.cometDensity : _COSMETICS_BASE.cometDensity,
    nightSkyBrightness: typeof c.nightSkyBrightness === 'number' ? c.nightSkyBrightness : _COSMETICS_BASE.nightSkyBrightness,
    cometDirection: typeof c.cometDirection === 'string' ? c.cometDirection : _COSMETICS_BASE.cometDirection,
    particleSize: typeof c.particleSize === 'number' ? c.particleSize : _COSMETICS_BASE.particleSize,
    particleDensity: typeof c.particleDensity === 'number' ? c.particleDensity : _COSMETICS_BASE.particleDensity,
    particleOpacity: typeof c.particleOpacity === 'number' ? c.particleOpacity : _COSMETICS_BASE.particleOpacity,
    particleDrift: typeof c.particleDrift === 'string' ? c.particleDrift : _COSMETICS_BASE.particleDrift,
    morphStyle: typeof c.morphStyle === 'string' ? c.morphStyle : _COSMETICS_BASE.morphStyle,
    numberFormat: typeof c.numberFormat === 'string' ? c.numberFormat : _COSMETICS_BASE.numberFormat,
    binaryFontSize: typeof c.binaryFontSize === 'number' ? c.binaryFontSize : _COSMETICS_BASE.binaryFontSize,
    wallpaperUseAccent: c.wallpaperUseAccent == null ? _COSMETICS_BASE.wallpaperUseAccent : !!c.wallpaperUseAccent,
    wallpaperColor: typeof c.wallpaperColor === 'string' ? c.wallpaperColor : _COSMETICS_BASE.wallpaperColor,
    vignetteIntensity: typeof c.vignetteIntensity === 'number' ? c.vignetteIntensity : _COSMETICS_BASE.vignetteIntensity,
    vignetteDirection: typeof c.vignetteDirection === 'string' ? c.vignetteDirection : _COSMETICS_BASE.vignetteDirection,
    glow: typeof c.glow === 'number' ? c.glow : _COSMETICS_BASE.glow,
    radius: typeof c.radius === 'string' ? c.radius : _COSMETICS_BASE.radius,
  };
})();

const _SCHEMA = (typeof window !== 'undefined' && window.SHARED_SCHEMA) || {};
const ACCENT_OPTIONS = ["#c8e856", "#33ff66", "#ff7a3d", "#7a9eff", "#ffd25a", "#e85c89", "#9d7cff"];
const CURSOR_COLOR_OPTIONS = ["#ffffff", "#c8e856", "#33ff66", "#ff7a3d", "#7a9eff", "#ffd25a", "#ff4466"];
const TYPE_OPTIONS = _SCHEMA.FONT_TYPES || ['default', 'editorial', 'pixel', 'modern', 'mono', 'slab', 'rounded', 'retro'];
const HEADING_FONT_OPTIONS = _SCHEMA.HEADING_FONTS || ['match', 'serif', 'editorial', 'grotesk', 'mono', 'pixel', 'slab', 'rounded', 'retro', 'display'];
const TRACKING_OPTIONS = ['tight', 'normal', 'wide'];
const BG_PATTERN_OPTIONS = (_SCHEMA.BG_PATTERNS || ['grid', 'dots', 'scan', 'starfield', 'crosshatch', 'hex', 'circuits', 'waves', 'diagonal', 'brick', 'noise', 'aurora', 'cosmos', 'matrixrain', 'particles', 'pulse', 'none']).map((v) => {
  const meta = (_SCHEMA.BG_PATTERN_META || {})[v];
  const label = meta ? meta.label + (meta.animated ? ' ✦' : '') : v;
  return { value: v, label };
});
const VIGNETTE_DIRECTION_OPTIONS = (_SCHEMA.VIGNETTE_DIRECTIONS || ['none', 'center', 'all', 'top', 'bottom', 'left', 'right', 'horizontal', 'vertical', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).map((v) => ({ value: v, label: v === 'none' ? 'None' : v.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }));
const CURSOR_STYLE_OPTIONS = _SCHEMA.CURSOR_STYLES || ['ring', 'pixel', 'dot', 'cross', 'halo', 'outline', 'bold', 'diamond', 'trail', 'square', 'beam'];
const RADIUS_OPTIONS = ['sharp', 'soft', 'round'];

function App() {
  // Splash on every normal page load (booted resets on refresh — no localStorage skip).
  // Admin live-preview (?adminpreview) skips splash by default; ?showboot=1 replays it.
  const [booted, setBooted] = useState(() => {
    try {
      const params = new URLSearchParams(location.search);
      const isPreview = params.has('adminpreview');
      const showBootInPreview = params.get('showboot') === '1';
      if (isPreview) return !showBootInPreview;
      return false;
    } catch (e) { return false; }
  });
  // Live content: starts from the synchronous snapshot, then streams from
  // Firestore content/published so edits published in the admin appear here
  // without a refresh.
  const [liveContent, setLiveContent] = useState(CONTENT);
  useEffect(() => {
    const unsub = window.subscribeContent ? window.subscribeContent((c) => setLiveContent(c)) : null;
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);
  // Expose the custom-icon library so the standalone Icon() resolver can render
  // uploaded SVGs, and keep it fresh as live content streams in (admin preview).
  useEffect(() => { window.__SKILL_ICONS = (liveContent && liveContent.icons) || []; }, [liveContent]);

  // Preview iframe always reflects the published "Default mode"; real visitors
  // keep a choice only once they've explicitly toggled (amritos.theme.explicit),
  // otherwise they land on the published default. This is what makes the admin's
  // Default-mode switch actually move the live site + preview.
  const isPreview = (() => { try { return new URLSearchParams(location.search).has('adminpreview'); } catch (e) { return false; } })();
  const [theme, setTheme] = useState(() => {
    const cosm = ((CONTENT && CONTENT.cosmetics && CONTENT.cosmetics.theme) === 'light') ? 'light' : 'dark';
    if (isPreview) return cosm;
    const explicit = localStorage.getItem('amritos.theme.explicit') === '1';
    const stored = localStorage.getItem('amritos.theme');
    if (explicit && stored) return stored === 'light' ? 'light' : 'dark';
    return cosm;
  });
  // Visitor-initiated toggle: records an explicit preference so it sticks across
  // future default changes (preview ignores the flag so the admin always sees the default).
  const chooseTheme = useCallback((next) => {
    try { localStorage.setItem('amritos.theme.explicit', '1'); } catch (e) { }
    setTheme(next);
  }, []);
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const active = useActiveSection(['intro', 'about', 'expertise', 'work', 'projects', 'contact']);
  useReveal();

  // Appearance follows the live snapshot: push cosmetic fields into tweak state so
  // CustomCursor/bot icon re-render; DOM vars are also synced via applyCosmeticsToRoot.
  const liveCos = liveContent && liveContent.cosmetics;
  const liveCosKey = liveCos ? JSON.stringify(liveCos) : '';
  const resolveLiveCos = (raw) => (_SCHEMA.resolveEffectiveCosmetics ? _SCHEMA.resolveEffectiveCosmetics(raw) : raw);
  const effectiveLiveCos = liveCos ? resolveLiveCos(liveCos) : null;
  const uiCos = effectiveLiveCos || t;
  useEffect(() => {
    if (!liveCos) return;
    const merged = resolveLiveCos(liveCos);
    const next = {};
    ['accent', 'accentTone', 'scanlines', 'cursorStyle', 'cursorColor', 'botIcon', 'botIconColor', 'type', 'fontScale',
      'headingFont', 'tracking', 'bgPattern', 'wallpaperBrightness', 'wallpaperIntensity', 'wallpaperAnimSpeed', 'wallpaperRandomness',
      'rainDirection', 'starSize', 'cometDensity', 'nightSkyBrightness', 'cometDirection',
      'particleSize', 'particleDensity', 'particleOpacity', 'particleDrift', 'morphStyle', 'numberFormat', 'binaryFontSize',
      'wallpaperUseAccent', 'wallpaperColor', 'vignetteIntensity', 'vignetteDirection', 'glow', 'radius'].forEach((k) => {
        if (merged[k] !== undefined) next[k] = merged[k];
      });
    setTweak(next);
    if (merged.theme) {
      const explicit = localStorage.getItem('amritos.theme.explicit') === '1';
      if (isPreview || !explicit) setTheme(merged.theme === 'light' ? 'light' : 'dark');
    }
  }, [liveCosKey, isPreview]);

  // Log a page view on every load (skip the admin's live-preview iframe so
  // editing doesn't inflate counts). Tracked regardless of geo — the event
  // always carries a timestamp; location is best-effort on top.
  // Also warm the bot proxy now so the first chat reply isn't a cold start.
  useEffect(() => {
    let preview = false;
    try { preview = new URLSearchParams(location.search).has('adminpreview'); } catch (e) { }
    if (!preview) {
      logEvent('view');
      try { if (window.FUNCTIONS_BASE) fetch(window.FUNCTIONS_BASE + '/warmup', { mode: 'cors' }).catch(() => { }); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('amritos.theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.boot = booted ? 'done' : 'active';
    return () => { delete document.documentElement.dataset.boot; };
  }, [booted]);

  // (The fixed menubar is now full-width — the scroll container .os-root sits
  // below it, so no scrollbar-width compensation is needed.)

  // Prefer live snapshot (preview postMessage + published onSnapshot) over tweak
  // state — tweak sync runs one frame later and would briefly revert wallpaper/vignette.
  const applyCosmeticsKey = effectiveLiveCos ? liveCosKey : JSON.stringify(t);
  useEffect(() => {
    if (!window.applyCosmeticsToRoot) return;
    window.applyCosmeticsToRoot(uiCos, { theme, forceTheme: isPreview });
  }, [applyCosmeticsKey, theme, isPreview, uiCos]);

  const handleBootDone = useCallback(() => {
    setBooted(true);
  }, []);

  const navActive = active === 'expertise' ? 'about' : active;

  // CV: pick the theme-matching variant so the file mirrors the page they came from.
  // Sources from content.media so admin uploads replace the link without code changes.
  const media = (liveContent && liveContent.media) || {};
  const cvVariant = theme === 'dark' ? 'dark' : 'light';
  const cvMedia = cvVariant === 'dark' ? media.cvDark : media.cvLight;
  const cvUrl = (cvMedia && cvMedia.url)
    || (theme === 'dark' ? 'assets/Amrit Dash - CV 2025 (Dark).pdf' : 'assets/Amrit Dash - CV 2025.pdf');
  const cvFileName = (cvMedia && cvMedia.name) || 'Amrit-Dash-CV.pdf';

  const [cvThemeTipNonce, setCvThemeTipNonce] = useState(0);
  const showCvThemeTip = useCallback(() => setCvThemeTipNonce((n) => n + 1), []);
  const dismissCvThemeTip = useCallback(() => setCvThemeTipNonce(0), []);

  const { TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakRadio, TweakSelect, TweakSlider } = window;

  const wpCos = uiCos;
  const wpTint = wpCos.wallpaperUseAccent !== false
    ? (window.toneAccent ? window.toneAccent(wpCos.accent, wpCos.accentTone) : wpCos.accent)
    : (wpCos.wallpaperColor || wpCos.accent);

  return (
    <ContentCtx.Provider value={liveContent}>
      {!booted && <BootSequence onDone={handleBootDone} />}
      <AnimatedWallpaper
        pattern={wpCos.bgPattern || 'grid'}
        color={wpTint}
        brightness={wpCos.wallpaperBrightness == null ? 50 : wpCos.wallpaperBrightness}
        intensity={wpCos.wallpaperIntensity == null ? 50 : wpCos.wallpaperIntensity}
        animSpeed={wpCos.wallpaperAnimSpeed == null ? 50 : wpCos.wallpaperAnimSpeed}
        randomness={wpCos.wallpaperRandomness == null ? 40 : wpCos.wallpaperRandomness}
        theme={theme}
        cos={wpCos}
      />
      {booted &&
      <div className="os-root" data-comment-anchor="e902a98e34-div-780-7">
        <MenuBar
          theme={theme}
          active={navActive}
          cvThemeTipNonce={cvThemeTipNonce}
          onCvThemeTipDismiss={dismissCvThemeTip}
          onToggleTheme={() => chooseTheme(theme === 'dark' ? 'light' : 'dark')} />

        <Hero botIcon={uiCos.botIcon} botIconColor={uiCos.botIconColor} />
        <AboutWindow cvUrl={cvUrl} cvVariant={cvVariant} cvFileName={cvFileName} onCvDownloaded={showCvThemeTip} />
        <ExpertiseWindow />
        <ExperienceFolder />
        <ProjectsDesktop />
        <ContactWindow />
        <Dock />
      </div>}
      {TweaksPanel &&
        <TweaksPanel title="amrit.os tweaks">
          <TweakSection label="Theme" />
          <TweakRadio label="Mode" value={theme} options={['dark', 'light']}
            onChange={(v) => setTheme(v)} />
          <TweakColor label="Accent (swatch)" value={t.accent} options={ACCENT_OPTIONS}
            onChange={(v) => setTweak('accent', v)} />
          <TweakColor label="Accent (custom)" value={t.accent}
            onChange={(v) => setTweak('accent', v)} />
          <TweakSlider label="Accent brightness" value={t.accentTone == null ? 50 : t.accentTone} min={0} max={100} step={5} unit=""
            onChange={(v) => setTweak('accentTone', v)} />
          <TweakSection label="Typography" />
          <TweakSelect label="Font set" value={t.type} options={TYPE_OPTIONS}
            onChange={(v) => setTweak('type', v)} />
          <TweakSelect label="Heading font" value={t.headingFont || 'match'} options={HEADING_FONT_OPTIONS}
            onChange={(v) => setTweak('headingFont', v)} />
          <TweakRadio label="Tracking" value={t.tracking || 'normal'} options={TRACKING_OPTIONS}
            onChange={(v) => setTweak('tracking', v)} />
          <TweakSlider label="Font size" value={t.fontScale} min={85} max={120} step={5} unit="%"
            onChange={(v) => setTweak('fontScale', v)} />
          <TweakSection label="Background" />
          <TweakSelect label="Wallpaper" value={t.bgPattern || 'grid'} options={BG_PATTERN_OPTIONS}
            onChange={(v) => setTweak('bgPattern', v)} />
          <TweakSlider label="Wallpaper brightness" value={t.wallpaperBrightness == null ? 50 : t.wallpaperBrightness} min={0} max={100} step={5} unit=""
            onChange={(v) => setTweak('wallpaperBrightness', v)} />
          <TweakSlider label="Wallpaper intensity" value={t.wallpaperIntensity == null ? 50 : t.wallpaperIntensity} min={0} max={100} step={5} unit=""
            onChange={(v) => setTweak('wallpaperIntensity', v)} />
          {!!((_SCHEMA.BG_PATTERN_META || {})[t.bgPattern || 'grid'] || {}).animated && (
            <>
              <TweakSlider label="Animation speed" value={t.wallpaperAnimSpeed == null ? 50 : t.wallpaperAnimSpeed} min={0} max={100} step={5} unit=""
                onChange={(v) => setTweak('wallpaperAnimSpeed', v)} />
              <TweakSlider label="Randomness" value={t.wallpaperRandomness == null ? 40 : t.wallpaperRandomness} min={0} max={100} step={5} unit=""
                onChange={(v) => setTweak('wallpaperRandomness', v)} />
            </>
          )}
          <TweakSlider label="Vignette intensity" value={t.vignetteIntensity == null ? 45 : t.vignetteIntensity} min={0} max={100} step={5} unit=""
            onChange={(v) => setTweak('vignetteIntensity', v)} />
          <TweakSelect label="Vignette direction" value={t.vignetteDirection || 'center'} options={VIGNETTE_DIRECTION_OPTIONS}
            onChange={(v) => setTweak('vignetteDirection', v)} />
          <TweakSection label="Bot Icon" />
          <TweakSelect label="Icon style" value={t.botIcon || 'brain'}
            options={BOT_ICON_OPTIONS.map(o => o.value)}
            onChange={(v) => setTweak('botIcon', v)} />
          <TweakRadio label="Icon color" value={t.botIconColor || 'white'}
            options={['white', 'accent']}
            onChange={(v) => setTweak('botIconColor', v)} />
          <TweakSection label="Effects" />
          <TweakSlider label="Accent glow" value={t.glow == null ? 100 : t.glow} min={0} max={160} step={10} unit="%"
            onChange={(v) => setTweak('glow', v)} />
          <TweakRadio label="Corners" value={t.radius || 'soft'} options={RADIUS_OPTIONS}
            onChange={(v) => setTweak('radius', v)} />
          <TweakToggle label="CRT scanlines" value={t.scanlines}
            onChange={(v) => setTweak('scanlines', v)} />
          <TweakSelect label="Cursor type" value={t.cursorStyle || 'ring'}
            options={CURSOR_STYLE_OPTIONS}
            onChange={(v) => setTweak('cursorStyle', v)} />
          <TweakColor label="Cursor color" value={t.cursorColor || t.accent}
            options={CURSOR_COLOR_OPTIONS}
            onChange={(v) => setTweak('cursorColor', v)} />
        </TweaksPanel>
      }
      {booted && <CustomCursor cursorStyle={uiCos.cursorStyle || 'ring'} />}
    </ContentCtx.Provider>);
}

/* =====================================================
   CUSTOM CURSOR
   ===================================================== */

function CustomCursor({ cursorStyle }) {
  const primaryRef = useRef(null);
  const trailRef = useRef(null);
  // No custom cursor on touch / no-hover devices — it would sit frozen and jump
  // on tap. Native cursor is restored via CSS for these devices too.
  const isTouch = typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(hover: none), (pointer: coarse)').matches;

  useEffect(() => {
    if (isTouch) return;
    const primary = primaryRef.current;
    const trail = trailRef.current;
    if (!primary) return;

    let mx = -200, my = -200;
    let tx = -200, ty = -200;
    let raf;

    const onMove = (e) => { mx = e.clientX; my = e.clientY; };

    // ring hover expand
    const onEnter = () => { if (trail) trail.classList.add('cursor-ring--active'); };
    const onLeave = () => { if (trail) trail.classList.remove('cursor-ring--active'); };
    const SEL = 'a, button, [role="button"], input, textarea, .folder-icon';
    document.querySelectorAll(SEL).forEach((el) => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    const animate = () => {
      // pixel cursor anchors at 2,2 to match hotspot — others center
      const offset = cursorStyle === 'pixel' ? 0 : 0;
      const spin = cursorStyle === 'diamond' ? ' rotate(45deg)' : '';
      primary.style.transform = `translate(${mx + offset}px, ${my + offset}px)${spin}`;
      if (trail) {
        tx += (mx - tx) * 0.12;
        ty += (my - ty) * 0.12;
        trail.style.transform = `translate(${tx}px, ${ty}px)`;
      }
      raf = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(animate);
    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [cursorStyle]);

  if (isTouch) return null;

  if (cursorStyle === 'ring') {
    return (
      <>
        <div className="cursor-dot" ref={primaryRef} />
        <div className="cursor-ring" ref={trailRef} />
      </>);
  }

  if (cursorStyle === 'pixel') {
    return (
      <div className="cursor-pixel" ref={primaryRef}>
        <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: 'block', marginLeft: '-2px', marginTop: '-2px' }}>
          <path d="M2 2 L2 15 L6.5 11.5 L9.5 18 L13 16.5 L10 10.5 L15.5 10.5 Z"
            fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" />
        </svg>
      </div>);
  }

  if (cursorStyle === 'dot') {
    return <div className="cursor-bigdot" ref={primaryRef} />;
  }

  if (cursorStyle === 'cross') {
    return (
      <div className="cursor-cross" ref={primaryRef}>
        <span className="cursor-cross-dot" />
      </div>);
  }

  if (cursorStyle === 'halo') {
    return <div className="cursor-halo" ref={primaryRef} />;
  }

  if (cursorStyle === 'outline') {
    return <div className="cursor-outline" ref={primaryRef} />;
  }

  if (cursorStyle === 'bold') {
    return <div className="cursor-bold" ref={primaryRef} />;
  }

  if (cursorStyle === 'diamond') {
    return <div className="cursor-diamond" ref={primaryRef} />;
  }

  if (cursorStyle === 'square') {
    return <div className="cursor-square" ref={primaryRef} />;
  }

  if (cursorStyle === 'beam') {
    return <div className="cursor-beam" ref={primaryRef} />;
  }

  if (cursorStyle === 'trail') {
    return (
      <>
        <div className="cursor-trail" ref={primaryRef} />
        <div className="cursor-trail cursor-trail__ghost" ref={trailRef} />
      </>);
  }

  // fallback — ring
  return (
    <>
      <div className="cursor-dot" ref={primaryRef} />
      <div className="cursor-ring" ref={trailRef} />
    </>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);