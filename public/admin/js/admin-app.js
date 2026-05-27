import { firebaseConfig, FIRESTORE_DOC, ADMIN_EMAIL } from '../../js/firebase-config.js';
import { fetchPortfolioContent, savePortfolioContent, getFirebaseAuth, getFirebaseStorage } from '../../js/core/content-service.js';

let content = null;
let auth = null;
let cropper = null;
let cropContext = null;

const statusEl = document.getElementById('status-bar');
const loginView = document.getElementById('login-view');
const adminShell = document.getElementById('admin-shell');

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status-bar' + (type ? ` is-${type}` : '');
}

async function initFirebaseAuth() {
  const authMod = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
  const appMod = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
  const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(firebaseConfig);
  auth = authMod.getAuth(app);
  return { auth, authMod, app };
}

function showAdmin(user) {
  loginView.classList.add('hidden');
  adminShell.classList.add('is-active');
  document.getElementById('admin-user').textContent = user.email;
}

function showLogin() {
  loginView.classList.remove('hidden');
  adminShell.classList.remove('is-active');
}

async function handleAuthState(user) {
  if (!user) {
    showLogin();
    return;
  }
  if (user.email !== ADMIN_EMAIL) {
    setStatus('This account is not authorized.', 'error');
    await auth.signOut();
    showLogin();
    return;
  }
  showAdmin(user);
  await loadContent();
}

async function loadContent() {
  content = await fetchPortfolioContent();
  populateForms();
  setStatus('Content loaded', 'success');
}

function populateForms() {
  const p = content.profile || {};
  const form = document.getElementById('form-profile');
  form.name.value = p.name || '';
  form.pretitle.value = p.pretitle || '';
  form.headline.value = (p.headline || []).join('\n');
  form.summary.value = p.summary || '';
  form.email.value = p.email || '';
  form.phone.value = p.phone || '';
  form.skills.value = (content.skills || []).join(', ');
  form.contactHeading.value = content.contact?.heading || '';
  form.contactMessage.value = content.contact?.message || '';

  document.getElementById('experience-json').value = JSON.stringify(content.experience || [], null, 2);
  document.getElementById('education-json').value = JSON.stringify(content.education || [], null, 2);

  renderProjectsEditor();

  const t = content.settings || {};
  const tf = document.getElementById('form-theme');
  tf.defaultTheme.value = t.defaultTheme || 'dark';
  tf.accentLight.value = t.accentLight || '#c45c26';
  tf.accentDark.value = t.accentDark || '#5eead4';
  tf.fontDisplay.value = t.fontDisplay || '';
  tf.fontBody.value = t.fontBody || '';
  tf.bootLines.value = (t.bootLines || []).join('\n');

  const assets = content.assets || {};
  document.getElementById('cv-status').textContent =
    `Light: ${assets.cvLightStorage || assets.cvLight || 'default'} · Dark: ${assets.cvDarkStorage || assets.cvDark || 'default'}`;
}

function renderProjectsEditor() {
  const container = document.getElementById('projects-editor');
  container.innerHTML = '';
  (content.projects || []).forEach((proj, index) => {
    container.appendChild(createProjectEditor(proj, index));
  });
}

function createProjectEditor(proj, index) {
  const wrap = document.createElement('div');
  wrap.className = 'project-editor-item';
  wrap.dataset.index = index;
  wrap.innerHTML = `
    <h3>Project ${index + 1}</h3>
    <label>ID<input data-field="id" value="${proj.id || ''}"></label>
    <label>Title<input data-field="title" value="${escapeAttr(proj.title)}"></label>
    <label>Category<input data-field="category" value="${escapeAttr(proj.category)}"></label>
    <label>Description<textarea data-field="description" rows="3">${escapeHtml(proj.description)}</textarea></label>
    <label>Tags (comma)<input data-field="tags" value="${(proj.tags || []).join(', ')}"></label>
    <label>Featured<input data-field="featured" type="checkbox" ${proj.featured ? 'checked' : ''}></label>
    <div class="form-row">
      <div>
        <label>Thumbnail URL<input data-field="thumbnail" value="${escapeAttr(proj.thumbnail)}"></label>
        <input type="file" accept="image/*" data-upload="thumbnail" data-index="${index}">
      </div>
      <div>
        <label>Gallery URL<input data-field="gallery" value="${escapeAttr(proj.gallery)}"></label>
        <input type="file" accept="image/*" data-upload="gallery" data-index="${index}">
      </div>
    </div>
    <label>Links JSON<textarea data-field="links" rows="2">${JSON.stringify(proj.links || [])}</textarea></label>
    <button type="button" class="btn btn--danger btn--ghost" data-remove>Remove</button>
  `;

  wrap.querySelector('[data-remove]').addEventListener('click', () => {
    content.projects.splice(index, 1);
    renderProjectsEditor();
  });

  wrap.querySelectorAll('[data-upload]').forEach((input) => {
    input.addEventListener('change', () => handleImagePick(input, wrap));
  });

  return wrap;
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

function escapeHtml(s) {
  return String(s || '').replace(/</g, '&lt;');
}

function collectProjectsFromDom() {
  const items = document.querySelectorAll('.project-editor-item');
  return Array.from(items).map((wrap) => {
    const get = (field) => wrap.querySelector(`[data-field="${field}"]`);
    let links = [];
    try {
      links = JSON.parse(get('links').value || '[]');
    } catch {
      links = [];
    }
    return {
      id: get('id').value || `proj-${Date.now()}`,
      title: get('title').value,
      category: get('category').value,
      description: get('description').value,
      tags: get('tags').value.split(',').map((t) => t.trim()).filter(Boolean),
      featured: get('featured').checked,
      thumbnail: get('thumbnail').value,
      gallery: get('gallery').value,
      links
    };
  });
}

async function handleImagePick(input, wrap) {
  const file = input.files?.[0];
  if (!file) return;
  const kind = input.dataset.upload;
  const specs = content.imageSpecs || {};
  const spec = kind === 'gallery' ? specs.gallery : specs.thumbnail;
  const w = spec?.width || 600;
  const h = spec?.height || 650;

  openCropModal(file, w / h, async (blob) => {
    const index = wrap.dataset.index;
    const proj = collectProjectsFromDom()[index];
    const path = `portfolio/projects/${proj.id || 'project'}-${kind}-${Date.now()}.jpg`;
    const url = await uploadBlob(blob, path);
    wrap.querySelector(`[data-field="${kind}"]`).value = url;
    setStatus(`Uploaded ${kind} for ${proj.title}`, 'success');
  });
}

function openCropModal(file, aspectRatio, onConfirm) {
  const modal = document.getElementById('crop-modal');
  const img = document.getElementById('crop-image');
  const reader = new FileReader();
  reader.onload = () => {
    img.src = reader.result;
    modal.classList.add('is-open');
    if (cropper) cropper.destroy();
    cropper = new Cropper(img, {
      aspectRatio,
      viewMode: 1,
      autoCropArea: 1
    });
    cropContext = { onConfirm };
  };
  reader.readAsDataURL(file);
}

document.getElementById('crop-cancel').addEventListener('click', closeCropModal);
document.getElementById('crop-confirm').addEventListener('click', async () => {
  if (!cropper || !cropContext) return;
  const canvas = cropper.getCroppedCanvas({ maxWidth: 2400, maxHeight: 2600 });
  canvas.toBlob(async (blob) => {
    await cropContext.onConfirm(blob);
    closeCropModal();
  }, 'image/jpeg', 0.92);
});

function closeCropModal() {
  document.getElementById('crop-modal').classList.remove('is-open');
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  cropContext = null;
}

async function uploadBlob(blob, path) {
  const { storage, storageMod } = await getFirebaseStorage(auth);
  const { ref, uploadBytes, getDownloadURL } = storageMod;
  const storageRef = ref(storage, path);
  const contentType =
    blob.type ||
    (path.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}

document.getElementById('google-signin').addEventListener('click', async () => {
  try {
    const { authMod } = await initFirebaseAuth();
    const provider = new authMod.GoogleAuthProvider();
    await authMod.signInWithPopup(auth, provider);
  } catch (err) {
    const errEl = document.getElementById('login-error');
    errEl.textContent = err.message || 'Sign-in failed. Enable Google Auth in Firebase Console.';
    errEl.classList.remove('hidden');
  }
});

document.getElementById('sign-out').addEventListener('click', () => auth?.signOut());

document.querySelectorAll('.admin-nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav button').forEach((b) => b.classList.remove('is-active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.getElementById(`panel-${btn.dataset.panel}`).classList.add('is-active');
  });
});

document.getElementById('form-profile').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  content.profile = {
    ...content.profile,
    name: f.name.value,
    pretitle: f.pretitle.value,
    headline: f.headline.value.split('\n').filter(Boolean),
    summary: f.summary.value,
    email: f.email.value,
    phone: f.phone.value
  };
  content.skills = f.skills.value.split(',').map((s) => s.trim()).filter(Boolean);
  content.contact = {
    ...content.contact,
    heading: f.contactHeading.value,
    message: f.contactMessage.value
  };
  await persist();
});

document.getElementById('save-experience').addEventListener('click', async () => {
  try {
    content.experience = JSON.parse(document.getElementById('experience-json').value);
    content.education = JSON.parse(document.getElementById('education-json').value);
    await persist();
  } catch {
    setStatus('Invalid JSON in timeline fields', 'error');
  }
});

document.getElementById('save-projects').addEventListener('click', async () => {
  content.projects = collectProjectsFromDom();
  await persist();
});

document.getElementById('add-project').addEventListener('click', () => {
  content.projects = collectProjectsFromDom();
  content.projects.unshift({
    id: `project-${Date.now()}`,
    title: 'New Project',
    category: 'Category',
    thumbnail: '',
    gallery: '',
    description: '',
    tags: [],
    links: []
  });
  renderProjectsEditor();
});

document.getElementById('form-theme').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  content.settings = {
    ...content.settings,
    defaultTheme: f.defaultTheme.value,
    accentLight: f.accentLight.value,
    accentDark: f.accentDark.value,
    fontDisplay: f.fontDisplay.value,
    fontBody: f.fontBody.value,
    bootLines: f.bootLines.value.split('\n').filter(Boolean)
  };
  await persist();
});

async function uploadCv(inputId, storageKey, localKey) {
  const file = document.getElementById(inputId).files?.[0];
  if (!file) return;
  const path = `portfolio/cv/${storageKey}-${Date.now()}.pdf`;
  const url = await uploadBlob(file, path);
  content.assets = content.assets || {};
  content.assets[localKey] = url;
  await persist();
  document.getElementById('cv-status').textContent = `Uploaded ${storageKey}`;
}

document.getElementById('cv-light').addEventListener('change', () =>
  uploadCv('cv-light', 'cv-light', 'cvLightStorage').catch((e) => setStatus(e.message, 'error'))
);
document.getElementById('cv-dark').addEventListener('change', () =>
  uploadCv('cv-dark', 'cv-dark', 'cvDarkStorage').catch((e) => setStatus(e.message, 'error'))
);

document.getElementById('about-photo').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  openCropModal(file, 600 / 650, async (blob) => {
    const url = await uploadBlob(blob, `portfolio/about-${Date.now()}.jpg`);
    content.profile.aboutPhoto = url;
    content.profile.aboutPhoto2x = url;
    await persist();
  });
});

async function persist() {
  setStatus('Saving…');
  try {
    await savePortfolioContent(content, auth);
    setStatus('Saved to Firestore', 'success');
  } catch (err) {
    setStatus(err.message || 'Save failed', 'error');
  }
}

(async function main() {
  if (firebaseConfig.apiKey?.includes('placeholder')) {
    document.getElementById('login-error').textContent =
      'Configure public/js/firebase-config.js with your Web app credentials (Firebase Console → Project settings).';
    document.getElementById('login-error').classList.remove('hidden');
  }

  const { authMod } = await initFirebaseAuth();
  authMod.onAuthStateChanged(auth, handleAuthState);
})();
