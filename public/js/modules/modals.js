// Project modals — cards advertise themselves via data-modal="tpl-id";
// we clone the matching <template> into the modal body on open.

export function initModals() {
    const root = document.getElementById('modal-root');
    const body = document.getElementById('modal-body');
    const close = document.getElementById('modal-close');
    if (!root || !body) return;

    function open(id) {
        const tpl = document.getElementById(`tpl-${id}`);
        if (!tpl) return;
        body.innerHTML = '';
        body.appendChild(tpl.content.cloneNode(true));
        root.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() {
        root.classList.remove('is-open');
        document.body.style.overflow = '';
        body.innerHTML = '';
    }

    document.querySelectorAll('[data-modal]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            open(card.getAttribute('data-modal'));
        });
        card.style.cursor = 'pointer';
    });

    close?.addEventListener('click', closeModal);
    root.addEventListener('click', (e) => { if (e.target === root) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}
