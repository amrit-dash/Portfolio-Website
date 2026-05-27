import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const fallbackConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

const firebaseConfig = window.__FIREBASE_CONFIG__ || fallbackConfig;
const isFirebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let database;
let auth;
let storage;

if (isFirebaseReady) {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  auth = getAuth(app);
  storage = getStorage(app);
}

export function canUseFirebase() {
  return isFirebaseReady;
}

export async function readData(path) {
  if (!database) return null;
  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function setData(path, payload) {
  if (!database) throw new Error("Firebase database is not configured.");
  await set(ref(database, path), payload);
}

export async function updateData(path, payload) {
  if (!database) throw new Error("Firebase database is not configured.");
  await update(ref(database, path), payload);
}

export async function adminLogin(email, password) {
  if (!auth) throw new Error("Firebase auth is not configured.");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  if (!auth) return;
  await signOut(auth);
}

export function watchAuthState(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function uploadFile(path, file, contentType) {
  if (!storage) throw new Error("Firebase storage is not configured.");
  const uploadRef = storageRef(storage, path);
  const metadata = contentType ? { contentType } : undefined;
  await uploadBytes(uploadRef, file, metadata);
  return getDownloadURL(uploadRef);
}
