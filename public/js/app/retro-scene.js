export async function createRetroScene() {
  const canvas = document.querySelector("[data-retro-canvas]");
  if (!canvas) return;
  let THREE;
  try {
    THREE = await import("https://unpkg.com/three@0.165.0/build/three.module.js");
  } catch (error) {
    console.warn("3D scene skipped because Three.js could not be loaded.", error);
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0.8, 4.5);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const point = new THREE.PointLight(0x6ee7ff, 1.4, 30);
  point.position.set(2, 3, 5);
  scene.add(ambient, point);

  const rig = new THREE.Group();
  scene.add(rig);

  const material = new THREE.MeshStandardMaterial({
    color: 0x10172a,
    metalness: 0.35,
    roughness: 0.45,
    emissive: 0x030914,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ee7ff,
    emissive: 0x0b4460,
    emissiveIntensity: 0.6,
  });

  const monitor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 0.5), material);
  monitor.position.set(0, 0.5, 0);
  rig.add(monitor);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.1), accentMaterial);
  screen.position.set(0, 0.55, 0.27);
  rig.add(screen);

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.6, 24), material);
  stand.position.set(0, -0.45, 0);
  rig.add(stand);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.2, 24), material);
  base.position.set(0, -0.84, 0);
  rig.add(base);

  const folder = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.2, 0.75),
    new THREE.MeshStandardMaterial({ color: 0xff8a5b, metalness: 0.2, roughness: 0.7 }),
  );
  folder.position.set(-1.4, -0.35, 0.2);
  rig.add(folder);

  const folderLid = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.08, 0.75),
    new THREE.MeshStandardMaterial({ color: 0xffa47f, metalness: 0.15, roughness: 0.6 }),
  );
  folderLid.position.set(-1.4, -0.2, 0.2);
  rig.add(folderLid);

  const clock = new THREE.Clock();

  function resize() {
    const parent = canvas.parentElement;
    const width = parent?.clientWidth || 480;
    const height = parent?.clientHeight || 320;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    const elapsed = clock.getElapsedTime();
    rig.rotation.y = Math.sin(elapsed * 0.4) * 0.25;
    rig.position.y = Math.sin(elapsed * 0.8) * 0.08;

    const progress = Math.min(
      (document.documentElement.scrollTop || document.body.scrollTop) / (window.innerHeight * 1.4),
      1,
    );
    folderLid.rotation.x = -progress * 1.15;
    folderLid.position.y = -0.2 + progress * 0.02;

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  resize();
  animate();
}
