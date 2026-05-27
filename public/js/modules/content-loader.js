// Loads CMS-managed content from Firestore when configured. Each section is
// stored as a single document under the `site` collection (e.g.
// site/hero, site/about, site/experience, site/projects). When Firestore is
// unavailable, the page keeps the static HTML defaults — so the site always
// works as a plain static portfolio.

import { getFirebase, hasFirebaseConfig } from './firebase-app.js';

function setText(selector, value) {
    if (value == null) return;
    document.querySelectorAll(`[data-cms="${selector}"]`).forEach(el => {
        el.textContent = value;
    });
}

function applyHero(hero) {
    if (!hero) return;
    if (hero.name) setText('hero.name', hero.name);
    if (hero.sub)  setText('hero.sub',  hero.sub);
}

function applyAbout(about) {
    if (!about) return;
    if (about.p1) setText('about.p1', about.p1);
    if (about.p2) setText('about.p2', about.p2);
    if (about.p3) setText('about.p3', about.p3);
}

function applyExperience(items) {
    if (!Array.isArray(items) || !items.length) return;
    const list = document.getElementById('timeline-exp');
    if (!list) return;
    list.innerHTML = items.map(it => `
        <li class="tl-item ${it.current ? 'is-current' : ''}">
            <div class="tl-head">
                <span class="tl-role">${escape(it.role || '')}</span>
                ${it.current ? '<span class="tl-current-pill">Current</span>' : ''}
                <span class="tl-period">${escape(it.period || '')}</span>
            </div>
            <div class="tl-org">${escape(it.org || '')}</div>
            <p class="tl-desc">${escape(it.desc || '')}</p>
            ${Array.isArray(it.tags) && it.tags.length
                ? `<div class="tl-tags">${it.tags.map(t => `<span>${escape(t)}</span>`).join('')}</div>`
                : ''}
        </li>
    `).join('');
}

function applyCv(cv) {
    if (!cv) return;
    window.__AD_CONFIG = Object.assign({}, window.__AD_CONFIG, { cv });
    document.dispatchEvent(new CustomEvent('cv:update'));
}

function escape(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export async function initContent() {
    if (!hasFirebaseConfig()) return;
    const fb = await getFirebase();
    if (!fb) return;

    const { firestore, _fs } = fb;
    try {
        const sections = ['hero', 'about', 'experience', 'cv', 'cosmetics'];
        const snaps = await Promise.all(
            sections.map(name => _fs.getDoc(_fs.doc(firestore, 'site', name)).catch(() => null))
        );
        const [hero, about, exp, cv, cos] = snaps.map(s => s && s.exists() ? s.data() : null);
        applyHero(hero);
        applyAbout(about);
        applyExperience(exp && exp.items);
        applyCv(cv);
        if (cos && cos.accent) document.documentElement.style.setProperty('--accent', cos.accent);
        if (cos && cos.defaultTheme && !localStorage.getItem('ad-theme')) {
            document.documentElement.setAttribute('data-theme', cos.defaultTheme);
            document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: cos.defaultTheme } }));
        }
    } catch (err) {
        console.info('[content-loader] could not load CMS content, using static defaults:', err?.message || err);
    }
}
