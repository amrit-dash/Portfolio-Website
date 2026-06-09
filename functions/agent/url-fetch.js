/* Owner-only URL fetch — SSRF-safe, size + timeout capped. Used by capability
   probes and the fetchUrl agent tool. */

const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 10_000;
const DEFAULT_MAX_CHARS = 8000;

function isPrivateHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost') return true;
  if (h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === '0.0.0.0') return true;
  // IPv4 literals
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = v4.slice(1).map(Number);
    if (a[0] === 10) return true;
    if (a[0] === 127) return true;
    if (a[0] === 169 && a[1] === 254) return true;
    if (a[0] === 172 && a[1] >= 16 && a[1] <= 31) return true;
    if (a[0] === 192 && a[1] === 168) return true;
    if (a[0] === 0) return true;
    return false;
  }
  // IPv6 loopback / link-local / unique-local
  if (h === '::1' || h === '::') return true;
  if (h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
  return false;
}

function normalizeProbeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'https://example.com';
  let u;
  try { u = new URL(s); } catch (e) { throw new Error('invalid-url'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('unsupported-protocol');
  if (isPrivateHost(u.hostname)) throw new Error('blocked-host');
  return u.toString();
}

function htmlToText(html) {
  let s = String(html || '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/gi, ' ');
  s = s.replace(/&amp;/gi, '&');
  s = s.replace(/&lt;/gi, '<');
  s = s.replace(/&gt;/gi, '>');
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function pickMarker(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const m = t.match(/[A-Za-z][A-Za-z0-9][A-Za-z0-9 .,'-]{4,60}/);
  return m ? m[0].trim().slice(0, 48) : t.slice(0, 32);
}

async function fetchUrlText(url, opts = {}) {
  const target = normalizeProbeUrl(url);
  const maxBytes = opts.maxBytes || MAX_BYTES;
  const maxChars = opts.maxChars || DEFAULT_MAX_CHARS;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || TIMEOUT_MS);
  let r;
  try {
    r = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: 'text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'amritos-agent-url-fetch/1.0',
      },
    });
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) throw new Error(`fetch-http-${r.status}`);
  const ctype = (r.headers.get('content-type') || '').toLowerCase();
  if (ctype.includes('image/') || ctype.includes('application/octet-stream')) {
    throw new Error('unsupported-content-type');
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > maxBytes) throw new Error('response-too-large');
  const raw = buf.toString('utf8');
  const text = htmlToText(raw);
  if (!text) throw new Error('empty-content');
  const excerpt = text.slice(0, maxChars);
  const marker = pickMarker(excerpt);
  if (!marker) throw new Error('no-marker');
  return { url: target, excerpt, marker, bytes: buf.length, chars: excerpt.length };
}

module.exports = {
  MAX_BYTES,
  TIMEOUT_MS,
  DEFAULT_MAX_CHARS,
  normalizeProbeUrl,
  htmlToText,
  pickMarker,
  fetchUrlText,
  isPrivateHost,
};
