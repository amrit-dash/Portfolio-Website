// Wires the CV download button to the theme-appropriate PDF. The admin
// dashboard can override the URLs at runtime by setting
// `window.__AD_CONFIG.cv = { light, dark }` before the page boots, or by
// dispatching a `cv:update` event.

const DEFAULTS = {
    light: 'assets/Amrit Dash | CV | 2025 (Light).pdf',
    dark:  'assets/Amrit Dash | CV | 2025 (Dark).pdf',
};

function urlFor(theme) {
    const cfg = (window.__AD_CONFIG && window.__AD_CONFIG.cv) || {};
    return (cfg[theme] || DEFAULTS[theme] || DEFAULTS.dark);
}

function apply() {
    const btn = document.getElementById('cv-download');
    if (!btn) return;
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    btn.setAttribute('href', urlFor(theme));
    btn.setAttribute('download', `Amrit Dash - CV - ${theme === 'light' ? 'Light' : 'Dark'}.pdf`);
}

export function initCv() {
    apply();
    document.addEventListener('theme:change', apply);
    document.addEventListener('cv:update', apply);
}
