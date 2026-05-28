const SESSION_KEY = "portfolio-admin-session";
const DEFAULT_USER = "admin";
const DEFAULT_PASS = "admin";

export function isAuthenticated() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function login(username, password) {
  if (username === DEFAULT_USER && password === DEFAULT_PASS) {
    sessionStorage.setItem(SESSION_KEY, "true");
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function tryFirebaseLogin(email, password) {
  try {
    const { initFirebase, getAuthRef, isFirebaseConfigured } = await import("../../js/core/firebase.js");
    if (!isFirebaseConfigured()) return false;
    await initFirebase();
    const { signInWithEmailAndPassword } = await import(
      "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"
    );
    await signInWithEmailAndPassword(getAuthRef(), email, password);
    sessionStorage.setItem(SESSION_KEY, "true");
    return true;
  } catch {
    return false;
  }
}
