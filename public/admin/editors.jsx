/* global React */
/* =====================================================
   amrit.os ADMIN — content editors (part 1)
   Hero · About · Expertise · Achievements/Cards · Contact · Media · Appearance
   ===================================================== */
const { useState, useRef, useCallback, useMemo } = React;

const EXPERTISE_ICONS = ['automation', 'rag', 'gas', 'flutter', 'bots', 'shopify', 'web', 'ios', 'comedy', 'brain'];
const SOCIAL_ICONS = ['whatsapp', 'linkedin', 'github', 'instagram', 'email', 'web'];
const ACCENT_OPTIONS = ['#c8e856', '#33ff66', '#ff7a3d', '#7a9eff', '#ffd25a', '#e85c89', '#9d7cff'];
const CURSOR_COLOR_OPTIONS = ['#ffffff', '#c8e856', '#33ff66', '#ff7a3d', '#7a9eff', '#ffd25a', '#ff4466'];
const TYPE_OPTIONS = [
  { value: 'default', label: 'Default · Newsreader' },
  { value: 'editorial', label: 'Editorial · Playfair' },
  { value: 'pixel', label: 'Pixel · VT323' },
  { value: 'modern', label: 'Modern · Space Grotesk' },
  { value: 'mono', label: 'Mono · JetBrains' },
  { value: 'slab', label: 'Slab · Roboto Slab' },
  { value: 'rounded', label: 'Rounded · Nunito' },
  { value: 'retro', label: 'Retro · Press Start' },
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
const _BG_SCHEMA = window.SHARED_SCHEMA || {};
const BG_PATTERNS = (() => {
  const patterns = _BG_SCHEMA.BG_PATTERNS || [];
  const meta = _BG_SCHEMA.BG_PATTERN_META || {};
  const toOption = (value) => {
    const m = meta[value] || { label: value, animated: false };
    const tag = m.cursorReactive ? ' ✦ interactive' : (m.animated ? ' ✦ animated' : '');
    return { value, label: m.label + tag };
  };
  const staticOpts = [];
  const animOpts = [];
  const interactiveOpts = [];
  patterns.forEach((value) => {
    if (value === 'none') return;
    const m = meta[value] || { animated: false };
    if (m.cursorReactive) interactiveOpts.push(toOption(value));
    else if (m.animated) animOpts.push(toOption(value));
    else staticOpts.push(toOption(value));
  });
  const groups = [
    { group: 'Static', options: staticOpts },
    { group: 'Animated', options: animOpts },
  ];
  if (interactiveOpts.length) groups.push({ group: 'Interactive', options: interactiveOpts });
  groups.push({ group: 'Other', options: [toOption('none')] });
  return groups;
})();
const HONEYCOMB_STYLE_OPTIONS = (_BG_SCHEMA.HONEYCOMB_STYLES || ['outline', 'fill']).map((v) => ({
  value: v,
  label: v === 'outline' ? 'Outline · grid lines' : 'Fill · sparse cells',
}));
const CURSOR_STYLES = [
  { value: 'ring', label: 'Ring' },
  { value: 'pixel', label: 'Pixel arrow' },
  { value: 'dot', label: 'Dot' },
  { value: 'cross', label: 'Crosshair' },
  { value: 'halo', label: 'Halo glow' },
  { value: 'outline', label: 'Outline ring' },
  { value: 'bold', label: 'Bold dot' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'trail', label: 'Trail' },
  { value: 'square', label: 'Square' },
  { value: 'beam', label: 'Beam' },
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
  { value: 'slab', label: 'Roboto Slab' },
  { value: 'rounded', label: 'Nunito' },
  { value: 'retro', label: 'Press Start 2P' },
  { value: 'display', label: 'Syne · display' },
];
const TRACKING_OPTIONS = [
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
];
const VIGNETTE_DIRECTIONS = (window.SHARED_SCHEMA && window.SHARED_SCHEMA.VIGNETTE_DIRECTIONS) || [
  'none', 'center', 'all', 'top', 'bottom', 'left', 'right', 'horizontal', 'vertical',
  'top-left', 'top-right', 'bottom-left', 'bottom-right',
];
const RAIN_DIRECTION_OPTIONS = (_BG_SCHEMA.RAIN_DIRECTIONS || ['down', 'diagonal-left', 'diagonal-right', 'left', 'right']).map((v) => ({
  value: v,
  label: v === 'down' ? 'Straight down' : v.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
}));
const WAVE_DIRECTION_OPTIONS = (_BG_SCHEMA.WAVE_DIRECTIONS || ['up', 'down', 'left', 'right', 'diagonal-up', 'diagonal-down']).map((v) => ({
  value: v,
  label: v === 'up' ? 'Roll upward'
    : v === 'down' ? 'Roll downward'
    : v.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
}));
const COMET_DIRECTION_OPTIONS = (_BG_SCHEMA.COMET_DIRECTIONS || ['right-down', 'left-down', 'right', 'left', 'up-right']).map((v) => ({
  value: v,
  label: v.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
}));
const PARTICLE_DRIFT_OPTIONS = (_BG_SCHEMA.PARTICLE_DRIFT_DIRECTIONS || ['up', 'down', 'diagonal-up', 'diagonal-down', 'left', 'right']).map((v) => ({
  value: v,
  label: v === 'up' ? 'Float up'
    : v === 'down' ? 'Float down'
    : v.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
}));
const CURSOR_EFFECT_OPTIONS = (_BG_SCHEMA.CURSOR_EFFECTS || ['none', 'trail', 'comet', 'ripple', 'spark', 'glow']).map((v) => ({
  value: v,
  label: v === 'none' ? 'None' : v.charAt(0).toUpperCase() + v.slice(1),
}));
const CURSOR_EFFECT_TRAIL_STYLE_OPTIONS = (_BG_SCHEMA.CURSOR_EFFECT_TRAIL_STYLES || ['glow', 'line', 'dotted', 'particles']).map((v) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}));
const CURSOR_EFFECT_COMET_DIRECTION_OPTIONS = (_BG_SCHEMA.CURSOR_EFFECT_COMET_DIRECTIONS || ['cursor', 'up', 'down', 'random']).map((v) => ({
  value: v,
  label: v === 'cursor' ? 'Follow cursor' : v.charAt(0).toUpperCase() + v.slice(1),
}));
const NUMBER_FORMAT_OPTIONS = (_BG_SCHEMA.NUMBER_FORMATS || ['binary', 'octal', 'decimal', 'hex']).map((v) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}));
const VIGNETTE_DIRECTION_OPTIONS = VIGNETTE_DIRECTIONS.map((v) => ({
  value: v,
  label: v === 'none' ? 'None'
    : v === 'all' ? 'All edges'
    : v === 'horizontal' ? 'Top & bottom'
    : v === 'vertical' ? 'Left & right'
    : v.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
}));

const _SCHEMA = window.SHARED_SCHEMA || {};
const _coerceCustomVibes = (value) => (_SCHEMA.coerceCustomVibes ? _SCHEMA.coerceCustomVibes(value) : (Array.isArray(value) ? value : []));
const _nextCustomVibeId = (slots) => (_SCHEMA.nextCustomVibeId ? _SCHEMA.nextCustomVibeId(slots) : 'custom-1');
const _SNAPSHOT_COS = (cos) => (_SCHEMA.snapshotCosmetics ? _SCHEMA.snapshotCosmetics(cos) : cos);
const _customVibeNum = (id) => (_SCHEMA.customVibeNum ? _SCHEMA.customVibeNum(id) : parseInt(String(id || '').replace('custom-', ''), 10));
const _customVibeLabel = (id) => 'Custom vibe ' + (_customVibeNum(id) || '');
const _isVibeHidden = (vibe) => (_SCHEMA.isVibeHidden ? _SCHEMA.isVibeHidden(vibe) : false);
const VIBES = (_SCHEMA.VIBES) || [];
const VIBE_VISIBLE_COUNT = (_SCHEMA.getVisibleVibes ? _SCHEMA.getVisibleVibes().length : VIBES.length);
const VIBE_CATEGORIES = (_SCHEMA.VIBE_CATEGORIES) || [
  { id: 'dark', label: 'Dark mode' },
  { id: 'light', label: 'Light mode' },
  { id: 'retro', label: 'Retro & CRT' },
  { id: 'bold', label: 'Bold & experimental' },
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
function newImpactId() {
  return 'imp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function AboutEditor({ content, setAt }) {
  const { PageHead, Panel, Field, DelBtn, Input, Btn, AdminIcon, Reorderable, ReorderPanel, inputStr } = window.ADMIN_UI;
  const { ImageSlot } = window.ADMIN_CROP;
  const a = content.about;
  const meta = Array.isArray(a.meta) ? a.meta : [];
  const impact = Array.isArray(a.impact) ? a.impact : [];
  const setMeta = (i, key, val) => setAt('about.meta', meta.map((m, j) => j === i ? { ...m, [key]: val } : m));
  const setImpact = (i, key, val) => setAt('about.impact', impact.map((m, j) => j === i ? { ...m, [key]: inputStr(val) } : m));
  const setImpactEntry = (i, patch) => setAt('about.impact', impact.map((m, j) => j === i ? { ...m, label: inputStr(patch.label), html: inputStr(patch.html) } : m));
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/ABOUT.ME" title="About section">Your photo, the readme-style bio and the Now / Then / Before timeline.</PageHead>
      <div className="grid2">
        <Panel title="Photo">
          <ImageSlot label="About photo" value={a.photo} target={TARGETS.aboutPhoto} previewW={120} storageKey="about/photo"
            hint="Portrait — shown in the about window" onChange={(url) => setAt('about.photo', url)} />
          <Field label="Photo stamp caption"><Input value={a.photoStamp} onChange={(v) => setAt('about.photoStamp', v)} /></Field>
        </Panel>
        <Panel title="Meta strip" sub={`${meta.length} rows · drag to reorder`}>
          <Reorderable items={meta} getKey={(_, i) => i} onReorder={(next) => setAt('about.meta', next)}
            renderItem={(m, i, { gripProps }) => (
              <ReorderPanel gripProps={gripProps} className="reorder-panel--fields reorder-panel--meta">
                <Field label="Label" className="field--label"><Input value={m.label} onChange={(v) => setMeta(i, 'label', v)} /></Field>
                <Field label="Value" className="field--value"><Input value={m.value} onChange={(v) => setMeta(i, 'value', v)} /></Field>
                <DelBtn onClick={() => setAt('about.meta', meta.filter((_, j) => j !== i))} />
              </ReorderPanel>
            )} />
          <Btn sm icon="plus" kind="ghost" onClick={() => setAt('about.meta', [...meta, { label: '', value: '' }])}>Add meta row</Btn>
        </Panel>
      </div>
      <Panel title="Bio copy">
        <Field label="Heading" hint="<em> for italic accent · ✨ to refine"><window.ADMIN_REFINER.RefineField label="About bio heading" context="The About section heading shown above the bio intro paragraph." rows={2} value={a.heading} onChange={(v) => setAt('about.heading', v)} /></Field>
        <Field label="Intro paragraph" hint="✨ to refine"><window.ADMIN_REFINER.RefineField label="About intro paragraph" context="The intro paragraph under the About heading." rows={2} value={a.intro} onChange={(v) => setAt('about.intro', v)} /></Field>
      </Panel>
      <Panel title="Impact timeline" sub={`${impact.length} entries · drag to reorder`}>
        <Reorderable items={impact} getKey={(m) => m.id || m.label}
          onReorder={(next) => setAt('about.impact', next)}
          renderItem={(m, i, { gripProps }) => (
            <div className="item__reorder">
              <span className="item__reorder-grip" {...gripProps} title="Drag to reorder"><AdminIcon name="grip" size={16} /></span>
              <div className="item__reorder-body">
                <window.ADMIN_REFINER.RefineImpactEntry
                  label={m.label}
                  html={m.html}
                  onLabelChange={(v) => setImpact(i, 'label', v)}
                  onHtmlChange={(v) => setImpact(i, 'html', v)}
                  onAccept={(p) => setImpactEntry(i, p)}
                  onDelete={() => setAt('about.impact', impact.filter((_, j) => j !== i))}
                  context="A short label and description pair in the About impact timeline (Now / Then / Before)."
                />
              </div>
            </div>
          )} />
        <Btn sm icon="plus" kind="ghost" onClick={() => setAt('about.impact', [...impact, { id: newImpactId(), label: '', html: '' }])}>Add timeline entry</Btn>
      </Panel>
    </div>
  );
}

/* One-time editor shown right after an SVG is picked. Confirms the file is a
   valid SVG (or explains it isn't), lets the owner rename it, and previews how
   it'll look once recolored to the site theme — every uploaded icon adopts the
   accent like the built-in ones, so it sits consistently in the grid. */
// Coerce a CSS color to a 6-digit hex for <input type="color"> (which only
// accepts #rrggbb). #rgb expands; anything else falls back to black.
function toHex6(c) {
  const s = String(c || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  const m = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (m) return ('#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toLowerCase();
  return '#000000';
}

function IconUploadModal({ draft, onSave, onClose }) {
  const { AdminIcon, Field, Segmented } = window.ADMIN_UI;
  const SS = window.SHARED_SCHEMA;
  // Mounted only while a draft exists (see ExpertiseEditor), so these initialise
  // fresh from the picked file each time the modal opens.
  const [name, setName] = useState(typeof (draft && draft.name) === 'string' ? draft.name : 'icon');
  // Each distinct color the SVG declares, mapped to how the owner wants it shown:
  // theme (accent), transparent (hidden), or a custom hex. Defaults to theme.
  const colors = draft && draft.svg ? SS.svgColors(draft.svg) : [];
  const [modes, setModes] = useState(() => {
    const o = {};
    colors.forEach((c) => { o[c] = { mode: 'theme', custom: toHex6(c) }; });
    return o;
  });
  const setMode = (c, patch) => setModes((s) => ({ ...s, [c]: { ...(s[c] || { mode: 'theme', custom: toHex6(c) }), ...patch } }));
  const targetFor = (c) => {
    const m = modes[c] || { mode: 'theme' };
    return m.mode === 'transparent' ? 'none' : m.mode === 'custom' ? toHex6(m.custom) : 'currentColor';
  };
  const map = {};
  colors.forEach((c) => { map[c] = targetFor(c); });
  const themed = !draft || !draft.svg ? ''
    : colors.length ? SS.recolorSvgMap(draft.svg, map) : SS.recolorSvg(draft.svg, 'currentColor');
  const save = () => onSave({ name: (String(name || '').trim() || 'icon').slice(0, 40), svg: themed });
  return (
    <div className="agentmodal" onMouseDown={onClose}>
      <div className="agentmodal__panel" style={{ width: 'min(420px, 100%)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="agentmodal__hd">
          <span className="agentmodal__title"><AdminIcon name="upload" size={15} /> {draft && draft.error ? 'Unsupported file' : 'Add icon'}</span>
          <button className="agentmodal__close" onClick={onClose} aria-label="Close"><AdminIcon name="x" size={16} /></button>
        </div>
        <div className="agentmodal__body">
          {draft && draft.error ? (
            <p className="helptext" style={{ color: '#e0a341', margin: 0 }}>⚠ {draft.error}<br /><br />Only <b>.svg</b> files are accepted — pick a vector icon and try again.</p>
          ) : (
            <>
              <div className="iconup__preview"><span className="skillicon" style={{ width: 40, height: 40 }} dangerouslySetInnerHTML={{ __html: themed }} /></div>
              <Field label="Icon name">
                <input className="inp" type="text" value={typeof name === 'string' ? name : ''}
                  placeholder="icon" onChange={(e) => setName(e.target.value)} />
              </Field>
              {colors.length > 0 ? (
                <Field label={colors.length === 1 ? 'Color' : `Colors (${colors.length})`}
                  hint="theme · transparent · custom">
                  {colors.map((c) => (
                    <div className="iconup__color" key={c}>
                      <span className="iconup__swatch" style={{ background: c }} title={c} />
                      <Segmented value={(modes[c] || {}).mode || 'theme'}
                        options={[{ value: 'theme', label: 'Theme' }, { value: 'transparent', label: 'Transparent' }, { value: 'custom', label: 'Custom' }]}
                        onChange={(v) => setMode(c, { mode: v })} />
                      {(modes[c] || {}).mode === 'custom' && (
                        <input type="color" className="iconup__pick" value={toHex6((modes[c] || {}).custom)}
                          onChange={(e) => setMode(c, { custom: e.target.value })} />
                      )}
                    </div>
                  ))}
                </Field>
              ) : (
                <p className="helptext" style={{ marginTop: 8 }}>This icon will use the site theme color, just like the other icons in this section.</p>
              )}
              <div className="iconup__ft">
                <button className="btn btn--sm" onClick={onClose}>Cancel</button>
                <button className="btn btn--sm btn--primary" onClick={save}>Add icon</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ EXPERTISE ============ */
function ExpertiseEditor({ content, setAt }) {
  const { PageHead, Panel, Field, Input, Select, AdminIcon, SkillIcon, Reorderable, ListItem } = window.ADMIN_UI;
  const list = content.expertise;
  const customIcons = content.icons || [];
  const [open, setOpen] = useState(null);
  const [iconDraft, setIconDraft] = useState(null); // {name,svg} pending the modal, or {error}
  const fileRef = React.useRef(null);
  const update = (i, key, val) => setAt('expertise', list.map((e, j) => j === i ? { ...e, [key]: val } : e));
  const renumber = (arr) => arr.map((e, i) => ({ ...e, num: String(i + 1).padStart(2, '0') }));
  const add = () => { const n = renumber([...list, { num: '', icon: 'automation', title: 'New module', sub: '' }]); setAt('expertise', n); setOpen(n.length - 1); };

  // Pick an SVG → sanitize → open the one-time editor modal (rename + preview).
  const onAddIcon = async (file) => {
    if (!file) return;
    const isSvg = /\.svg$/i.test(file.name || '') || file.type === 'image/svg+xml';
    if (!isSvg) { setIconDraft({ error: 'That file isn’t an SVG.' }); return; }
    let text = '';
    try { text = await file.text(); } catch (e) { setIconDraft({ error: 'Couldn’t read that file.' }); return; }
    const svg = (window.SHARED_SCHEMA && window.SHARED_SCHEMA.sanitizeSvg(text)) || '';
    if (!svg) { setIconDraft({ error: 'That doesn’t look like a valid SVG (or it’s too large).' }); return; }
    const name = (file.name || 'icon').replace(/\.svg$/i, '').slice(0, 40) || 'icon';
    setIconDraft({ name, svg });
  };
  const saveIcon = ({ name, svg }) => {
    const id = 'custom_' + Math.random().toString(36).slice(2, 10);
    setAt('icons', [...customIcons, { id, name, svg }]);
    setIconDraft(null);
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
      <Panel className="panel--expertise" title="Installed modules" sub={`${list.length} modules`} actions={<div className="panel__actions">
        <input ref={fileRef} type="file" accept="image/svg+xml,.svg" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; onAddIcon(f); }} />
        <button className="btn btn--sm btn--tall" type="button" title="Add Icon" onClick={() => fileRef.current && fileRef.current.click()}><AdminIcon name="upload" size={13} /><span className="btn__label">Add Icon</span></button>
        <button className="btn btn--sm btn--tall btn--primary" type="button" title="Add module" onClick={add}><AdminIcon name="plus" size={13} /><span className="btn__label">Add module</span></button>
      </div>}>
        <Reorderable items={list} getKey={(_, i) => i}
          onReorder={(next) => setAt('expertise', renumber(next))}
          renderItem={(e, i, { gripProps }) => (
            <ListItem layout="card" gripProps={gripProps} num={'MOD_' + (e.num || String(i + 1).padStart(2, '0'))}
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
      {iconDraft && <IconUploadModal draft={iconDraft} onSave={saveIcon} onClose={() => setIconDraft(null)} />}
    </div>
  );
}

/* ============ ACHIEVEMENTS / EDUCATION / CERTS (cards) ============ */
function CardsEditor({ content, setAt }) {
  const { PageHead, Panel, Field, DelBtn, Input, TextArea, Btn, BulletEditor, AdminIcon, Reorderable, ReorderPanel } = window.ADMIN_UI;
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
            c.id === 'education'
              ? <Field label="Body paragraph" hint="✨ to refine"><window.ADMIN_REFINER.RefineField label="Education description" context="The education description paragraph on the portfolio Education info card — coursework, clubs, and highlights beneath the degree and school name." rows={3} value={c.body} onChange={(v) => update(i, 'body', v)} /></Field>
              : <Field label="Body paragraph"><TextArea rows={3} value={c.body} onChange={(v) => update(i, 'body', v)} /></Field>
          )}
          {(c.items.length > 0 || (c.id !== 'offduty' && c.id !== 'education')) && (
            (c.id === 'achievements' || c.id === 'certifications')
              ? <Field label="List items" hint="drag to reorder"><BulletEditor items={c.items} onChange={(v) => update(i, 'items', v)} placeholder={c.id === 'achievements' ? 'Achievement' : 'Certification'} reorderable /></Field>
              : <Field label="List items"><BulletEditor items={c.items} onChange={(v) => update(i, 'items', v)} placeholder="List item" /></Field>
          )}
          {c.scores && c.scores.length >= 0 && c.id === 'education' && (
            <Field label="Score chips" hint="Drag to reorder">
              <Reorderable items={c.scores} getKey={(_, k) => k} onReorder={(next) => update(i, 'scores', next)}
                renderItem={(s, k, { gripProps }) => (
                  <ReorderPanel gripProps={gripProps} className="reorder-panel--fields">
                    <Field label="Label"><Input value={s.label} onChange={(v) => update(i, 'scores', c.scores.map((x, m) => m === k ? { ...x, label: v } : x))} /></Field>
                    <Field label="Value"><Input value={s.value} onChange={(v) => update(i, 'scores', c.scores.map((x, m) => m === k ? { ...x, value: v } : x))} /></Field>
                    <DelBtn onClick={() => update(i, 'scores', c.scores.filter((_, m) => m !== k))} />
                  </ReorderPanel>
                )} />
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
  const { PageHead, Panel, Field, Input, AdminIcon, Reorderable, inputStr } = window.ADMIN_UI;
  const c = content.contact;
  const setSocial = (i, key, val) => setAt('contact.socials', c.socials.map((s, j) => j === i ? { ...s, [key]: val } : s));
  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/CONTACT.SH" title="Contact & socials">Reach-me details and the social links shown in the contact window and footer.</PageHead>
      <Panel title="Message">
        <Field label="Heading" hint="<em> accent, <br/> line break · ✨ to refine"><window.ADMIN_REFINER.RefineField label="Contact message heading" context="The heading shown in the contact window above the intro paragraph." rows={2} value={c.heading} onChange={(v) => setAt('contact.heading', v)} /></Field>
        <Field label="Intro paragraph" hint="✨ to refine"><window.ADMIN_REFINER.RefineField label="Contact intro paragraph" context="The intro paragraph in the contact window beneath the heading." rows={2} value={c.intro} onChange={(v) => setAt('contact.intro', v)} /></Field>
      </Panel>
      <Panel title="Reach me at">
        <div className="row">
          <Field label="Email"><Input value={c.email} onChange={(v) => setAt('contact.email', v)} /></Field>
          <Field label="Phone"><Input value={c.phone} onChange={(v) => setAt('contact.phone', v)} /></Field>
        </div>
      </Panel>
      <Panel className="panel--social" title="Social links" sub={`${c.socials.length} links`}
        actions={<div className="panel__actions">
          <button className="btn btn--sm btn--primary" type="button" title="Add link"
            onClick={() => setAt('contact.socials', [...c.socials, { label: '', icon: 'web', href: '' }])}>
            <AdminIcon name="plus" size={13} /><span className="btn__label">Add link</span>
          </button>
        </div>}>
        {/* Inline row: grip · icon · label · icon dropdown · full-width URL · delete.
            The old title/sub column duplicated these fields and wrapped long URLs
            into an unreadable stack, so it's dropped in favour of one clean row. */}
        <Reorderable items={c.socials} getKey={(_, i) => i} onReorder={(next) => setAt('contact.socials', next)}
          renderItem={(s, i, { gripProps }) => (
            <div className="socirow">
              <span className="item__grip" {...gripProps} title="Drag to reorder"><AdminIcon name="grip" size={16} /></span>
              <span className="miniico"><AdminIcon name={SOCIAL_ICONS.includes(s.icon) ? s.icon : 'web'} size={16} /></span>
              <input className="inp socirow__label" value={inputStr(s.label)} placeholder="Label" onChange={(e) => setSocial(i, 'label', e.target.value)} />
              <select className="sel socirow__sel" value={s.icon} onChange={(e) => setSocial(i, 'icon', e.target.value)}>
                {SOCIAL_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </select>
              <input className="inp socirow__href" value={inputStr(s.href)} placeholder="https://" onChange={(e) => setSocial(i, 'href', e.target.value)} />
              <span className="iconbtn iconbtn--danger" onClick={() => setAt('contact.socials', c.socials.filter((_, j) => j !== i))} title="Delete"><AdminIcon name="trash" size={14} /></span>
            </div>
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
function VibeButton({ vibe, active, onClick, extended }) {
  return (
    <button type="button" className="vibe" data-on={active} data-extended={extended ? 'true' : undefined} onClick={onClick} title={vibe.desc}>
      <span className="vibe__swatch" style={{ background: vibe.cos.accent }} />
      <span className="vibe__txt"><b>{vibe.label}</b><span>{vibe.desc}</span></span>
    </button>
  );
}

/* Unsaved tweaks — dotted card shown when cosmetics diverge from last saved baseline. */
function UnsavedVibeCard({ active }) {
  return (
    <button
      type="button"
      className="vibe unsaved-vibe-card"
      data-on={active}
      title="Unsaved vibe · tweaks not saved to a slot"
      aria-label="Unsaved vibe"
      aria-pressed={active}
    >
      <span className="vibe__swatch unsaved-vibe-card__swatch" aria-hidden="true" />
      <span className="vibe__txt"><b>Unsaved vibe</b><span>Tweaks not saved to a slot</span></span>
    </button>
  );
}

/* Saved custom vibe card — mirrors preset vibe card layout. */
function CustomVibeCard({ slot, active, editing, onSelect, onEdit, onDelete }) {
  const { AdminIcon } = window.ADMIN_UI;
  const accent = (slot.cos && slot.cos.accent) || '#c8e856';
  const title = (slot.name && slot.name.trim()) ? slot.name.trim() : 'Untitled';
  const subtitle = _customVibeLabel(slot.id);

  return (
    <div className="vibe custom-vibe-card" data-on={active} data-editing={editing ? 'true' : undefined}>
      <button type="button" className="custom-vibe-card__main" onClick={onSelect} title={title + ' · ' + subtitle}>
        <span className="vibe__swatch" style={{ background: accent }} />
        <span className="vibe__txt"><b>{title}</b><span>{subtitle}</span></span>
      </button>
      <button
        type="button"
        className="custom-vibe-card__delete"
        onClick={(e) => { e.stopPropagation(); onDelete(slot); }}
        title="Delete custom vibe"
        aria-label="Delete custom vibe"
      >
        <AdminIcon name="x" size={10} />
      </button>
      <button
        type="button"
        className={'custom-vibe-card__edit' + (editing ? ' custom-vibe-card__edit--active' : '')}
        onClick={(e) => { e.stopPropagation(); onEdit(slot); }}
        title={editing ? 'Editing this vibe' : 'Edit custom vibe'}
        aria-label={editing ? 'Editing this vibe' : 'Edit custom vibe'}
        aria-pressed={editing}
      >
        <AdminIcon name="pencil" size={14} />
      </button>
    </div>
  );
}

function AppearanceEditor({ content, setAt }) {
  const { PageHead, Panel, Field, Select, Segmented, Swatches, ToggleRow, Input, AdminIcon, Btn } = window.ADMIN_UI;
  const { CUSTOM_VIBE_UI, getCustomVibeUiState, getCustomVibeDisplayId, snapshotCosForCompare, deleteCustomVibeSlot } = window.ADMIN_STORE;
  const c = content.cosmetics;
  const useAccentWallpaper = c.wallpaperUseAccent !== false;
  const wallpaperTint = useAccentWallpaper ? (c.accent || '#c8e856') : (c.wallpaperColor || c.accent || '#c8e856');
  const bgPattern = c.bgPattern || 'grid';
  const bgMeta = (_BG_SCHEMA.BG_PATTERN_META || {})[bgPattern] || { label: bgPattern, animated: false };
  const bgAnimated = !!bgMeta.animated;
  const bgCursorReactive = !!bgMeta.cursorReactive;
  const bgSupportsRandomness = bgMeta.supportsRandomness != null ? bgMeta.supportsRandomness : (bgAnimated && !bgCursorReactive);
  const wallpaperRandomness = c.wallpaperRandomness == null ? 40 : c.wallpaperRandomness;
  const chaosMode = wallpaperRandomness >= 95;
  const bgPatternLabel = bgMeta.label || bgPattern;
  const customVibes = useMemo(() => _coerceCustomVibes(c.customVibes), [c.customVibes]);
  const savedCustomVibes = customVibes;
  const cosBaselineRef = useRef(snapshotCosForCompare(c));
  const editIntentRef = useRef(null);
  const [cosBaseline, setCosBaseline] = useState(() => snapshotCosForCompare(c));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showAllVibes, setShowAllVibes] = useState(() => {
    try { return localStorage.getItem('amritos.vibes.showAll') === '1'; } catch (e) { return false; }
  });
  const [editingCustomId, setEditingCustomId] = useState(null);
  const [createName, setCreateName] = useState('');

  React.useEffect(() => {
    const baseline = snapshotCosForCompare(c);
    cosBaselineRef.current = baseline;
    setCosBaseline(baseline);
    if (editIntentRef.current && editIntentRef.current === c.vibe) {
      editIntentRef.current = null;
      return;
    }
    setEditingCustomId(null);
    setCreateName('');
  }, [c.vibe]);

  const vibeUiState = useMemo(
    () => getCustomVibeUiState(c, editingCustomId, cosBaseline),
    [c, editingCustomId, cosBaseline],
  );
  const vibeDisplayId = useMemo(
    () => getCustomVibeDisplayId(c, editingCustomId, cosBaseline),
    [c, editingCustomId, cosBaseline],
  );
  const showUnsavedCard = vibeDisplayId === CUSTOM_VIBE_UI.UNSAVED_ID;

  const setCosAt = useCallback((path, value) => {
    setAt(path, value);
  }, [setAt]);

  const applyVibe = (v) => {
    setAt('cosmetics', { ...c, ...v.cos, vibe: v.id, customVibes: c.customVibes || customVibes });
  };

  const applyCustomSlot = (slot) => {
    if (slot && slot.cos && typeof slot.cos === 'object') {
      setAt('cosmetics', { ...c, ...slot.cos, vibe: slot.id, customVibes });
    } else {
      setAt('cosmetics.vibe', slot.id);
    }
  };

  const handleSelectCustom = (slot) => {
    applyCustomSlot(slot);
    setAdvancedOpen(true);
  };

  const handleEditCustom = (slot) => {
    editIntentRef.current = slot.id;
    setEditingCustomId(slot.id);
    setCreateName(slot.name || '');
    setAdvancedOpen(true);
    if (c.vibe !== slot.id) {
      applyCustomSlot(slot);
    } else {
      const savedBaseline = snapshotCosForCompare(slot.cos || {});
      cosBaselineRef.current = savedBaseline;
      setCosBaseline(savedBaseline);
    }
  };

  const cancelCustomEdit = () => {
    if (!editingCustomId) return;
    const slot = customVibes.find((s) => s.id === editingCustomId);
    if (slot && slot.cos) {
      const restored = { ...c, ...slot.cos, vibe: editingCustomId, customVibes };
      setAt('cosmetics', restored);
      const baseline = snapshotCosForCompare(restored);
      cosBaselineRef.current = baseline;
      setCosBaseline(baseline);
    }
    setEditingCustomId(null);
    setCreateName('');
  };

  const handleDeleteCustom = (slot) => {
    if (!slot || !slot.id) return;
    const title = (slot.name && slot.name.trim()) ? slot.name.trim() : _customVibeLabel(slot.id);
    if (!confirm('Delete "' + title + '"? This removes the saved custom vibe from your draft.')) return;

    if (editingCustomId === slot.id) {
      setEditingCustomId(null);
      setCreateName('');
    }
    editIntentRef.current = null;

    const next = deleteCustomVibeSlot(c, slot.id);
    if (!next) return;
    setAt('cosmetics', next);
    const baseline = snapshotCosForCompare(next);
    cosBaselineRef.current = baseline;
    setCosBaseline(baseline);
  };

  const saveCustomFromPanel = () => {
    const snapshot = _SNAPSHOT_COS(c);
    const name = createName.trim();

    if (editingCustomId) {
      const idx = customVibes.findIndex((s) => s.id === editingCustomId);
      if (idx < 0) return;
      const next = customVibes.map((slot, i) => (i === idx ? { ...slot, name: name || slot.name, cos: snapshot } : slot));
      setAt('cosmetics', { ...c, vibe: editingCustomId, customVibes: next });
      setEditingCustomId(null);
      setCreateName('');
      cosBaselineRef.current = snapshot;
      setCosBaseline(snapshot);
      return;
    }

    const id = _nextCustomVibeId(customVibes);
    const num = _customVibeNum(id) || customVibes.length + 1;
    const newSlot = { id, name, label: 'Custom vibe ' + num, cos: snapshot };
    const next = [...customVibes, newSlot];
    setAt('cosmetics', { ...c, vibe: id, customVibes: next });
    setCreateName('');
    cosBaselineRef.current = snapshot;
    setCosBaseline(snapshot);
  };

  const vibeCount = VIBES.length;
  const savedCount = savedCustomVibes.length;
  const presetVibes = useMemo(() => {
    if (showAllVibes) return VIBES;
    return VIBES.filter((v) => !_isVibeHidden(v) || v.id === c.vibe);
  }, [showAllVibes, c.vibe]);
  const toggleShowAllVibes = () => {
    setShowAllVibes((prev) => {
      const next = !prev;
      try { localStorage.setItem('amritos.vibes.showAll', next ? '1' : '0'); } catch (e) { /* quota */ }
      return next;
    });
  };
  const showCreatePanel = advancedOpen && vibeUiState !== CUSTOM_VIBE_UI.APPLIED;
  const createPanelTitle = vibeUiState === CUSTOM_VIBE_UI.DIRTY_NEW
    ? 'Save as new vibe'
    : vibeUiState === CUSTOM_VIBE_UI.DIRTY_EDITING
      ? 'Save changes to custom vibe'
      : 'Edit custom vibe';
  const createPanelSub = vibeUiState === CUSTOM_VIBE_UI.DIRTY_NEW
    ? 'your tweaks differ from the last saved look — name and save as a new slot'
    : vibeUiState === CUSTOM_VIBE_UI.DIRTY_EDITING
      ? 'unsaved changes — save updates this slot or cancel to revert'
      : 'rename or save when you change settings below';
  const saveButtonLabel = editingCustomId ? 'Save changes' : 'Save custom vibe';
  const editingSlot = editingCustomId ? customVibes.find((s) => s.id === editingCustomId) : null;

  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/APPEARANCE.CFG" title="Appearance & cosmetics">Every site-wide tweak in one place — these become the published defaults visitors land on. Start from a vibe, then fine-tune below.</PageHead>

      <Panel
        className="panel--vibes"
        title="Vibes"
        sub={'one-click presets · ' + (showAllVibes ? vibeCount : VIBE_VISIBLE_COUNT) + ' shown · ' + vibeCount + ' total · ' + VIBE_CATEGORIES.length + ' categories'}
        actions={
          <button
            type="button"
            className="iconbtn vibes-toggle"
            onClick={toggleShowAllVibes}
            title={showAllVibes ? 'Show fewer vibes' : 'Show all vibes'}
            aria-label={showAllVibes ? 'Show fewer vibes' : 'Show all vibes'}
            aria-pressed={showAllVibes}
          >
            <AdminIcon name={showAllVibes ? 'chevron-up' : 'chevron-down'} size={16} />
          </button>
        }
      >
        {VIBE_CATEGORIES.map((cat) => {
          const items = presetVibes.filter((v) => v.category === cat.id);
          if (!items.length) return null;
          return (
            <div className="vibe-cat" key={cat.id}>
              <div className="vibe-cat__head">{cat.label}</div>
              <div className="vibes">
                {items.map((v) => (
                  <VibeButton
                    key={v.id}
                    vibe={v}
                    active={vibeDisplayId === v.id}
                    extended={_isVibeHidden(v)}
                    onClick={() => applyVibe(v)}
                  />
                ))}
              </div>
            </div>
          );
        })}
        <p className="helptext" style={{ marginTop: 12, marginBottom: 0 }}>A vibe sets accent, fonts, cursor, wallpaper density/brightness, glow &amp; corner style together — use view more settings below to fine-tune.</p>
      </Panel>

      <Panel
        title="Custom vibes"
        sub={savedCount + ' saved look' + (savedCount === 1 ? '' : 's')}
      >
        <div className="vibes custom-vibes__grid">
          <UnsavedVibeCard active={showUnsavedCard} />
          {savedCustomVibes.map((slot) => (
            <CustomVibeCard
              key={slot.id}
              slot={slot}
              active={vibeDisplayId === slot.id}
              editing={editingCustomId === slot.id}
              onSelect={() => handleSelectCustom(slot)}
              onEdit={handleEditCustom}
              onDelete={handleDeleteCustom}
            />
          ))}
        </div>
        {savedCount === 0 && !showUnsavedCard && (
          <p className="helptext" style={{ margin: '10px 0 0' }}>No custom vibes saved yet. Pick a preset, open view more settings, tweak settings, then save a new look.</p>
        )}
      </Panel>

      <button
        type="button"
        className="advanced-toggle"
        onClick={() => setAdvancedOpen((o) => !o)}
        aria-expanded={advancedOpen}
      >
        <AdminIcon name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={16} />
        {advancedOpen ? 'Hide settings' : 'View more settings'}
      </button>

      {advancedOpen && (
        <div className="appearance-advanced">
          <div className="grid2">
            <Panel title="Theme & color">
              <Field label="Default mode" hint="visitors can still toggle"><Segmented value={c.theme} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} onChange={(v) => setCosAt('cosmetics.theme', v)} /></Field>
              <Field label="Accent color"><Swatches value={c.accent} options={ACCENT_OPTIONS} onChange={(v) => setCosAt('cosmetics.accent', v)} /></Field>
              <Field label="Accent brightness" hint="darken ← → lighten"><RangeRow label="Shade" value={c.accentTone == null ? 50 : c.accentTone} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.accentTone', v)} /></Field>
              <p className="helptext" style={{ margin: '2px 0 0' }}>The browser-tab favicon (the pixel “AD” monogram) tints to this accent and follows light/dark mode automatically.</p>
            </Panel>
            <Panel title="Typography">
              <Field label="Font set" hint="display + body + mono"><Select value={c.type} options={TYPE_OPTIONS} onChange={(v) => setCosAt('cosmetics.type', v)} /></Field>
              <Field label="Heading font" hint="overrides headings only"><Select value={c.headingFont || 'match'} options={HEADING_FONTS} onChange={(v) => setCosAt('cosmetics.headingFont', v)} /></Field>
              <Field label="Letter spacing"><Segmented value={c.tracking || 'normal'} options={TRACKING_OPTIONS} onChange={(v) => setCosAt('cosmetics.tracking', v)} /></Field>
              <Field label="Base font size"><RangeRow label="Scale" value={c.fontScale} min={85} max={120} step={5} unit="%" onChange={(v) => setCosAt('cosmetics.fontScale', v)} /></Field>
            </Panel>
          </div>

          <Panel title="Wallpaper">
            <Field label="Pattern"><Select value={bgPattern} options={BG_PATTERNS} onChange={(v) => setCosAt('cosmetics.bgPattern', v)} /></Field>
            <p className="helptext" style={{ margin: '4px 0 0' }}>Patterns marked <span className="mono">✦ animated</span> open the animated wallpaper panel below for motion and per-pattern controls.</p>
            {!bgAnimated && (
              <>
                <Field label="Pattern brightness" hint="faint ← → vivid"><RangeRow label="Brightness" value={c.wallpaperBrightness == null ? 50 : c.wallpaperBrightness} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.wallpaperBrightness', v)} /></Field>
                <Field label="Pattern density" hint="sparse ← → dense"><RangeRow label="Density" value={c.wallpaperIntensity == null ? 50 : c.wallpaperIntensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.wallpaperIntensity', v)} /></Field>
              </>
            )}
            {bgPattern === 'honeycomb' && (
              <Field label="Honeycomb style" hint="outline = wire grid · fill = sparse filled cells"><Select value={c.honeycombStyle || 'outline'} options={HONEYCOMB_STYLE_OPTIONS} onChange={(v) => setCosAt('cosmetics.honeycombStyle', v)} /></Field>
            )}
            <ToggleRow title="Use accent for wallpaper" sub="when off, pick a separate tint below" value={useAccentWallpaper} onChange={(v) => setCosAt('cosmetics.wallpaperUseAccent', v)} />
            {!useAccentWallpaper && (
              <Field label="Wallpaper color"><Swatches value={c.wallpaperColor || c.accent} options={ACCENT_OPTIONS} onChange={(v) => setCosAt('cosmetics.wallpaperColor', v)} allowCustom={true} /></Field>
            )}
            {useAccentWallpaper && (
              <p className="helptext" style={{ margin: '4px 0 0' }}>Wallpaper tint follows accent (<span className="mono" style={{ color: wallpaperTint }}>{wallpaperTint}</span>).</p>
            )}
            <div className="divider" />
            <Field label="Vignette intensity" hint="0 off · higher = stronger edge fade"><RangeRow label="Intensity" value={c.vignetteIntensity == null ? 45 : c.vignetteIntensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.vignetteIntensity', v)} /></Field>
            <Field label="Vignette direction" hint="which edges/corners fade"><Select value={c.vignetteDirection || 'center'} options={VIGNETTE_DIRECTION_OPTIONS} onChange={(v) => setCosAt('cosmetics.vignetteDirection', v)} /></Field>
          </Panel>

          {bgAnimated && (
            <Panel title={bgPatternLabel + ' ✦'} sub="Animated wallpaper">
              <Field label="Pattern brightness" hint="faint ← → vivid"><RangeRow label="Brightness" value={c.wallpaperBrightness == null ? 50 : c.wallpaperBrightness} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.wallpaperBrightness', v)} /></Field>
              {bgPattern !== 'particles' && bgPattern !== 'fluidcore' && (
                <Field label="Pattern density" hint="sparse ← → dense"><RangeRow label="Density" value={c.wallpaperIntensity == null ? 50 : c.wallpaperIntensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.wallpaperIntensity', v)} /></Field>
              )}
              <Field label="Animation speed" hint={bgPattern === 'fluidcore' ? 'slow ← → fast (blob rotation)' : 'slow ← → fast'}><RangeRow label="Speed" value={c.wallpaperAnimSpeed == null ? 50 : c.wallpaperAnimSpeed} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.wallpaperAnimSpeed', v)} /></Field>
              <ToggleRow title="Freeze animation" sub="keep the pattern visible but stop motion" value={!!c.wallpaperAnimPaused} onChange={(v) => setCosAt('cosmetics.wallpaperAnimPaused', v)} />
              {bgSupportsRandomness && (
                <>
                  <Field label="Randomness" hint="0 = uniform (other sliders rule) · 100 = chaos (per-element direction, speed & phase override uniformity)">
                    <RangeRow label="Random" value={wallpaperRandomness} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.wallpaperRandomness', v)} />
                  </Field>
                  {chaosMode && (
                    <p className="helptext" style={{ margin: '4px 0 0' }}>At high randomness, direction and format sliders have less effect — motion splits across elements instead of staying uniform.</p>
                  )}
                </>
              )}

              <div className={chaosMode ? 'wallpaper-chaos-dim' : undefined}>
              {bgPattern === 'rain' && (
                <Field label="Rain direction" hint={chaosMode ? 'mostly overridden at 100% randomness' : 'angle of falling drops'}><Select value={c.rainDirection || 'down'} options={RAIN_DIRECTION_OPTIONS} onChange={(v) => setCosAt('cosmetics.rainDirection', v)} /></Field>
              )}
              {bgPattern === 'waves' && (
                <Field label="Wave direction" hint={chaosMode ? 'mostly overridden at 100% randomness' : 'travel direction for rolling bands'}><Select value={c.waveDirection || 'up'} options={WAVE_DIRECTION_OPTIONS} onChange={(v) => setCosAt('cosmetics.waveDirection', v)} /></Field>
              )}
              {bgPattern === 'cosmos' && (
                <>
                  <Field label="Star size" hint="small ← → large"><RangeRow label="Size" value={c.starSize == null ? 50 : c.starSize} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.starSize', v)} /></Field>
                  <Field label="Comet density" hint="rare ← → frequent"><RangeRow label="Comets" value={c.cometDensity == null ? 40 : c.cometDensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cometDensity', v)} /></Field>
                  <Field label="Comet direction" hint={chaosMode ? 'mostly overridden at 100% randomness' : 'travel angle for shooting stars'}><Select value={c.cometDirection || 'right-down'} options={COMET_DIRECTION_OPTIONS} onChange={(v) => setCosAt('cosmetics.cometDirection', v)} /></Field>
                </>
              )}
              {bgPattern === 'particles' && (
                <>
                  <Field label="Particle density" hint="sparse ← → dense (tile count)"><RangeRow label="Density" value={c.particleDensity == null ? 35 : c.particleDensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.particleDensity', v)} /></Field>
                  <Field label="Particle size" hint="small motes ← → large"><RangeRow label="Size" value={c.particleSize == null ? 45 : c.particleSize} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.particleSize', v)} /></Field>
                  <Field label="Particle opacity" hint="faint ← → vivid"><RangeRow label="Opacity" value={c.particleOpacity == null ? 70 : c.particleOpacity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.particleOpacity', v)} /></Field>
                  <Field label="Drift direction" hint={chaosMode ? 'mostly overridden at 100% randomness' : 'scroll vector for floating motes'}><Select value={c.particleDrift || 'up'} options={PARTICLE_DRIFT_OPTIONS} onChange={(v) => setCosAt('cosmetics.particleDrift', v)} /></Field>
                </>
              )}
              {bgCursorReactive && (
                <>
                  <Field label="Interact strength" hint="subtle ← → strong pointer response"><RangeRow label="Strength" value={c.cursorInteractStrength == null ? 55 : c.cursorInteractStrength} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorInteractStrength', v)} /></Field>
                  {(bgPattern === 'snowinteractive' || bgPattern === 'fireflies') && (
                    <Field label="Particle density" hint="sparse ← → dense"><RangeRow label="Density" value={c.cursorParticleDensity == null ? 40 : c.cursorParticleDensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorParticleDensity', v)} /></Field>
                  )}
                  {bgPattern === 'snowinteractive' && (
                    <Field label="Sweep radius" hint="small ← → wide cursor clear area"><RangeRow label="Sweep" value={c.cursorSweepRadius == null ? 50 : c.cursorSweepRadius} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorSweepRadius', v)} /></Field>
                  )}
                </>
              )}
              {bgPattern === 'binarystream' && (
                <>
                  <Field label="Number format" hint={chaosMode ? 'mostly overridden at 100% randomness' : 'glyph set for data stream'}><Select value={c.numberFormat || 'binary'} options={NUMBER_FORMAT_OPTIONS} onChange={(v) => setCosAt('cosmetics.numberFormat', v)} /></Field>
                  <Field label="Font size" hint="small ← → large"><RangeRow label="Size" value={c.binaryFontSize == null ? 50 : c.binaryFontSize} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.binaryFontSize', v)} /></Field>
                </>
              )}
              {bgPattern === 'fluidcore' && (
                <>
                  <Field label="Blob size" hint="small ← → large (viewport scale)"><RangeRow label="Size" value={c.fluidSize == null ? 50 : c.fluidSize} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.fluidSize', v)} /></Field>
                  <Field label="Morph speed" hint="calm ← → lively shape + internal flow"><RangeRow label="Morph" value={c.fluidMorphSpeed == null ? 45 : c.fluidMorphSpeed} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.fluidMorphSpeed', v)} /></Field>
                  <p className="helptext" style={{ margin: '4px 0 0' }}>Animation speed above controls blob rotation; morph speed changes how fast the silhouette and internal flow shift.</p>
                </>
              )}
              {bgPattern === 'honeycombGlow' && (
                <Field label="Glow density" hint="few hexes lit ← → many glowing at once"><RangeRow label="Glow max" value={c.honeycombGlowDensity == null ? 50 : c.honeycombGlowDensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.honeycombGlowDensity', v)} /></Field>
              )}
              </div>
            </Panel>
          )}

          <Panel title="Effects & cursor">
            <div className="effects-split-row">
              <Field label="Corner radius" hint="UI boxes & windows"><Segmented value={c.radius || 'soft'} options={RADIUS_OPTIONS} onChange={(v) => setCosAt('cosmetics.radius', v)} /></Field>
              <Field label="Cursor effect" hint="global overlay — works on any wallpaper"><Select value={c.cursorEffect || 'none'} options={CURSOR_EFFECT_OPTIONS} onChange={(v) => setCosAt('cosmetics.cursorEffect', v)} /></Field>
            </div>
            <div className="effects-cursor-sliders">
            {(c.cursorEffect || 'none') === 'trail' && (
              <>
                <Field label="Trail style"><Select value={c.cursorEffectTrailStyle || 'glow'} options={CURSOR_EFFECT_TRAIL_STYLE_OPTIONS} onChange={(v) => setCosAt('cosmetics.cursorEffectTrailStyle', v)} /></Field>
                <Field label="Trail length" hint="short ← → long"><RangeRow label="Length" value={c.cursorEffectTrailLength == null ? 50 : c.cursorEffectTrailLength} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorEffectTrailLength', v)} /></Field>
                <Field label="Effect intensity" hint="subtle ← → vivid"><RangeRow label="Intensity" value={c.cursorEffectIntensity == null ? 55 : c.cursorEffectIntensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorEffectIntensity', v)} /></Field>
              </>
            )}
            {(c.cursorEffect || 'none') === 'comet' && (
              <>
                <Field label="Comet direction"><Select value={c.cursorEffectCometDirection || 'cursor'} options={CURSOR_EFFECT_COMET_DIRECTION_OPTIONS} onChange={(v) => setCosAt('cosmetics.cursorEffectCometDirection', v)} /></Field>
                <Field label="Comet intensity" hint="sparse ← → frequent"><RangeRow label="Intensity" value={c.cursorEffectCometIntensity == null ? 50 : c.cursorEffectCometIntensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorEffectCometIntensity', v)} /></Field>
                <Field label="Comet speed" hint="slow ← → fast"><RangeRow label="Speed" value={c.cursorEffectCometSpeed == null ? 50 : c.cursorEffectCometSpeed} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorEffectCometSpeed', v)} /></Field>
              </>
            )}
            {(c.cursorEffect || 'none') === 'ripple' && (
              <>
                <Field label="Effect intensity" hint="subtle ← → vivid (ring brightness)"><RangeRow label="Intensity" value={c.cursorEffectIntensity == null ? 55 : c.cursorEffectIntensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorEffectIntensity', v)} /></Field>
                <Field label="Ripple count" hint="1 ring ← → 8 staggered waves"><RangeRow label="Count" value={c.cursorEffectRippleCount == null ? 50 : c.cursorEffectRippleCount} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorEffectRippleCount', v)} /></Field>
                <Field label="Ripple speed" hint="slow expansion ← → fast"><RangeRow label="Speed" value={c.cursorEffectRippleSpeed == null ? 50 : c.cursorEffectRippleSpeed} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorEffectRippleSpeed', v)} /></Field>
              </>
            )}
            {['spark', 'glow'].includes(c.cursorEffect || '') && (
              <Field label="Effect intensity" hint="subtle ← → vivid"><RangeRow label="Intensity" value={c.cursorEffectIntensity == null ? 55 : c.cursorEffectIntensity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorEffectIntensity', v)} /></Field>
            )}
            </div>
            <Field label="Accent glow" hint="bloom on accent-colored UI" className="effects-accent-glow"><RangeRow label="Bloom" value={c.glow == null ? 100 : c.glow} min={0} max={160} step={10} unit="%" onChange={(v) => setCosAt('cosmetics.glow', v)} /></Field>
            <Field label="Ring follow" hint="snappy ← → floaty (ring & trail cursors)"><RangeRow label="Lag" value={c.cursorRingLag == null ? 50 : c.cursorRingLag} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.cursorRingLag', v)} /></Field>
            <Field label="Panel translucency" hint="opaque ← → glassy windows & cards"><RangeRow label="Glass" value={c.uiGlassOpacity == null ? 0 : c.uiGlassOpacity} min={0} max={100} step={5} unit="" onChange={(v) => setCosAt('cosmetics.uiGlassOpacity', v)} /></Field>
            <div className="divider" />
            <ToggleRow title="CRT scanlines" sub="retro overlay across the page" value={c.scanlines} onChange={(v) => setCosAt('cosmetics.scanlines', v)} />
            <div className="grid2" style={{ marginBottom: 0 }}>
              <Field label="Cursor type"><Select value={c.cursorStyle} options={CURSOR_STYLES} onChange={(v) => setCosAt('cosmetics.cursorStyle', v)} /></Field>
              <Field label="Cursor color"><Swatches value={c.cursorColor} options={CURSOR_COLOR_OPTIONS} onChange={(v) => setCosAt('cosmetics.cursorColor', v)} /></Field>
            </div>
          </Panel>

          <Panel title="Bot avatar">
            <div className="grid2" style={{ marginBottom: 0 }}>
              <Field label="Icon style"><Select value={c.botIcon} options={BOT_ICONS} onChange={(v) => setCosAt('cosmetics.botIcon', v)} /></Field>
              <Field label="Icon color"><Segmented value={c.botIconColor} options={[{ value: 'white', label: 'White' }, { value: 'accent', label: 'Accent' }]} onChange={(v) => setCosAt('cosmetics.botIconColor', v)} /></Field>
            </div>
          </Panel>

          {showCreatePanel && (
            <>
              <div className="divider" style={{ margin: '20px 0' }} />
              <Panel title={createPanelTitle} sub={createPanelSub} className="custom-vibes__create" data-vibe-state={vibeUiState}>
                <Field label="Vibe name" hint="shown on the card">
                  <Input
                    value={createName}
                    placeholder={editingCustomId ? ((editingSlot && editingSlot.name) || _customVibeLabel(editingCustomId)) : 'My midnight terminal'}
                    onChange={setCreateName}
                  />
                </Field>
                <div className="custom-vibes__actions">
                  <Btn kind="primary" onClick={saveCustomFromPanel}>
                    <AdminIcon name="save" size={13} />
                    {saveButtonLabel}
                  </Btn>
                  {editingCustomId && (
                    <>
                      <Btn kind="ghost" onClick={cancelCustomEdit}>Cancel</Btn>
                      <Btn kind="ghost" onClick={() => editingSlot && handleDeleteCustom(editingSlot)}>
                        <AdminIcon name="trash" size={13} />
                        Delete vibe
                      </Btn>
                    </>
                  )}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}

window.ADMIN_EDITORS = { HeroEditor, AboutEditor, ExpertiseEditor, CardsEditor, ContactEditor, MediaEditor, AppearanceEditor, TARGETS, EXPERTISE_ICONS, VIBES, ACCENT_OPTIONS };
