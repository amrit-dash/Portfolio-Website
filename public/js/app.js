/**
 * Amrit Dash Portfolio — Main App
 * Modules: Config, Theme, Cursor, Preloader, Navbar,
 *          Particles, Animations, Projects, Admin config
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   SITE CONFIG (reads from localStorage if admin has saved one)
   ────────────────────────────────────────────────────────────── */
const DEFAULT_CONFIG = {
    theme: {
        default: 'dark',
        accentColor1: '#7c3aed',
        accentColor2: '#06b6d4',
        accentGreen: '#10b981',
        fontHeading: 'Space Grotesk',
        fontBody: 'Inter',
        customCursor: true,
        particlesEnabled: true
    },
    cv: {
        dark: 'assets/cv-dark.pdf',
        light: 'assets/cv-light.pdf'
    }
};

function getSiteConfig() {
    try {
        const stored = localStorage.getItem('portfolio-config');
        if (stored) {
            return Object.assign({}, DEFAULT_CONFIG, JSON.parse(stored));
        }
    } catch (e) { /* ignore */ }
    return DEFAULT_CONFIG;
}

const config = getSiteConfig();

/* ──────────────────────────────────────────────────────────────
   THEME
   ────────────────────────────────────────────────────────────── */
function initTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('portfolio-theme');
    const preferred = saved || config.theme.default || 'dark';

    html.setAttribute('data-theme', preferred);
    updateCVLinks(preferred);

    btn && btn.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('portfolio-theme', next);
        updateCVLinks(next);
        updateParticleColors(next);
    });
}

function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
}

function updateCVLinks(theme) {
    const cvPath = theme === 'dark' ? config.cv.dark : config.cv.light;
    document.querySelectorAll('.cv-download-btn, #hero-cv-btn, #about-cv-btn').forEach(el => {
        el.setAttribute('href', cvPath);
    });
}

/* Apply custom accent colors from config */
function applyConfigTheme() {
    const root = document.documentElement;
    const t = config.theme;
    if (t.accentColor1) root.style.setProperty('--accent-1', t.accentColor1);
    if (t.accentColor2) root.style.setProperty('--accent-2', t.accentColor2);
    if (t.accentGreen)  root.style.setProperty('--accent-green', t.accentGreen);
    if (t.fontHeading)  root.style.setProperty('--font-heading', `'${t.fontHeading}', sans-serif`);
    if (t.fontBody)     root.style.setProperty('--font-body', `'${t.fontBody}', sans-serif`);
}

/* ──────────────────────────────────────────────────────────────
   CUSTOM CURSOR
   ────────────────────────────────────────────────────────────── */
function initCursor() {
    if (!config.theme.customCursor) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const dot   = document.getElementById('cursor-dot');
    const outer = document.getElementById('cursor-outer');
    if (!dot || !outer) return;

    let mouseX = -100, mouseY = -100;
    let outerX = -100, outerY = -100;
    let rafId;

    const lerp = (a, b, t) => a + (b - a) * t;

    function animate() {
        outerX = lerp(outerX, mouseX, 0.12);
        outerY = lerp(outerY, mouseY, 0.12);

        dot.style.left   = mouseX + 'px';
        dot.style.top    = mouseY + 'px';
        outer.style.left = outerX + 'px';
        outer.style.top  = outerY + 'px';

        rafId = requestAnimationFrame(animate);
    }

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!rafId) animate();
    });

    document.addEventListener('mouseleave', () => {
        dot.style.opacity   = '0';
        outer.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
        dot.style.opacity   = '1';
        outer.style.opacity = '0.6';
    });

    /* Hover states */
    document.querySelectorAll('a, button, [data-hover]').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    document.querySelectorAll('p, h1, h2, h3, h4, span').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-text'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-text'));
    });
}

/* ──────────────────────────────────────────────────────────────
   PRELOADER
   ────────────────────────────────────────────────────────────── */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    const minTime = 1800;
    const start = Date.now();

    function hide() {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, minTime - elapsed);
        setTimeout(() => {
            preloader.classList.add('hidden');
            document.body.classList.add('loaded');
            triggerHeroAnimations();
        }, remaining);
    }

    if (document.readyState === 'complete') {
        hide();
    } else {
        window.addEventListener('load', hide);
    }
}

/* ──────────────────────────────────────────────────────────────
   NAVBAR
   ────────────────────────────────────────────────────────────── */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('nav-hamburger');
    const mobileMenu = document.getElementById('nav-mobile-menu');
    const progress = document.getElementById('scroll-progress');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!navbar) return;

    /* Scrolled state */
    function onScroll() {
        const scrollY = window.scrollY;
        navbar.classList.toggle('scrolled', scrollY > 20);

        /* Scroll progress */
        if (progress) {
            const doc = document.documentElement;
            const total = doc.scrollHeight - doc.clientHeight;
            progress.style.width = total > 0 ? (scrollY / total * 100) + '%' : '0%';
        }

        /* Active section spy */
        const sections = document.querySelectorAll('section[id]');
        let active = '';
        sections.forEach(sec => {
            const top = sec.getBoundingClientRect().top;
            if (top < window.innerHeight * 0.4) active = sec.id;
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === active);
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* Hamburger */
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            const open = hamburger.classList.toggle('open');
            mobileMenu.classList.toggle('open', open);
        });

        document.querySelectorAll('.nav-mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                mobileMenu.classList.remove('open');
            });
        });
    }

    /* Smooth scroll for all anchor links */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/* ──────────────────────────────────────────────────────────────
   PARTICLE CANVAS
   ────────────────────────────────────────────────────────────── */
let particleInstance = null;

function initParticles() {
    if (!config.theme.particlesEnabled) return;

    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const theme = getCurrentTheme();
    let particles = [];
    let mouse = { x: null, y: null, radius: 150 };
    let animId;
    let w, h;

    /* Colors based on theme */
    function getColors() {
        return theme === 'dark'
            ? { dot: 'rgba(124,58,237,', line: 'rgba(6,182,212,', bg: 'rgba(8,8,16,0)' }
            : { dot: 'rgba(124,58,237,', line: 'rgba(6,182,212,', bg: 'rgba(248,250,255,0)' };
    }

    function resize() {
        w = canvas.width  = canvas.parentElement.offsetWidth;
        h = canvas.height = canvas.parentElement.offsetHeight;
        buildParticles();
    }

    function buildParticles() {
        const count = Math.min(Math.floor((w * h) / 12000), 90);
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        const C = getColors();

        particles.forEach((p, i) => {
            /* Move */
            p.x += p.vx;
            p.y += p.vy;

            /* Bounce */
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;

            /* Mouse repel */
            if (mouse.x !== null) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    p.x += dx / dist * force * 2;
                    p.y += dy / dist * force * 2;
                }
            }

            /* Draw particle */
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = C.dot + p.opacity + ')';
            ctx.fill();

            /* Connect nearby */
            for (let j = i + 1; j < particles.length; j++) {
                const q = particles[j];
                const dx = p.x - q.x;
                const dy = p.y - q.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 120;
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = C.line + alpha + ')';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        });

        animId = requestAnimationFrame(draw);
    }

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.x = null; mouse.y = null;
    });

    resize();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    particleInstance = { destroy: () => { cancelAnimationFrame(animId); ro.disconnect(); } };
}

function updateParticleColors() {
    /* Particles will use the updated theme on next frame automatically */
}

/* ──────────────────────────────────────────────────────────────
   SCROLL ANIMATIONS (Intersection Observer)
   ────────────────────────────────────────────────────────────── */
function initScrollAnimations() {
    const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-side');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => observer.observe(el));
}

/* ──────────────────────────────────────────────────────────────
   HERO ENTRY ANIMATIONS (triggered after preloader)
   ────────────────────────────────────────────────────────────── */
function triggerHeroAnimations() {
    /* Show social sidebar */
    const socials = document.querySelector('.hero-socials');
    if (socials) {
        setTimeout(() => socials.classList.add('visible'), 600);
    }

    /* Trigger hero reveals */
    document.querySelectorAll('#hero .reveal-up, #hero .reveal-side').forEach(el => {
        setTimeout(() => el.classList.add('visible'), 200);
    });

    /* Start scroll animations for other sections */
    initScrollAnimations();
    initStatCounters();
    init3DTilt();
}

/* ──────────────────────────────────────────────────────────────
   STAT COUNTERS (in About section)
   ────────────────────────────────────────────────────────────── */
function initStatCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseInt(el.dataset.count, 10);
            let current = 0;
            const duration = 1200;
            const step = target / (duration / 16);

            const tick = () => {
                current = Math.min(current + step, target);
                el.textContent = Math.floor(current);
                if (current < target) requestAnimationFrame(tick);
            };
            tick();
            observer.unobserve(el);
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

/* ──────────────────────────────────────────────────────────────
   3D TILT CARDS
   ────────────────────────────────────────────────────────────── */
function init3DTilt() {
    if (window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (rect.width / 2);
            const dy = (e.clientY - cy) / (rect.height / 2);
            const rotX = -dy * 5;
            const rotY =  dx * 5;
            card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
        });

        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.15s ease, border-color 0.3s, box-shadow 0.3s';
        });
    });
}

/* ──────────────────────────────────────────────────────────────
   EXPERIENCE TABS
   ────────────────────────────────────────────────────────────── */
function initExperienceTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.dataset.tab;
            document.querySelectorAll('.timeline').forEach(t => {
                t.classList.toggle('hidden', t.id !== `tab-${target}`);
            });
        });
    });
}

/* ──────────────────────────────────────────────────────────────
   PROJECT FILTERING
   ────────────────────────────────────────────────────────────── */
function initProjectFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            cards.forEach(card => {
                const cats = card.dataset.category || '';
                const match = filter === 'all' || cats.includes(filter);
                card.classList.toggle('filtered-out', !match);
            });
        });
    });
}

/* ──────────────────────────────────────────────────────────────
   PROJECT MODALS
   ────────────────────────────────────────────────────────────── */
function initProjectModals() {
    const modal = document.getElementById('project-modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = document.getElementById('modal-close');
    const backdrop = document.getElementById('modal-backdrop');
    if (!modal) return;

    let projectData = {};
    try {
        const raw = document.getElementById('project-data');
        if (raw) projectData = JSON.parse(raw.textContent);
    } catch (e) { console.warn('Could not parse project data:', e); }

    function openModal(projectId) {
        const data = projectData[projectId];
        if (!data) return;

        let html = '';

        if (data.image) {
            html += `<img src="${data.image}" alt="${data.title}" loading="lazy">`;
        }

        html += `<div class="modal-content-inner">`;
        html += `<div class="modal-cat">${data.category}</div>`;
        html += `<h2>${data.title}</h2>`;
        html += `<p class="modal-desc">${data.description}</p>`;

        if (data.tech && data.tech.length) {
            html += `<div class="modal-tech-list">`;
            data.tech.forEach(t => { html += `<span>${t}</span>`; });
            html += `</div>`;
        }

        if (data.links && data.links.length) {
            html += `<div class="modal-links">`;
            data.links.forEach(l => {
                html += `<a href="${l.url}" class="modal-link" target="_blank" rel="noopener">
                    ${l.label}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>`;
            });
            html += `</div>`;
        }

        html += `</div>`;

        modalBody.innerHTML = html;
        modal.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';
        modal.focus();
    }

    function closeModal() {
        modal.setAttribute('hidden', '');
        document.body.style.overflow = '';
    }

    /* Open via "View Details" buttons */
    document.querySelectorAll('.project-view-btn[data-project]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            openModal(btn.dataset.project);
        });
    });

    /* Open via "Explore" link on card footer (for genki project which has no external link) */
    document.querySelectorAll('.project-link-btn[data-project]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            openModal(btn.dataset.project);
        });
    });

    closeBtn && closeBtn.addEventListener('click', closeModal);
    backdrop && backdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

/* ──────────────────────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    /* Try to load config from Firebase if configured */
    try {
        const fbConfigRaw = localStorage.getItem('firebase-web-config');
        if (fbConfigRaw) {
            const { initFirebase, getConfig } = await import('./firebase-service.js');
            const connected = await initFirebase();
            if (connected) {
                const cloudConfig = await getConfig();
                if (cloudConfig && Object.keys(cloudConfig).length > 0) {
                    /* Merge cloud config into localStorage cache */
                    localStorage.setItem('portfolio-config', JSON.stringify(cloudConfig));
                }
            }
        }
    } catch (e) {
        /* Silently fall back to localStorage */
    }

    applyConfigTheme();
    initTheme();
    initCursor();
    initPreloader();
    initNavbar();
    initParticles();
    initExperienceTabs();
    initProjectFilter();
    initProjectModals();

    /* Ensure CV links are correct immediately */
    updateCVLinks(getCurrentTheme());
});
