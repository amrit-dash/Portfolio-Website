// Configurable custom cursor. Toggled via :root[data-cursor]. Falls
// back to native cursor on coarse-pointer devices.

let bound = false;

export function initCursor() {
  if (bound) return;
  if (matchMedia("(pointer: coarse)").matches) return;
  bound = true;
  const dot = document.createElement("div");
  const ring = document.createElement("div");
  dot.className = "cursor-dot";
  ring.className = "cursor-ring";
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let rx = x;
  let ry = y;

  document.addEventListener("mousemove", (e) => {
    x = e.clientX;
    y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });

  const loop = () => {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  };
  loop();

  document.addEventListener("mouseover", (e) => {
    const t = e.target;
    const hov = t.closest && t.closest("a, button, [data-cursor-hover]");
    if (hov) ring.classList.add("is-hover");
    else ring.classList.remove("is-hover");
  });

  document.addEventListener("mouseleave", () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  });
  document.addEventListener("mouseenter", () => {
    dot.style.opacity = "";
    ring.style.opacity = "";
  });
}
