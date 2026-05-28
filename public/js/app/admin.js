import { defaultPortfolioData, PORTFOLIO_DB_PATH } from "./portfolio-data.js";
import {
  adminLogin,
  adminLogout,
  canUseFirebase,
  devAdminLogin,
  devAdminLogout,
  getDevAdminUser,
  isDevAdminSession,
  readData,
  setData,
  uploadFile,
  watchAuthState,
} from "./firebase-client.js";

const LOCAL_DRAFT_KEY = "portfolio-admin-local-draft";

const state = {
  data: structuredClone(defaultPortfolioData),
  cropper: null,
};

function mergeData(base, incoming) {
  if (!incoming || typeof incoming !== "object") return structuredClone(base);
  const target = structuredClone(base);
  Object.entries(incoming).forEach(([key, value]) => {
    if (Array.isArray(value)) target[key] = value;
    else if (value && typeof value === "object") target[key] = { ...(target[key] || {}), ...value };
    else target[key] = value;
  });
  return target;
}

function showStatus(message, type = "info") {
  const el = document.querySelector("[data-admin-status]");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
}

function bindTextLines(selector, values = []) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.value = values.join("\n");
}

function parseTextLines(selector) {
  const value = document.querySelector(selector)?.value || "";
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillForms(data) {
  document.querySelector("[name='name']").value = data.profile.name;
  document.querySelector("[name='title']").value = data.profile.title;
  document.querySelector("[name='tagline']").value = data.profile.tagline;
  document.querySelector("[name='summary']").value = data.profile.summary;
  document.querySelector("[name='status']").value = data.profile.status;
  document.querySelector("[name='location']").value = data.profile.location;

  document.querySelector("[name='accent']").value = data.theme.accent;
  document.querySelector("[name='altAccent']").value = data.theme.altAccent;
  document.querySelector("[name='defaultMode']").value = data.theme.defaultMode;
  document.querySelector("[name='fontFamily']").value = data.theme.fontFamily;
  document.querySelector("[name='customCursor']").checked = Boolean(data.theme.customCursor ?? data.ui?.customCursor);

  document.querySelector("[name='email']").value = data.contact.email;
  document.querySelector("[name='phone']").value = data.contact.phone;
  document.querySelector("[name='linkedin']").value = data.contact.linkedin;
  document.querySelector("[name='github']").value = data.contact.github;
  document.querySelector("[name='instagram']").value = data.contact.instagram;
  document.querySelector("[name='website']").value = data.contact.website || "";

  bindTextLines("[name='skills']", data.skills);
  bindTextLines("[name='interests']", data.interests);
  bindTextLines("[name='achievements']", data.achievements);
  bindTextLines("[name='certifications']", data.certifications);
  bindTextLines("[name='volunteer']", data.volunteer || []);

  document.querySelector("[name='experienceJson']").value = JSON.stringify(data.experience, null, 2);
  document.querySelector("[name='projectsJson']").value = JSON.stringify(data.projects, null, 2);
  document.querySelector("[name='educationJson']").value = JSON.stringify(data.education, null, 2);
  document.querySelector("[name='scoresJson']").value = JSON.stringify(data.scores, null, 2);

  document.querySelector("[name='showJourneyRail']").checked = data.ui?.showJourneyRail !== false;
  document.querySelector("[name='cvLightUrl']").value = data.cv?.lightUrl || "";
  document.querySelector("[name='cvDarkUrl']").value = data.cv?.darkUrl || "";
}

function collectFormData() {
  return {
    profile: {
      name: document.querySelector("[name='name']").value.trim(),
      title: document.querySelector("[name='title']").value.trim(),
      tagline: document.querySelector("[name='tagline']").value.trim(),
      summary: document.querySelector("[name='summary']").value.trim(),
      status: document.querySelector("[name='status']").value.trim(),
      location: document.querySelector("[name='location']").value.trim(),
    },
    theme: {
      accent: document.querySelector("[name='accent']").value.trim(),
      altAccent: document.querySelector("[name='altAccent']").value.trim(),
      defaultMode: document.querySelector("[name='defaultMode']").value,
      fontFamily: document.querySelector("[name='fontFamily']").value.trim(),
      customCursor: document.querySelector("[name='customCursor']").checked,
    },
    contact: {
      email: document.querySelector("[name='email']").value.trim(),
      phone: document.querySelector("[name='phone']").value.trim(),
      linkedin: document.querySelector("[name='linkedin']").value.trim(),
      github: document.querySelector("[name='github']").value.trim(),
      instagram: document.querySelector("[name='instagram']").value.trim(),
      website: document.querySelector("[name='website']").value.trim(),
    },
    cv: {
      lightUrl: document.querySelector("[name='cvLightUrl']").value.trim() || state.data.cv.lightUrl,
      darkUrl: document.querySelector("[name='cvDarkUrl']").value.trim() || state.data.cv.darkUrl,
    },
    skills: parseTextLines("[name='skills']"),
    interests: parseTextLines("[name='interests']"),
    achievements: parseTextLines("[name='achievements']"),
    certifications: parseTextLines("[name='certifications']"),
    volunteer: parseTextLines("[name='volunteer']"),
    experience: JSON.parse(document.querySelector("[name='experienceJson']").value),
    projects: JSON.parse(document.querySelector("[name='projectsJson']").value),
    education: JSON.parse(document.querySelector("[name='educationJson']").value),
    scores: JSON.parse(document.querySelector("[name='scoresJson']").value),
    ui: {
      ...state.data.ui,
      showJourneyRail: document.querySelector("[name='showJourneyRail']").checked,
      customCursor: document.querySelector("[name='customCursor']").checked,
    },
  };
}

function saveLocalDraft(data) {
  localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(data));
}

function loadLocalDraft() {
  const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadPortfolioData() {
  const localDraft = loadLocalDraft();
  if (localDraft && (isDevAdminSession() || !canUseFirebase())) {
    state.data = mergeData(defaultPortfolioData, localDraft);
    fillForms(state.data);
    showStatus("Loaded local draft from browser storage.", "info");
    return;
  }

  if (!canUseFirebase()) {
    state.data = structuredClone(defaultPortfolioData);
    fillForms(state.data);
    showStatus(
      "Firebase not configured. Use admin / admin to edit and save a local draft, or add firebase-config.js.",
      "warn",
    );
    return;
  }

  const remote = await readData(PORTFOLIO_DB_PATH);
  state.data = mergeData(defaultPortfolioData, remote);
  fillForms(state.data);
  showStatus("Portfolio data loaded from Firebase Realtime Database.", "success");
}

async function savePortfolioData(event) {
  event.preventDefault();
  try {
    const next = collectFormData();
    state.data = mergeData(state.data, next);

    if (!canUseFirebase() || isDevAdminSession()) {
      saveLocalDraft(state.data);
      if (!canUseFirebase()) {
        showStatus("Saved local draft (Firebase not configured). Changes apply on this browser only.", "warn");
        return;
      }
    }

    if (!canUseFirebase()) {
      showStatus("Firebase is not configured.", "error");
      return;
    }

    await setData(PORTFOLIO_DB_PATH, state.data);
    saveLocalDraft(state.data);
    showStatus("Portfolio content saved to Firebase Realtime Database.", "success");
  } catch (error) {
    showStatus(`Save failed: ${error.message}`, "error");
  }
}

async function handleCvUpload(mode) {
  const input = document.querySelector(mode === "light" ? "[name='cvLight']" : "[name='cvDark']");
  const file = input?.files?.[0];
  if (!file) {
    showStatus(`Choose a ${mode} CV PDF first.`, "warn");
    return;
  }

  if (!canUseFirebase() || isDevAdminSession()) {
    showStatus("CV upload to Storage requires Firebase Auth (not dev admin). Set URLs manually for now.", "warn");
    return;
  }

  const storagePath = `portfolio/cv/${mode}-${Date.now()}-${file.name}`;
  const url = await uploadFile(storagePath, file, file.type || "application/pdf");
  if (mode === "light") {
    state.data.cv.lightUrl = url;
    document.querySelector("[name='cvLightUrl']").value = url;
  } else {
    state.data.cv.darkUrl = url;
    document.querySelector("[name='cvDarkUrl']").value = url;
  }
  await setData(PORTFOLIO_DB_PATH, state.data);
  showStatus(`${mode[0].toUpperCase()}${mode.slice(1)} CV uploaded and linked.`, "success");
}

function destroyCropper() {
  if (state.cropper) {
    state.cropper.destroy();
    state.cropper = null;
  }
}

function setupCropper() {
  const fileInput = document.querySelector("[name='projectImage']");
  const image = document.querySelector("[data-crop-image]");
  const targetSelect = document.querySelector("[name='projectImageType']");

  const applyCropper = (src) => {
    image.src = src;
    image.onload = () => {
      destroyCropper();
      const ratio = targetSelect.value === "thumbnail" ? 16 / 10 : 16 / 9;
      state.cropper = new Cropper(image, {
        aspectRatio: ratio,
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.95,
        responsive: true,
      });
    };
  };

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    applyCropper(URL.createObjectURL(file));
  });

  targetSelect.addEventListener("change", () => {
    if (image.src) applyCropper(image.src);
  });
}

async function uploadCroppedProjectImage() {
  const projectIndex = Number(document.querySelector("[name='projectIndex']").value);
  const imageType = document.querySelector("[name='projectImageType']").value;

  if (!Number.isInteger(projectIndex) || projectIndex < 0) {
    showStatus("Select a valid project index.", "error");
    return;
  }
  if (!state.cropper) {
    showStatus("Load and crop an image before upload.", "warn");
    return;
  }
  if (!canUseFirebase() || isDevAdminSession()) {
    showStatus("Image upload to Storage requires Firebase Auth (not dev admin).", "warn");
    return;
  }

  const dimensions = imageType === "thumbnail" ? [640, 400] : [1280, 720];
  const blob = await new Promise((resolve) =>
    state.cropper
      .getCroppedCanvas({ width: dimensions[0], height: dimensions[1], imageSmoothingQuality: "high" })
      .toBlob(resolve, "image/jpeg", 0.92),
  );

  if (!blob) {
    showStatus("Unable to create cropped image blob.", "error");
    return;
  }

  const path = `portfolio/projects/p${projectIndex}-${imageType}-${Date.now()}.jpg`;
  const url = await uploadFile(path, blob, "image/jpeg");
  const project = state.data.projects?.[projectIndex];
  if (!project) {
    showStatus("Project index does not exist in data.", "error");
    return;
  }
  project[imageType] = url;
  document.querySelector("[name='projectsJson']").value = JSON.stringify(state.data.projects, null, 2);
  await setData(PORTFOLIO_DB_PATH, state.data);
  showStatus(`Project ${imageType} updated and saved.`, "success");
}

function togglePanels(user) {
  document.querySelector("[data-login-panel]").hidden = Boolean(user);
  document.querySelector("[data-editor-panel]").hidden = !user;
  if (!user) {
    showStatus(
      "Sign in with Firebase email/password, or use dev credentials: admin / admin (email field: admin).",
      "info",
    );
  }
}

function setupAuth() {
  const loginForm = document.querySelector("[data-login-form]");
  const logoutButton = document.querySelector("[data-logout]");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("[name='adminEmail']").value.trim();
    const password = document.querySelector("[name='adminPassword']").value;

    try {
      const devUser = devAdminLogin(email, password);
      if (devUser) {
        togglePanels(devUser);
        document.querySelector("[data-admin-user]").textContent = `${devUser.email} (dev mode)`;
        await loadPortfolioData();
        showStatus("Dev admin session active (admin / admin). Firebase uploads disabled in dev mode.", "success");
        return;
      }

      if (!canUseFirebase()) {
        showStatus("Firebase not configured. Use admin / admin for dev access.", "error");
        return;
      }

      const result = await adminLogin(email, password);
      const user = result.user || result;
      document.querySelector("[data-admin-user]").textContent = user.email || user.uid;
      showStatus("Login successful.", "success");
    } catch (error) {
      showStatus(`Login failed: ${error.message}`, "error");
    }
  });

  logoutButton.addEventListener("click", async () => {
    await adminLogout();
    togglePanels(null);
    showStatus("Logged out.", "info");
  });

  watchAuthState((user) => {
    if (user) {
      togglePanels(user);
      const label = user.isDev ? `${user.email} (dev mode)` : user.email || user.uid;
      document.querySelector("[data-admin-user]").textContent = label;
      loadPortfolioData().catch((error) => showStatus(error.message, "error"));
    } else {
      togglePanels(null);
    }
  });
}

function installActions() {
  document.querySelector("[data-editor-form]").addEventListener("submit", savePortfolioData);
  document.querySelector("[data-upload-light]").addEventListener("click", () => handleCvUpload("light"));
  document.querySelector("[data-upload-dark]").addEventListener("click", () => handleCvUpload("dark"));
  document.querySelector("[data-project-upload]").addEventListener("click", uploadCroppedProjectImage);
  setupCropper();
}

function bootAdmin() {
  setupAuth();
  installActions();
}

bootAdmin();
