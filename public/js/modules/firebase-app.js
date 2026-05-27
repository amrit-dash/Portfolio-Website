// Optional Firebase bootstrap. The app must work as a static site even when
// the Firebase project hasn't been configured. We lazy-load the SDK only when
// a config object is present on `window.__FIREBASE_CONFIG__`. The config can
// also be supplied via a `<script src="firebase-config.js"></script>` tag
// (see firebase-config.example.js) so secrets stay out of source control.

const FIREBASE_VERSION = '10.13.2';
const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

let _readyPromise = null;
let _services = null;

export function hasFirebaseConfig() {
    return !!(window.__FIREBASE_CONFIG__ && window.__FIREBASE_CONFIG__.apiKey);
}

export function getFirebase() {
    if (_services) return Promise.resolve(_services);
    if (_readyPromise) return _readyPromise;

    if (!hasFirebaseConfig()) {
        return Promise.resolve(null);
    }

    _readyPromise = (async () => {
        try {
            const [{ initializeApp, getApps, getApp }, fs, st, au] = await Promise.all([
                import(/* @vite-ignore */ `${CDN}/firebase-app.js`),
                import(/* @vite-ignore */ `${CDN}/firebase-firestore.js`),
                import(/* @vite-ignore */ `${CDN}/firebase-storage.js`),
                import(/* @vite-ignore */ `${CDN}/firebase-auth.js`),
            ]);

            const app = getApps().length ? getApp() : initializeApp(window.__FIREBASE_CONFIG__);
            _services = {
                app,
                firestore: fs.getFirestore(app),
                storage: st.getStorage(app),
                auth: au.getAuth(app),
                _fs: fs,
                _st: st,
                _au: au,
            };
            return _services;
        } catch (err) {
            console.warn('[firebase] init failed, falling back to static content:', err);
            return null;
        }
    })();
    return _readyPromise;
}
