/**
 * Lightweight Three.js ambient background — retro grid + floating nodes.
 */
export async function initThreeBackground(canvas) {
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.172.0/build/three.module.js');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 6;

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();

    const grid = new THREE.GridHelper(24, 24, 0x5eead4, 0x1e293b);
    grid.position.y = -2;
    scene.add(grid);

    const nodes = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.12, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x5eead4, wireframe: true });
    for (let i = 0; i < 28; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      );
      mesh.userData.speed = 0.2 + Math.random() * 0.6;
      nodes.add(mesh);
    }
    scene.add(nodes);

    let frame = 0;
    let rafId = 0;
    const animate = () => {
      frame += 0.01;
      nodes.rotation.y = frame * 0.15;
      nodes.children.forEach((m, i) => {
        m.position.y += Math.sin(frame * m.userData.speed + i) * 0.002;
        m.rotation.x += 0.01;
      });
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    };
  } catch (e) {
    console.warn('[three-bg] skipped', e);
    return null;
  }
}
