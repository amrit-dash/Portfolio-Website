// Lightweight 3D-feeling background. Lazy-loads Three.js from a CDN and
// renders a slow rotating wireframe icosahedron + drifting particles.
// Gracefully no-ops if Three.js can't be reached (offline / blocked).

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export async function initThreeBg() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let THREE;
    try {
        THREE = await import(/* @vite-ignore */ THREE_CDN);
    } catch (err) {
        console.info('[three-bg] Three.js unavailable, skipping 3D backdrop:', err?.message || err);
        return;
    }

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w() / h(), 0.1, 100);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w(), h(), false);

    function themeColors() {
        const t = document.documentElement.getAttribute('data-theme') || 'dark';
        return t === 'dark'
            ? { line: 0x6effc6, point: 0xffffff }
            : { line: 0xff7a3d, point: 0x14122a };
    }

    // Wireframe icosahedron
    const geo = new THREE.IcosahedronGeometry(1.6, 1);
    const lineMat = new THREE.LineBasicMaterial({ color: themeColors().line, transparent: true, opacity: 0.55 });
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), lineMat);
    scene.add(wire);

    // Particles
    const particleCount = 220;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: themeColors().point, size: 0.025, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Drive a soft camera parallax with the mouse.
    const mouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / w()) * 2 - 1;
        mouse.y = (e.clientY / h()) * 2 - 1;
    }, { passive: true });

    function onResize() { camera.aspect = w() / h(); camera.updateProjectionMatrix(); renderer.setSize(w(), h(), false); }
    window.addEventListener('resize', onResize);

    document.addEventListener('theme:change', () => {
        const c = themeColors();
        lineMat.color.setHex(c.line);
        pMat.color.setHex(c.point);
    });

    let raf;
    function tick(t) {
        wire.rotation.x = t * 0.00015;
        wire.rotation.y = t * 0.00020;
        particles.rotation.y = t * 0.00006;
        camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.04;
        camera.position.y += (-mouse.y * 0.4 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // Pause when tab is hidden to be CPU-friendly.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(raf);
        else raf = requestAnimationFrame(tick);
    });
}
