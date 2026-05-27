import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import { firebaseConfig, FIRESTORE_PATHS } from "../firebase-config.js";

let app;
let auth;
let db;
let storage;
let firebaseReady = false;

export function initFirebase() {
  if (firebaseReady) return { auth, db, storage };
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    firebaseReady = true;
  } catch (err) {
    console.warn("Firebase init skipped:", err.message);
  }
  return { auth, db, storage, ready: firebaseReady };
}

export function isFirebaseConfigured() {
  return !firebaseConfig.apiKey.includes("DummyReplace");
}

export async function fetchPortfolioContent() {
  const fallback = await loadDefaultContent();
  const { db: firestore, ready } = initFirebase();
  if (!ready || !isFirebaseConfigured()) return fallback;

  try {
    const snap = await getDoc(doc(firestore, FIRESTORE_PATHS.content));
    if (snap.exists()) {
      return deepMerge(fallback, snap.data());
    }
  } catch (err) {
    console.warn("Firestore read failed, using defaults:", err);
  }
  return fallback;
}

export async function fetchPortfolioSettings() {
  const defaults = getDefaultSettings();
  const { db: firestore, ready } = initFirebase();
  if (!ready || !isFirebaseConfigured()) return defaults;

  try {
    const snap = await getDoc(doc(firestore, FIRESTORE_PATHS.settings));
    if (snap.exists()) return { ...defaults, ...snap.data() };
  } catch (err) {
    console.warn("Settings read failed:", err);
  }
  return defaults;
}

export function subscribePortfolioContent(callback) {
  const { db: firestore, ready } = initFirebase();
  if (!ready || !isFirebaseConfigured()) {
    loadDefaultContent().then(callback);
    return () => {};
  }

  return onSnapshot(
    doc(firestore, FIRESTORE_PATHS.content),
    async (snap) => {
      const fallback = await loadDefaultContent();
      callback(snap.exists() ? deepMerge(fallback, snap.data()) : fallback);
    },
    () => loadDefaultContent().then(callback)
  );
}

export function subscribePortfolioSettings(callback) {
  const defaults = getDefaultSettings();
  const { db: firestore, ready } = initFirebase();
  if (!ready || !isFirebaseConfigured()) {
    callback(defaults);
    return () => {};
  }

  return onSnapshot(
    doc(firestore, FIRESTORE_PATHS.settings),
    (snap) => callback(snap.exists() ? { ...defaults, ...snap.data() } : defaults),
    () => callback(defaults)
  );
}

export async function resolveStorageUrl(path, fallbackUrl) {
  const { storage: store, ready } = initFirebase();
  if (!ready || !isFirebaseConfigured() || !path) return fallbackUrl;
  try {
    return await getDownloadURL(ref(store, path));
  } catch {
    return fallbackUrl;
  }
}

export { doc, getDoc, setDoc, ref, uploadBytes, getDownloadURL };

async function loadDefaultContent() {
  const res = await fetch("/data/default-content.json");
  return res.json();
}

function getDefaultSettings() {
  return {
    defaultTheme: "dark",
    accentHue: 142,
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    fontBody: "'IBM Plex Mono', ui-monospace, monospace",
    bootEnabled: true,
    reducedMotion: false
  };
}

function deepMerge(base, override) {
  if (!override || typeof override !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const val = override[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      out[key] = deepMerge(base[key] || {}, val);
    } else if (val !== undefined && val !== null) {
      out[key] = val;
    }
  }
  return out;
}
