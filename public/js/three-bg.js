import * as THREE from 'three';

let scene, camera, renderer, particles, frameId;
let geometries = [];
let mouse = new THREE.Vector2(0.5, 0.5);
let targetMouse = new THREE.Vector2(0.5, 0.5);
let clock = new THREE.Clock();
let isLight = document.documentElement.dataset.theme === 'light';

function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particles field
    createParticles();

    // Floating geometries
    createGeometries();

    // Events
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);

    // Watch theme changes
    const observer = new MutationObserver(() => {
        isLight = document.documentElement.dataset.theme === 'light';
        updateColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    animate();
}

function getAccentColor() {
    return isLight ? new THREE.Color(0x1a1a4e) : new THREE.Color(0x00e5a0);
}

function getDimColor() {
    return isLight ? new THREE.Color(0xc8c4ba) : new THREE.Color(0x1e1e2e);
}

function createParticles() {
    const count = window.innerWidth < 768 ? 600 : 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const accent = getAccentColor();
    const dim = getDimColor();

    for (let i = 0; i < count; i++) {
        const spread = 60;
        positions[i * 3] = (Math.random() - 0.5) * spread;
        positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

        const t = Math.random();
        const c = t > 0.85 ? accent : dim;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        sizes[i] = Math.random() * 1.5 + 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: isLight ? 0.35 : 0.6,
        sizeAttenuation: true,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function createGeometries() {
    const shapes = [
        { geo: new THREE.IcosahedronGeometry(2.5, 0), pos: [12, 4, -10], speed: 0.003 },
        { geo: new THREE.OctahedronGeometry(1.8, 0), pos: [-14, -6, -8], speed: 0.005 },
        { geo: new THREE.TetrahedronGeometry(2.2, 0), pos: [8, -10, -12], speed: 0.004 },
        { geo: new THREE.IcosahedronGeometry(1.2, 0), pos: [-10, 8, -6], speed: 0.006 },
    ];

    shapes.forEach(({ geo, pos, speed }) => {
        const mat = new THREE.MeshBasicMaterial({
            color: getAccentColor(),
            wireframe: true,
            transparent: true,
            opacity: isLight ? 0.06 : 0.12,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.userData = { speed, baseY: pos[1], phase: Math.random() * Math.PI * 2 };
        scene.add(mesh);
        geometries.push(mesh);
    });
}

function updateColors() {
    const accent = getAccentColor();
    const dim = getDimColor();

    if (particles) {
        const colorAttr = particles.geometry.attributes.color;
        const count = colorAttr.count;
        for (let i = 0; i < count; i++) {
            const t = Math.random();
            const c = t > 0.85 ? accent : dim;
            colorAttr.setXYZ(i, c.r, c.g, c.b);
        }
        colorAttr.needsUpdate = true;
        particles.material.opacity = isLight ? 0.35 : 0.6;
    }

    geometries.forEach(geo => {
        geo.material.color.set(getAccentColor());
        geo.material.opacity = isLight ? 0.06 : 0.12;
    });
}

function animate() {
    frameId = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Smooth mouse follow
    mouse.x += (targetMouse.x - mouse.x) * 0.05;
    mouse.y += (targetMouse.y - mouse.y) * 0.05;

    // Rotate particles
    if (particles) {
        particles.rotation.y = elapsed * 0.02;
        particles.rotation.x = elapsed * 0.01;
        // Subtle mouse parallax
        particles.rotation.y += (mouse.x - 0.5) * 0.001;
        particles.rotation.x += (mouse.y - 0.5) * 0.001;
    }

    // Animate geometries
    geometries.forEach(geo => {
        geo.rotation.x += geo.userData.speed;
        geo.rotation.y += geo.userData.speed * 1.3;
        geo.position.y = geo.userData.baseY + Math.sin(elapsed * 0.5 + geo.userData.phase) * 0.8;
    });

    renderer.render(scene, camera);
}

function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
    targetMouse.x = e.clientX / window.innerWidth;
    targetMouse.y = e.clientY / window.innerHeight;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
