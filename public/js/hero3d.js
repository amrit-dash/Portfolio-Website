// Three.js hero: a slowly rotating "constellation" of points + connecting
// lines on an icosahedron, picking up the current accent color.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export async function initHero3D() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const hero = canvas.parentElement;

  // Respect reduced motion: render a single static frame, no animation.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 9);

  // Read accent color from CSS.
  function accentColor() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c5cff';
    return new THREE.Color(v);
  }
  function accent2Color() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#22d3ee';
    return new THREE.Color(v);
  }
  function textColor() {
    const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
    return new THREE.Color(isDark ? '#ffffff' : '#14161c');
  }

  // Icosahedron wireframe
  const icoGeo = new THREE.IcosahedronGeometry(2.2, 1);
  const icoLines = new THREE.LineSegments(
    new THREE.WireframeGeometry(icoGeo),
    new THREE.LineBasicMaterial({ color: accentColor(), transparent: true, opacity: 0.35 })
  );
  scene.add(icoLines);

  // Points on the same geometry
  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute('position', icoGeo.getAttribute('position'));
  const pointMat = new THREE.PointsMaterial({
    color: textColor(),
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  });
  const points = new THREE.Points(pointGeo, pointMat);
  scene.add(points);

  // A cloud of distant particles
  const cloudCount = 600;
  const cloudPositions = new Float32Array(cloudCount * 3);
  for (let i = 0; i < cloudCount; i++) {
    const r = 10 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    cloudPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    cloudPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    cloudPositions[i * 3 + 2] = r * Math.cos(phi);
  }
  const cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPositions, 3));
  const cloudMat = new THREE.PointsMaterial({
    color: accent2Color(),
    size: 0.04,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
  });
  const cloud = new THREE.Points(cloudGeo, cloudMat);
  scene.add(cloud);

  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Mouse parallax
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener('mousemove', (e) => {
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    tmy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // React to theme changes by refreshing colors
  document.addEventListener('themechange', () => {
    icoLines.material.color = accentColor();
    pointMat.color = textColor();
    cloudMat.color = accent2Color();
  });

  let raf;
  const start = performance.now();

  function frame(now) {
    const t = (now - start) / 1000;
    mx += (tmx - mx) * 0.04;
    my += (tmy - my) * 0.04;
    icoLines.rotation.x = t * 0.12 + my * 0.4;
    icoLines.rotation.y = t * 0.18 + mx * 0.4;
    points.rotation.copy(icoLines.rotation);
    cloud.rotation.y = -t * 0.02 + mx * 0.05;
    cloud.rotation.x = my * 0.05;
    renderer.render(scene, camera);
    if (!prefersReduced) raf = requestAnimationFrame(frame);
  }

  if (prefersReduced) {
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(frame);
  }

  // Cleanup hook (rarely used in this static site)
  return () => {
    cancelAnimationFrame(raf);
    renderer.dispose();
    icoGeo.dispose();
    pointGeo.dispose();
    cloudGeo.dispose();
  };
}
