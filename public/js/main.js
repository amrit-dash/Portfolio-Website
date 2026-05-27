import { defaultContent } from "./portfolio-data.js";
import { fetchRemoteContent, isFirebaseConfigured, onAuthChanged, saveRemoteContent, signInWithEmail, signInWithGoogle, signOut, uploadCroppedImage } from "./firebase-service.js";

let portfolioContent = structuredClone(defaultContent);
let cropState = { image: null, filename: "portfolio-image.png" };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const listItems = (items = []) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
const chips = (items = []) => items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("");

function mergeContent(base, remote) {
  if (!remote) return base;
  return { ...base, ...remote, meta: { ...base.meta, ...remote.meta }, profile: { ...base.profile, ...remote.profile }, contact: { ...base.contact, ...remote.contact } };
}

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("portfolio-theme", nextTheme);
  $(".theme-toggle__label") && ($(".theme-toggle__label").textContent = nextTheme === "light" ? "Light" : "Dark");
  $("#terminal-mode") && ($("#terminal-mode").textContent = nextTheme);
  const cv = $("#cv-download");
  if (cv) {
    cv.href = portfolioContent.meta.cv[nextTheme];
    cv.textContent = `Download ${nextTheme} CV`;
  }
}

function applyCosmetics(content) {
  document.documentElement.style.setProperty("--accent", content.meta.accent || defaultContent.meta.accent);
  document.documentElement.style.setProperty("--font-body", `"${content.meta.font || "Inter"}", system-ui, sans-serif`);
  setTheme(localStorage.getItem("portfolio-theme") || content.meta.defaultTheme || "dark");
}

function renderPortfolio(content) {
  portfolioContent = content;
  document.title = `${content.profile.name} | ${content.profile.role}`;
  $("#hero-title").textContent = content.profile.headline;
  $("#hero-summary").textContent = content.profile.summary;
  $("#hero-tags").innerHTML = chips(content.profile.tags);
  $("#stats-grid").innerHTML = content.profile.stats.map((stat) => `<article class="stat"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></article>`).join("");
  $("#about-copy").textContent = content.profile.about;
  $("#skill-cloud").innerHTML = content.skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("");
  $("#experience-timeline").innerHTML = content.experience.map((job, index) => `
    <article class="experience-card ${job.primary ? "is-primary" : ""}" data-animate="${index % 2 ? "slide-right" : "slide-up"}">
      <time>${escapeHtml(job.timeframe)}</time>
      <div>
        <p class="eyebrow">${escapeHtml(job.company)}</p>
        <h3>${escapeHtml(job.role)}</h3>
        <p>${escapeHtml(job.summary)}</p>
        <ul>${listItems(job.bullets)}</ul>
      </div>
    </article>`).join("");
  $("#project-grid").innerHTML = content.projects.map((project, index) => `
    <article class="project-card" style="--project-color:${escapeHtml(project.color || content.meta.accent)}" data-animate="${["slide-up", "flip-up", "scale-up"][index % 3]}">
      <div>
        <div class="project-card__folder" aria-hidden="true"></div>
        <p class="eyebrow">${escapeHtml(project.category)}</p>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <div class="chip-row">${(project.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </div>
      <div class="card-actions">${(project.links || []).map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)} -></a>`).join("") || "<span class=\"tag\">Case study details available on request</span>"}</div>
    </article>`).join("");
  $("#education-panel").innerHTML = `<h3>${escapeHtml(content.education.title)}</h3><p>${escapeHtml(content.education.timeframe)}</p><ul>${listItems(content.education.details)}</ul>`;
  $("#credential-panel").innerHTML = `<h3>Certifications</h3><ul>${listItems(content.credentials.certifications)}</ul><h3>Achievements</h3><ul>${listItems(content.credentials.achievements)}</ul><h3>Community</h3><ul>${listItems(content.credentials.communities)}</ul>`;
  $("#contact-copy").textContent = content.contact.copy;
  $("#contact-links").innerHTML = content.contact.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("");
  $("#current-year").textContent = new Date().getFullYear();
  applyCosmetics(content);
  setupScrollAnimations();
}

function setupScrollAnimations() {
  const animated = $$('[data-animate]:not(.is-observed)');
  if (!animated.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
  animated.forEach((node) => {
    node.classList.add("is-observed");
    observer.observe(node);
  });
}

function setupInteractions() {
  $("#theme-toggle")?.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));
  $(".nav-toggle")?.addEventListener("click", (event) => {
    const nav = $("#site-nav");
    nav.classList.toggle("is-open");
    event.currentTarget.setAttribute("aria-expanded", String(nav.classList.contains("is-open")));
  });
  $$('[data-tilt]').forEach((node) => {
    node.addEventListener("pointermove", (event) => {
      const rect = node.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * 12;
      const y = ((event.clientY - rect.top) / rect.height - .5) * -12;
      node.style.setProperty("--tilt-x", `${x}deg`);
      node.style.setProperty("--tilt-y", `${y}deg`);
    });
    node.addEventListener("pointerleave", () => {
      node.style.setProperty("--tilt-x", "0deg");
      node.style.setProperty("--tilt-y", "0deg");
    });
  });
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      $$(".site-nav a").forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { threshold: .42 });
  $$(".target-section").forEach((section) => navObserver.observe(section));
}

async function initPortfolio() {
  try {
    const remote = await fetchRemoteContent();
    renderPortfolio(mergeContent(structuredClone(defaultContent), remote));
  } catch (error) {
    console.warn("Using bundled portfolio content:", error);
    renderPortfolio(structuredClone(defaultContent));
  }
  setupInteractions();
  setTimeout(() => $("#preloader")?.classList.add("is-loaded"), 400);
}

function showDashboardScreen(name) {
  $$('[data-dashboard-screen]').forEach((screen) => {
    screen.hidden = screen.dataset.dashboardScreen !== name;
  });
}

function syncDashboardControls(content) {
  $("#content-editor").value = JSON.stringify(content, null, 2);
  $("#default-theme-control").value = content.meta.defaultTheme || "dark";
  $("#accent-control").value = content.meta.accent || "#38f8b6";
  $("#font-control").value = content.meta.font || "Inter";
  $("#export-output").textContent = JSON.stringify({ firestorePath: "portfolio/siteContent", storageFolder: "portfolio-media", configured: isFirebaseConfigured() }, null, 2);
}

function getEditedContent() {
  const parsed = JSON.parse($("#content-editor").value);
  parsed.meta = parsed.meta || {};
  parsed.meta.defaultTheme = $("#default-theme-control").value;
  parsed.meta.accent = $("#accent-control").value;
  parsed.meta.font = $("#font-control").value;
  return parsed;
}

function drawCropPreview() {
  const canvas = $("#crop-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const ratioParts = $("#crop-ratio").value.split("/").map(Number);
  const ratio = ratioParts[0] / ratioParts[1];
  canvas.height = Math.round(canvas.width / ratio);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0d18";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!cropState.image) {
    ctx.fillStyle = "#a8b3cf";
    ctx.font = "28px IBM Plex Mono";
    ctx.fillText("Select an image to preview crop", 48, 90);
    return;
  }
  const zoom = Number($("#crop-zoom").value || 1);
  const imageRatio = cropState.image.width / cropState.image.height;
  let drawWidth = canvas.width * zoom;
  let drawHeight = drawWidth / imageRatio;
  if (drawHeight < canvas.height * zoom) {
    drawHeight = canvas.height * zoom;
    drawWidth = drawHeight * imageRatio;
  }
  const x = (canvas.width - drawWidth) / 2;
  const y = (canvas.height - drawHeight) / 2;
  ctx.drawImage(cropState.image, x, y, drawWidth, drawHeight);
}

function setupCropper() {
  $("#media-file")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    cropState.filename = file.name;
    const image = new Image();
    image.onload = () => {
      cropState.image = image;
      drawCropPreview();
      URL.revokeObjectURL(image.src);
    };
    image.src = URL.createObjectURL(file);
  });
  $("#crop-ratio")?.addEventListener("change", drawCropPreview);
  $("#crop-zoom")?.addEventListener("input", drawCropPreview);
  $("#upload-crop")?.addEventListener("click", async () => {
    if (!cropState.image) return setDashboardMessage("Choose an image before uploading.");
    $("#crop-canvas").toBlob(async (blob) => {
      try {
        const url = await uploadCroppedImage(blob, cropState.filename);
        setDashboardMessage(`Uploaded cropped image: ${url}`);
      } catch (error) {
        setDashboardMessage(error.message);
      }
    }, "image/png", .92);
  });
  drawCropPreview();
}

function setDashboardMessage(message) {
  $("#dashboard-message").textContent = message;
}

async function initDashboard() {
  $("#portfolio-view").hidden = true;
  $("#dashboard-view").hidden = false;
  document.title = "Portfolio Dashboard | Amrit Dash";
  document.body.dataset.route = "dashboard";
  $("#firebase-status").textContent = isFirebaseConfigured()
    ? "Firebase config detected. Sign in with an authorized admin account."
    : "Firebase config is not filled yet. Add the web app apiKey/appId in public/js/firebase-config.js, then enable Auth, Firestore, and Storage.";
  syncDashboardControls(portfolioContent);
  setupCropper();
  $("#preview-content")?.addEventListener("click", () => {
    try {
      portfolioContent = getEditedContent();
      syncDashboardControls(portfolioContent);
      setDashboardMessage("Local preview model updated. Open / in another tab to use saved Firestore content after publishing.");
    } catch (error) {
      setDashboardMessage(`Invalid JSON: ${error.message}`);
    }
  });
  $("#save-content")?.addEventListener("click", async () => {
    try {
      const edited = getEditedContent();
      await saveRemoteContent(edited);
      portfolioContent = edited;
      setDashboardMessage("Saved to Firebase Firestore at portfolio/siteContent.");
    } catch (error) {
      setDashboardMessage(error.message);
    }
  });
  $("#email-login")?.addEventListener("click", async () => {
    try {
      await signInWithEmail($("#admin-email").value, $("#admin-password").value);
    } catch (error) {
      setDashboardMessage(error.message);
    }
  });
  $("#google-login")?.addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      setDashboardMessage(error.message);
    }
  });
  $("#sign-out")?.addEventListener("click", signOut);
  await onAuthChanged((user, services) => {
    if (services && services.configured === false) {
      showDashboardScreen("login");
      return;
    }
    showDashboardScreen(user ? "app" : "login");
    if (user) setDashboardMessage(`Signed in as ${user.email || user.uid}.`);
  });
  setTimeout(() => $("#preloader")?.classList.add("is-loaded"), 200);
}

async function init() {
  const isDashboard = ["/admin", "/dashboard"].includes(window.location.pathname.replace(/\/$/, ""));
  await initPortfolio();
  if (isDashboard) await initDashboard();
}

init();
