import { firebaseClientConfig, firebaseCollections } from "./firebase-config.js";

const SDK_VERSION = "10.14.1";
let servicesPromise;

export function isFirebaseConfigured() {
  return Boolean(firebaseClientConfig.apiKey && firebaseClientConfig.projectId && firebaseClientConfig.appId);
}

export async function getFirebaseServices() {
  if (!isFirebaseConfigured()) {
    return { configured: false, reason: "Firebase web config is missing apiKey/appId. Add them in public/js/firebase-config.js." };
  }
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-storage.js`)
    ]).then(([appMod, authMod, firestoreMod, storageMod]) => {
      const app = appMod.initializeApp(firebaseClientConfig);
      const auth = authMod.getAuth(app);
      const db = firestoreMod.getFirestore(app);
      const storage = storageMod.getStorage(app);
      return { configured: true, app, auth, db, storage, authMod, firestoreMod, storageMod };
    });
  }
  return servicesPromise;
}

export async function fetchRemoteContent() {
  const services = await getFirebaseServices();
  if (!services.configured) return null;
  const { firestoreMod, db } = services;
  const docRef = firestoreMod.doc(db, firebaseCollections.contentCollection, firebaseCollections.contentDocument);
  const snap = await firestoreMod.getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

export async function saveRemoteContent(content) {
  const services = await getFirebaseServices();
  if (!services.configured) throw new Error(services.reason);
  const { firestoreMod, db } = services;
  const docRef = firestoreMod.doc(db, firebaseCollections.contentCollection, firebaseCollections.contentDocument);
  await firestoreMod.setDoc(docRef, { ...content, updatedAt: firestoreMod.serverTimestamp() }, { merge: true });
}

export async function signInWithEmail(email, password) {
  const services = await getFirebaseServices();
  if (!services.configured) throw new Error(services.reason);
  return services.authMod.signInWithEmailAndPassword(services.auth, email, password);
}

export async function signInWithGoogle() {
  const services = await getFirebaseServices();
  if (!services.configured) throw new Error(services.reason);
  const provider = new services.authMod.GoogleAuthProvider();
  return services.authMod.signInWithPopup(services.auth, provider);
}

export async function signOut() {
  const services = await getFirebaseServices();
  if (!services.configured) return;
  return services.authMod.signOut(services.auth);
}

export async function onAuthChanged(callback) {
  const services = await getFirebaseServices();
  if (!services.configured) {
    callback(null, services);
    return () => {};
  }
  return services.authMod.onAuthStateChanged(services.auth, callback);
}

export async function uploadCroppedImage(blob, filename) {
  const services = await getFirebaseServices();
  if (!services.configured) throw new Error(services.reason);
  const path = `${firebaseCollections.mediaFolder}/${Date.now()}-${filename.replace(/[^a-z0-9._-]/gi, "-").toLowerCase()}`;
  const fileRef = services.storageMod.ref(services.storage, path);
  await services.storageMod.uploadBytes(fileRef, blob, { contentType: blob.type || "image/png" });
  return services.storageMod.getDownloadURL(fileRef);
}
