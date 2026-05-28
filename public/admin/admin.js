'use strict';

/* ──────────────────────────────────────────────────────────────
   ADMIN DASHBOARD — JavaScript
   ────────────────────────────────────────────────────────────── */

const CREDS_KEY    = 'admin-credentials';
const AUTH_KEY     = 'admin-auth';
const CONFIG_KEY   = 'portfolio-config';
const THEME_KEY    = 'admin-theme';

/* Default credentials (change via Settings panel) */
const DEFAULT_CREDS = { username: 'admin', password: 'admin' };

/* ──────────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────────── */
function getStoredCreds() {
    try {
        const c = JSON.parse(localStorage.getItem(CREDS_KEY));
        return c || DEFAULT_CREDS;
    } catch (e) { return DEFAULT_CREDS; }
}

function getConfig() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
    } catch (e) { return {}; }
}

function saveConfig(partial) {
    const current = getConfig();
    const merged = deepMerge(current, partial);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
}

function deepMerge(target, source) {
    const out = Object.assign({}, target);
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            out[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            out[key] = source[key];
        }
    });
    return out;
}

function showToast(msg, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), duration);
}

function showFeedback(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
}

/* ──────────────────────────────────────────────────────────────
   THEME (admin panel's own theme)
   ────────────────────────────────────────────────────────────── */
function initAdminTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    const btn = document.getElementById('admin-theme-toggle');
    btn && btn.addEventListener('click', () => {
        const curr = document.documentElement.getAttribute('data-theme');
        const next = curr === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
    });
}

/* ──────────────────────────────────────────────────────────────
   LOGIN
   ────────────────────────────────────────────────────────────── */
function initLogin() {
    const loginScreen = document.getElementById('login-screen');
    const dashboard   = document.getElementById('dashboard');

    /* Check existing session */
    if (sessionStorage.getItem(AUTH_KEY) === 'true') {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        loadConfigIntoForms();
        return;
    }

    const form      = document.getElementById('login-form');
    const errorEl   = document.getElementById('login-error');
    const pwInput   = document.getElementById('password');
    const togglePw  = document.getElementById('toggle-pw');
    const eyeOpen   = document.getElementById('eye-open');
    const eyeClosed = document.getElementById('eye-closed');

    /* Password visibility toggle */
    togglePw && togglePw.addEventListener('click', () => {
        const show = pwInput.type === 'password';
        pwInput.type = show ? 'text' : 'password';
        eyeOpen.classList.toggle('hidden', show);
        eyeClosed.classList.toggle('hidden', !show);
    });

    form && form.addEventListener('submit', e => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pw   = document.getElementById('password').value;
        const creds = getStoredCreds();

        if (user === creds.username && pw === creds.password) {
            sessionStorage.setItem(AUTH_KEY, 'true');
            loginScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
            loadConfigIntoForms();
        } else {
            errorEl.classList.remove('hidden');
            setTimeout(() => errorEl.classList.add('hidden'), 4000);
        }
    });
}

/* ──────────────────────────────────────────────────────────────
   SIDEBAR & NAVIGATION
   ────────────────────────────────────────────────────────────── */
function initSidebar() {
    const sidebar      = document.getElementById('sidebar');
    const toggleBtn    = document.getElementById('sidebar-toggle');
    const closeBtn     = document.getElementById('sidebar-close');
    const mainWrap     = document.querySelector('.main-wrap');
    const navItems     = document.querySelectorAll('.nav-item[data-panel]');
    const panelTitle   = document.getElementById('panel-title');

    const TITLES = {
        overview:   'Overview',
        content:    'Content',
        experience: 'Experience',
        projects:   'Projects',
        appearance: 'Appearance',
        cv:         'CV Files',
        settings:   'Settings'
    };

    function navigateTo(panelId) {
        /* Deactivate all */
        navItems.forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

        /* Activate target */
        const targetNav   = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
        const targetPanel = document.getElementById(`panel-${panelId}`);

        if (targetNav)   targetNav.classList.add('active');
        if (targetPanel) targetPanel.classList.add('active');
        if (panelTitle)  panelTitle.textContent = TITLES[panelId] || '';

        /* Close sidebar on mobile */
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(item.dataset.panel);
        });
    });

    /* Quick action buttons in Overview */
    document.querySelectorAll('.qa-btn[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.nav));
    });

    /* Sidebar toggle */
    toggleBtn && toggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
        } else {
            sidebar.classList.toggle('collapsed');
            mainWrap && mainWrap.classList.toggle('expanded');
        }
    });

    closeBtn && closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    /* Logout */
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn && logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem(AUTH_KEY);
        window.location.reload();
    });
}

/* ──────────────────────────────────────────────────────────────
   LOAD CONFIG INTO FORMS
   ────────────────────────────────────────────────────────────── */
function loadConfigIntoForms() {
    const config = getConfig();

    /* Content */
    if (config.hero) {
        setVal('content-name',      config.hero.name || 'Amrit Dash');
        setVal('content-title',     config.hero.title || 'AI & Automation Engineer');
        setVal('content-subtitle',  config.hero.subtitle || '');
        setChecked('content-available', config.hero.available !== false);
    }
    if (config.about) {
        setVal('content-bio',           config.about.bio || '');
        setVal('content-years',         config.about.years || '5');
        setVal('content-projects-count',config.about.projectsCount || '10');
        setVal('content-companies',     config.about.companies || '3');
    }
    if (config.contact) {
        setVal('content-email',    config.contact.email || '');
        setVal('content-phone',    config.contact.phone || '');
        setVal('content-linkedin', config.contact.linkedin || '');
        setVal('content-github',   config.contact.github || '');
        setVal('content-instagram',config.contact.instagram || '');
    }

    /* Appearance */
    if (config.theme) {
        setVal('app-default-theme', config.theme.default || 'dark');
        setChecked('app-custom-cursor', config.theme.customCursor !== false);
        setChecked('app-particles',     config.theme.particlesEnabled !== false);
        const a1 = config.theme.accentColor1 || '#7c3aed';
        const a2 = config.theme.accentColor2 || '#06b6d4';
        const ag = config.theme.accentGreen  || '#10b981';
        setVal('app-accent1',      a1);
        setVal('app-accent1-text', a1);
        setVal('app-accent2',      a2);
        setVal('app-accent2-text', a2);
        setVal('app-green',        ag);
        setVal('app-green-text',   ag);
        updateAccentPreview(a1, a2);
        setVal('app-font-heading', config.theme.fontHeading || 'Space Grotesk');
        setVal('app-font-body',    config.theme.fontBody    || 'Inter');
    }

    /* CV */
    if (config.cv) {
        setVal('cv-dark-path',  config.cv.dark  || 'assets/cv-dark.pdf');
        setVal('cv-light-path', config.cv.light || 'assets/cv-light.pdf');
    }

    /* Experience */
    if (config.currentRole) {
        setVal('exp-current-role',    config.currentRole.role    || '');
        setVal('exp-current-company', config.currentRole.company || '');
        setVal('exp-current-period',  config.currentRole.period  || '');
        setVal('exp-current-desc',    config.currentRole.desc    || '');
    }
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = val;
}

/* ──────────────────────────────────────────────────────────────
   SAVE HANDLERS
   ────────────────────────────────────────────────────────────── */
function initSaveHandlers() {

    /* Content */
    const saveContent = document.getElementById('save-content');
    saveContent && saveContent.addEventListener('click', () => {
        saveConfig({
            hero: {
                name:      val('content-name'),
                title:     val('content-title'),
                subtitle:  val('content-subtitle'),
                available: checked('content-available')
            },
            about: {
                bio:           val('content-bio'),
                years:         val('content-years'),
                projectsCount: val('content-projects-count'),
                companies:     val('content-companies')
            },
            contact: {
                email:     val('content-email'),
                phone:     val('content-phone'),
                linkedin:  val('content-linkedin'),
                github:    val('content-github'),
                instagram: val('content-instagram')
            }
        });
        showFeedback('content-saved');
        showToast('Content saved ✓');
    });

    /* Experience */
    const saveExp = document.getElementById('save-experience');
    saveExp && saveExp.addEventListener('click', () => {
        saveConfig({
            currentRole: {
                role:    val('exp-current-role'),
                company: val('exp-current-company'),
                period:  val('exp-current-period'),
                desc:    val('exp-current-desc')
            }
        });
        showFeedback('experience-saved');
        showToast('Experience saved ✓');
    });

    /* Appearance */
    const saveAppearance = document.getElementById('save-appearance');
    saveAppearance && saveAppearance.addEventListener('click', () => {
        saveConfig({
            theme: {
                default:          val('app-default-theme'),
                customCursor:     checked('app-custom-cursor'),
                particlesEnabled: checked('app-particles'),
                accentColor1:     val('app-accent1-text'),
                accentColor2:     val('app-accent2-text'),
                accentGreen:      val('app-green-text'),
                fontHeading:      val('app-font-heading'),
                fontBody:         val('app-font-body')
            }
        });
        showFeedback('appearance-saved');
        showToast('Appearance saved ✓');
    });

    /* Reset appearance */
    const resetAppearance = document.getElementById('reset-appearance');
    resetAppearance && resetAppearance.addEventListener('click', () => {
        if (!confirm('Reset appearance to defaults?')) return;
        const defaults = { accentColor1:'#7c3aed', accentColor2:'#06b6d4', accentGreen:'#10b981',
                           fontHeading:'Space Grotesk', fontBody:'Inter', default:'dark',
                           customCursor:true, particlesEnabled:true };
        setVal('app-default-theme', defaults.default);
        setChecked('app-custom-cursor', defaults.customCursor);
        setChecked('app-particles', defaults.particlesEnabled);
        setVal('app-accent1', defaults.accentColor1);
        setVal('app-accent1-text', defaults.accentColor1);
        setVal('app-accent2', defaults.accentColor2);
        setVal('app-accent2-text', defaults.accentColor2);
        setVal('app-green', defaults.accentGreen);
        setVal('app-green-text', defaults.accentGreen);
        updateAccentPreview(defaults.accentColor1, defaults.accentColor2);
        setVal('app-font-heading', defaults.fontHeading);
        setVal('app-font-body', defaults.fontBody);
        saveConfig({ theme: defaults });
        showToast('Appearance reset to defaults');
    });

    /* CV */
    const saveCv = document.getElementById('save-cv');
    saveCv && saveCv.addEventListener('click', () => {
        saveConfig({
            cv: {
                dark:  val('cv-dark-path'),
                light: val('cv-light-path')
            }
        });
        showFeedback('cv-saved');
        showToast('CV paths saved ✓');
    });

    /* Password */
    const savePw = document.getElementById('save-password');
    savePw && savePw.addEventListener('click', () => {
        const curr = document.getElementById('settings-current-pw')?.value;
        const newPw = document.getElementById('settings-new-pw')?.value;
        const confirmPw = document.getElementById('settings-confirm-pw')?.value;
        const creds = getStoredCreds();

        document.getElementById('password-error')?.classList.add('hidden');
        document.getElementById('password-saved')?.classList.add('hidden');

        if (curr !== creds.password) {
            showFeedback('password-error');
            document.getElementById('password-error').textContent = '❌ Current password is incorrect';
            return;
        }
        if (!newPw || newPw.length < 4) {
            showFeedback('password-error');
            document.getElementById('password-error').textContent = '❌ New password must be at least 4 characters';
            return;
        }
        if (newPw !== confirmPw) {
            showFeedback('password-error');
            document.getElementById('password-error').textContent = '❌ Passwords do not match';
            return;
        }
        localStorage.setItem(CREDS_KEY, JSON.stringify({ username: creds.username, password: newPw }));
        showFeedback('password-saved');
        showToast('Password updated ✓');
        ['settings-current-pw','settings-new-pw','settings-confirm-pw'].forEach(id => setVal(id, ''));
    });

    /* Export config */
    const exportBtn = document.getElementById('export-config');
    exportBtn && exportBtn.addEventListener('click', () => {
        const data = localStorage.getItem(CONFIG_KEY) || '{}';
        const blob = new Blob([JSON.stringify(JSON.parse(data), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portfolio-config.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    /* Reset all */
    const resetAll = document.getElementById('reset-config');
    resetAll && resetAll.addEventListener('click', () => {
        if (!confirm('Reset ALL configuration to defaults? This cannot be undone.')) return;
        localStorage.removeItem(CONFIG_KEY);
        loadConfigIntoForms();
        showToast('All config reset to defaults');
    });
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function checked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : true;
}

/* ──────────────────────────────────────────────────────────────
   APPEARANCE LIVE PREVIEW
   ────────────────────────────────────────────────────────────── */
function updateAccentPreview(a1, a2) {
    const bar = document.getElementById('accent-preview-bar');
    const btn = document.getElementById('accent-preview-btn');
    const grad = `linear-gradient(135deg, ${a1}, ${a2})`;
    if (bar) bar.style.background = grad;
    if (btn) btn.style.background = grad;
}

function initAppearanceLivePreview() {
    /* Color pickers sync with text inputs */
    const pairs = [
        ['app-accent1', 'app-accent1-text'],
        ['app-accent2', 'app-accent2-text'],
        ['app-green',   'app-green-text']
    ];

    pairs.forEach(([pickerId, textId]) => {
        const picker = document.getElementById(pickerId);
        const text   = document.getElementById(textId);
        if (!picker || !text) return;

        picker.addEventListener('input', () => {
            text.value = picker.value;
            const a1 = document.getElementById('app-accent1')?.value || '#7c3aed';
            const a2 = document.getElementById('app-accent2')?.value || '#06b6d4';
            updateAccentPreview(a1, a2);
        });

        text.addEventListener('input', () => {
            if (/^#[0-9a-fA-F]{6}$/.test(text.value)) {
                picker.value = text.value;
                const a1 = document.getElementById('app-accent1-text')?.value || '#7c3aed';
                const a2 = document.getElementById('app-accent2-text')?.value || '#06b6d4';
                updateAccentPreview(a1, a2);
            }
        });
    });

    /* Color preset swatches */
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            const a1 = preset.dataset.a1;
            const a2 = preset.dataset.a2;
            setVal('app-accent1', a1);
            setVal('app-accent1-text', a1);
            setVal('app-accent2', a2);
            setVal('app-accent2-text', a2);
            updateAccentPreview(a1, a2);
        });
    });
}

/* ──────────────────────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initAdminTheme();
    initLogin();
    initSidebar();
    initSaveHandlers();
    initAppearanceLivePreview();
});
