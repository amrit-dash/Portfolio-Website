// Admin dashboard controller. Handles authentication, CMS editing, image &
// CV uploads (with crop) and cosmetic overrides. Talks to Firebase Auth,
// Firestore and Storage when configured.

import { getFirebase, hasFirebaseConfig } from './modules/firebase-app.js';

const PROJECT_KEYS = [
    { id: 'coffeeMapper',  label: 'Coffee Mapper (cover)' },
    { id: 'cdtKoraput',    label: 'Coffee Mapper Dashboard (cover)' },
    { id: 'nbc',           label: 'Nothing BOT Comedy (cover)' },
    { id: 'kunsquad',      label: 'Kunsquad (cover)' },
    { id: 'make',          label: 'Make Automation (cover)' },
    { id: 'asapCG',        label: 'ASAP - CG (cover)' },
];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const loginView = $('#login-view');
const dashView = $('#dashboard-view');
const loginStatus = $('#login-status');
const saveStatus = $('#save-status');

let services = null;
let _onAuthChange = null;

// ---------- Firebase setup gate ----------
if (!hasFirebaseConfig()) {
    setupMissing();
} else {
    bootstrap();
}

function setupMissing() {
    loginView.innerHTML = `
        <div class="login-card">
            <div class="login-brand">
                <span class="login-dot"></span>
                <h1>dashboard <span class="muted">// not configured</span></h1>
            </div>
            <p class="login-lede">No Firebase project is wired up yet.</p>
            <p class="muted">Create <code>public/firebase-config.js</code> with your project keys, then reload. See <code>FIREBASE_SETUP.md</code> for the recipe.</p>
            <pre style="margin-top:18px;font-family:var(--font-mono);font-size:1.25rem;background:var(--bg-elev);padding:14px;border-radius:8px;border:1px solid var(--line);overflow:auto;">
window.__FIREBASE_CONFIG__ = {
  apiKey: "...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  appId: "..."
};</pre>
        </div>`;
}

async function bootstrap() {
    services = await getFirebase();
    if (!services) { setupMissing(); return; }

    const { auth, _au } = services;
    _onAuthChange = _au.onAuthStateChanged(auth, (user) => {
        if (user) showDashboard(user);
        else showLogin();
    });

    $('#login-form').addEventListener('submit', onLogin);
    $('#logout').addEventListener('click', () => _au.signOut(auth));
    $$('.nav-item').forEach(b => b.addEventListener('click', () => switchPane(b.dataset.pane)));
    $('#save-all').addEventListener('click', saveAll);
    $('#add-exp').addEventListener('click', () => addExpRow({}));
    renderProjectUploads();
    bindUploads();
    bindCosmeticsLive();
}

// ---------- Auth ----------
async function onLogin(e) {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const pwd = $('#login-password').value;
    loginStatus.textContent = 'Signing in…';
    loginStatus.className = 'status';
    try {
        const { _au, auth } = services;
        await _au.signInWithEmailAndPassword(auth, email, pwd);
        loginStatus.textContent = '';
    } catch (err) {
        loginStatus.textContent = err?.message || 'Sign-in failed';
        loginStatus.className = 'status error';
    }
}

function showLogin() {
    loginView.hidden = false;
    dashView.hidden = true;
}

function showDashboard(user) {
    loginView.hidden = true;
    dashView.hidden = false;
    $('#who').textContent = user.email || user.uid;
    loadAll();
}

// ---------- Pane switching ----------
function switchPane(name) {
    $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.pane === name));
    $$('.admin-pane').forEach(p => p.classList.toggle('is-active', p.dataset.pane === name));
    $('#pane-title').textContent = ({
        content: 'Content',
        experience: 'Experience',
        cv: 'CV files',
        images: 'Images',
        cosmetics: 'Cosmetics'
    })[name] || 'Dashboard';
}

// ---------- Data load/save ----------
async function loadAll() {
    const { firestore, _fs, storage, _st } = services;
    try {
        const sections = ['hero', 'about', 'experience', 'cv', 'cosmetics', 'images'];
        const snaps = await Promise.all(
            sections.map(name => _fs.getDoc(_fs.doc(firestore, 'site', name)).catch(() => null))
        );
        const [hero, about, exp, cv, cos, images] = snaps.map(s => s && s.exists() ? s.data() : {});

        bindInputs({
            'hero.name': hero.name,
            'hero.sub': hero.sub,
            'about.p1': about.p1,
            'about.p2': about.p2,
            'about.p3': about.p3,
            'cosmetics.accent': cos.accent || '#ff7a3d',
            'cosmetics.defaultTheme': cos.defaultTheme || '',
            'cosmetics.font': cos.font || '"Space Grotesk", system-ui, sans-serif',
        });

        // Experience entries
        $('#exp-list').innerHTML = '';
        const items = (exp && exp.items) || [];
        if (items.length) items.forEach(addExpRow);
        else addExpRow({ role: 'Automation Engineer', org: 'Contour Education', period: 'Aug 2025 – Present', desc: '', tags: [], current: true });

        // CV links
        if (cv?.dark) showCvLink('cv-dark-link', cv.dark);
        if (cv?.light) showCvLink('cv-light-link', cv.light);

        // Image current thumbs
        if (images?.['about.photo']) {
            $('#about-photo-current').src = images['about.photo'];
            $('#about-photo-current').hidden = false;
        }
        PROJECT_KEYS.forEach(k => {
            const url = images?.[`projects.${k.id}`];
            const card = document.querySelector(`[data-thumb-for="projects.${k.id}"]`);
            if (card && url) { card.src = url; card.hidden = false; }
        });

        saveStatus.textContent = 'Loaded';
        saveStatus.className = 'save-status ok';
    } catch (err) {
        console.error(err);
        saveStatus.textContent = 'Load failed';
        saveStatus.className = 'save-status err';
    }
}

function bindInputs(map) {
    Object.entries(map).forEach(([key, value]) => {
        const el = document.querySelector(`[data-bind="${key}"]`);
        if (!el || value == null) return;
        el.value = value;
    });
}

function readBinds() {
    const out = {};
    $$('[data-bind]').forEach(el => {
        const path = el.dataset.bind.split('.');
        let cur = out;
        for (let i = 0; i < path.length - 1; i++) {
            cur[path[i]] = cur[path[i]] || {};
            cur = cur[path[i]];
        }
        cur[path[path.length - 1]] = el.value;
    });
    return out;
}

function readExperience() {
    return $$('.exp-row').map(row => ({
        role:    row.querySelector('[data-f="role"]').value,
        org:     row.querySelector('[data-f="org"]').value,
        period:  row.querySelector('[data-f="period"]').value,
        desc:    row.querySelector('[data-f="desc"]').value,
        tags:    row.querySelector('[data-f="tags"]').value.split(',').map(s => s.trim()).filter(Boolean),
        current: row.querySelector('[data-f="current"]').checked,
    }));
}

async function saveAll() {
    const { firestore, _fs } = services;
    saveStatus.textContent = 'Saving…';
    saveStatus.className = 'save-status';

    const data = readBinds();
    try {
        await Promise.all([
            _fs.setDoc(_fs.doc(firestore, 'site', 'hero'),   data.hero      || {}, { merge: true }),
            _fs.setDoc(_fs.doc(firestore, 'site', 'about'),  data.about     || {}, { merge: true }),
            _fs.setDoc(_fs.doc(firestore, 'site', 'cosmetics'), data.cosmetics || {}, { merge: true }),
            _fs.setDoc(_fs.doc(firestore, 'site', 'experience'), { items: readExperience() }, { merge: true }),
        ]);
        saveStatus.textContent = 'Saved ✓';
        saveStatus.className = 'save-status ok';
    } catch (err) {
        console.error(err);
        saveStatus.textContent = 'Save failed';
        saveStatus.className = 'save-status err';
    }
}

// ---------- Experience editor rows ----------
function addExpRow(item = {}) {
    const row = document.createElement('div');
    row.className = 'exp-row';
    row.innerHTML = `
        <div class="row-2">
            <label>Role <input type="text" data-f="role" value="${escapeAttr(item.role)}"></label>
            <label>Organisation <input type="text" data-f="org" value="${escapeAttr(item.org)}"></label>
        </div>
        <div class="row-2">
            <label>Period <input type="text" data-f="period" value="${escapeAttr(item.period)}"></label>
            <label>Tags (comma-separated) <input type="text" data-f="tags" value="${escapeAttr((item.tags || []).join(', '))}"></label>
        </div>
        <label>Description <textarea rows="3" data-f="desc">${escapeText(item.desc)}</textarea></label>
        <div class="row-actions">
            <label style="display:flex;align-items:center;gap:8px;font-size:1.3rem;text-transform:none;letter-spacing:0;">
                <input type="checkbox" data-f="current" ${item.current ? 'checked' : ''}> Mark as current role
            </label>
            <div style="display:flex;gap:6px;">
                <button class="btn btn--ghost" type="button" data-act="up">↑</button>
                <button class="btn btn--ghost" type="button" data-act="down">↓</button>
                <button class="btn btn--ghost" type="button" data-act="del">Remove</button>
            </div>
        </div>`;
    row.addEventListener('click', (e) => {
        const t = e.target.closest('[data-act]');
        if (!t) return;
        const list = $('#exp-list');
        if (t.dataset.act === 'del') row.remove();
        if (t.dataset.act === 'up' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
        if (t.dataset.act === 'down' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
    });
    $('#exp-list').appendChild(row);
}

function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }
function escapeText(s) { return String(s || '').replace(/</g, '&lt;'); }

// ---------- CV + image uploads ----------
function showCvLink(id, url) {
    const a = document.getElementById(id);
    a.href = url; a.hidden = false;
}

function bindUploads() {
    document.getElementById('cv-dark-file').addEventListener('change', (e) => onCvUpload(e, 'dark'));
    document.getElementById('cv-light-file').addEventListener('change', (e) => onCvUpload(e, 'light'));
    document.getElementById('about-photo-file').addEventListener('change', (e) => onImageUpload(e, 'about.photo', 0.8));
}

async function onCvUpload(e, mode) {
    const file = e.target.files[0];
    if (!file) return;
    const { storage, _st, firestore, _fs } = services;
    saveStatus.textContent = `Uploading ${mode} CV…`;
    saveStatus.className = 'save-status';
    try {
        const ref = _st.ref(storage, `cv/cv-${mode}.pdf`);
        await _st.uploadBytes(ref, file, { contentType: 'application/pdf' });
        const url = await _st.getDownloadURL(ref);
        await _fs.setDoc(_fs.doc(firestore, 'site', 'cv'), { [mode]: url }, { merge: true });
        showCvLink(`cv-${mode}-link`, url);
        saveStatus.textContent = `${mode} CV uploaded ✓`;
        saveStatus.className = 'save-status ok';
    } catch (err) {
        console.error(err);
        saveStatus.textContent = 'CV upload failed';
        saveStatus.className = 'save-status err';
    }
}

function renderProjectUploads() {
    const root = document.getElementById('project-uploads');
    root.innerHTML = PROJECT_KEYS.map(k => `
        <div class="pu-card">
            <div class="pu-title">${k.label}</div>
            <input type="file" accept="image/*" data-pu="${k.id}">
            <img class="thumb" data-thumb-for="projects.${k.id}" hidden>
        </div>
    `).join('');
    root.querySelectorAll('input[data-pu]').forEach(inp => {
        inp.addEventListener('change', (e) => onImageUpload(e, `projects.${inp.dataset.pu}`, 1.6));
    });
}

async function onImageUpload(e, key, aspect) {
    const file = e.target.files[0];
    if (!file) return;
    const cropped = await openCropper(file, aspect);
    if (!cropped) return;
    const { storage, _st, firestore, _fs } = services;
    saveStatus.textContent = `Uploading ${key}…`;
    saveStatus.className = 'save-status';
    try {
        const ref = _st.ref(storage, `images/${key.replace(/\./g, '_')}.jpg`);
        await _st.uploadBytes(ref, cropped, { contentType: 'image/jpeg' });
        const url = await _st.getDownloadURL(ref);
        await _fs.setDoc(_fs.doc(firestore, 'site', 'images'), { [key]: url }, { merge: true });
        const thumb = document.querySelector(`[data-thumb-for="${key}"]`) || document.getElementById('about-photo-current');
        if (thumb) { thumb.src = url; thumb.hidden = false; }
        saveStatus.textContent = `${key} uploaded ✓`;
        saveStatus.className = 'save-status ok';
    } catch (err) {
        console.error(err);
        saveStatus.textContent = 'Image upload failed';
        saveStatus.className = 'save-status err';
    }
}

// ---------- Cropper ----------
function openCropper(file, aspect) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const backdrop = document.getElementById('crop-backdrop');
        const img = document.getElementById('crop-image');
        const confirm = document.getElementById('crop-confirm');
        const cancel = document.getElementById('crop-cancel');

        img.src = url;
        backdrop.hidden = false;

        let cropper;
        img.onload = () => {
            cropper && cropper.destroy();
            cropper = new window.Cropper(img, {
                aspectRatio: aspect,
                viewMode: 1,
                autoCropArea: 1,
                background: false,
                movable: true,
                zoomable: true,
                rotatable: false,
                scalable: false,
            });
        };

        function cleanup() {
            cropper && cropper.destroy();
            backdrop.hidden = true;
            URL.revokeObjectURL(url);
            confirm.removeEventListener('click', onConfirm);
            cancel.removeEventListener('click', onCancel);
        }
        function onCancel() { cleanup(); resolve(null); }
        function onConfirm() {
            cropper.getCroppedCanvas({ maxWidth: 1800, imageSmoothingQuality: 'high' })
                .toBlob((blob) => { cleanup(); resolve(blob); }, 'image/jpeg', 0.9);
        }
        confirm.addEventListener('click', onConfirm);
        cancel.addEventListener('click', onCancel);
    });
}

// ---------- Cosmetics live preview ----------
function bindCosmeticsLive() {
    const accent = document.querySelector('[data-bind="cosmetics.accent"]');
    accent && accent.addEventListener('input', () => {
        document.documentElement.style.setProperty('--accent', accent.value);
    });
}
