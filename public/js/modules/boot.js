// Retro CRT boot-screen preloader.
// Reveals lines progressively, then hides itself. Honours reduced-motion.

export function initBootScreen() {
    const screen = document.getElementById('boot-screen');
    if (!screen) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lines = Array.from(screen.querySelectorAll('.boot-line'));
    lines.forEach(l => {
        l.dataset.html = l.innerHTML;
        l.innerHTML = '';
        l.style.opacity = '0';
    });

    function dismiss() {
        screen.classList.add('is-done');
        setTimeout(() => screen.remove(), 750);
        document.dispatchEvent(new CustomEvent('boot:done'));
    }

    if (reduced) {
        lines.forEach(l => { l.innerHTML = l.dataset.html; l.style.opacity = '1'; });
        setTimeout(dismiss, 250);
        return;
    }

    let i = 0;
    function step() {
        if (i >= lines.length) {
            setTimeout(dismiss, 450);
            return;
        }
        const line = lines[i++];
        line.style.opacity = '1';
        line.innerHTML = line.dataset.html;
        setTimeout(step, 220 + Math.random() * 180);
    }
    setTimeout(step, 150);

    // Hard fallback so the splash never traps the page.
    setTimeout(() => screen.isConnected && dismiss(), 5000);
}
