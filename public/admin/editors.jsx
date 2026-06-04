/* global React */
/* =====================================================
   amrit.os ADMIN — content editors (part 1)
   Hero · About · Expertise · Achievements/Cards · Contact · Media · Appearance
   ===================================================== */
const { useState } = React;

const EXPERTISE_ICONS = ['automation', 'rag', 'gas', 'flutter', 'bots', 'shopify', 'web', 'ios', 'comedy', 'brain'];
const SOCIAL_ICONS = ['whatsapp', 'linkedin', 'github', 'instagram', 'email', 'web'];
const ACCENT_OPTIONS = ['#c8e856', '#33ff66', '#ff7a3d', '#7a9eff', '#ffd25a', '#e85c89', '#9d7cff'];
const CURSOR_COLOR_OPTIONS = ['#ffffff', '#c8e856', '#33ff66', '#ff7a3d', '#7a9eff', '#ffd25a', '#ff4466'];
const TYPE_OPTIONS = [
  { value: 'default', label: 'Default · Newsreader' },
  { value: 'editorial', label: 'Editorial · Playfair' },
  { value: 'pixel', label: 'Pixel · VT323' },
  { value: 'modern', label: 'Modern · Space Grotesk' },
];
const BOT_ICONS = [
  { value: 'brain-computer', label: 'Brain + Computer' },
  { value: 'brain', label: 'Brain (original)' },
  { value: 'brain14', label: 'Brain Outline' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'bot-ai', label: 'Bot AI' },
  { value: 'brain-pc2', label: 'Brain + Computer 2' },
  { value: 'brain-pc', label: 'Brain + Computer 3' },
];

/* Appearance-engine option sets — mirror the data-* hooks consumed by
   styles.css + app.jsx (background pattern, corner radius, heading font,
   letter-spacing). Keep values in sync with the CSS selectors. */
const BG_PATTERNS = [
  { value: 'grid', label: 'Grid' },
  { value: 'dots', label: 'Dots' },
  { value: 'scan', label: 'Scanlines' },
  { value: 'starfield', label: 'Starfield' },
  { value: 'none', label: 'None' },
];
const RADIUS_OPTIONS = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'soft', label: 'Soft' },
  { value: 'round', label: 'Round' },
];
const HEADING_FONTS = [
  { value: 'match', label: 'Match font set' },
  { value: 'serif', label: 'Newsreader · serif' },
  { value: 'editorial', label: 'Playfair · editorial' },
  { value: 'grotesk', label: 'Space Grotesk' },
  { value: 'mono', label: 'JetBrains Mono' },
  { value: 'pixel', label: 'VT323 · pixel' },
];
const TRACKING_OPTIONS = [
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
];

/* One-click "vibes" — bundles that set theme + accent + fonts + cursor +
   effects + background + glow + radius together. Each writes the full cosmetic
   set (including dark/light mode) so a switch is fully deterministic — no
   leftover state from the previous vibe. */
const VIBES = [
  { id: 'classic', label: 'Classic', desc: 'Dark · lime CRT',
    cos: { theme: 'dark', accent: '#c8e856', type: 'default', headingFont: 'match', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#c8e856', scanlines: true, bgPattern: 'grid', glow: 100, radius: 'soft' } },
  { id: 'matrix', label: 'Matrix', desc: 'Dark · green pixel',
    cos: { theme: 'dark', accent: '#33ff66', type: 'pixel', headingFont: 'pixel', tracking: 'normal', cursorStyle: 'pixel', cursorColor: '#33ff66', scanlines: true, bgPattern: 'scan', glow: 140, radius: 'sharp' } },
  { id: 'royal', label: 'Royal', desc: 'Dark · violet editorial',
    cos: { theme: 'dark', accent: '#9d7cff', type: 'editorial', headingFont: 'editorial', tracking: 'wide', cursorStyle: 'ring', cursorColor: '#9d7cff', scanlines: false, bgPattern: 'starfield', glow: 120, radius: 'soft' } },
  { id: 'crimson', label: 'Crimson', desc: 'Dark · rose editorial',
    cos: { theme: 'dark', accent: '#e85c89', type: 'editorial', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#e85c89', scanlines: false, bgPattern: 'starfield', glow: 120, radius: 'soft' } },
  { id: 'lilac', label: 'Lilac', desc: 'Light · violet',
    cos: { theme: 'light', accent: '#9d7cff', type: 'default', headingFont: 'editorial', tracking: 'normal', cursorStyle: 'ring', cursorColor: '#9d7cff', scanlines: false, bgPattern: 'dots', glow: 90, radius: 'soft' } },
  { id: 'sunset', label: 'Sunset', desc: 'Light · amber soft',
    cos: { theme: 'light', accent: '#ff7a3d', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#ff7a3d', scanlines: false, bgPattern: 'dots', glow: 110, radius: 'round' } },
  { id: 'solar', label: 'Solar', desc: 'Light · gold',
    cos: { theme: 'light', accent: '#ffd25a', type: 'modern', headingFont: 'grotesk', tracking: 'normal', cursorStyle: 'dot', cursorColor: '#ffd25a', scanlines: false, bgPattern: 'grid', glow: 90, radius: 'soft' } },
  { id: 'mono', label: 'Mono', desc: 'Light · slate flat',
    cos: { theme: 'light', accent: '#7a9eff', type: 'default', headingFont: 'mono', tracking: 'normal', cursorStyle: 'cross', cursorColor: '#7a9eff', scanlines: false, bgPattern: 'none', glow: 60, radius: 'sharp' } },
];

const TARGETS = {
  aboutPhoto: { w: 720, h: 880 },
  projThumb: { w: 480, h: 360 },
  projGallery: { w: 1280, h: 800 },
};

function RangeRow({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <div className="zoomrow" style={{ marginTop: 0 }}>
      <span className="lbl" style={{ minWidth: 88 }}>{label}</span>
      <input className="rng" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="lbl" style={{ minWidth: 44, textAlign: 'right', color: 'var(--accent)' }}>{value}{unit}</span>
    </div>
  );
}

/* ============ HERO ============ */
function HeroEditor({ content, setAt }) {
  const { PageHead, Panel, Field, Input, TextArea, Btn, AdminIcon } = window.ADMIN_UI;
  const h = content.hero;
  const setCta = (i, key, val) => { const n = h.ctas.map((c, j) => j === i ? { ...c, [key]: val } : c); setAt('hero.ctas', n); };
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/HERO.INTRO" title="Hero & intro">The first thing visitors see — terminal handle, name, title and the pitch paragraph.</PageHead>
      <Panel title="Headline">
        <Field label="Terminal handle"><Input value={h.handle} onChange={(v) => setAt('hero.handle', v)} /></Field>
        <div className="row">
          <Field label="First name"><Input value={h.name} onChange={(v) => setAt('hero.name', v)} /></Field>
          <Field label="Emphasised (italic) name"><Input value={h.nameEm} onChange={(v) => setAt('hero.nameEm', v)} /></Field>
        </div>
        <Field label="Subtitle"><Input value={h.subtitle} onChange={(v) => setAt('hero.subtitle', v)} /></Field>
        <Field label="Pitch paragraph" hint="<b> for bold · ✨ to refine"><window.ADMIN_REFINER.RefineField label="Hero pitch paragraph" context="The short punchy intro pitch shown in the portfolio hero section." rows={4} value={h.role} onChange={(v) => setAt('hero.role', v)} /></Field>
      </Panel>
      <Panel title="Call-to-action buttons">
        {h.ctas.map((c, i) => (
          <div className="item" key={i}>
            <div className="item__bd" style={{ borderTop: 0, paddingTop: 14 }}>
              <div className="row">
                <Field label={`Button ${i + 1} label`}><Input value={c.label} onChange={(v) => setCta(i, 'label', v)} /></Field>
                <Field label="Link / anchor"><Input value={c.href} onChange={(v) => setCta(i, 'href', v)} /></Field>
              </div>
              <div className="togrow" style={{ padding: 0 }}>
                <div className="txt"><b>Primary (filled) style</b></div>
                {React.createElement(window.ADMIN_UI.Toggle, { value: c.primary, onChange: (v) => setCta(i, 'primary', v) })}
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ============ ABOUT ============ */
function AboutEditor({ content, setAt }) {
  const { PageHead, Panel, Field, DelBtn, Input, TextArea, Btn, AdminIcon } = window.ADMIN_UI;
  const { ImageSlot } = window.ADMIN_CROP;
  const a = content.about;
  const setMeta = (i, key, val) => setAt('about.meta', a.meta.map((m, j) => j === i ? { ...m, [key]: val } : m));
  const setImpact = (i, key, val) => setAt('about.impact', a.impact.map((m, j) => j === i ? { ...m, [key]: val } : m));
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/ABOUT.ME" title="About section">Your photo, the readme-style bio and the Now / Then / Before timeline.</PageHead>
      <div className="grid2">
        <Panel title="Photo">
          <ImageSlot label="About photo" value={a.photo} target={TARGETS.aboutPhoto} previewW={120} storageKey="about/photo"
            hint="Portrait — shown in the about window" onChange={(url) => setAt('about.photo', url)} />
          <Field label="Photo stamp caption"><Input value={a.photoStamp} onChange={(v) => setAt('about.photoStamp', v)} /></Field>
        </Panel>
        <Panel title="Meta strip">
          {a.meta.map((m, i) => (
            <div className="row" key={i} style={{ marginBottom: 10 }}>
              <Field label="Label"><Input value={m.label} onChange={(v) => setMeta(i, 'label', v)} /></Field>
              <Field label="Value"><Input value={m.value} onChange={(v) => setMeta(i, 'value', v)} /></Field>
              <DelBtn onClick={() => setAt('about.meta', a.meta.filter((_, j) => j !== i))} />
            </div>
          ))}
          <Btn sm icon="plus" kind="ghost" onClick={() => setAt('about.meta', [...a.meta, { label: '', value: '' }])}>Add meta row</Btn>
        </Panel>
      </div>
      <Panel title="Bio copy">
        <Field label="Heading" hint="<em> for italic accent"><TextArea rows={2} value={a.heading} onChange={(v) => setAt('about.heading', v)} /></Field>
        <Field label="Intro paragraph" hint="✨ to refine"><window.ADMIN_REFINER.RefineField label="About intro paragraph" context="The intro paragraph under the About heading." rows={2} value={a.intro} onChange={(v) => setAt('about.intro', v)} /></Field>
      </Panel>
      <Panel title="Impact timeline" sub={`${a.impact.length} entries`}>
        {a.impact.map((m, i) => (
          <div className="item" key={i}>
            <div className="item__bd" style={{ borderTop: 0, paddingTop: 14 }}>
              <div className="row">
                <Field label="Label"><Input value={m.label} onChange={(v) => setImpact(i, 'label', v)} /></Field>
                <DelBtn onClick={() => setAt('about.impact', a.impact.filter((_, j) => j !== i))} />
              </div>
              <Field label="Description" hint="<em> for accent · ✨ to refine"><window.ADMIN_REFINER.RefineField label="Impact timeline entry" context="A short description line in the About impact timeline." rows={2} value={m.html} onChange={(v) => setImpact(i, 'html', v)} /></Field>
            </div>
          </div>
        ))}
        <Btn sm icon="plus" kind="ghost" onClick={() => setAt('about.impact', [...a.impact, { label: '', html: '' }])}>Add timeline entry</Btn>
      </Panel>
    </div>
  );
}

/* ============ EXPERTISE ============ */
function ExpertiseEditor({ content, setAt }) {
  const { PageHead, Panel, Field, Input, Select, Btn, AdminIcon, SkillIcon, Reorderable, ListItem } = window.ADMIN_UI;
  const list = content.expertise;
  const customIcons = content.icons || [];
  const [open, setOpen] = useState(null);
  const fileRef = React.useRef(null);
  const update = (i, key, val) => setAt('expertise', list.map((e, j) => j === i ? { ...e, [key]: val } : e));
  const renumber = (arr) => arr.map((e, i) => ({ ...e, num: String(i + 1).padStart(2, '0') }));
  const add = () => { const n = renumber([...list, { num: '', icon: 'automation', title: 'New module', sub: '' }]); setAt('expertise', n); setOpen(n.length - 1); };

  // Upload a custom SVG → sanitize → store in content.icons (selectable as an icon).
  const onAddIcon = async (file) => {
    if (!file) return;
    let text = '';
    try { text = await file.text(); } catch (e) { return; }
    const svg = (window.SHARED_SCHEMA && window.SHARED_SCHEMA.sanitizeSvg(text)) || '';
    if (!svg) { alert('That doesn’t look like a valid SVG (or it’s too large).'); return; }
    const id = 'custom_' + Math.random().toString(36).slice(2, 10);
    const name = (file.name || 'icon').replace(/\.svg$/i, '').slice(0, 40) || 'icon';
    setAt('icons', [...customIcons, { id, name, svg }]);
  };
  const removeIcon = (id) => {
    setAt('icons', customIcons.filter((ic) => ic.id !== id));
    // Reset any module still pointing at the removed icon to a safe default.
    if (list.some((e) => e.icon === id)) setAt('expertise', list.map((e) => e.icon === id ? { ...e, icon: 'automation' } : e));
  };
  const iconOptions = EXPERTISE_ICONS.map((i) => ({ value: i, label: i })).concat(customIcons.map((ic) => ({ value: ic.id, label: '★ ' + ic.name })));

  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/EXPERTISE.SYS" title="Expertise modules">The clickable skill grid. Drag to reorder — numbers (MOD_01…) renumber automatically. Each module can filter projects on the site.</PageHead>
      <Panel title="Installed modules" sub={`${list.length} modules`} actions={<>
        <input ref={fileRef} type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; onAddIcon(f); }} />
        <Btn sm icon="upload" onClick={() => fileRef.current && fileRef.current.click()}>Add Icon</Btn>
        <Btn sm icon="plus" kind="primary" onClick={add}>Add module</Btn>
      </>}>
        <Reorderable items={list} getKey={(_, i) => i}
          onReorder={(next) => setAt('expertise', renumber(next))}
          renderItem={(e, i, { gripProps }) => (
            <ListItem gripProps={gripProps} num={'MOD_' + (e.num || String(i + 1).padStart(2, '0'))}
              icon={<SkillIcon name={e.icon} icons={customIcons} size={16} />}
              title={e.title} sub={e.sub} open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
              onDelete={() => { setAt('expertise', renumber(list.filter((_, j) => j !== i))); setOpen(null); }}>
              <div className="row">
                <Field label="Title"><Input value={e.title} onChange={(v) => update(i, 'title', v)} /></Field>
                <Field label="Subtitle"><Input value={e.sub} onChange={(v) => update(i, 'sub', v)} /></Field>
              </div>
              <Field label="Icon" hint="built-in or your uploaded SVGs (★)"><Select value={e.icon} options={iconOptions} onChange={(v) => update(i, 'icon', v)} /></Field>
            </ListItem>
          )} />
        {customIcons.length > 0 && (
          <div className="iconlib">
            <div className="iconlib__hd">Uploaded icons</div>
            <div className="iconlib__grid">
              {customIcons.map((ic) => (
                <div className="iconlib__item" key={ic.id} title={ic.name}>
                  <SkillIcon name={ic.id} icons={customIcons} size={20} />
                  <span className="iconlib__name">{ic.name}</span>
                  <button className="iconlib__del" onClick={() => removeIcon(ic.id)} title="Remove icon"><AdminIcon name="x" size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ============ ACHIEVEMENTS / EDUCATION / CERTS (cards) ============ */
function CardsEditor({ content, setAt }) {
  const { PageHead, Panel, Field, DelBtn, Input, TextArea, Btn, BulletEditor, AdminIcon } = window.ADMIN_UI;
  const cards = content.cards;
  const update = (i, key, val) => setAt('cards', cards.map((c, j) => j === i ? { ...c, [key]: val } : c));
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/WORK.HISTORY → INFO CARDS" title="Education · Achievements · Certifications">The four info cards beneath the work timeline. Each has a heading, subtitle and either a list or a body paragraph.</PageHead>
      {cards.map((c, i) => (
        <Panel key={c.id} title={c.title || c.eyebrow} sub={c.eyebrow}>
          <div className="row">
            <Field label="Eyebrow label"><Input value={c.eyebrow} onChange={(v) => update(i, 'eyebrow', v)} /></Field>
            <Field label="Meta (right)"><Input value={c.meta} onChange={(v) => update(i, 'meta', v)} /></Field>
          </div>
          <div className="row">
            <Field label="Title"><Input value={c.title} onChange={(v) => update(i, 'title', v)} /></Field>
            <Field label="Subtitle"><Input value={c.sub} onChange={(v) => update(i, 'sub', v)} /></Field>
          </div>
          {c.body !== undefined && (c.items.length === 0 || c.id === 'offduty' || c.id === 'education') && (
            <Field label="Body paragraph"><TextArea rows={3} value={c.body} onChange={(v) => update(i, 'body', v)} /></Field>
          )}
          {(c.items.length > 0 || (c.id !== 'offduty' && c.id !== 'education')) && (
            <Field label="List items"><BulletEditor items={c.items} onChange={(v) => update(i, 'items', v)} placeholder="List item" /></Field>
          )}
          {c.scores && c.scores.length >= 0 && c.id === 'education' && (
            <Field label="Score chips">
              {c.scores.map((s, k) => (
                <div className="row" key={k} style={{ marginBottom: 8 }}>
                  <Field label="Label"><Input value={s.label} onChange={(v) => update(i, 'scores', c.scores.map((x, m) => m === k ? { ...x, label: v } : x))} /></Field>
                  <Field label="Value"><Input value={s.value} onChange={(v) => update(i, 'scores', c.scores.map((x, m) => m === k ? { ...x, value: v } : x))} /></Field>
                  <DelBtn onClick={() => update(i, 'scores', c.scores.filter((_, m) => m !== k))} />
                </div>
              ))}
              <Btn sm icon="plus" kind="ghost" onClick={() => update(i, 'scores', [...c.scores, { label: '', value: '' }])}>Add score</Btn>
            </Field>
          )}
        </Panel>
      ))}
    </div>
  );
}

/* ============ CONTACT ============ */
function ContactEditor({ content, setAt }) {
  const { PageHead, Panel, Field, Input, TextArea, Select, Btn, AdminIcon, Reorderable, ListItem } = window.ADMIN_UI;
  const c = content.contact;
  const setSocial = (i, key, val) => setAt('contact.socials', c.socials.map((s, j) => j === i ? { ...s, [key]: val } : s));
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/CONTACT.SH" title="Contact & socials">Reach-me details and the social links shown in the contact window and footer.</PageHead>
      <Panel title="Message">
        <Field label="Heading" hint="<em> accent, <br/> line break"><TextArea rows={2} value={c.heading} onChange={(v) => setAt('contact.heading', v)} /></Field>
        <Field label="Intro paragraph"><TextArea rows={2} value={c.intro} onChange={(v) => setAt('contact.intro', v)} /></Field>
      </Panel>
      <Panel title="Reach me at">
        <div className="row">
          <Field label="Email"><Input value={c.email} onChange={(v) => setAt('contact.email', v)} /></Field>
          <Field label="Phone"><Input value={c.phone} onChange={(v) => setAt('contact.phone', v)} /></Field>
        </div>
      </Panel>
      <Panel title="Social links" sub={`${c.socials.length} links`}
        actions={<Btn sm icon="plus" kind="primary" onClick={() => setAt('contact.socials', [...c.socials, { label: '', icon: 'web', href: '' }])}>Add link</Btn>}>
        <Reorderable items={c.socials} getKey={(_, i) => i} onReorder={(next) => setAt('contact.socials', next)}
          renderItem={(s, i, { gripProps }) => (
            <ListItem gripProps={gripProps} title={s.label || '(unnamed)'} sub={s.href}
              icon={<AdminIcon name="link" size={15} />}
              onDelete={() => setAt('contact.socials', c.socials.filter((_, j) => j !== i))}
              headRight={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="inp" style={{ width: 120 }} value={s.label} placeholder="Label" onClick={(e) => e.stopPropagation()} onChange={(e) => setSocial(i, 'label', e.target.value)} />
                <select className="sel" style={{ width: 130 }} value={s.icon} onClick={(e) => e.stopPropagation()} onChange={(e) => setSocial(i, 'icon', e.target.value)}>
                  {SOCIAL_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input className="inp" style={{ width: 220 }} value={s.href} placeholder="https://" onClick={(e) => e.stopPropagation()} onChange={(e) => setSocial(i, 'href', e.target.value)} />
              </div>} />
          )} />
      </Panel>
    </div>
  );
}

/* ============ MEDIA (CV files) ============ */
function MediaEditor({ content, setAt, analytics }) {
  const { PageHead, Panel, Field, Btn, AdminIcon, fmtBytes, uploadToStorage, storageReady } = window.ADMIN_UI;
  const { useState } = React;
  const m = content.media;
  const [busy, setBusy] = useState(null);   // slot currently uploading
  const [err, setErr] = useState(null);
  const upload = async (slot, file) => {
    if (!file) return;
    setErr(null);
    if (!storageReady()) { setErr('Sign in to upload the CV to Storage.'); return; }
    if (file.type !== 'application/pdf') { setErr('Please choose a PDF.'); return; }
    setBusy(slot);
    try {
      const url = await uploadToStorage(`cv/${slot}.pdf`, file, 'application/pdf');
      setAt(`media.${slot}`, { name: file.name, url, size: fmtBytes(file.size) });
    } catch (e) { setErr((e && e.message) || 'upload failed'); }
    finally { setBusy(null); }
  };
  const CvBox = ({ slot, title }) => {
    const f = slot !== '__proto__' && slot !== 'constructor' && slot !== 'prototype' ? Reflect.get(m, slot) : undefined;
    const inputId = 'cv-' + slot;
    return (
      <Panel title={title} sub={slot === 'cvLight' ? 'served on light theme' : 'served on dark theme'}>
        <div className="filebox">
          <div className="filebox__ico" />
          <div className="filebox__info">
            <div className="nm">{f.name}</div>
            <div className="meta">{busy === slot ? 'uploading…' : (f.size ? f.size + ' · ' : '') + (f.url && f.url.indexOf('firebasestorage') > -1 ? 'in Storage' : f.url)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a className="btn btn--sm" href={f.url} target="_blank" rel="noreferrer"><AdminIcon name="eye" size={13} />Preview</a>
            <label className="btn btn--sm" htmlFor={inputId} style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}><AdminIcon name="upload" size={13} />{busy === slot ? 'Uploading…' : 'Replace'}</label>
            <input id={inputId} type="file" accept="application/pdf" hidden disabled={!!busy} onChange={(e) => upload(slot, e.target.files[0])} />
          </div>
        </div>
        {err && <div className="helptext" style={{ color: '#e0a341', marginTop: 8 }}>⚠ {err}</div>}
      </Panel>
    );
  };
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/MEDIA.STORE" title="CV files & assets">Two CV variants are shipped — the site serves the one matching the visitor's theme. Replace either with a new PDF.</PageHead>
      <div className="callout"><AdminIcon name="download" size={16} /><div><b>{(analytics.cvDownloads || 0).toLocaleString()}</b> CV download{analytics.cvDownloads === 1 ? '' : 's'} captured from the live site so far. Replace either PDF below — the cropped-down URL is what the portfolio's About window links to.</div></div>
      <CvBox slot="cvLight" title="CV — Light variant" />
      <CvBox slot="cvDark" title="CV — Dark variant" />
      <Panel title="On Firebase" sub="after migration">
        <p className="helptext">Uploaded PDFs are held as data URLs in the draft today. On migration these write to <code>Firebase Storage</code> under <code>cv/{'{'}variant{'}'}.pdf</code> and the field stores the download URL — the site link updates automatically on publish.</p>
      </Panel>
    </div>
  );
}

/* ============ APPEARANCE (cosmetics) ============ */

/* One vibe button — shows the preset's accent + a label, highlights when active. */
function VibeButton({ vibe, active, onClick }) {
  return (
    <button type="button" className="vibe" data-on={active} onClick={onClick} title={vibe.desc}>
      <span className="vibe__swatch" style={{ background: vibe.cos.accent }} />
      <span className="vibe__txt"><b>{vibe.label}</b><span>{vibe.desc}</span></span>
    </button>
  );
}

function AppearanceEditor({ content, setAt }) {
  const { PageHead, Panel, Field, Select, Segmented, Swatches, ToggleRow, AdminIcon } = window.ADMIN_UI;
  const c = content.cosmetics;
  // Apply a vibe: write the whole bundle so the switch is deterministic, then
  // tag the active vibe id. setAt is a functional update, so the calls compose.
  const applyVibe = (v) => {
    Object.entries(v.cos).forEach(([k, val]) => setAt('cosmetics.' + k, val));
    setAt('cosmetics.vibe', v.id);
  };
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/APPEARANCE.CFG" title="Appearance & cosmetics">Every site-wide tweak in one place — these become the published defaults visitors land on. Start from a vibe, then fine-tune below.</PageHead>

      <Panel title="Vibes" sub="one-click presets">
        <div className="vibes">
          {VIBES.map((v) => <VibeButton key={v.id} vibe={v} active={c.vibe === v.id} onClick={() => applyVibe(v)} />)}
        </div>
        <p className="helptext" style={{ marginTop: 12, marginBottom: 0 }}>A vibe sets accent, fonts, cursor, background, glow &amp; corner style together — then tweak any of them in the panels below.</p>
      </Panel>

      <div className="grid2">
        <Panel title="Theme & color">
          <Field label="Default mode" hint="visitors can still toggle"><Segmented value={c.theme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} onChange={(v) => setAt('cosmetics.theme', v)} /></Field>
          <Field label="Accent color"><Swatches value={c.accent} options={ACCENT_OPTIONS} onChange={(v) => setAt('cosmetics.accent', v)} /></Field>
          <Field label="Accent brightness" hint="darken ← → lighten"><RangeRow label="Shade" value={c.accentTone == null ? 50 : c.accentTone} min={0} max={100} step={5} unit="" onChange={(v) => setAt('cosmetics.accentTone', v)} /></Field>
          <p className="helptext" style={{ margin: '2px 0 0' }}>The browser-tab favicon (the pixel “AD” monogram) tints to this accent and follows light/dark mode automatically.</p>
        </Panel>
        <Panel title="Typography">
          <Field label="Font set" hint="display + body + mono"><Select value={c.type} options={TYPE_OPTIONS} onChange={(v) => setAt('cosmetics.type', v)} /></Field>
          <Field label="Heading font" hint="overrides headings only"><Select value={c.headingFont || 'match'} options={HEADING_FONTS} onChange={(v) => setAt('cosmetics.headingFont', v)} /></Field>
          <Field label="Letter spacing"><Segmented value={c.tracking || 'normal'} options={TRACKING_OPTIONS} onChange={(v) => setAt('cosmetics.tracking', v)} /></Field>
          <Field label="Base font size"><RangeRow label="Scale" value={c.fontScale} min={85} max={120} step={5} unit="%" onChange={(v) => setAt('cosmetics.fontScale', v)} /></Field>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Background & glow">
          <Field label="Wallpaper pattern"><Select value={c.bgPattern || 'grid'} options={BG_PATTERNS} onChange={(v) => setAt('cosmetics.bgPattern', v)} /></Field>
          <Field label="Accent glow"><RangeRow label="Intensity" value={c.glow == null ? 100 : c.glow} min={0} max={160} step={10} unit="%" onChange={(v) => setAt('cosmetics.glow', v)} /></Field>
          <Field label="Corner radius"><Segmented value={c.radius || 'soft'} options={RADIUS_OPTIONS} onChange={(v) => setAt('cosmetics.radius', v)} /></Field>
        </Panel>
        <Panel title="Effects & cursor">
          <ToggleRow title="CRT scanlines" sub="retro overlay across the page" value={c.scanlines} onChange={(v) => setAt('cosmetics.scanlines', v)} />
          <div className="divider" />
          <Field label="Cursor type"><Select value={c.cursorStyle} options={['ring', 'pixel', 'dot', 'cross']} onChange={(v) => setAt('cosmetics.cursorStyle', v)} /></Field>
          <Field label="Cursor color"><Swatches value={c.cursorColor} options={CURSOR_COLOR_OPTIONS} onChange={(v) => setAt('cosmetics.cursorColor', v)} /></Field>
        </Panel>
      </div>

      <Panel title="Bot avatar">
        <div className="grid2" style={{ marginBottom: 0 }}>
          <Field label="Icon style"><Select value={c.botIcon} options={BOT_ICONS} onChange={(v) => setAt('cosmetics.botIcon', v)} /></Field>
          <Field label="Icon color"><Segmented value={c.botIconColor} options={[{ value: 'white', label: 'White' }, { value: 'accent', label: 'Accent' }]} onChange={(v) => setAt('cosmetics.botIconColor', v)} /></Field>
        </div>
      </Panel>
    </div>
  );
}

window.ADMIN_EDITORS = { HeroEditor, AboutEditor, ExpertiseEditor, CardsEditor, ContactEditor, MediaEditor, AppearanceEditor, TARGETS, EXPERTISE_ICONS, VIBES, ACCENT_OPTIONS };
