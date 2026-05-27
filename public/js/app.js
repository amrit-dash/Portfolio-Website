/**
 * Amrit Dash Portfolio — app.js
 * Handles: preloader, theme toggle, navigation, animations,
 *          typewriter, scroll effects, custom cursor
 */

'use strict';

// =========================================================
// UTILITIES
// =========================================================
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
}

// =========================================================
// PRELOADER
// =========================================================
function initPreloader() {
    const preloader = qs('#preloader');
    const linesEl = qs('#preloader-lines');
    if (!preloader || !linesEl) return;

    const lines = [
        '> Initializing amrit.dash.portfolio...',
        '> Loading modules: automation, flutter, AI...',
        '> Mounting experience data... OK',
        '> Firing up the coffee machine... ☕',
        '> Ready. Welcome!',
    ];

    let lineIdx = 0;
    function addLine() {
        if (lineIdx >= lines.length) {
            // All lines printed — hide preloader
            setTimeout(() => {
                preloader.classList.add('is-hidden');
                document.body.style.overflow = '';
                initHeroReveal();
            }, 400);
            return;
        }
        const span = document.createElement('span');
        span.className = 'line';
        span.textContent = lines[lineIdx];
        span.style.animationDelay = `${lineIdx * 0.12}s`;
        linesEl.appendChild(span);
        lineIdx++;
        setTimeout(addLine, lineIdx < lines.length ? 280 : 120);
    }

    document.body.style.overflow = 'hidden';

    // Start after a short delay
    setTimeout(addLine, 200);

    // Fallback: if something hangs, remove preloader after 4s
    setTimeout(() => {
        if (!preloader.classList.contains('is-hidden')) {
            preloader.classList.add('is-hidden');
            document.body.style.overflow = '';
            initHeroReveal();
        }
    }, 4000);
}

// =========================================================
// HERO REVEAL
// =========================================================
function initHeroReveal() {
    // Trigger all hero data-reveal elements
    const elements = qsa('.hero [data-reveal]');
    elements.forEach((el, i) => {
        const delay = parseInt(el.dataset.delay || 0);
        setTimeout(() => el.classList.add('is-revealed'), delay);
    });

    // Start typewriter after bio fades in
    setTimeout(initTypewriter, 600);
}

// =========================================================
// TYPEWRITER
// =========================================================
function initTypewriter() {
    const target = qs('#hero-role');
    if (!target) return;

    const roles = [
        'AI & Automation Engineer',
        'Flutter Developer',
        'LLM / RAG Specialist',
        'Make.com Expert',
        'Problem Solver',
    ];

    let roleIdx = 0, charIdx = 0, isDeleting = false;

    function type() {
        const current = roles[roleIdx];
        const displayed = isDeleting
            ? current.substring(0, charIdx--)
            : current.substring(0, charIdx++);

        target.textContent = displayed;

        let delay = isDeleting ? 40 : 70;

        if (!isDeleting && charIdx > current.length) {
            delay = 2200;
            isDeleting = true;
        } else if (isDeleting && charIdx < 0) {
            isDeleting = false;
            charIdx = 0;
            roleIdx = (roleIdx + 1) % roles.length;
            delay = 300;
        }

        setTimeout(type, delay);
    }
    type();
}

// =========================================================
// THEME TOGGLE
// =========================================================
function initTheme() {
    const root = document.documentElement;
    const btn = qs('#theme-toggle');
    const cvBtn = qs('#cv-download-btn');

    // Load saved theme
    const saved = localStorage.getItem('ad-theme') || 'dark';
    root.dataset.theme = saved;
    updateCvLink(saved, cvBtn);

    if (!btn) return;

    btn.addEventListener('click', () => {
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        localStorage.setItem('ad-theme', next);
        updateCvLink(next, cvBtn);
    });
}

function updateCvLink(theme, btn) {
    if (!btn) return;
    if (theme === 'light') {
        btn.href = 'assets/cv-light.pdf';
    } else {
        btn.href = 'assets/cv-dark.pdf';
    }
}

// =========================================================
// HEADER SCROLL BEHAVIOR
// =========================================================
function initHeader() {
    const header = qs('#header');
    if (!header) return;

    let lastScroll = 0;
    let ticking = false;

    function updateHeader() {
        const scroll = window.scrollY;
        if (scroll > 60) {
            header.classList.add('is-scrolled');
        } else {
            header.classList.remove('is-scrolled');
        }

        if (scroll > lastScroll + 8 && scroll > 200) {
            header.classList.add('is-hidden');
        } else if (scroll < lastScroll - 8 || scroll < 80) {
            header.classList.remove('is-hidden');
        }

        lastScroll = scroll;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }, { passive: true });
}

// =========================================================
// NAV SCROLL SPY
// =========================================================
function initScrollSpy() {
    const navLinks = qsa('.nav-link');
    const sections = qsa('.section, .hero');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.forEach(a => {
                    a.classList.toggle('is-active', a.dataset.section === id);
                });
            }
        });
    }, { rootMargin: '-40% 0px -40% 0px' });

    sections.forEach(s => observer.observe(s));
}

// =========================================================
// MOBILE MENU
// =========================================================
function initMobileMenu() {
    const toggle = qs('#mobile-menu-toggle');
    const nav = qs('#mobile-nav');
    const links = qsa('.mobile-nav-link');

    if (!toggle || !nav) return;

    function close() {
        toggle.classList.remove('is-open');
        nav.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    toggle.addEventListener('click', () => {
        const isOpen = toggle.classList.toggle('is-open');
        nav.classList.toggle('is-open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    links.forEach(l => l.addEventListener('click', close));

    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') close();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) close();
    });
}

// =========================================================
// SMOOTH SCROLL
// =========================================================
function initSmoothScroll() {
    document.addEventListener('click', e => {
        const link = e.target.closest('.smoothscroll');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        e.preventDefault();
        const target = qs(href);
        if (!target) return;
        const headerH = 70;
        const top = target.getBoundingClientRect().top + window.scrollY - headerH;
        window.scrollTo({ top, behavior: 'smooth' });
    });
}

// =========================================================
// SCROLL REVEAL (Intersection Observer)
// =========================================================
function initScrollReveal() {
    const elements = qsa('[data-reveal]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const delay = parseInt(el.dataset.delay || 0);
            setTimeout(() => el.classList.add('is-revealed'), delay);
            observer.unobserve(el);
        });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.1 });

    elements.forEach(el => {
        // Don't observe hero elements (they're handled by initHeroReveal)
        if (el.closest('.hero')) return;
        observer.observe(el);
    });
}

// =========================================================
// STAGGER REVEAL (for grids)
// =========================================================
function initStaggerReveal() {
    const grids = qsa('.projects-bento, .education-grid');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const children = qsa('[data-reveal]', entry.target);
            children.forEach((child, i) => {
                setTimeout(() => child.classList.add('is-revealed'), i * 80);
            });
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

    grids.forEach(g => observer.observe(g));
}

// =========================================================
// TIMELINE REVEAL
// =========================================================
function initTimelineReveal() {
    const items = qsa('[data-reveal="timeline"]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.15 });

    items.forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.12}s`;
        observer.observe(el);
    });
}

// =========================================================
// SKILL TAGS STAGGER
// =========================================================
function initSkillTags() {
    const groups = qsa('.skill-group');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const tags = qsa('.skill-tag', entry.target);
            tags.forEach((tag, i) => {
                tag.style.opacity = '0';
                tag.style.transform = 'translateY(8px)';
                tag.style.transition = `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`;
                setTimeout(() => {
                    tag.style.opacity = '1';
                    tag.style.transform = 'translateY(0)';
                }, 50);
            });
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.3 });

    groups.forEach(g => observer.observe(g));
}

// =========================================================
// SCROLL PROGRESS BAR
// =========================================================
function initScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = `${pct}%`;
    }, { passive: true });
}

// =========================================================
// CUSTOM CURSOR
// =========================================================
function initCursor() {
    const cursor = qs('#cursor');
    const follower = qs('#cursor-follower');
    if (!cursor || !follower) return;

    // Only on non-touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let fx = 0, fy = 0;
    let lx = 0, ly = 0;

    function moveCursor(e) {
        fx = e.clientX;
        fy = e.clientY;
        cursor.style.left = fx + 'px';
        cursor.style.top = fy + 'px';
    }

    function animateFollower() {
        lx += (fx - lx) * 0.18;
        ly += (fy - ly) * 0.18;
        follower.style.left = lx + 'px';
        follower.style.top = ly + 'px';
        requestAnimationFrame(animateFollower);
    }

    window.addEventListener('mousemove', moveCursor, { passive: true });
    animateFollower();

    // Hover state
    const hoverEls = qsa('a, button, .project-card, .timeline__card, .skill-tag');
    hoverEls.forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
}

// =========================================================
// GSAP ENHANCED ANIMATIONS (if GSAP is loaded)
// =========================================================
function initGSAPAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Edu cards — scale/bounce in (no data-reveal on these)
    gsap.utils.toArray('.edu-card').forEach((card, i) => {
        gsap.fromTo(card,
            { y: 40, opacity: 0, scale: 0.95 },
            {
                y: 0, opacity: 1, scale: 1,
                duration: 0.65,
                delay: i * 0.12,
                ease: 'back.out(1.4)',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 88%',
                    once: true,
                },
            }
        );
    });

    // Stat cards — pop in from below
    gsap.utils.toArray('.stat-card').forEach((card, i) => {
        gsap.fromTo(card,
            { y: 20, opacity: 0 },
            {
                y: 0, opacity: 1,
                duration: 0.5,
                delay: i * 0.1,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: '.about__stats',
                    start: 'top 88%',
                    once: true,
                },
            }
        );
    });
}

// =========================================================
// FIREBASE CONTENT LOADER (dynamic, with static fallback)
// =========================================================
async function loadFirebaseContent() {
    try {
        // Try to load firebase-config if it exists
        const mod = await import('./firebase-init.js').catch(() => null);
        if (!mod || !mod.db) return;

        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

        // Load site settings (accent color, theme defaults)
        const settingsSnap = await getDocs(collection(mod.db, 'settings')).catch(() => null);
        if (settingsSnap && !settingsSnap.empty) {
            const settings = settingsSnap.docs[0].data();
            if (settings.defaultTheme && !localStorage.getItem('ad-theme')) {
                document.documentElement.dataset.theme = settings.defaultTheme;
            }
            if (settings.accentColor) {
                document.documentElement.style.setProperty('--accent', settings.accentColor);
            }
        }

        // Load hero bio overrides
        const heroSnap = await getDocs(collection(mod.db, 'hero')).catch(() => null);
        if (heroSnap && !heroSnap.empty) {
            const hero = heroSnap.docs[0].data();
            if (hero.bio) {
                const bioEl = qs('.hero__bio');
                if (bioEl) bioEl.innerHTML = hero.bio;
            }
        }

    } catch (e) {
        // Firebase not configured — use static content
        console.debug('Firebase not configured, using static content.');
    }
}

// =========================================================
// INIT
// =========================================================
onReady(() => {
    initPreloader();
    initTheme();
    initHeader();
    initScrollSpy();
    initMobileMenu();
    initSmoothScroll();
    initScrollReveal();
    initStaggerReveal();
    initTimelineReveal();
    initSkillTags();
    initScrollProgress();
    initCursor();
    loadFirebaseContent();

    // GSAP animations (after DOM is ready and GSAP has loaded)
    if (typeof gsap !== 'undefined') {
        initGSAPAnimations();
    } else {
        // Wait for GSAP to load
        window.addEventListener('load', () => {
            if (typeof gsap !== 'undefined') initGSAPAnimations();
        });
    }
});
