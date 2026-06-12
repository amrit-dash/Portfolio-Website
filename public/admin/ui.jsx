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
    case 'palette': return (<svg {...p}><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.7 0 2.5-1.3 2.5-2.5 0-.6-.2-1.1-.5-1.5-.3-.4-.5-.9-.5-1.5 0-1.1.9-2 2-2h1.8c2.8 0 5-2.2 5-5 0-4.4-4.4-7.5-9.8-7.5z"/><circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="13.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/></svg>);
    case 'bot': return (<svg {...p}><rect x="4" y="7" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.3" fill="currentColor" stroke="none"/><path d="M12 3v4"/><circle cx="12" cy="2.6" r="1" fill="currentColor" stroke="none"/></svg>);
    case 'sync': return (<svg {...p}><path d="M21 12a9 9 0 01-9 9 9 9 0 01-7.5-4"/><path d="M3 12a9 9 0 019-9 9 9 0 017.5 4"/><path d="M21 3v4h-4"/><path d="M3 21v-4h4"/></svg>);
    case 'settings': return (<svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/></svg>);
    case 'plus': return (<svg {...p}><path d="M12 5v14M5 12h14"/></svg>);
    case 'trash': return (<svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>);
    case 'grip': return (<svg {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/></svg>);
    case 'gripH': return (<svg {...p}><circle cx="5" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="2" fill="currentColor" stroke="none"/></svg>);
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
    // 'globe' — world icon (general use).
    case 'globe': return (<svg {...p}><circle cx="12" cy="12" r="9"/><path d="M2 12h20"/><path d="M12 3a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z"/></svg>);
    // 'publish' — browser window + upload arrow (filled); used for Publish (draft → live site).
    case 'publish': return (<svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" stroke="none" style={{ display: 'block' }}><path d="M9.967 8.193L5 13h3v6h4v-6h3L9.967 8.193zM18 1H2C.9 1 0 1.9 0 3v12c0 1.1.9 2 2 2h4v-2H2V6h16v9h-4v2h4c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zM2.5 4.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm2 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM18 4H6V3h12.019L18 4z"/></svg>);
    case 'rocket': return (<svg {...p}><path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2 2 0 00-3 .8z"/><path d="M9 13l-2-2c1-4 4-7 11-8-1 7-4 10-8 11z"/><circle cx="15" cy="9" r="1.4"/></svg>);
    case 'save': return (<svg {...p}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>);
    case 'pencil': return (<svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>);
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
    /* Social-link glyphs — mirror the site's set (public/app.jsx Icon) so the
       Contact editor's link rows render the same brand marks the live site shows. */
    case 'github': return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.69-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.93 10.93 0 015.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55C20.21 21.38 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>);
    case 'linkedin': return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v15H.22V8zm7.62 0H12v2.06h.06c.62-1.18 2.13-2.43 4.39-2.43 4.7 0 5.56 3.09 5.56 7.11V23h-4.6v-7.07c0-1.69-.03-3.86-2.36-3.86-2.36 0-2.72 1.85-2.72 3.75V23H7.84V8z"/></svg>);
    case 'instagram': return (<svg {...p}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".9" fill="currentColor" stroke="none"/></svg>);
    case 'whatsapp': return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/></svg>);
    case 'email': return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>);
    default: return <svg {...p} />;
  }
}

/* Resolve an expertise/skill icon: a custom uploaded SVG (content.icons) renders
   inline; otherwise fall back to the built-in AdminIcon glyph. */
function SkillIcon({ name, size = 16, icons }) {
  const custom = Array.isArray(icons) ? icons.find((ic) => ic && ic.id === name) : null;
  if (custom && custom.svg) {
    return <span className="skillicon" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: custom.svg }} />;
  }
  return <AdminIcon name={name} size={size} />;
}

/* ---------- Layout ---------- */
function PageHead({ eyebrow, title, children, actions }) {
  return (
    <div className="phead">
      <div className="phead__row">
        <div className="phead__main">
          {eyebrow && <div className="phead__eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
        </div>
        {actions && <div className="phead__actions">{actions}</div>}
      </div>
      {children && <p>{children}</p>}
    </div>
  );
}

/* Markdown renderer — shared module (md.jsx). Capture impl before defining a
   local wrapper; a global `function mdInline` would overwrite window.mdInline. */
const _mdInlineImpl = window.mdInline;
function renderMd(text) {
  const fn = _mdInlineImpl;
  return (typeof fn === 'function' ? fn : (t) => [String(t == null ? '' : t)])(text);
}

function Panel({ title, sub, actions, children, tight, className }) {
  return (
    <div className={'panel' + (className ? ' ' + className : '')}>
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

function Btn({ kind, sm, icon, children, onClick, type, disabled, title, className }) {
  const cls = ['btn'];
  if (kind === 'primary') cls.push('btn--primary');
  if (kind === 'ghost') cls.push('btn--ghost');
  if (kind === 'danger') cls.push('btn--danger');
  if (sm) cls.push('btn--sm');
  if (className) cls.push(className);
  return (
    <button className={cls.join(' ')} onClick={onClick} type={type || 'button'} disabled={disabled} title={title}>
      {icon && <AdminIcon name={icon} size={sm ? 13 : 15} />}
      {children}
    </button>
  );
}

/* ---------- Form fields ---------- */
function Field({ label, hint, req, children, className = '' }) {
  return (
    <div className={'field' + (className ? ' ' + className : '')}>
      {label && <label>{label}{req && <span className="req">*</span>}{hint && <span style={{ marginLeft: 'auto', color: 'var(--fg-mute)', letterSpacing: 0 }}>{hint}</span>}</label>}
      {children}
    </div>
  );
}

/* Coerce any stored value to a safe string for controlled text inputs. Objects
   (e.g. a stray SyntheticEvent saved via an overridden onChange) become ''. */
function inputStr(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  return '';
}

function Input({ value, onChange, placeholder, ...rest }) {
  const v = inputStr(value);
  return (
    <input
      className="inp"
      {...rest}
      value={v}
      placeholder={placeholder}
      onChange={(e) => { if (onChange) onChange(e.target.value); }}
    />
  );
}

/* Grip handle for labeled rows — invisible label spacer matches DelBtn / Field height */
function GripHandle({ gripProps, className = '', stopPropagation = true }) {
  const props = { ...gripProps, title: gripProps?.title || 'Drag to reorder' };
  if (stopPropagation) {
    const prevClick = props.onClick;
    props.onClick = (e) => { e.stopPropagation(); prevClick?.(e); };
  }
  return (
    <div className="field field--grip">
      <label aria-hidden="true">&nbsp;</label>
      <span className={'item__grip' + (className ? ' ' + className : '')} {...props}>
        <AdminIcon name="grip" size={16} />
      </span>
    </div>
  );
}

/* Unified reorder row — grip column + separator + body (+ optional right actions). */
function ReorderPanel({ gripProps, children, className = '', actions }) {
  const gripClick = gripProps?.onClick;
  const grip = gripProps ? (
    <span
      className="reorder-panel__grip"
      {...gripProps}
      title={gripProps.title || 'Drag to reorder'}
      onClick={(e) => { e.stopPropagation(); gripClick?.(e); }}
    >
      <AdminIcon name="grip" size={16} />
    </span>
  ) : null;
  return (
    <div className={'reorder-panel' + (className ? ' ' + className : '')}>
      {grip}
      {grip && <span className="reorder-panel__sep" aria-hidden="true" />}
      <div className="reorder-panel__body">{children}</div>
      {actions && <div className="reorder-panel__actions">{actions}</div>}
    </div>
  );
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
  return (
    <textarea
      className={'ta' + (mono ? ' mono' : '')}
      {...rest}
      rows={rows}
      value={inputStr(value)}
      placeholder={placeholder}
      onChange={(e) => { if (onChange) onChange(e.target.value); }}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="sel" value={value == null ? '' : String(value)} onChange={(e) => { if (onChange) onChange(e.target.value); }}>
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
function TagInput({ value = [], onChange, placeholder = 'Add tag + Enter', reorderable = false }) {
  const [draft, setDraft] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const list = Array.isArray(value) ? value : [];
  const add = () => { const t = draft.trim(); if (t && !list.includes(t)) onChange([...list, t]); setDraft(''); };

  const clearDrag = () => { setDragIdx(null); setOverIdx(null); };

  const handleDrop = (to) => {
    if (!reorderable || dragIdx === null || dragIdx === to) { clearDrag(); return; }
    const next = list.slice();
    const [moved] = next.splice(dragIdx, 1);
    next.splice(to, 0, moved);
    onChange(next);
    clearDrag();
  };

  return (
    <div className={'tags' + (reorderable ? ' tags--reorder' : '')} onClick={(e) => { if (e.target.classList.contains('tags')) e.currentTarget.querySelector('input').focus(); }}>
      {list.map((t, i) => (
        <span key={t + ':' + i}
          className={'tag' + (reorderable ? ' tag--reorder' : '') + (reorderable && dragIdx === i ? ' dragging' : '') + (reorderable && overIdx === i && dragIdx !== null && dragIdx !== i ? ' dragover' : '')}
          draggable={reorderable || undefined}
          title={reorderable ? 'Drag to reorder' : undefined}
          onDragStart={reorderable ? (e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (err) {} } : undefined}
          onDragEnd={reorderable ? clearDrag : undefined}
          onDragOver={reorderable ? (e) => { e.preventDefault(); setOverIdx(i); } : undefined}
          onDrop={reorderable ? (e) => { e.preventDefault(); handleDrop(i); } : undefined}>
          {t}
          <button type="button" draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => onChange(list.filter((_, j) => j !== i))}>×</button>
        </span>
      ))}
      <input value={draft} placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !draft && list.length) onChange(list.slice(0, -1)); }}
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

/* Hold ~300ms on a pill/tab, then drag to reorder (no visible grip). */
function HoldReorderPills({ items, getKey, activeIndex, onSelect, onReorder, renderPill, addNode, className = 'subtabs' }) {
  const HOLD_MS = 300;
  const list = Array.isArray(items) ? items : [];
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [armedIdx, setArmedIdx] = useState(null);
  const holdTimer = useRef(null);
  const suppressClick = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  }, []);

  const handleDrop = (to) => {
    if (dragIdx === null || dragIdx === to) { setDragIdx(null); setOverIdx(null); return; }
    const next = list.slice();
    const [moved] = next.splice(dragIdx, 1);
    next.splice(to, 0, moved);
    onReorder(next);
    setDragIdx(null);
    setOverIdx(null);
    suppressClick.current = true;
  };

  const pillHandlers = (i) => ({
    onMouseDown: (e) => {
      if (e.button !== 0) return;
      suppressClick.current = false;
      clearHoldTimer();
      holdTimer.current = setTimeout(() => setArmedIdx(i), HOLD_MS);
    },
    onMouseUp: () => {
      clearHoldTimer();
      if (armedIdx === i && dragIdx === null) suppressClick.current = true;
      if (dragIdx === null) setArmedIdx(null);
    },
    onMouseLeave: () => {
      clearHoldTimer();
      if (dragIdx === null) setArmedIdx(null);
    },
    draggable: armedIdx === i,
    onDragStart: (e) => {
      if (armedIdx !== i) { e.preventDefault(); return; }
      setDragIdx(i);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(i)); } catch (err) {}
    },
    onDragEnd: () => {
      setDragIdx(null);
      setOverIdx(null);
      setArmedIdx(null);
      clearHoldTimer();
      suppressClick.current = true;
    },
    onDragOver: (e) => { e.preventDefault(); if (dragIdx !== null) setOverIdx(i); },
    onDrop: (e) => { e.preventDefault(); e.stopPropagation(); handleDrop(i); },
    onClick: (e) => {
      if (suppressClick.current) { suppressClick.current = false; e.preventDefault(); return; }
      onSelect(i);
    },
  });

  return (
    <div className={className + (dragIdx !== null ? ' subtabs--drag' : '')}>
      {list.map((it, i) => (
        <span
          key={getKey(it, i)}
          className={'subtab' + (armedIdx === i ? ' subtab--armed' : '') + (dragIdx === i ? ' subtab--dragging' : '') + (overIdx === i && dragIdx !== null && dragIdx !== i ? ' subtab--over' : '')}
          data-on={activeIndex === i}
          {...pillHandlers(i)}
        >
          {renderPill(it, i)}
        </span>
      ))}
      {addNode}
    </div>
  );
}

/* ---------- Reorderable list (HTML5 DnD) ---------- */
function Reorderable({ items, getKey, onReorder, renderItem }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const list = Array.isArray(items) ? items : [];

  const handleDrop = (to) => {
    if (dragIdx === null || dragIdx === to) { setDragIdx(null); setOverIdx(null); return; }
    const next = list.slice();
    const [moved] = next.splice(dragIdx, 1);
    next.splice(to, 0, moved);
    onReorder(next);
    setDragIdx(null); setOverIdx(null);
  };

  if (!list.length && !Array.isArray(items)) {
    return <p className="helptext">List data is invalid — refresh or undo the last agent change.</p>;
  }

  return (
    <div>
      {list.map((it, i) => (
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
function ListItem({ gripProps, num, thumb, icon, title, sub, open, onToggle, onDelete, children, headRight, layout }) {
  const hdClass = 'item__hd' + (onToggle ? ' clickable' : '') + (layout === 'card' ? ' item__hd--card' : '');
  return (
    <>
      <div className={hdClass} onClick={onToggle}>
        <span className="item__grip" {...gripProps} onClick={(e) => e.stopPropagation()} title="Drag to reorder"><AdminIcon name="grip" size={16} /></span>
        {thumb && <img className="minithumb" src={window.assetUrl(thumb)} alt="" />}
        {icon && <span className="miniico">{icon}</span>}
        <div className="item__text">
          <div className="item__title">{title}</div>
          {sub && <div className="item__sub">{sub}</div>}
        </div>
        <span className="spacer" />
        {headRight}
        {num != null && <span className="item__num">{num}</span>}
        {onDelete && <span className="iconbtn iconbtn--danger" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete"><AdminIcon name="trash" size={14} /></span>}
        {onToggle && <span className="chev" data-open={!!open}><AdminIcon name="chev" size={16} /></span>}
      </div>
      {open && <div className="item__bd">{children}</div>}
    </>
  );
}

/* Bullet list editor */
function BulletEditor({ items = [], onChange, placeholder = 'Bullet point', reorderable = false }) {
  const list = Array.isArray(items) ? items : [];
  const setItem = (i, val) => { const n = list.slice(); n[i] = val; onChange(n); };
  const removeItem = (i) => onChange(list.filter((_, j) => j !== i));

  const renderBullet = (b, i, gripProps) => {
    if (reorderable && gripProps) {
      return (
        <ReorderPanel
          gripProps={gripProps}
          className="reorder-panel--bullet"
          actions={
            <button type="button" className="reorder-panel__del iconbtn iconbtn--danger" onClick={() => removeItem(i)} title="Remove" aria-label="Remove">
              <AdminIcon name="x" size={13} />
            </button>
          }
        >
          <input className="inp" value={b} placeholder={placeholder} onChange={(e) => setItem(i, e.target.value)} />
        </ReorderPanel>
      );
    }
    return (
      <div className="bullet">
        <input className="inp" value={b} placeholder={placeholder} onChange={(e) => setItem(i, e.target.value)} />
        <button type="button" className="iconbtn iconbtn--danger" onClick={() => removeItem(i)} title="Remove" aria-label="Remove"><AdminIcon name="x" size={13} /></button>
      </div>
    );
  };

  return (
    <div>
      {reorderable ? (
        <Reorderable items={list} getKey={(_, i) => i} onReorder={onChange}
          renderItem={(b, i, { gripProps }) => renderBullet(b, i, gripProps)} />
      ) : (
        list.map((b, i) => <React.Fragment key={i}>{renderBullet(b, i)}</React.Fragment>)
      )}
      <Btn sm icon="plus" kind="ghost" onClick={() => onChange([...list, ''])}>Add point</Btn>
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
  AdminIcon, SkillIcon, PageHead, Panel, Btn, Field, DelBtn, GripHandle, Input, SecretInput, TextArea, Select, Toggle, ToggleRow,
  Segmented, TagInput, Swatches, HoldReorderPills, Reorderable, ReorderPanel, ListItem, BulletEditor, fileToDataURL, fmtBytes, inputStr,
  storageReady, uploadToStorage, mdInline: renderMd,
};
