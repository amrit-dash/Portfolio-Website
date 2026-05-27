// Dock nav: scroll-spy + smooth scroll + mobile sheet.

export function initNav() {
    const links = Array.from(document.querySelectorAll('.dock-link, .mobile-sheet a'));
    const targets = links
        .map(a => a.getAttribute('href'))
        .filter(h => h && h.startsWith('#'))
        .map(h => document.querySelector(h))
        .filter(Boolean);

    // Smooth scroll for in-page anchors (the dock-brand also handles #top).
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            if (id === '#' || !id) return;
            const el = id === '#top' ? document.documentElement : document.querySelector(id);
            if (!el) return;
            e.preventDefault();
            const top = id === '#top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 40;
            window.scrollTo({ top, behavior: 'smooth' });
            sheet?.classList.remove('is-open');
        });
    });

    // Active link as you scroll.
    if ('IntersectionObserver' in window && targets.length) {
        const map = new Map(targets.map(t => [t.id, t]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    document.querySelectorAll('.dock-link').forEach(l => {
                        l.classList.toggle('is-active', l.getAttribute('href') === '#' + id);
                    });
                }
            });
        }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
        targets.forEach(t => io.observe(t));
    }

    // Mobile menu sheet.
    const trigger = document.getElementById('menu-trigger');
    const sheet = document.getElementById('mobile-sheet');
    if (trigger && sheet) {
        trigger.addEventListener('click', () => sheet.classList.toggle('is-open'));
        sheet.querySelectorAll('a').forEach(a => a.addEventListener('click', () => sheet.classList.remove('is-open')));
    }
}
