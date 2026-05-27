export function runBootScreen(lines, onComplete) {
  const screen = document.getElementById('boot-screen');
  const log = document.getElementById('boot-log');
  if (!screen || !log) {
    onComplete?.();
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    screen.classList.add('boot-done');
    onComplete?.();
    return;
  }

  let index = 0;
  const typeLine = () => {
    if (index >= lines.length) {
      setTimeout(() => {
        screen.classList.add('boot-done');
        setTimeout(() => {
          screen.remove();
          onComplete?.();
        }, 500);
      }, 400);
      return;
    }
    const line = document.createElement('div');
    line.className = 'boot-line';
    line.textContent = `> ${lines[index]}`;
    log.appendChild(line);
    index += 1;
    setTimeout(typeLine, 280 + Math.random() * 220);
  };

  typeLine();
}
