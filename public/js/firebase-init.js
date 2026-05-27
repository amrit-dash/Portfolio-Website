/**
 * Firebase initialization for Amrit Dash Portfolio
 *
 * HOW TO SET UP:
 * 1. Go to https://console.firebase.google.com/project/amrit-dash-portfolio/settings/general
 * 2. Under "Your apps", find or create a Web App
 * 3. Copy the firebaseConfig values below
 * 4. Enable Firestore, Storage, and Authentication in the Firebase console
 * 5. Set Firestore rules to allow read for all, write for authenticated only
 *
 * FIRESTORE STRUCTURE:
 *   /settings/{doc}  — { defaultTheme, accentColor, accentColorLight, bio, heroTitle }
 *   /hero/{doc}      — { bio, greeting, name, roles[] }
 *   /projects/{doc}  — { title, desc, tags[], links[], imageUrl, order, visible }
 *   /experience/{doc}— { role, company, start, end, desc, tags[], order }
 *   /contact/{doc}   — { email, phone, socials{} }
 *
 * STORAGE STRUCTURE:
 *   /cv/cv-light.pdf
 *   /cv/cv-dark.pdf
 *   /projects/{id}/thumbnail.jpg
 *   /projects/{id}/cover.jpg
 *   /profile/photo.jpg
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ⚠️  REPLACE WITH YOUR FIREBASE PROJECT CONFIG
// Get it from: Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
    apiKey: "REPLACE_WITH_YOUR_API_KEY",
    authDomain: "amrit-dash-portfolio.firebaseapp.com",
    projectId: "amrit-dash-portfolio",
    storageBucket: "amrit-dash-portfolio.appspot.com",
    messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
    appId: "REPLACE_WITH_APP_ID"
};

let app, db, storage, auth;

// Only initialize if config is set (not placeholder)
if (firebaseConfig.apiKey !== "REPLACE_WITH_YOUR_API_KEY") {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
        auth = getAuth(app);
    } catch (e) {
        console.warn('Firebase initialization failed:', e.message);
    }
}

export { app, db, storage, auth, firebaseConfig };
