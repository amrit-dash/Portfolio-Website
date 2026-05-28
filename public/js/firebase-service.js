/**
 * Firebase Service Layer
 * 
 * This module provides a unified interface for all Firebase operations.
 * It initialises Firebase with the config stored in localStorage (set via admin panel)
 * and exposes methods for Auth, Firestore, and Storage.
 * 
 * If Firebase is not configured, all methods gracefully fall back to
 * localStorage-based alternatives.
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   FIREBASE CONFIG
   ──────────────────────────────────────────────────────────────
   The admin panel stores the Firebase config in localStorage under
   the key 'firebase-config'. This module reads it on init.
   
   The config object should match the Firebase Web App config:
   {
     apiKey: "...",
     authDomain: "...",
     projectId: "amrit-dash-portfolio",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   }
   ────────────────────────────────────────────────────────────── */

const FIREBASE_CONFIG_KEY = 'firebase-web-config';
const PORTFOLIO_CONFIG_KEY = 'portfolio-config';

let _app = null;
let _auth = null;
let _db = null;
let _storage = null;
let _isInitialized = false;

/**
 * Read Firebase config from localStorage (set via admin panel)
 */
function getFirebaseConfig() {
    try {
        const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { /* */ }
    return null;
}

/**
 * Initialise Firebase SDK dynamically.
 * Returns true if init succeeded, false if not configured.
 */
async function initFirebase() {
    if (_isInitialized) return !!_app;

    const fbConfig = getFirebaseConfig();
    if (!fbConfig || !fbConfig.apiKey) {
        console.info('[Firebase] No config found. Using localStorage fallback.');
        _isInitialized = true;
        return false;
    }

    try {
        /* Dynamic import of Firebase SDK modules */
        const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const { getStorage } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');

        if (!getApps().length) {
            _app = initializeApp(fbConfig);
        } else {
            _app = getApps()[0];
        }

        _auth    = getAuth(_app);
        _db      = getFirestore(_app);
        _storage = getStorage(_app);

        _isInitialized = true;
        console.info('[Firebase] Initialized successfully.');
        return true;
    } catch (err) {
        console.warn('[Firebase] Initialization failed:', err.message);
        _isInitialized = true;
        return false;
    }
}

/* ──────────────────────────────────────────────────────────────
   AUTH
   ────────────────────────────────────────────────────────────── */

/**
 * Sign in with email and password.
 * Falls back to localStorage-based admin check if Firebase unavailable.
 */
async function signIn(email, password) {
    if (!_auth) {
        /* localStorage fallback (admin/admin) */
        const creds = getLocalCreds();
        if (email === creds.username && password === creds.password) {
            return { user: { email, displayName: 'Admin' }, local: true };
        }
        throw new Error('Invalid credentials');
    }

    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    return signInWithEmailAndPassword(_auth, email, password);
}

/**
 * Sign out.
 */
async function signOut() {
    if (_auth) {
        const { signOut: fbSignOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        await fbSignOut(_auth);
    }
    sessionStorage.removeItem('admin-auth');
}

/**
 * Get current user (null if not signed in).
 */
function getCurrentUser() {
    return _auth ? _auth.currentUser : null;
}

/**
 * Listen to auth state changes.
 */
function onAuthStateChanged(callback) {
    if (!_auth) {
        /* Simulate auth state from sessionStorage */
        const authed = sessionStorage.getItem('admin-auth') === 'true';
        callback(authed ? { displayName: 'Admin' } : null);
        return () => {};
    }
    return _auth.onAuthStateChanged(callback);
}

/* ──────────────────────────────────────────────────────────────
   FIRESTORE
   ────────────────────────────────────────────────────────────── */

const SITE_CONFIG_DOC = 'portfolio-config/main';

/**
 * Read site config from Firestore. Falls back to localStorage.
 */
async function getConfig() {
    if (!_db) {
        return getLocalConfig();
    }

    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const docRef = doc(_db, 'portfolio-config', 'main');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return snap.data();
        }
    } catch (err) {
        console.warn('[Firebase] Firestore read failed:', err.message);
    }
    return getLocalConfig();
}

/**
 * Save site config to Firestore. Falls back to localStorage.
 */
async function saveConfig(configData) {
    /* Always save to localStorage as cache */
    saveLocalConfig(configData);

    if (!_db) return;

    try {
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const docRef = doc(_db, 'portfolio-config', 'main');
        await setDoc(docRef, { ...configData, _updatedAt: serverTimestamp() }, { merge: true });
        console.info('[Firebase] Config saved to Firestore.');
    } catch (err) {
        console.warn('[Firebase] Firestore write failed:', err.message);
    }
}

/* ──────────────────────────────────────────────────────────────
   STORAGE
   ────────────────────────────────────────────────────────────── */

/**
 * Upload a file to Firebase Storage.
 * @param {File} file - The file to upload
 * @param {string} path - Storage path (e.g. 'cv/cv-dark.pdf')
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} Download URL
 */
async function uploadFile(file, path, onProgress) {
    if (!_storage) {
        throw new Error('Firebase Storage not configured');
    }

    const { ref, uploadBytesResumable, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');

    return new Promise((resolve, reject) => {
        const storageRef = ref(_storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress && onProgress(Math.round(pct));
            },
            (error) => {
                console.error('[Firebase] Upload failed:', error);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
}

/**
 * Get a public download URL for a stored file.
 */
async function getFileURL(path) {
    if (!_storage) return null;

    try {
        const { ref, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');
        return await getDownloadURL(ref(_storage, path));
    } catch (err) {
        return null;
    }
}

/* ──────────────────────────────────────────────────────────────
   LOCAL STORAGE FALLBACKS
   ────────────────────────────────────────────────────────────── */

function getLocalConfig() {
    try {
        const raw = localStorage.getItem(PORTFOLIO_CONFIG_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function saveLocalConfig(data) {
    try {
        const current = getLocalConfig();
        const merged = deepMerge(current, data);
        localStorage.setItem(PORTFOLIO_CONFIG_KEY, JSON.stringify(merged));
    } catch (e) { /* */ }
}

function getLocalCreds() {
    try {
        const raw = localStorage.getItem('admin-credentials');
        return raw ? JSON.parse(raw) : { username: 'admin', password: 'admin' };
    } catch (e) { return { username: 'admin', password: 'admin' }; }
}

function deepMerge(target, source) {
    const out = Object.assign({}, target);
    if (source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                out[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                out[key] = source[key];
            }
        });
    }
    return out;
}

/* ──────────────────────────────────────────────────────────────
   STATUS
   ────────────────────────────────────────────────────────────── */

function isFirebaseConnected() {
    return _isInitialized && !!_app;
}

/* ──────────────────────────────────────────────────────────────
   EXPORT
   ────────────────────────────────────────────────────────────── */
export {
    initFirebase,
    isFirebaseConnected,
    signIn,
    signOut,
    getCurrentUser,
    onAuthStateChanged,
    getConfig,
    saveConfig,
    uploadFile,
    getFileURL
};
