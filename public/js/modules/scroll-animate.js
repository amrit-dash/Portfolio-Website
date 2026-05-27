// IntersectionObserver-based reveal animations. Any element marked with
// `data-anim` (fade | slide-l | slide-r | scale | rotate) animates on entry.
// Children of `[data-anim-stagger]` animate sequentially via the `--i` index.

export function initScrollAnim() {
    const items = document.querySelectorAll('[data-anim]');
    if (!('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('is-in'));
        return;
    }

    document.querySelectorAll('[data-anim-stagger]').forEach(group => {
        Array.from(group.children).forEach((child, i) => {
            if (!child.style.getPropertyValue('--i')) child.style.setProperty('--i', i);
        });
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => io.observe(el));
}
