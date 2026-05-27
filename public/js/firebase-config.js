/**
 * Firebase Web SDK configuration for amrit-dash-portfolio.
 * Replace values from Firebase Console → Project settings → Your apps → Web app.
 * These keys are safe to expose in client apps; security is enforced via rules.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDummyReplaceFromConsole",
  authDomain: "amrit-dash-portfolio.firebaseapp.com",
  projectId: "amrit-dash-portfolio",
  storageBucket: "amrit-dash-portfolio.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

export const FIRESTORE_PATHS = {
  content: "portfolio/content",
  settings: "portfolio/settings"
};

export const STORAGE_PATHS = {
  cvLight: "cv/cv-light.pdf",
  cvDark: "cv/cv-dark.pdf",
  projectThumb: (id) => `portfolio/projects/${id}/thumb.jpg`,
  projectHero: (id) => `portfolio/projects/${id}/hero.jpg`
};

/** Thumbnail and hero image dimensions for project cards */
export const IMAGE_SPECS = {
  thumb: { width: 600, height: 450, label: "Thumbnail (4:3)" },
  hero: { width: 1200, height: 800, label: "Detail image (3:2)" }
};
