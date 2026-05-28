// Atlas Admin — content + cosmetics editor.
// Persists changes to localStorage under `amritdash:portfolio:overrides`
// so the public site renders them immediately. Firebase persistence is
// stubbed for the next milestone.

import { deepMerge, getOverrides, setOverrides, clearOverrides } from '../js/data.js';

/* ----------------- AUTH ----------------- */
const AUTH_KEY = 'amritdash:admin:session';
const VALID = { user: 'admin', pass: 'admin' };

const loginShell = document.getElementById('login-shell');
const app = document.getElementById('app');

function isAuthed() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}
function setAuthed(v) {
  if (v) sessionStorage.setItem(AUTH_KEY, '1');
  else sessionStorage.removeItem(AUTH_KEY);
}
function refreshAuthUI() {
  if (isAuthed()) {
    loginShell.style.display = 'none';
    app.hidden = false;
  } else {
    loginShell.style.display = '';
    app.hidden = true;
  }
}
function tryLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const ok = u === VALID.user && p === VALID.pass;
  document.getElementById('login-error').hidden = ok;
  if (ok) {
    setAuthed(true);
    refreshAuthUI();
    initApp();
  }
}
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  tryLogin();
});
document.getElementById('login-form').querySelectorAll('input').forEach(inp => {
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tryLogin(); } });
});
document.getElementById('logout-btn')?.addEventListener('click', () => {
  setAuthed(false);
  location.reload();
});
refreshAuthUI();

/* ----------------- STATE ----------------- */
let baseData = null;     // shipped portfolio.json
let workingData = null;  // base + current overrides being edited
let saveTimer = null;
const status = document.getElementById('save-status');

async function fetchBase() {
  const res = await fetch('../data/portfolio.json', { cache: 'no-store' });
  return res.json();
}

function commit() {
  // Compute diff between workingData and baseData → overrides object.
  const overrides = diff(baseData, workingData);
  setOverrides(overrides);
  status.classList.add('is-pending');
  status.textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    status.classList.remove('is-pending');
    status.textContent = 'Saved · live preview right →';
    refreshPreview();
  }, 220);
}

function refreshPreview() {
  const f = document.getElementById('preview-frame');
  if (!f) return;
  // Primary path: tell the iframe to reload via postMessage. Same-origin so
  // it always reaches the public site's listener.
  try { f.contentWindow.postMessage('amritdash:refresh', '*'); } catch (_) { /* */ }
  // Fallback: explicit reload via location.replace, in case the listener
  // wasn't attached yet (first paint) or postMessage was somehow ignored.
  setTimeout(() => {
    try { f.contentWindow.location.replace('/?preview=1&t=' + Date.now()); }
    catch (_) { f.src = '/?preview=1&t=' + Date.now(); }
  }, 400);
}

// Minimal diff: returns the parts of `cur` that differ from `orig`.
function diff(orig, cur) {
  if (Array.isArray(cur)) {
    if (Array.isArray(orig) && JSON.stringify(orig) === JSON.stringify(cur)) return undefined;
    return cur;
  }
  if (cur === null || typeof cur !== 'object') {
    return orig === cur ? undefined : cur;
  }
  const out = {};
  for (const k of Object.keys(cur)) {
    const d = diff(orig ? orig[k] : undefined, cur[k]);
    if (d !== undefined) out[k] = d;
  }
  return Object.keys(out).length ? out : undefined;
}

/* ----------------- APP INIT ----------------- */
async function initApp() {
  if (!isAuthed()) return;
  baseData = await fetchBase();
  workingData = deepMerge(baseData, getOverrides());
  bindSideNav();
  renderTab('identity');
  document.getElementById('refresh-preview').addEventListener('click', refreshPreview);
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('Reset all admin changes and restore portfolio.json?')) return;
    clearOverrides();
    workingData = JSON.parse(JSON.stringify(baseData));
    renderTab(currentTab);
    refreshPreview();
  });
  document.getElementById('export-btn').addEventListener('click', exportJSON);
}
if (isAuthed()) initApp();

/* ----------------- TABS ----------------- */
const titles = {
  identity: ['Identity', 'Top-level info shown across the site.'],
  about: ['About & Stats', 'Bio copy and the headline metrics under the photo.'],
  expertise: ['Skills', 'Bento grid groups and items.'],
  experience: ['Experience', 'Timeline of roles. The first item with “current” shows the live pill.'],
  projects: ['Projects', 'Bento card grid + modal. Drop images and crop to 16 : 10.'],
  education: ['Education', 'Cards in the Education section.'],
  achievements: ['Achievements', 'Three-up cards under Achievements.'],
  certifications: ['Certifications', 'Pill list under the Education section.'],
  cv: ['CV Files', 'PDF that gets downloaded — one for each theme.'],
  theme: ['Theme & Cosmetics', 'Default mode, accent colors, fonts and motion preferences.'],
  settings: ['Settings', 'Account, persistence target and import / export.'],
};

let currentTab = 'identity';
function bindSideNav() {
  document.querySelectorAll('#side-nav button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#side-nav button').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      renderTab(b.dataset.tab);
    });
  });
}

function renderTab(tab) {
  currentTab = tab;
  const [title, sub] = titles[tab] || [tab, ''];
  document.getElementById('tab-title').textContent = title;
  document.getElementById('tab-sub').textContent = sub;
  const body = document.getElementById('editor-body');
  body.innerHTML = '';
  switch (tab) {
    case 'identity': body.appendChild(buildIdentity()); break;
    case 'about': body.appendChild(buildAbout()); break;
    case 'expertise': body.appendChild(buildExpertise()); break;
    case 'experience': body.appendChild(buildExperience()); break;
    case 'projects': body.appendChild(buildProjects()); break;
    case 'education': body.appendChild(buildEducation()); break;
    case 'achievements': body.appendChild(buildAchievements()); break;
    case 'certifications': body.appendChild(buildCertifications()); break;
    case 'cv': body.appendChild(buildCV()); break;
    case 'theme': body.appendChild(buildTheme()); break;
    case 'settings': body.appendChild(buildSettings()); break;
  }
}

/* ----------------- BUILDERS ----------------- */
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function field(label, value, onInput, { type = 'text', placeholder = '' } = {}) {
  const node = el(`<label class="field"><span>${escape(label)}</span>${
    type === 'textarea'
      ? `<textarea placeholder="${escape(placeholder)}"></textarea>`
      : `<input type="${type}" placeholder="${escape(placeholder)}" />`
  }</label>`);
  const input = node.querySelector(type === 'textarea' ? 'textarea' : 'input');
  if (value != null) input.value = value;
  input.addEventListener('input', () => onInput(input.value));
  return node;
}

function listSection(title, addLabel, items, render, onAdd) {
  const wrap = el(`<section><h2>${escape(title)}</h2><div class="list"></div><div class="add-row"><button class="btn btn--accent">+ ${escape(addLabel)}</button></div></section>`);
  const list = wrap.querySelector('.list');
  items.forEach((it, i) => list.appendChild(render(it, i)));
  wrap.querySelector('.btn').addEventListener('click', () => {
    onAdd();
    renderTab(currentTab);
  });
  return wrap;
}

function deleteButton(onClick) {
  const b = el(`<button class="btn btn--ghost">Delete</button>`);
  b.addEventListener('click', onClick);
  return b;
}

function buildIdentity() {
  const id = workingData.identity = workingData.identity || {};
  const root = document.createDocumentFragment();
  const s = el('<section><h2>Top of page</h2><div class="grid grid--2"></div></section>');
  const g = s.querySelector('.grid');
  g.appendChild(field('Name', id.name, v => { id.name = v; commit(); }));
  g.appendChild(field('Role / title', id.role, v => { id.role = v; commit(); }));
  g.appendChild(field('Location', id.location, v => { id.location = v; commit(); }));
  g.appendChild(field('Available label', id.availableLabel, v => { id.availableLabel = v; commit(); }));
  g.appendChild(field('Tagline (under name)', id.tagline, v => { id.tagline = v; commit(); }, { type: 'textarea' }));
  root.appendChild(s);

  const s2 = el('<section><h2>Status &amp; Contact</h2><div class="grid grid--2"></div></section>');
  const g2 = s2.querySelector('.grid');
  const toggle = el(`<label class="field"><span>Available for work</span>
    <select><option value="true">Yes — show pill</option><option value="false">No — hide pill</option></select></label>`);
  toggle.querySelector('select').value = id.available ? 'true' : 'false';
  toggle.querySelector('select').addEventListener('change', e => { id.available = e.target.value === 'true'; commit(); });
  g2.appendChild(toggle);
  g2.appendChild(field('Email', id.email, v => { id.email = v; commit(); }));
  g2.appendChild(field('Phone', id.phone, v => { id.phone = v; commit(); }));
  g2.appendChild(field('Website', id.website, v => { id.website = v; commit(); }));
  root.appendChild(s2);

  const s3 = el('<section><h2>Social links</h2><div class="grid grid--2"></div></section>');
  const g3 = s3.querySelector('.grid');
  id.socials = id.socials || {};
  ['linkedin', 'github', 'instagram', 'whatsapp', 'aboutme'].forEach(k => {
    g3.appendChild(field(k[0].toUpperCase() + k.slice(1), id.socials[k] || '', v => { id.socials[k] = v; commit(); }));
  });
  root.appendChild(s3);

  const s4 = el('<section><h2>Profile photo</h2></section>');
  const photoRow = el('<div class="swatch-row"></div>');
  const thumb = el(`<div class="thumb" style="aspect-ratio:4/5; width:120px; background-image:url('${normalizeAsset(id.photoRetina || id.photo || '')}')"></div>`);
  const up = uploader('Replace photo', (dataUrl) => {
    openCrop(dataUrl, 4 / 5, (cropped) => {
      id.photo = cropped;
      id.photoRetina = cropped;
      thumb.style.backgroundImage = `url('${cropped}')`;
      commit();
    });
  });
  photoRow.appendChild(thumb);
  photoRow.appendChild(up);
  s4.appendChild(photoRow);
  root.appendChild(s4);

  return root;
}

function buildAbout() {
  const a = workingData.about = workingData.about || {};
  const root = document.createDocumentFragment();
  const s = el('<section><h2>Copy</h2><div class="grid"></div></section>');
  const g = s.querySelector('.grid');
  g.appendChild(field('Intro paragraph', a.intro, v => { a.intro = v; commit(); }, { type: 'textarea' }));
  g.appendChild(field('Body paragraph', a.body, v => { a.body = v; commit(); }, { type: 'textarea' }));
  root.appendChild(s);

  a.stats = a.stats || [];
  const sect = listSection('Headline stats', 'Add stat', a.stats, (stat, i) => {
    const item = el(`<div class="list-item"><div class="row"></div></div>`);
    const row = item.querySelector('.row');
    row.appendChild(field('Value', stat.value, v => { a.stats[i].value = v; commit(); }));
    row.appendChild(field('Label', stat.label, v => { a.stats[i].label = v; commit(); }));
    const acts = el('<div class="list-actions"></div>');
    acts.appendChild(deleteButton(() => { a.stats.splice(i, 1); commit(); renderTab(currentTab); }));
    item.appendChild(acts);
    return item;
  }, () => a.stats.push({ value: '0', label: 'New stat' }));
  root.appendChild(sect);

  return root;
}

function buildExpertise() {
  workingData.expertise = workingData.expertise || [];
  const groups = workingData.expertise;
  return listSection('Skill groups', 'Add group', groups, (g, i) => {
    const item = el('<div class="list-item"></div>');
    item.appendChild(field('Group name', g.group, v => { groups[i].group = v; commit(); }));
    item.appendChild(field('Items (comma-separated)', (g.items || []).join(', '), v => {
      groups[i].items = v.split(',').map(s => s.trim()).filter(Boolean);
      commit();
    }, { type: 'textarea' }));
    const acts = el('<div class="list-actions"></div>');
    acts.appendChild(deleteButton(() => { groups.splice(i, 1); commit(); renderTab(currentTab); }));
    item.appendChild(acts);
    return item;
  }, () => groups.push({ group: 'New group', items: [] }));
}

function buildExperience() {
  workingData.experience = workingData.experience || [];
  const items = workingData.experience;
  return listSection('Experience', 'Add role', items, (it, i) => {
    const card = el('<div class="list-item"></div>');
    const row = el('<div class="grid grid--2"></div>');
    row.appendChild(field('Role', it.role, v => { items[i].role = v; commit(); }));
    row.appendChild(field('Company', it.company, v => { items[i].company = v; commit(); }));
    row.appendChild(field('Period', it.period, v => { items[i].period = v; commit(); }));
    const cur = el(`<label class="field"><span>Highlight as current</span>
      <select><option value="false">No</option><option value="true">Yes</option></select></label>`);
    cur.querySelector('select').value = it.current ? 'true' : 'false';
    cur.querySelector('select').addEventListener('change', e => { items[i].current = e.target.value === 'true'; commit(); });
    row.appendChild(cur);
    card.appendChild(row);
    card.appendChild(field('Summary', it.summary, v => { items[i].summary = v; commit(); }, { type: 'textarea' }));
    card.appendChild(field('Tags (comma-separated)', (it.tags || []).join(', '), v => {
      items[i].tags = v.split(',').map(s => s.trim()).filter(Boolean);
      commit();
    }));
    const acts = el('<div class="list-actions"></div>');
    if (i > 0) {
      const up = el('<button class="btn btn--ghost">↑ Move up</button>');
      up.addEventListener('click', () => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; commit(); renderTab(currentTab); });
      acts.appendChild(up);
    }
    if (i < items.length - 1) {
      const dn = el('<button class="btn btn--ghost">↓ Move down</button>');
      dn.addEventListener('click', () => { [items[i + 1], items[i]] = [items[i], items[i + 1]]; commit(); renderTab(currentTab); });
      acts.appendChild(dn);
    }
    acts.appendChild(deleteButton(() => { items.splice(i, 1); commit(); renderTab(currentTab); }));
    card.appendChild(acts);
    return card;
  }, () => items.unshift({
    role: 'New role', company: 'Company', period: 'Year — Year',
    summary: '', tags: [], current: false,
  }));
}

function buildProjects() {
  workingData.projects = workingData.projects || [];
  const items = workingData.projects;
  return listSection('Projects', 'Add project', items, (p, i) => {
    const card = el('<div class="list-item"></div>');
    const row = el('<div class="grid grid--2"></div>');
    row.appendChild(field('Title', p.title, v => { items[i].title = v; commit(); }));
    row.appendChild(field('Category', p.category, v => { items[i].category = v; commit(); }));
    card.appendChild(row);
    card.appendChild(field('Summary', p.summary, v => { items[i].summary = v; commit(); }, { type: 'textarea' }));
    card.appendChild(field('Tags (comma-separated)', (p.tags || []).join(', '), v => {
      items[i].tags = v.split(',').map(s => s.trim()).filter(Boolean);
      commit();
    }));

    const mediaRow = el('<div class="swatch-row"></div>');
    const thumb = el(`<div class="thumb" style="background-image:url('${normalizeAsset(p.image)}')"></div>`);
    const up = uploader('Upload thumbnail (auto-cropped to 16 : 10)', (dataUrl) => {
      openCrop(dataUrl, 16 / 10, (cropped) => {
        items[i].image = cropped;
        thumb.style.backgroundImage = `url('${cropped}')`;
        commit();
      });
    });
    mediaRow.appendChild(thumb);
    mediaRow.appendChild(up);
    card.appendChild(mediaRow);

    // Links
    p.links = p.links || [];
    const linkWrap = el(`<div><h2 style="margin-top:14px">Links</h2><div class="links"></div>
      <div class="add-row"><button class="btn btn--ghost">+ Add link</button></div></div>`);
    const linksList = linkWrap.querySelector('.links');
    p.links.forEach((l, li) => {
      const lrow = el('<div class="list-item"><div class="row"></div></div>');
      const r = lrow.querySelector('.row');
      r.appendChild(field('Label', l.label, v => { p.links[li].label = v; commit(); }));
      r.appendChild(field('URL', l.url, v => { p.links[li].url = v; commit(); }));
      const acts = el('<div class="list-actions"></div>');
      acts.appendChild(deleteButton(() => { p.links.splice(li, 1); commit(); renderTab(currentTab); }));
      lrow.appendChild(acts);
      linksList.appendChild(lrow);
    });
    linkWrap.querySelector('.btn').addEventListener('click', () => {
      p.links.push({ label: 'New link', url: 'https://' });
      commit();
      renderTab(currentTab);
    });
    card.appendChild(linkWrap);

    const acts = el('<div class="list-actions"></div>');
    if (i > 0) {
      const upBtn = el('<button class="btn btn--ghost">↑</button>');
      upBtn.addEventListener('click', () => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; commit(); renderTab(currentTab); });
      acts.appendChild(upBtn);
    }
    if (i < items.length - 1) {
      const dn = el('<button class="btn btn--ghost">↓</button>');
      dn.addEventListener('click', () => { [items[i + 1], items[i]] = [items[i], items[i + 1]]; commit(); renderTab(currentTab); });
      acts.appendChild(dn);
    }
    acts.appendChild(deleteButton(() => { items.splice(i, 1); commit(); renderTab(currentTab); }));
    card.appendChild(acts);
    return card;
  }, () => items.push({
    id: 'project-' + Date.now(),
    title: 'New project', category: 'Category', summary: '',
    image: 'images/portfolio/coffeeMapper.jpg', tags: [], links: [],
  }));
}

function buildEducation() {
  workingData.education = workingData.education || [];
  return listSection('Education entries', 'Add entry', workingData.education, (it, i) => {
    const card = el('<div class="list-item"></div>');
    const row = el('<div class="grid grid--2"></div>');
    row.appendChild(field('Title', it.title, v => { workingData.education[i].title = v; commit(); }));
    row.appendChild(field('Subtitle', it.subtitle, v => { workingData.education[i].subtitle = v; commit(); }));
    row.appendChild(field('Period', it.period, v => { workingData.education[i].period = v; commit(); }));
    card.appendChild(row);
    card.appendChild(field('Body', it.body, v => { workingData.education[i].body = v; commit(); }, { type: 'textarea' }));
    const acts = el('<div class="list-actions"></div>');
    acts.appendChild(deleteButton(() => { workingData.education.splice(i, 1); commit(); renderTab(currentTab); }));
    card.appendChild(acts);
    return card;
  }, () => workingData.education.push({ title: 'New', subtitle: '', period: '', body: '' }));
}

function buildAchievements() {
  workingData.achievements = workingData.achievements || [];
  return listSection('Achievements', 'Add achievement', workingData.achievements, (it, i) => {
    const card = el('<div class="list-item"></div>');
    card.appendChild(field('Title', it.title, v => { workingData.achievements[i].title = v; commit(); }));
    card.appendChild(field('Body', it.body, v => { workingData.achievements[i].body = v; commit(); }, { type: 'textarea' }));
    const acts = el('<div class="list-actions"></div>');
    acts.appendChild(deleteButton(() => { workingData.achievements.splice(i, 1); commit(); renderTab(currentTab); }));
    card.appendChild(acts);
    return card;
  }, () => workingData.achievements.push({ title: 'New achievement', body: '' }));
}

function buildCertifications() {
  workingData.certifications = workingData.certifications || [];
  const wrap = el('<section><h2>Certifications</h2><div class="list"></div><div class="add-row"><button class="btn btn--accent">+ Add cert</button></div></section>');
  const list = wrap.querySelector('.list');
  workingData.certifications.forEach((c, i) => {
    const card = el('<div class="list-item"><div class="row"></div></div>');
    card.querySelector('.row').appendChild(field('Certification', c, v => { workingData.certifications[i] = v; commit(); }));
    const acts = el('<div class="list-actions"></div>');
    acts.appendChild(deleteButton(() => { workingData.certifications.splice(i, 1); commit(); renderTab(currentTab); }));
    card.appendChild(acts);
    list.appendChild(card);
  });
  wrap.querySelector('.btn').addEventListener('click', () => {
    workingData.certifications.push('New certification');
    commit();
    renderTab(currentTab);
  });
  return wrap;
}

function buildCV() {
  workingData.cv = workingData.cv || {};
  const root = document.createDocumentFragment();
  const note = el(`<section><p class="muted">The site picks the matching CV based on the current theme. Replace either PDF below. Files are stored locally as a data URL for now — once Firebase Storage is wired up they will sync to the cloud.</p></section>`);
  root.appendChild(note);

  ['dark', 'light'].forEach((mode) => {
    const s = el(`<section><h2>${mode === 'dark' ? 'Dark mode CV' : 'Light mode CV'}</h2></section>`);
    const row = el('<div class="swatch-row"></div>');
    const link = el(`<a class="btn btn--ghost" target="_blank" rel="noopener">Open current</a>`);
    link.href = normalizeAsset(workingData.cv[mode] || '');
    row.appendChild(link);
    row.appendChild(uploader(`Upload ${mode}-mode PDF`, (dataUrl, file) => {
      if (file && file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      workingData.cv[mode] = dataUrl;
      link.href = dataUrl;
      commit();
    }, 'application/pdf'));
    s.appendChild(row);
    root.appendChild(s);
  });
  return root;
}

function buildTheme() {
  workingData.theme = workingData.theme || {};
  const t = workingData.theme;
  const root = document.createDocumentFragment();
  const s = el('<section><h2>Defaults</h2><div class="grid grid--2"></div></section>');
  const g = s.querySelector('.grid');

  const mode = el(`<label class="field"><span>Default theme mode</span>
    <select><option value="dark">Dark</option><option value="light">Light</option></select></label>`);
  mode.querySelector('select').value = t.defaultMode || 'dark';
  mode.querySelector('select').addEventListener('change', e => { t.defaultMode = e.target.value; commit(); });
  g.appendChild(mode);

  const cursor = el(`<label class="field"><span>Cursor style</span>
    <select><option value="glow">Glow follower</option><option value="off">System default</option></select></label>`);
  cursor.querySelector('select').value = t.cursor || 'glow';
  cursor.querySelector('select').addEventListener('change', e => { t.cursor = e.target.value; commit(); });
  g.appendChild(cursor);

  const particles = el(`<label class="field"><span>Hero 3D particles</span>
    <select><option value="true">On</option><option value="false">Off (CPU saver)</option></select></label>`);
  particles.querySelector('select').value = (t.particles ?? true) ? 'true' : 'false';
  particles.querySelector('select').addEventListener('change', e => { t.particles = e.target.value === 'true'; commit(); });
  g.appendChild(particles);
  root.appendChild(s);

  const s2 = el('<section><h2>Accent colors</h2><div class="grid grid--2"></div></section>');
  const g2 = s2.querySelector('.grid');
  const c1 = el(`<label class="field"><span>Primary accent</span><input type="color" /></label>`);
  c1.querySelector('input').value = t.accent || '#7c5cff';
  c1.querySelector('input').addEventListener('input', e => { t.accent = e.target.value; commit(); });
  g2.appendChild(c1);
  const c2 = el(`<label class="field"><span>Secondary accent</span><input type="color" /></label>`);
  c2.querySelector('input').value = t.accentAlt || '#22d3ee';
  c2.querySelector('input').addEventListener('input', e => { t.accentAlt = e.target.value; commit(); });
  g2.appendChild(c2);
  root.appendChild(s2);

  const s3 = el('<section><h2>Typography</h2><div class="grid grid--3"></div></section>');
  const g3 = s3.querySelector('.grid');
  const presets = [
    { label: 'Space Grotesk + Inter (default)', d: "'Space Grotesk', system-ui, sans-serif", b: "'Inter', system-ui, sans-serif", m: "'JetBrains Mono', ui-monospace, monospace" },
    { label: 'Inter only (utilitarian)', d: "'Inter', system-ui, sans-serif", b: "'Inter', system-ui, sans-serif", m: "'JetBrains Mono', ui-monospace, monospace" },
    { label: 'Mono everywhere (engineer mode)', d: "'JetBrains Mono', ui-monospace, monospace", b: "'JetBrains Mono', ui-monospace, monospace", m: "'JetBrains Mono', ui-monospace, monospace" },
    { label: 'System UI', d: 'system-ui, sans-serif', b: 'system-ui, sans-serif', m: 'ui-monospace, monospace' },
  ];
  const preset = el(`<label class="field"><span>Font preset</span><select></select></label>`);
  presets.forEach((p, i) => preset.querySelector('select').appendChild(el(`<option value="${i}">${escape(p.label)}</option>`)));
  preset.querySelector('select').addEventListener('change', e => {
    const p = presets[e.target.value];
    t.fontDisplay = p.d; t.fontBody = p.b; t.fontMono = p.m;
    commit();
  });
  g3.appendChild(preset);
  root.appendChild(s3);
  return root;
}

function buildSettings() {
  const root = document.createDocumentFragment();
  const s = el(`<section><h2>Account</h2>
    <p class="muted">Current credentials are a placeholder (<code>admin / admin</code>). When Firebase Auth is wired up this page will let you manage admin users and 2FA.</p>
  </section>`);
  root.appendChild(s);

  const s2 = el(`<section><h2>Persistence</h2>
    <p class="muted">Edits are saved to your browser (localStorage). They power the live preview on this URL only. Use “Export JSON” to ship them into <code>public/data/portfolio.json</code>, or wait for the Firebase Realtime Database integration in the next milestone.</p>
  </section>`);
  root.appendChild(s2);

  const s3 = el(`<section><h2>Import / Reset</h2></section>`);
  const row = el('<div class="swatch-row"></div>');
  const importBtn = uploader('Import portfolio.json', (dataUrl, file) => {
    file.text().then(txt => {
      try {
        const next = JSON.parse(txt);
        workingData = next;
        commit();
        renderTab(currentTab);
        alert('Imported successfully.');
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
      }
    });
  }, 'application/json');
  row.appendChild(importBtn);
  const resetAll = el('<button class="btn btn--ghost">Clear all overrides</button>');
  resetAll.addEventListener('click', () => {
    if (!confirm('Discard all admin edits?')) return;
    clearOverrides();
    workingData = JSON.parse(JSON.stringify(baseData));
    renderTab(currentTab);
    refreshPreview();
  });
  row.appendChild(resetAll);
  s3.appendChild(row);
  root.appendChild(s3);
  return root;
}

/* ----------------- HELPERS ----------------- */

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function normalizeAsset(p) {
  if (!p) return '';
  if (p.startsWith('data:')) return p;
  if (p.startsWith('http')) return p;
  return '../' + p.replace(/^\.?\//, '');
}

function uploader(label, onPick, accept = 'image/*') {
  const w = el(`<label class="upload">${escape(label)}<input type="file" accept="${accept}" /></label>`);
  w.querySelector('input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onPick(ev.target.result, file);
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  return w;
}

function exportJSON() {
  const json = JSON.stringify(workingData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'portfolio.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ----------------- CROP TOOL ----------------- */
let cropState = null;
function openCrop(dataUrl, ratio, onDone) {
  cropState = { dataUrl, ratio, onDone };
  const modal = document.getElementById('crop-modal');
  const img = document.getElementById('crop-img');
  const win = document.getElementById('crop-window');
  document.getElementById('crop-ratio').textContent = `${ratio.toFixed(2)} : 1`;
  img.onload = () => positionDefaultCrop(img, win, ratio);
  img.src = dataUrl;
  modal.classList.add('open');
  enableCropDrag(img, win);
}
document.getElementById('crop-confirm').addEventListener('click', () => {
  if (!cropState) return;
  const img = document.getElementById('crop-img');
  const win = document.getElementById('crop-window');
  const stage = document.getElementById('crop-stage');
  const stageRect = stage.getBoundingClientRect();
  const sx = img.naturalWidth / stageRect.width;
  const sy = img.naturalHeight / stageRect.height;
  const rect = {
    x: parseFloat(win.style.left) * sx,
    y: parseFloat(win.style.top) * sy,
    w: parseFloat(win.style.width) * sx,
    h: parseFloat(win.style.height) * sy,
  };
  const canvas = document.createElement('canvas');
  // Cap output for storage sanity
  const maxW = 1280;
  const scale = Math.min(1, maxW / rect.w);
  canvas.width = Math.round(rect.w * scale);
  canvas.height = Math.round(rect.h * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL('image/jpeg', 0.86);
  document.getElementById('crop-modal').classList.remove('open');
  cropState.onDone(out);
  cropState = null;
});
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-modal-close]')) {
    document.getElementById('crop-modal').classList.remove('open');
    cropState = null;
  }
});

function positionDefaultCrop(img, win, ratio) {
  const stage = document.getElementById('crop-stage');
  // Wait one frame for layout
  requestAnimationFrame(() => {
    const r = stage.getBoundingClientRect();
    let w = r.width * 0.8;
    let h = w / ratio;
    if (h > r.height * 0.9) { h = r.height * 0.9; w = h * ratio; }
    win.style.width = w + 'px';
    win.style.height = h + 'px';
    win.style.left = (r.width - w) / 2 + 'px';
    win.style.top = (r.height - h) / 2 + 'px';
  });
}

function enableCropDrag(img, win) {
  const stage = document.getElementById('crop-stage');
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  win.onpointerdown = (e) => {
    dragging = true; sx = e.clientX; sy = e.clientY;
    ox = parseFloat(win.style.left); oy = parseFloat(win.style.top);
    win.setPointerCapture(e.pointerId);
  };
  win.onpointermove = (e) => {
    if (!dragging) return;
    const r = stage.getBoundingClientRect();
    const w = parseFloat(win.style.width);
    const h = parseFloat(win.style.height);
    let nx = ox + (e.clientX - sx);
    let ny = oy + (e.clientY - sy);
    nx = Math.max(0, Math.min(nx, r.width - w));
    ny = Math.max(0, Math.min(ny, r.height - h));
    win.style.left = nx + 'px';
    win.style.top = ny + 'px';
  };
  win.onpointerup = (e) => { dragging = false; win.releasePointerCapture(e.pointerId); };
}
