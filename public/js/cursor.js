// Custom glow cursor (desktop only).

export function initCursor() {
  const el = document.getElementById('cursor');
  if (!el) return;
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) {
    el.remove();
    return;
  }
  let tx = 0, ty = 0, x = 0, y = 0;
  let running = true;

  window.addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
  }, { passive: true });

  const interactive = 'a,button,.project,[data-cursor="active"]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactive)) el.classList.add('is-active');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest && e.target.closest(interactive)) el.classList.remove('is-active');
  });

  function tick() {
    if (!running) return;
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener('blur', () => running = false);
  window.addEventListener('focus', () => { running = true; tick(); });
}
