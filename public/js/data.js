// Loads portfolio.json and merges in any localStorage overrides
// (so the admin dashboard can preview content changes without a backend).

const STORAGE_KEY = 'amritdash:portfolio:overrides';

export function getOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function setOverrides(obj) {
  if (obj === undefined || obj === null || (typeof obj === 'object' && Object.keys(obj).length === 0)) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }
}

export function clearOverrides() {
  localStorage.removeItem(STORAGE_KEY);
}

// Recursively clone any value. Used to keep base and working data independent
// even when the override object has no key for a branch.
export function deepClone(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(deepClone);
  const out = {};
  for (const k of Object.keys(v)) out[k] = deepClone(v[k]);
  return out;
}

// Deep merge: target's keys win unless source has the key.
// Arrays are replaced wholesale (we treat them as atomic).
// Always returns a fully independent (deep-cloned) result so callers can
// safely mutate the output without leaking back into either input.
export function deepMerge(base, over) {
  if (Array.isArray(over)) return over.map(deepClone);
  if (over === null || typeof over !== 'object') {
    return over === undefined ? deepClone(base) : over;
  }
  const out = {};
  const baseObj = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
  const baseKeys = Object.keys(baseObj);
  for (const k of baseKeys) {
    if (!(k in over)) out[k] = deepClone(baseObj[k]);
  }
  for (const k of Object.keys(over)) {
    out[k] = deepMerge(baseObj[k], over[k]);
  }
  return out;
}

export async function loadPortfolio() {
  const res = await fetch('data/portfolio.json', { cache: 'no-store' });
  const base = await res.json();
  const overrides = getOverrides();
  return deepMerge(base, overrides);
}

// Tiny "get nested key by dotted path"
export function get(obj, path) {
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj);
}
