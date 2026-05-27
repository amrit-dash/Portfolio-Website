// Generic tabbed switcher used by the Journey section.
export function initTabs() {
    const tabs = document.querySelectorAll('.tl-tab');
    if (!tabs.length) return;
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            document.querySelectorAll('.tl-tab').forEach(t => t.classList.toggle('is-active', t === tab));
            document.querySelectorAll('.tl-panel').forEach(p => p.classList.toggle('is-active', p.id === `panel-${target}`));
        });
    });
}
