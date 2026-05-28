// Central data store for the portfolio.
// Loads /data/portfolio.json, then applies any overrides saved in
// localStorage by the admin dashboard. Exposes a tiny pub/sub so the
// admin can re-render the site (and itself) on save.
//
// Firebase note: when Firebase Storage/Firestore is wired in, the
// overlay can be replaced by a Firestore document subscription — the
// rest of the rendering pipeline does not need to change.

const LS_DATA_KEY = "amritos.portfolio.v2";
const LS_PREFS_KEY = "amritos.prefs.v2";

const DEEP_MERGE_ARRAY_REPLACE_KEYS = new Set([
  "experience",
  "education",
  "projects",
  "certifications",
  "achievements",
  "interests",
  "tests",
  "metrics",
  "lines",
  "highlights",
  "tags",
  "links",
  "facts",
  "items",
  "groups",
  "accentOptions",
]);

function deepMerge(base, overlay, path = "") {
  if (overlay === null || overlay === undefined) return base;
  if (Array.isArray(base) || Array.isArray(overlay)) {
    return overlay !== undefined ? overlay : base;
  }
  if (typeof base !== "object" || typeof overlay !== "object") {
    return overlay;
  }
  const out = { ...base };
  for (const key of Object.keys(overlay)) {
    const childPath = path ? `${path}.${key}` : key;
    if (DEEP_MERGE_ARRAY_REPLACE_KEYS.has(key)) {
      out[key] = overlay[key];
    } else {
      out[key] = deepMerge(base[key], overlay[key], childPath);
    }
  }
  return out;
}

const subscribers = new Set();

export const Store = {
  data: null,
  defaults: null,

  async load() {
    const res = await fetch("data/portfolio.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load portfolio.json");
    this.defaults = await res.json();
    const overlay = this._readOverlay();
    this.data = deepMerge(this.defaults, overlay);
    return this.data;
  },

  _readOverlay() {
    try {
      const raw = localStorage.getItem(LS_DATA_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  },

  saveOverlay(overlay) {
    localStorage.setItem(LS_DATA_KEY, JSON.stringify(overlay));
    this.data = deepMerge(this.defaults, overlay);
    subscribers.forEach((fn) => fn(this.data));
  },

  resetOverlay() {
    localStorage.removeItem(LS_DATA_KEY);
    this.data = JSON.parse(JSON.stringify(this.defaults));
    subscribers.forEach((fn) => fn(this.data));
  },

  getOverlay() {
    return this._readOverlay();
  },

  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
};

// Lightweight user-preferences store (theme mode, accent, cursor, etc.)
// These are also editable from the admin panel and persist across reloads.
export const Prefs = {
  defaults: {
    mode: "dark",
    accent: null,
    customCursor: null,
    animatedBackground: null,
    scrollAnimations: null,
  },

  read() {
    try {
      const raw = localStorage.getItem(LS_PREFS_KEY);
      return { ...this.defaults, ...(raw ? JSON.parse(raw) : {}) };
    } catch (_) {
      return { ...this.defaults };
    }
  },

  write(patch) {
    const next = { ...this.read(), ...patch };
    localStorage.setItem(LS_PREFS_KEY, JSON.stringify(next));
    return next;
  },

  reset() {
    localStorage.removeItem(LS_PREFS_KEY);
  },
};

export const Keys = { LS_DATA_KEY, LS_PREFS_KEY };
