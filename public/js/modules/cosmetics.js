// Applies any cosmetic preferences saved locally (accent, default theme,
// font). The admin dashboard pushes overrides to Firestore which the
// content-loader then applies; for visitors without Firestore this just
// honours the saved local preference (so previews work).

export async function initCosmetics() {
    try {
        const raw = localStorage.getItem('ad-cosmetics');
        if (!raw) return;
        const c = JSON.parse(raw);
        if (c.accent) document.documentElement.style.setProperty('--accent', c.accent);
        if (c.font) document.documentElement.style.setProperty('--font-body', c.font);
        if (c.defaultTheme && !localStorage.getItem('ad-theme')) {
            document.documentElement.setAttribute('data-theme', c.defaultTheme);
        }
    } catch (_) {}
}
