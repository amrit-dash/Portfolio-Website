import { firebaseConfig } from "../firebase-config.js";

let app = null;
let db = null;
let storage = null;
let auth = null;

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig?.apiKey && !firebaseConfig.apiKey.includes("YOUR_"));
}

export async function initFirebase() {
  if (!isFirebaseConfigured()) return null;
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js");
  const { getDatabase } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
  const { getStorage } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js");
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");

  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    storage = getStorage(app);
    auth = getAuth(app);
  }
  return { app, db, storage, auth };
}

export function getDatabaseRef() {
  return db;
}

export function getStorageRef() {
  return storage;
}

export function getAuthRef() {
  return auth;
}

export async function saveSiteToFirebase(data) {
  const { ref, set } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js");
  const database = getDatabaseRef();
  if (!database) throw new Error("Firebase not configured");
  await set(ref(database, "site"), data);
}

export async function uploadFile(path, file) {
  const { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js");
  const st = getStorageRef();
  if (!st) throw new Error("Firebase Storage not configured");
  const storageRef = ref(st, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
