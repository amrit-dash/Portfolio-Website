/**
 * Admin Dashboard JS
 * Handles: auth guard, navigation, CRUD for projects/experience,
 *          CV upload, appearance settings, contact info
 */

import { auth, db, storage } from './firebase-init.js';

// Firebase SDK imports (loaded only if firebase is configured)
let onAuthStateChanged, signOut, collection, doc, getDocs, setDoc, addDoc, deleteDoc,
    updateDoc, orderBy, query, ref, uploadBytesResumable, getDownloadURL, deleteObject;

async function loadFirebaseSDK() {
    if (!auth) return false;
    try {
        ({ onAuthStateChanged, signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'));
        ({ collection, doc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'));
        ({ ref, uploadBytesResumable, getDownloadURL, deleteObject } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js'));
        return true;
    } catch (e) {
        console.error('Failed to load Firebase SDK:', e);
        return false;
    }
}

// =========================================================
// UTILITIES
// =========================================================
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function toast(msg, type = 'success') {
    const el = qs('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast is-visible toast--${type}`;
    setTimeout(() => el.classList.remove('is-visible'), 3500);
}

function openModal(id) {
    qs(`#${id}`)?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    qs(`#${id}`)?.classList.remove('is-open');
    document.body.style.overflow = '';
}

// =========================================================
// AUTH GUARD
// =========================================================
async function initAuth() {
    const guard = qs('#auth-guard');
    const sdkLoaded = await loadFirebaseSDK();

    if (!sdkLoaded || !auth) {
        // Firebase not configured — show setup info and unblock dashboard
        guard.classList.add('is-hidden');
        qs('#topbar-user').textContent = 'No Firebase Config';
        qs('#firebase-status-val').textContent = '⚠ Not Configured';
        markSetupStep('step-config', false);
        markSetupStep('step-auth', false);
        markSetupStep('step-firestore', false);
        markSetupStep('step-storage', false);
        updateOverviewCounts(0, 0, 0);
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = '/admin/login.html';
            return;
        }

        guard.classList.add('is-hidden');
        qs('#topbar-user').textContent = user.email || 'Admin';
        qs('#firebase-status-val').textContent = '✓ Connected';

        markSetupStep('step-config', true);
        markSetupStep('step-auth', true);

        initDashboard();
    });
}

function markSetupStep(id, done) {
    const step = qs(`#${id}`);
    if (!step) return;
    const icon = qs('.step-status', step);
    if (done) {
        icon.textContent = '✅';
        step.style.opacity = '0.5';
    }
}

// =========================================================
// NAVIGATION
// =========================================================
function initNavigation() {
    const links = qsa('.sidebar-link[data-panel]');
    const panels = qsa('.panel');
    const topbarTitle = qs('#topbar-title');

    links.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const panelId = link.dataset.panel;

            links.forEach(l => l.classList.remove('is-active'));
            link.classList.add('is-active');

            panels.forEach(p => p.classList.remove('is-active'));
            qs(`#panel-${panelId}`)?.classList.add('is-active');

            topbarTitle.textContent = link.textContent.trim();

            // Close sidebar on mobile
            qs('#sidebar')?.classList.remove('is-open');
        });
    });

    // Sidebar toggle
    qs('#sidebar-toggle')?.addEventListener('click', () => {
        qs('#sidebar')?.classList.toggle('is-open');
    });

    // Modal close buttons
    qsa('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    // Close modal on overlay click
    qsa('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    // Logout
    qs('#logout-btn')?.addEventListener('click', async () => {
        if (auth && signOut) {
            await signOut(auth);
            window.location.href = '/admin/login.html';
        }
    });
}

// =========================================================
// DASHBOARD DATA
// =========================================================
async function initDashboard() {
    await Promise.allSettled([
        loadProjects(),
        loadExperience(),
        checkCVFiles(),
    ]);

    markSetupStep('step-firestore', true);
    markSetupStep('step-storage', true);
}

function updateOverviewCounts(projects, exp, cvFiles) {
    const pEl = qs('#project-count');
    const eEl = qs('#exp-count');
    const cEl = qs('#cv-count');
    if (pEl) pEl.textContent = projects;
    if (eEl) eEl.textContent = exp;
    if (cEl) cEl.textContent = cvFiles + '/2';
}

// =========================================================
// PROJECTS
// =========================================================
let projectsCache = [];

async function loadProjects() {
    if (!db) return;
    const listEl = qs('#projects-list');
    if (!listEl) return;

    try {
        const q = query(collection(db, 'projects'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        projectsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderProjectList();
        qs('#project-count').textContent = projectsCache.length;
    } catch (e) {
        listEl.innerHTML = '<div class="item-list__loading">Failed to load projects.</div>';
    }
}

function renderProjectList() {
    const listEl = qs('#projects-list');
    if (!listEl) return;

    if (!projectsCache.length) {
        listEl.innerHTML = '<div class="item-list__loading">No projects yet. Click "+ Add Project" to create one.</div>';
        return;
    }

    listEl.innerHTML = projectsCache.map(p => `
        <div class="item-card" data-id="${p.id}">
            <div class="item-card__thumb item-card__thumb--placeholder">
                ${p.imageUrl
                    ? `<img src="${p.imageUrl}" alt="${p.title}" style="width:64px;height:44px;object-fit:cover;border-radius:6px;">`
                    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
                }
            </div>
            <div class="item-card__content">
                <div class="item-card__title">${escapeHTML(p.title || 'Untitled')}</div>
                <div class="item-card__sub">${(p.tags || []).slice(0,3).join(' · ')}</div>
            </div>
            <div class="item-card__actions">
                <button class="btn-icon" title="Edit" onclick="editProject('${p.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon btn-icon--danger" title="Delete" onclick="deleteProject('${p.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

window.editProject = (id) => {
    const p = projectsCache.find(x => x.id === id);
    if (!p) return;
    qs('#project-id').value = id;
    qs('#project-modal-title').textContent = 'Edit Project';
    qs('#proj-title').value = p.title || '';
    qs('#proj-tags').value = (p.tags || []).join(', ');
    qs('#proj-desc').value = p.desc || '';
    qs('#proj-link1-url').value = p.links?.[0]?.url || '';
    qs('#proj-link1-label').value = p.links?.[0]?.label || '';
    qs('#proj-link2-url').value = p.links?.[1]?.url || '';
    qs('#proj-link2-label').value = p.links?.[1]?.label || '';
    qs('#proj-order').value = p.order || 0;
    qs('#proj-featured').checked = p.featured || false;
    openModal('project-modal-overlay');
};

window.deleteProject = async (id) => {
    if (!confirm('Delete this project?')) return;
    try {
        await deleteDoc(doc(db, 'projects', id));
        projectsCache = projectsCache.filter(p => p.id !== id);
        renderProjectList();
        qs('#project-count').textContent = projectsCache.length;
        toast('Project deleted');
    } catch (e) {
        toast('Failed to delete', 'error');
    }
};

function initProjectModal() {
    qs('#add-project-btn')?.addEventListener('click', () => {
        qs('#project-id').value = '';
        qs('#project-modal-title').textContent = 'Add Project';
        qs('#project-modal').querySelectorAll('input, textarea').forEach(el => { el.value = ''; });
        qs('#proj-featured').checked = false;
        qs('#crop-container').style.display = 'none';
        qs('#proj-img-preview').style.display = 'none';
        openModal('project-modal-overlay');
    });

    qs('#save-project-btn')?.addEventListener('click', saveProject);

    // Image upload
    const fileInput = qs('#proj-img-file');
    const zone = qs('#proj-img-zone');
    zone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        previewAndCrop(file);
    });

    // Crop controls
    ['crop-x', 'crop-y', 'crop-zoom'].forEach(id => {
        qs(`#${id}`)?.addEventListener('input', drawCrop);
    });
}

let cropImage = null, cropFile = null;

function previewAndCrop(file) {
    cropFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            cropImage = img;
            qs('#proj-img-preview').style.display = 'block';
            qs('#proj-img-preview-img').src = e.target.result;
            qs('#crop-container').style.display = 'block';
            qs('#crop-x').value = 0;
            qs('#crop-y').value = 0;
            qs('#crop-zoom').value = 100;
            drawCrop();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawCrop() {
    if (!cropImage) return;
    const canvas = qs('#crop-canvas');
    const ctx = canvas.getContext('2d');
    const OUTPUT_W = 800, OUTPUT_H = 500;
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;

    const zoom = parseFloat(qs('#crop-zoom').value) / 100;
    const xPct = parseFloat(qs('#crop-x').value) / 100;
    const yPct = parseFloat(qs('#crop-y').value) / 100;

    const srcW = cropImage.naturalWidth / zoom;
    const srcH = cropImage.naturalHeight / zoom;
    const srcX = (cropImage.naturalWidth - srcW) * xPct;
    const srcY = (cropImage.naturalHeight - srcH) * yPct;

    ctx.clearRect(0, 0, OUTPUT_W, OUTPUT_H);
    ctx.drawImage(cropImage, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_W, OUTPUT_H);
}

function getCroppedBlob() {
    return new Promise(resolve => {
        const canvas = qs('#crop-canvas');
        if (!canvas || !cropImage) { resolve(null); return; }
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
    });
}

async function saveProject() {
    const btn = qs('#save-project-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = qs('#project-id').value;
    const data = {
        title: qs('#proj-title').value.trim(),
        tags: qs('#proj-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        desc: qs('#proj-desc').value.trim(),
        links: [
            { url: qs('#proj-link1-url').value.trim(), label: qs('#proj-link1-label').value.trim() },
            { url: qs('#proj-link2-url').value.trim(), label: qs('#proj-link2-label').value.trim() },
        ].filter(l => l.url),
        order: parseInt(qs('#proj-order').value || 0),
        featured: qs('#proj-featured').checked,
        updatedAt: new Date().toISOString(),
    };

    if (!data.title) { toast('Title is required', 'error'); btn.disabled = false; btn.textContent = 'Save Project'; return; }

    try {
        // Upload image if provided
        if (cropImage && storage) {
            const blob = await getCroppedBlob();
            if (blob) {
                const storageRef = ref(storage, `projects/${id || Date.now()}/thumbnail.jpg`);
                const uploadTask = uploadBytesResumable(storageRef, blob);
                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', null, reject, async () => {
                        data.imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    });
                });
            }
        }

        if (id) {
            await updateDoc(doc(db, 'projects', id), data);
        } else {
            await addDoc(collection(db, 'projects'), data);
        }

        toast('Project saved!');
        closeModal('project-modal-overlay');
        cropImage = null;
        cropFile = null;
        await loadProjects();
    } catch (e) {
        toast('Failed to save: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Project';
    }
}

// =========================================================
// EXPERIENCE
// =========================================================
let expCache = [];

async function loadExperience() {
    if (!db) return;
    const listEl = qs('#exp-list');
    if (!listEl) return;

    try {
        const q = query(collection(db, 'experience'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        expCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderExpList();
        qs('#exp-count').textContent = expCache.length;
    } catch (e) {
        listEl.innerHTML = '<div class="item-list__loading">Failed to load experience. Check Firestore setup.</div>';
    }
}

function renderExpList() {
    const listEl = qs('#exp-list');
    if (!listEl) return;

    if (!expCache.length) {
        listEl.innerHTML = '<div class="item-list__loading">No entries yet. Click "+ Add Entry".</div>';
        return;
    }

    listEl.innerHTML = expCache.map(e => `
        <div class="item-card" data-id="${e.id}">
            <div class="item-card__content">
                <div class="item-card__title">${escapeHTML(e.role || 'Untitled')} — ${escapeHTML(e.company || '')}</div>
                <div class="item-card__sub">${escapeHTML(e.start || '')} → ${escapeHTML(e.end || 'Present')}${e.current ? ' · <span style="color:#00e5a0">Current</span>' : ''}</div>
            </div>
            <div class="item-card__actions">
                <button class="btn-icon" onclick="editExp('${e.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon btn-icon--danger" onclick="deleteExp('${e.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

window.editExp = (id) => {
    const e = expCache.find(x => x.id === id);
    if (!e) return;
    qs('#exp-id').value = id;
    qs('#exp-modal-title').textContent = 'Edit Experience';
    qs('#exp-role').value = e.role || '';
    qs('#exp-company').value = e.company || '';
    qs('#exp-start').value = e.start || '';
    qs('#exp-end').value = e.end || '';
    qs('#exp-desc').value = e.desc || '';
    qs('#exp-tags').value = (e.tags || []).join(', ');
    qs('#exp-order').value = e.order || 0;
    qs('#exp-current').checked = e.current || false;
    openModal('exp-modal-overlay');
};

window.deleteExp = async (id) => {
    if (!confirm('Delete this experience entry?')) return;
    try {
        await deleteDoc(doc(db, 'experience', id));
        expCache = expCache.filter(e => e.id !== id);
        renderExpList();
        qs('#exp-count').textContent = expCache.length;
        toast('Entry deleted');
    } catch (e) {
        toast('Failed to delete', 'error');
    }
};

function initExpModal() {
    qs('#add-exp-btn')?.addEventListener('click', () => {
        qs('#exp-id').value = '';
        qs('#exp-modal-title').textContent = 'Add Experience';
        qs('#exp-modal').querySelectorAll('input, textarea').forEach(el => { el.value = ''; });
        qs('#exp-current').checked = false;
        openModal('exp-modal-overlay');
    });

    qs('#save-exp-btn')?.addEventListener('click', saveExp);
}

async function saveExp() {
    const btn = qs('#save-exp-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = qs('#exp-id').value;
    const data = {
        role: qs('#exp-role').value.trim(),
        company: qs('#exp-company').value.trim(),
        start: qs('#exp-start').value.trim(),
        end: qs('#exp-end').value.trim(),
        desc: qs('#exp-desc').value.trim(),
        tags: qs('#exp-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        order: parseInt(qs('#exp-order').value || 0),
        current: qs('#exp-current').checked,
        updatedAt: new Date().toISOString(),
    };

    if (!data.role) { toast('Role is required', 'error'); btn.disabled = false; btn.textContent = 'Save Experience'; return; }

    try {
        if (id) {
            await updateDoc(doc(db, 'experience', id), data);
        } else {
            await addDoc(collection(db, 'experience'), data);
        }
        toast('Experience saved!');
        closeModal('exp-modal-overlay');
        await loadExperience();
    } catch (e) {
        toast('Failed to save: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Experience';
    }
}

// =========================================================
// CV FILES
// =========================================================
async function checkCVFiles() {
    let count = 0;

    const lightStatus = qs('#cv-light-status');
    const darkStatus = qs('#cv-dark-status');

    // Check if storage-hosted CVs exist (attempt to fetch)
    if (storage) {
        try {
            const lightRef = ref(storage, 'cv/cv-light.pdf');
            await getDownloadURL(lightRef);
            if (lightStatus) { lightStatus.textContent = '✓ cv-light.pdf uploaded'; lightStatus.classList.add('is-ok'); }
            count++;
        } catch {
            if (lightStatus) { lightStatus.textContent = '⚠ Not uploaded yet (using static fallback)'; }
        }

        try {
            const darkRef = ref(storage, 'cv/cv-dark.pdf');
            await getDownloadURL(darkRef);
            if (darkStatus) { darkStatus.textContent = '✓ cv-dark.pdf uploaded'; darkStatus.classList.add('is-ok'); }
            count++;
        } catch {
            if (darkStatus) { darkStatus.textContent = '⚠ Not uploaded yet (using static fallback)'; }
        }
    } else {
        if (lightStatus) lightStatus.textContent = 'Using static file (Firebase not configured)';
        if (darkStatus) darkStatus.textContent = 'Using static file (Firebase not configured)';
    }

    qs('#cv-count').textContent = count;
    return count;
}

function initCVUpload() {
    setupCVUpload('cv-light-zone', 'cv-light-file', 'cv/cv-light.pdf', 'cv-light-progress', 'cv-light-bar', 'cv-light-status');
    setupCVUpload('cv-dark-zone', 'cv-dark-file', 'cv/cv-dark.pdf', 'cv-dark-progress', 'cv-dark-bar', 'cv-dark-status');
}

function setupCVUpload(zoneId, fileId, storagePath, progressId, barId, statusId) {
    const zone = qs(`#${zoneId}`);
    const fileInput = qs(`#${fileId}`);
    const progressEl = qs(`#${progressId}`);
    const barEl = qs(`#${barId}`);
    const statusEl = qs(`#${statusId}`);

    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !storage) {
            if (!storage) toast('Firebase Storage not configured', 'error');
            return;
        }

        progressEl.style.display = 'block';
        barEl.style.width = '0%';

        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const pct = (snapshot.bytesTransferred / snapshot.totalBytes * 100).toFixed(0);
                barEl.style.width = pct + '%';
            },
            (err) => {
                toast('Upload failed: ' + err.message, 'error');
                progressEl.style.display = 'none';
            },
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                toast('CV uploaded successfully!');
                progressEl.style.display = 'none';
                if (statusEl) {
                    statusEl.textContent = `✓ ${file.name} uploaded`;
                    statusEl.className = 'cv-status is-ok';
                }
                // Update static asset link if Firestore available
                if (db) {
                    const key = storagePath.includes('light') ? 'cvLight' : 'cvDark';
                    await setDoc(doc(db, 'settings', 'cv'), { [key]: url }, { merge: true });
                }
            }
        );
    });

    // Drag & drop
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('is-dragover');
        const file = e.dataTransfer.files[0];
        if (file) { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change')); }
    });
}

// =========================================================
// APPEARANCE
// =========================================================
function initAppearance() {
    const darkInput = qs('#accent-dark');
    const darkHex = qs('#accent-dark-hex');
    const lightInput = qs('#accent-light');
    const lightHex = qs('#accent-light-hex');

    darkInput?.addEventListener('input', () => { if (darkHex) darkHex.value = darkInput.value; });
    darkHex?.addEventListener('input', () => { if (darkHex.value.match(/^#[0-9a-f]{6}$/i)) darkInput.value = darkHex.value; });

    lightInput?.addEventListener('input', () => { if (lightHex) lightHex.value = lightInput.value; });
    lightHex?.addEventListener('input', () => { if (lightHex.value.match(/^#[0-9a-f]{6}$/i)) lightInput.value = lightHex.value; });

    qs('#save-appearance-btn')?.addEventListener('click', saveAppearance);
}

async function loadAppearance() {
    if (!db) return;
    try {
        const q = query(collection(db, 'settings'));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const data = snap.docs[0].data();
        if (data.defaultTheme) qs('#default-theme-select').value = data.defaultTheme;
        if (data.accentColor) { qs('#accent-dark').value = data.accentColor; qs('#accent-dark-hex').value = data.accentColor; }
        if (data.accentColorLight) { qs('#accent-light').value = data.accentColorLight; qs('#accent-light-hex').value = data.accentColorLight; }
        if (data.statusText) qs('#status-text').value = data.statusText;
        if (data.statusVisible !== undefined) qs('#status-visible').checked = data.statusVisible;
    } catch (e) {
        console.warn('Could not load appearance settings', e);
    }
}

async function saveAppearance() {
    const btn = qs('#save-appearance-btn');
    btn.disabled = true;
    if (!db) { toast('Firebase not configured', 'error'); btn.disabled = false; return; }

    try {
        await setDoc(doc(db, 'settings', 'appearance'), {
            defaultTheme: qs('#default-theme-select').value,
            accentColor: qs('#accent-dark-hex').value,
            accentColorLight: qs('#accent-light-hex').value,
            statusText: qs('#status-text').value.trim(),
            statusVisible: qs('#status-visible').checked,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        toast('Appearance saved!');
    } catch (e) {
        toast('Save failed: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// =========================================================
// CONTACT
// =========================================================
async function loadContact() {
    if (!db) return;
    try {
        const q = query(collection(db, 'contact'));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const data = snap.docs[0].data();
        if (data.email) qs('#contact-email').value = data.email;
        if (data.phone) qs('#contact-phone').value = data.phone;
        if (data.linkedin) qs('#social-linkedin').value = data.linkedin;
        if (data.github) qs('#social-github').value = data.github;
        if (data.instagram) qs('#social-instagram').value = data.instagram;
        if (data.whatsapp) qs('#social-whatsapp').value = data.whatsapp;
        if (data.aboutme) qs('#social-aboutme').value = data.aboutme;
        if (data.ctaText) qs('#contact-cta').value = data.ctaText;
    } catch (e) {
        console.warn('Could not load contact info', e);
    }
}

function initContact() {
    qs('#save-contact-btn')?.addEventListener('click', async () => {
        if (!db) { toast('Firebase not configured', 'error'); return; }
        try {
            await setDoc(doc(db, 'contact', 'main'), {
                email: qs('#contact-email').value.trim(),
                phone: qs('#contact-phone').value.trim(),
                linkedin: qs('#social-linkedin').value.trim(),
                github: qs('#social-github').value.trim(),
                instagram: qs('#social-instagram').value.trim(),
                whatsapp: qs('#social-whatsapp').value.trim(),
                aboutme: qs('#social-aboutme').value.trim(),
                ctaText: qs('#contact-cta').value.trim(),
                updatedAt: new Date().toISOString(),
            });
            toast('Contact info saved!');
        } catch (e) {
            toast('Save failed: ' + e.message, 'error');
        }
    });
}

// =========================================================
// HERO
// =========================================================
async function loadHero() {
    if (!db) return;
    try {
        const q = query(collection(db, 'hero'));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const data = snap.docs[0].data();
        if (data.name) qs('#hero-name-input').value = data.name;
        if (data.greeting) qs('#hero-greeting-input').value = data.greeting;
        if (data.roles) qs('#hero-roles-input').value = data.roles.join(', ');
        if (data.bio) qs('#hero-bio-input').value = data.bio;
        if (data.aboutBio) qs('#about-bio-input').value = data.aboutBio;
    } catch (e) {
        console.warn('Could not load hero data', e);
    }
}

function initHero() {
    qs('#save-hero-btn')?.addEventListener('click', async () => {
        if (!db) { toast('Firebase not configured', 'error'); return; }
        try {
            await setDoc(doc(db, 'hero', 'main'), {
                name: qs('#hero-name-input').value.trim(),
                greeting: qs('#hero-greeting-input').value.trim(),
                roles: qs('#hero-roles-input').value.split(',').map(r => r.trim()).filter(Boolean),
                bio: qs('#hero-bio-input').value.trim(),
                aboutBio: qs('#about-bio-input').value.trim(),
                updatedAt: new Date().toISOString(),
            });
            toast('Hero & Bio saved!');
        } catch (e) {
            toast('Save failed: ' + e.message, 'error');
        }
    });

    // Photo upload
    const photoZone = qs('#photo-upload-zone');
    const photoFile = qs('#photo-file');
    photoZone?.addEventListener('click', () => photoFile?.click());
    photoFile?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !storage) { if (!storage) toast('Firebase Storage not configured', 'error'); return; }
        const storageRef = ref(storage, 'profile/photo.jpg');
        const task = uploadBytesResumable(storageRef, file);
        toast('Uploading photo...');
        task.on('state_changed', null,
            () => toast('Upload failed', 'error'),
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                await setDoc(doc(db, 'hero', 'main'), { photoUrl: url }, { merge: true });
                toast('Photo uploaded!');
            }
        );
    });
}

// =========================================================
// HELPERS
// =========================================================
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// =========================================================
// INIT
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initProjectModal();
    initExpModal();
    initCVUpload();
    initAppearance();
    initContact();
    initHero();

    initAuth().then(() => {
        loadHero();
        loadAppearance();
        loadContact();
    });
});
