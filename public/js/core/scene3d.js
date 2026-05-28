export function initHeroScene(canvasId = "canvas-hero") {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === "undefined") return null;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 28;

  const count = window.innerWidth < 768 ? 120 : 220;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 50;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const theme = () => document.documentElement.getAttribute("data-theme") || "dark";
  const material = new THREE.PointsMaterial({
    color: 0x6ee7ff,
    size: 0.12,
    transparent: true,
    opacity: 0.85,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const lineGeo = new THREE.BufferGeometry();
  const linePositions = [];
  const maxDist = 6;
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      if (Math.hypot(dx, dy, dz) < maxDist) {
        linePositions.push(
          positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
          positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
        );
      }
    }
  }
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.08 })
  );
  scene.add(lines);

  let mouseX = 0;
  let mouseY = 0;
  document.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function onThemeChange() {
    material.color.setStyle(theme() === "light" ? "#0891b2" : "#6ee7ff");
    lines.material.color.setStyle(theme() === "light" ? "#7c3aed" : "#a78bfa");
  }
  new MutationObserver(onThemeChange).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  onThemeChange();

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);

  let frame = 0;
  function animate() {
    frame += 0.002;
    points.rotation.y = frame * 0.4 + mouseX * 0.15;
    points.rotation.x = mouseY * 0.1;
    lines.rotation.copy(points.rotation);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  return { dispose: () => renderer.dispose() };
}
