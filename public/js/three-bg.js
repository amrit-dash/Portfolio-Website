// Animated 3D background using Three.js. A flowing field of particles
// shaped like a torus + a soft starfield, with mouse-driven parallax
// and accent-colour reactivity. Imports Three.js via the official ESM
// CDN so we keep a zero-build setup. Bails out gracefully on slow
// devices or when the user has reduced-motion preferences.

const MODULE_URL = "https://unpkg.com/three@0.160.0/build/three.module.js";

let started = false;
let three, scene, camera, renderer, particles, stars, particleMaterial, starMaterial;
let mouseX = 0, mouseY = 0;
let rafId = null;

export async function initThreeBackground() {
  if (started) return;
  if (document.documentElement.getAttribute("data-animated-bg") === "off") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  started = true;

  try {
    three = await import(/* @vite-ignore */ MODULE_URL);
  } catch (e) {
    console.warn("three.js unavailable", e);
    return;
  }

  const canvas = document.getElementById("three-bg");
  if (!canvas) return;

  scene = new three.Scene();
  camera = new three.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;

  renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Torus knot of particles
  const knotGeom = new three.TorusKnotGeometry(14, 4, 220, 22);
  const pos = knotGeom.attributes.position;
  const points = new three.BufferGeometry();
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    arr[i * 3] = pos.getX(i) + (Math.random() - 0.5) * 1.5;
    arr[i * 3 + 1] = pos.getY(i) + (Math.random() - 0.5) * 1.5;
    arr[i * 3 + 2] = pos.getZ(i) + (Math.random() - 0.5) * 1.5;
  }
  points.setAttribute("position", new three.BufferAttribute(arr, 3));
  particleMaterial = new three.PointsMaterial({
    color: readAccentColor(),
    size: 0.18,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    blending: three.AdditiveBlending,
    depthWrite: false,
  });
  particles = new three.Points(points, particleMaterial);
  scene.add(particles);

  // Soft starfield
  const starsGeom = new three.BufferGeometry();
  const starCount = 800;
  const starArr = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starArr[i * 3] = (Math.random() - 0.5) * 220;
    starArr[i * 3 + 1] = (Math.random() - 0.5) * 220;
    starArr[i * 3 + 2] = (Math.random() - 0.5) * 220;
  }
  starsGeom.setAttribute("position", new three.BufferAttribute(starArr, 3));
  starMaterial = new three.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
    depthWrite: false,
  });
  stars = new three.Points(starsGeom, starMaterial);
  scene.add(stars);

  window.addEventListener("resize", onResize);
  window.addEventListener("mousemove", onMouseMove, { passive: true });

  // Re-tint when accent changes
  const obs = new MutationObserver(() => {
    if (particleMaterial) particleMaterial.color = new three.Color(readAccentColor());
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });

  animate();
}

function onResize() {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
}

function readAccentColor() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return v || "#7c5cff";
}

function animate() {
  if (!renderer) return;
  rafId = requestAnimationFrame(animate);
  const t = performance.now() * 0.0001;
  if (particles) {
    particles.rotation.x = t * 6 + mouseY * 0.3;
    particles.rotation.y = t * 8 + mouseX * 0.3;
  }
  if (stars) {
    stars.rotation.y = t * 2;
  }
  camera.position.x += (mouseX * 4 - camera.position.x) * 0.02;
  camera.position.y += (-mouseY * 4 - camera.position.y) * 0.02;
  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}

export function stopThreeBackground() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (renderer) {
    renderer.dispose();
    renderer.domElement && (renderer.domElement.style.display = "none");
  }
  started = false;
}
