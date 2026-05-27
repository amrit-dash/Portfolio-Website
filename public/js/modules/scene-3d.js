import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

export function initHeroScene(canvas) {
  if (!canvas) return () => {};

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return () => {};

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 6;

  const grid = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0x3dff9a,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });

  for (let i = -4; i <= 4; i++) {
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set((i % 3) * 1.2 - 1.2, Math.floor(i / 3) * 1.2 - 1.2, (i % 2) * 0.6);
    grid.add(mesh);
  }
  scene.add(grid);

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height || 1;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  let frame = 0;
  let rafId;
  const animate = () => {
    frame += 0.01;
    grid.rotation.x = frame * 0.4;
    grid.rotation.y = frame * 0.6;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  };
  animate();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    renderer.dispose();
  };
}
