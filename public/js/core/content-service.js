import { firebaseConfig, FIRESTORE_DOC } from '../firebase-config.js';

const DEFAULT_URL = '/data/default-content.json';
let db = null;
let firestoreModule = null;

async function loadFirebase() {
  const appMod = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
  const fsMod = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
  firestoreModule = fsMod;
  const app = appMod.initializeApp(firebaseConfig);
  db = fsMod.getFirestore(app);
  return { app, db };
}

export async function fetchPortfolioContent() {
  let remote = null;

  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('placeholder')) {
    try {
      if (!db) await loadFirebase();
      const { doc, getDoc } = firestoreModule;
      const snap = await getDoc(doc(db, ...FIRESTORE_DOC.split('/')));
      if (snap.exists()) remote = snap.data();
    } catch (err) {
      console.warn('[portfolio] Firestore unavailable, using defaults.', err);
    }
  }

  const response = await fetch(DEFAULT_URL, { cache: 'no-cache' });
  const defaults = await response.json();

  if (!remote) return defaults;
  return deepMerge(defaults, remote);
}

export async function savePortfolioContent(data, auth) {
  if (!auth?.currentUser) throw new Error('Not authenticated');
  if (!db) await loadFirebase();
  const { doc, setDoc, serverTimestamp } = firestoreModule;
  await setDoc(
    doc(db, ...FIRESTORE_DOC.split('/')),
    { ...data, updatedAt: serverTimestamp(), updatedBy: auth.currentUser.email },
    { merge: true }
  );
}

export function getFirebaseAuth() {
  return import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js').then(async (authMod) => {
    const appMod = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
    const apps = appMod.getApps();
    const app = apps.length ? apps[0] : appMod.initializeApp(firebaseConfig);
    return authMod.getAuth(app);
  });
}

export function getFirebaseStorage(auth) {
  return import('https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js').then(async (storageMod) => {
    const appMod = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
    const apps = appMod.getApps();
    const app = apps.length ? apps[0] : appMod.initializeApp(firebaseConfig);
    return { storage: storageMod.getStorage(app), storageMod, auth };
  });
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = base[key];
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
      out[key] = deepMerge(bv, pv);
    } else if (pv !== undefined && pv !== null && pv !== '') {
      out[key] = pv;
    }
  }
  return out;
}

export function resolveCvUrl(content, theme) {
  const assets = content.assets || {};
  const isDark = theme === 'dark';
  const storageUrl = isDark ? assets.cvDarkStorage : assets.cvLightStorage;
  const localUrl = isDark ? assets.cvDark : assets.cvLight;
  return storageUrl || localUrl || localUrl;
}
