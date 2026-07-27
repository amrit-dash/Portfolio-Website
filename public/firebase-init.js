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
  const db = firebase.firestore();
  // auth and storage are admin-only. The public portfolio deliberately omits
  // those two compat bundles from its <script> list, so probe instead of
  // assuming — firebase.auth is simply undefined there. Both stay null on the
  // site; callers already null-check (see app.jsx `window.fb.auth &&`).
  let auth = null;
  try { auth = firebase.auth(); } catch (e) { /* auth SDK not loaded on this page */ }
  let storage = null;
  try { storage = firebase.storage(); } catch (e) { /* storage SDK not loaded on this page */ }

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const useEmu = isLocal && new URLSearchParams(location.search).get('emu') === '1';
  if (useEmu) {
    try {
      if (auth) auth.useEmulator('http://localhost:9099', { disableWarnings: true });
      db.useEmulator('localhost', 8080);
      if (storage) storage.useEmulator('localhost', 9199);
      window.FUNCTIONS_BASE = 'http://localhost:5001/' + window.FIREBASE_CONFIG.projectId + '/asia-south1';
      console.info('[firebase-init] using local emulators');
    } catch (e) { console.warn('[firebase-init] emulator wiring failed', e); }
  }

  // Offline IndexedDB cache: repeat loads and re-queries are served locally
  // instead of re-billing Firestore reads, and the admin keeps working offline.
  // synchronizeTabs keeps multiple open admin tabs consistent. Enabled AFTER any
  // useEmulator() wiring (which must run before the client starts) and skipped
  // under the emulator. Must precede the first query — safe here since queries
  // only begin once React mounts. Failures (private mode / unsupported) no-op.
  //
  // Note: compat SDK 10.x still routes through enablePersistence(); the console
  // deprecation for enableMultiTabIndexedDbPersistence only goes away after a
  // full modular-SDK migration (initializeFirestore + persistentLocalCache).
  if (!useEmu) {
    try {
      db.enablePersistence({ synchronizeTabs: true })
        .catch((e) => console.info('[firebase-init] persistence off:', e && e.code));
    } catch (e) { /* older SDKs */ }
  }

  window.fb = {
    app, auth, db, storage,
    googleProvider: () => new firebase.auth.GoogleAuthProvider(), // admin only — auth-compat required
    FieldValue: firebase.firestore.FieldValue,
    serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
  };
})();
