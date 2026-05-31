/* Firebase web SDK config for amrit.os.
   NOTE: these values are public by design — the apiKey identifies the project,
   it is NOT a secret. Real security is enforced by Firestore/Storage rules and
   Firebase Auth (see firestore.rules / storage.rules). Safe to commit + ship.

   Functions base URL is region-specific; update if the Functions region changes
   (see setGlobalOptions in functions/index.js). */
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDkyWhjzZbfj4JEZTLRKDNtHInX5kwAhck',
  authDomain: 'amrit-dash-portfolio.firebaseapp.com',
  projectId: 'amrit-dash-portfolio',
  storageBucket: 'amrit-dash-portfolio.firebasestorage.app',
  messagingSenderId: '685743056177',
  appId: '1:685743056177:web:d371bcd3b8a63b62bbbc10',
};
window.FUNCTIONS_BASE = 'https://asia-south1-amrit-dash-portfolio.cloudfunctions.net';
// Public portfolio origin — used by the admin's live-preview iframe when admin
// is served from its own domain (amritos-admin.web.app). On localhost the admin
// + portfolio share an origin, so the iframe uses a relative path instead.
window.PORTFOLIO_URL = 'https://amritdash.web.app';
