const BOOT_LINES = [
  "POST portfolio-kernel v2.6.0",
  "Loading modules: automation, flutter, firebase...",
  "Mounting /home/amrit/workspace",
  "Initializing retro display pipeline...",
  "Auth: public read · admin write",
  "Ready."
];

export function runBootSequence({ enabled = true, onComplete }) {
  const overlay = document.getElementById("boot-overlay");
  const terminal = document.getElementById("boot-terminal");
  if (!overlay || !terminal || !enabled) {
    overlay?.classList.add("is-done");
    document.body.classList.remove("is-booting");
    onComplete?.();
    return;
  }

  document.body.classList.add("is-booting");
  let lineIndex = 0;

  function typeLine(text, done) {
    const line = document.createElement("div");
    line.className = "boot-line";
    terminal.appendChild(line);
    let i = 0;
    const tick = () => {
      line.textContent = text.slice(0, i);
      i += 1;
      if (i <= text.length) {
        requestAnimationFrame(() => setTimeout(tick, 12 + Math.random() * 18));
      } else {
        done();
      }
    };
    tick();
  }

  function nextLine() {
    if (lineIndex >= BOOT_LINES.length) {
      setTimeout(finishBoot, 400);
      return;
    }
    typeLine(BOOT_LINES[lineIndex], () => {
      lineIndex += 1;
      setTimeout(nextLine, 120);
    });
  }

  function finishBoot() {
    overlay.classList.add("is-opening");
    setTimeout(() => {
      overlay.classList.add("is-done");
      document.body.classList.remove("is-booting");
      onComplete?.();
    }, 900);
  }

  nextLine();
}
