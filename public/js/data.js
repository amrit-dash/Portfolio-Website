// Loads portfolio.json and merges in any localStorage overrides
// (so the admin dashboard can preview content changes without a backend).

const STORAGE_KEY = 'amritdash:portfolio:overrides';

export function getOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setOverrides(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}));
}

export function clearOverrides() {
  localStorage.removeItem(STORAGE_KEY);
}

// Deep merge: target's keys win unless source has the key.
// Arrays are replaced wholesale (we treat them as atomic).
export function deepMerge(base, over) {
  if (Array.isArray(over)) return over.slice();
  if (over === null || typeof over !== 'object') return over === undefined ? base : over;
  const out = Array.isArray(base) ? base.slice() : { ...(base || {}) };
  for (const k of Object.keys(over)) {
    out[k] = deepMerge(base ? base[k] : undefined, over[k]);
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
