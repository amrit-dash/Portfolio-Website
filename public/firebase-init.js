/* Firebase bootstrap (compat SDK, zero-build friendly). Loads after the
   firebase-*-compat.js CDN scripts and firebase-config.js, and exposes a single
   window.fb namespace the rest of the app uses. Calling initializeApp does NOT
   open any network connection — reads/writes happen lazily — so it's safe to
   include on every page even before Firestore data exists.

   Local dev: append ?emu=1 to the URL to route at the Firebase Emulator Suite
   instead of production. */
(function () {
  if (!window.firebase || !window.FIREBASE_CONFIG) {
    console.error('[firebase-init] SDK or config missing — did the compat scripts load before this file?');
    return;
  }

  const app = firebase.initializeApp(window.FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();
  let storage = null;
  try { storage = firebase.storage(); } catch (e) { /* storage SDK not loaded on this page */ }

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const useEmu = isLocal && new URLSearchParams(location.search).get('emu') === '1';
  if (useEmu) {
    try {
      auth.useEmulator('http://localhost:9099', { disableWarnings: true });
      db.useEmulator('localhost', 8080);
      if (storage) storage.useEmulator('localhost', 9199);
      window.FUNCTIONS_BASE = 'http://localhost:5001/' + window.FIREBASE_CONFIG.projectId + '/us-central1';
      console.info('[firebase-init] using local emulators');
    } catch (e) { console.warn('[firebase-init] emulator wiring failed', e); }
  }

  window.fb = {
    app, auth, db, storage,
    googleProvider: () => new firebase.auth.GoogleAuthProvider(),
    FieldValue: firebase.firestore.FieldValue,
    serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
  };
})();
