// Light/dark theme controller. Persists choice in localStorage and broadcasts
// a `theme:change` CustomEvent so other modules (e.g. CV download) can react.

const KEY = 'ad-theme';
const root = document.documentElement;

export function getTheme() {
    return root.getAttribute('data-theme') || 'dark';
}

export function setTheme(t) {
    if (t !== 'dark' && t !== 'light') t = 'dark';
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (_) {}
    document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: t } }));
}

export function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
    // Apply persisted preference (boot script already set initial state).
    const stored = (() => { try { return localStorage.getItem(KEY); } catch (_) { return null; } })();
    if (stored) setTheme(stored);

    const btns = document.querySelectorAll('#theme-toggle, #theme-toggle-mobile');
    btns.forEach(btn => btn.addEventListener('click', toggleTheme));

    // System theme changes only override if user hasn't picked one.
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        mq.addEventListener?.('change', (e) => {
            try {
                if (!localStorage.getItem(KEY)) setTheme(e.matches ? 'light' : 'dark');
            } catch (_) {}
        });
    }
}
