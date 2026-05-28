const DEFAULT_DATA_URL = "/data/site-default.json";
const LOCAL_OVERRIDE_KEY = "portfolio-site-override";

export async function loadSiteData() {
  const local = readLocalOverride();
  if (local) return local;

  const remote = await loadFromFirebase();
  if (remote) return remote;

  const res = await fetch(DEFAULT_DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load site data");
  return res.json();
}

function readLocalOverride() {
  try {
    const raw = localStorage.getItem(LOCAL_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalOverride(data) {
  localStorage.setItem(LOCAL_OVERRIDE_KEY, JSON.stringify(data));
}

export function clearLocalOverride() {
  localStorage.removeItem(LOCAL_OVERRIDE_KEY);
}

async function loadFromFirebase() {
  try {
    const { isFirebaseConfigured, getDatabaseRef } = await import("./firebase.js");
    if (!isFirebaseConfigured()) return null;
    const { get, ref } = await import(
      "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js"
    );
    const db = getDatabaseRef();
    if (!db) return null;
    const snap = await get(ref(db, "site"));
    if (!snap.exists()) return null;
    return snap.val();
  } catch {
    return null;
  }
}
