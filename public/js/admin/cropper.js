// Lightweight, dependency-free image cropper.
// Drag the image to position it inside a fixed-aspect frame, scroll/
// slider to zoom. Returns a PNG/JPEG data-URL at the requested output
// resolution — ready to be stored in the overlay (or, later, uploaded
// to Firebase Storage).

const stage = () => document.getElementById("cropper-stage");
const canvas = () => document.getElementById("cropper-canvas");
const frameEl = () => document.getElementById("cropper-frame");
const zoom = () => document.getElementById("cropper-zoom");
const ratioLabel = () => document.getElementById("cropper-ratio");
const modal = () => document.getElementById("cropper");

const state = {
  img: null,
  imgX: 0,
  imgY: 0,
  scale: 1,
  baseScale: 1,
  stageW: 0,
  stageH: 0,
  frame: { x: 0, y: 0, w: 0, h: 0 },
  outW: 800,
  outH: 800,
  resolve: null,
  format: "image/jpeg",
};

function fitToStage(img) {
  const maxW = Math.min(640, window.innerWidth - 100);
  const aspect = state.outW / state.outH;
  // Stage width = maxW, stage height chosen so the frame is centred with margin
  state.stageW = maxW;
  state.stageH = Math.round(maxW * 0.72);

  const cv = canvas();
  cv.width = state.stageW * window.devicePixelRatio;
  cv.height = state.stageH * window.devicePixelRatio;
  cv.style.width = state.stageW + "px";
  cv.style.height = state.stageH + "px";

  // Frame sized to roughly 80% of stage, respecting aspect
  let fw = state.stageW * 0.8;
  let fh = fw / aspect;
  if (fh > state.stageH * 0.86) {
    fh = state.stageH * 0.86;
    fw = fh * aspect;
  }
  state.frame = {
    x: (state.stageW - fw) / 2,
    y: (state.stageH - fh) / 2,
    w: fw,
    h: fh,
  };
  const f = frameEl();
  f.style.left = state.frame.x + "px";
  f.style.top = state.frame.y + "px";
  f.style.width = state.frame.w + "px";
  f.style.height = state.frame.h + "px";

  state.baseScale = Math.max(fw / img.width, fh / img.height);
  state.scale = state.baseScale;
  state.imgX = state.frame.x + (fw - img.width * state.scale) / 2;
  state.imgY = state.frame.y + (fh - img.height * state.scale) / 2;
  zoom().min = 1;
  zoom().max = 4;
  zoom().step = 0.01;
  zoom().value = 1;
  draw();
}

function draw() {
  const cv = canvas();
  const ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, state.stageW, state.stageH);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, state.stageW, state.stageH);
  if (!state.img) return;
  const w = state.img.width * state.scale;
  const h = state.img.height * state.scale;
  ctx.drawImage(state.img, state.imgX, state.imgY, w, h);
}

function clampImage() {
  const fr = state.frame;
  const w = state.img.width * state.scale;
  const h = state.img.height * state.scale;
  state.imgX = Math.min(fr.x, Math.max(fr.x + fr.w - w, state.imgX));
  state.imgY = Math.min(fr.y, Math.max(fr.y + fr.h - h, state.imgY));
}

function bindInteractions() {
  if (bindInteractions._bound) return;
  bindInteractions._bound = true;
  const cv = canvas();
  let dragging = false;
  let lastX = 0, lastY = 0;
  cv.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    state.imgX += e.clientX - lastX;
    state.imgY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    clampImage();
    draw();
  });
  cv.addEventListener("pointerup", () => (dragging = false));
  cv.addEventListener("pointercancel", () => (dragging = false));
  cv.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const z = parseFloat(zoom().value) + delta;
      zoom().value = Math.max(1, Math.min(4, z));
      onZoom();
    },
    { passive: false }
  );
  zoom().addEventListener("input", onZoom);
  document.getElementById("cropper-cancel").addEventListener("click", cancel);
  document.getElementById("cropper-save").addEventListener("click", save);
  document
    .getElementById("cropper-backdrop")
    .addEventListener("click", cancel);
}

function onZoom() {
  const factor = parseFloat(zoom().value);
  const prevScale = state.scale;
  const newScale = state.baseScale * factor;
  // Keep frame centre fixed
  const cx = state.frame.x + state.frame.w / 2;
  const cy = state.frame.y + state.frame.h / 2;
  const px = (cx - state.imgX) / prevScale;
  const py = (cy - state.imgY) / prevScale;
  state.scale = newScale;
  state.imgX = cx - px * newScale;
  state.imgY = cy - py * newScale;
  clampImage();
  draw();
}

function cancel() {
  modal().classList.remove("is-open");
  if (state.resolve) state.resolve(null);
  state.resolve = null;
  state.img = null;
}

function save() {
  const fr = state.frame;
  const off = document.createElement("canvas");
  off.width = state.outW;
  off.height = state.outH;
  const ctx = off.getContext("2d");
  const sx = (fr.x - state.imgX) / state.scale;
  const sy = (fr.y - state.imgY) / state.scale;
  const sw = fr.w / state.scale;
  const sh = fr.h / state.scale;
  ctx.drawImage(state.img, sx, sy, sw, sh, 0, 0, state.outW, state.outH);
  const data = off.toDataURL(state.format, 0.92);
  modal().classList.remove("is-open");
  const resolve = state.resolve;
  state.resolve = null;
  state.img = null;
  resolve && resolve(data);
}

export function openCropper({ src, outW = 800, outH = 800, format = "image/jpeg", label = "" } = {}) {
  return new Promise((resolve) => {
    state.outW = outW;
    state.outH = outH;
    state.format = format;
    state.resolve = resolve;
    ratioLabel().textContent = `${outW}×${outH} · ${(outW / outH).toFixed(2)}:1${label ? " · " + label : ""}`;
    const img = new Image();
    img.onload = () => {
      state.img = img;
      modal().classList.add("is-open");
      bindInteractions();
      requestAnimationFrame(() => fitToStage(img));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Helper: open a file picker, read as data URL, then crop.
export function pickAndCrop({ outW, outH, format, label } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return resolve(null);
      const fr = new FileReader();
      fr.onload = async () => {
        const cropped = await openCropper({ src: fr.result, outW, outH, format, label });
        resolve(cropped);
      };
      fr.readAsDataURL(file);
    });
    input.click();
  });
}

// Helper: open a file picker for non-image files (PDF, etc.) and return
// a base64 data-URL — used for CV uploads. No cropping involved.
export function pickFile({ accept = "application/pdf" } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return resolve(null);
      const fr = new FileReader();
      fr.onload = () => resolve({ name: file.name, type: file.type, dataUrl: fr.result, size: file.size });
      fr.readAsDataURL(file);
    });
    input.click();
  });
}
