/* Multimodal — image generation + safe Admin-SDK Storage upload.

   The Admin SDK bypasses storage.rules, so this module re-enforces those
   constraints IN CODE (the only thing standing between a tool call and the
   bucket): a HARD-CODED path prefix (no traversal/absolute paths), magic-byte
   MIME sniffing (never trust a provider's claimed type), and a size cap.

   Image hybrid (FR5):
   - place-only  → no model spend (handled by setProjectImage in tools.js).
   - generate    → provider router (Gemini image model, OpenAI DALL·E) → uploadImage.
   - understand  → parseAttachments (vision-in for chat turns).

   Provider image OUTPUT support (text-only providers cannot generate):
   - gemini  — gemini-2.5-flash-image-preview (default); prompt ≤ 2000 chars.
   - openai  — dall-e-3 (default) or dall-e-2; prompt ≤ 4000 chars; 1024² PNG.
   - anthropic, groq, grok, mistral, openrouter — no image generation API.

   Routing: try Gemini when its key is configured, then OpenAI; clear error if
   neither key is set. Upload cap applies to all providers (MAX_BYTES). */

const crypto = require('crypto');

const GEN_PREFIX = 'public/agent-gen/';        // hard-coded; never derived from input
const UPLOAD_PREFIX = 'public/agent-upload/';  // owner uploads via uploadAsset tool
const ALLOWED_PREFIXES = new Set([GEN_PREFIX, UPLOAD_PREFIX]);
const MAX_BYTES = 15 * 1024 * 1024;            // 15 MB (Storage upload cap)
const ATTACH_MAX_BYTES = 4 * 1024 * 1024;      // ~4 MB per chat attachment
const ATTACH_MAX_COUNT = 4;
const DEFAULT_BUCKET = 'amrit-dash-portfolio.firebasestorage.app';
const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const DEFAULT_OPENAI_IMAGE_MODEL = 'dall-e-3';
const DEFAULT_IMAGE_MODEL = DEFAULT_GEMINI_IMAGE_MODEL;
const PROMPT_LIMIT = { gemini: 2000, openai: 4000 };

/* Providers that can emit raster images from a text prompt. */
const IMAGE_OUTPUT_PROVIDERS = {
  gemini: { defaultModel: DEFAULT_GEMINI_IMAGE_MODEL, label: 'Gemini' },
  openai: { defaultModel: DEFAULT_OPENAI_IMAGE_MODEL, label: 'OpenAI DALL·E' },
};

function sniffPdf(buf) {
  if (!buf || buf.length < 5) return null;
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return { mime: 'application/pdf', ext: 'pdf' };
  }
  return null;
}

function resolveUploadPrefix(prefix) {
  const p = String(prefix || UPLOAD_PREFIX);
  if (!ALLOWED_PREFIXES.has(p)) return UPLOAD_PREFIX;
  return p;
}

/* Identify an image by magic bytes — do NOT trust any caller-declared MIME. */
function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  const b = buf;
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { mime: 'image/gif', ext: 'gif' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: 'image/webp', ext: 'webp' };
  return null;
}

/* Upload a validated image buffer under the pinned prefix. Returns a public URL. */
async function uploadImage({ admin, buffer, bucketName }) {
  let buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  if (buf.length === 0) throw new Error('empty-image');
  if (buf.length > MAX_BYTES) throw new Error('image-too-large');
  const sniff = sniffImage(buf);
  if (!sniff) throw new Error('not-an-image'); // magic-byte check, not the provider's claim

  // Name is hard-coded prefix + random hex + sniffed extension — no caller input
  // reaches the path, so traversal ('..') / absolute paths are impossible.
  const name = GEN_PREFIX + 'gen_' + crypto.randomBytes(10).toString('hex') + '.' + sniff.ext;
  const bucket = admin.storage().bucket(bucketName || DEFAULT_BUCKET);
  const file = bucket.file(name);
  await file.save(buf, {
    contentType: sniff.mime,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000', metadata: { source: 'agent-gen' } },
  });
  await file.makePublic().catch(() => {});
  return { path: name, url: `https://storage.googleapis.com/${bucket.name}/${name}`, mime: sniff.mime };
}

/* Generate an image with a Gemini image model; returns a raw buffer. */
async function geminiGenerateImage({ key, model, prompt }) {
  if (!key) throw new Error('no-gemini-key');
  const m = model || DEFAULT_GEMINI_IMAGE_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: String(prompt || '').slice(0, PROMPT_LIMIT.gemini) }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error((d && d.error && d.error.message) || ('HTTP ' + r.status));
  const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
  const img = parts.find((p) => p.inlineData && p.inlineData.data);
  if (!img) throw new Error('no-image-returned');
  return Buffer.from(img.inlineData.data, 'base64');
}

/* Generate an image with OpenAI Images API (DALL·E); returns a raw buffer. */
async function openaiGenerateImage({ key, model, prompt }) {
  if (!key) throw new Error('no-openai-key');
  const m = model || DEFAULT_OPENAI_IMAGE_MODEL;
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      model: m,
      prompt: String(prompt || '').slice(0, PROMPT_LIMIT.openai),
      n: 1,
      size: m === 'dall-e-2' ? '512x512' : '1024x1024',
      response_format: 'b64_json',
    }),
  });
  const d = await r.json();
  if (!r.ok || d.error) {
    throw new Error((d && d.error && d.error.message) || ('HTTP ' + r.status));
  }
  const b64 = d.data && d.data[0] && d.data[0].b64_json;
  if (!b64) throw new Error('no-image-returned');
  return Buffer.from(b64, 'base64');
}

/* Pick the first configured image-capable provider and generate. */
async function generateImage({ gemini, openai, prompt, prefer }) {
  const text = String(prompt || '').trim();
  if (!text) throw new Error('empty-prompt');

  const order = [];
  if (prefer === 'openai' && openai && openai.key) order.push('openai');
  else if (prefer === 'gemini' && gemini && gemini.key) order.push('gemini');
  if (gemini && gemini.key && !order.includes('gemini')) order.push('gemini');
  if (openai && openai.key && !order.includes('openai')) order.push('openai');

  if (!order.length) {
    throw new Error(
      'No image-generation key configured. Add a Gemini key (Agent settings → Gemini, image model optional) '
      + 'or an OpenAI key (supports dall-e-3). Anthropic/Groq/Grok/Mistral are text-only.'
    );
  }

  const errors = [];
  for (const id of order) {
    const cfg = id === 'gemini' ? gemini : openai;
    try {
      const buffer = id === 'gemini'
        ? await geminiGenerateImage({ key: cfg.key, model: cfg.model, prompt: text })
        : await openaiGenerateImage({ key: cfg.key, model: cfg.model, prompt: text });
      return {
        buffer,
        provider: id,
        model: cfg.model || IMAGE_OUTPUT_PROVIDERS[id].defaultModel,
      };
    } catch (e) {
      errors.push(`${IMAGE_OUTPUT_PROVIDERS[id].label}: ${e.message}`);
    }
  }
  throw new Error(errors.join('; ') || 'image-generation-failed');
}

/* Validate owner-pasted chat attachments: base64 (no data-uri prefix), sniff MIME,
   enforce count + size caps. Returns [{ mime, data, bytes }] for the turn loop. */
function parseAttachments(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) throw new Error('invalid-attachments');
  if (raw.length > ATTACH_MAX_COUNT) throw new Error('too-many-attachments');
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') throw new Error('invalid-attachment');
    let data = String(item.data || '').trim();
    if (!data) throw new Error('empty-attachment');
    const m = data.match(/^data:([^;]+);base64,(.+)$/i);
    if (m) data = m[2];
    let buf;
    try { buf = Buffer.from(data, 'base64'); } catch (e) { throw new Error('invalid-attachment'); }
    if (!buf.length) throw new Error('empty-attachment');
    if (buf.length > ATTACH_MAX_BYTES) throw new Error('attachment-too-large');
    const sniff = sniffImage(buf);
    if (!sniff) throw new Error('not-an-image');
    out.push({ mime: sniff.mime, data, bytes: buf.length });
  }
  return out;
}

/* Upload a validated image or PDF buffer under a pinned prefix. */
async function uploadAsset({ admin, buffer, bucketName, prefix, kind }) {
  let buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  if (buf.length === 0) throw new Error('empty-asset');
  if (buf.length > MAX_BYTES) throw new Error('asset-too-large');

  const sniff = kind === 'pdf' ? sniffPdf(buf) : (sniffImage(buf) || sniffPdf(buf));
  if (!sniff) throw new Error('unsupported-asset-type');

  const base = resolveUploadPrefix(prefix);
  const name = base + 'up_' + crypto.randomBytes(10).toString('hex') + '.' + sniff.ext;
  const bucket = admin.storage().bucket(bucketName || DEFAULT_BUCKET);
  const file = bucket.file(name);
  await file.save(buf, {
    contentType: sniff.mime,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000', metadata: { source: 'agent-upload' } },
  });
  await file.makePublic().catch(() => {});
  return { path: name, url: `https://storage.googleapis.com/${bucket.name}/${name}`, mime: sniff.mime };
}

function decodeBase64Asset(data) {
  let raw = String(data || '').trim();
  const m = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (m) raw = m[2];
  try { return Buffer.from(raw, 'base64'); }
  catch (e) { throw new Error('invalid-base64'); }
}

module.exports = {
  GEN_PREFIX,
  UPLOAD_PREFIX,
  ALLOWED_PREFIXES,
  MAX_BYTES,
  ATTACH_MAX_BYTES,
  ATTACH_MAX_COUNT,
  DEFAULT_BUCKET,
  DEFAULT_GEMINI_IMAGE_MODEL,
  DEFAULT_OPENAI_IMAGE_MODEL,
  DEFAULT_IMAGE_MODEL,
  PROMPT_LIMIT,
  IMAGE_OUTPUT_PROVIDERS,
  sniffImage,
  sniffPdf,
  decodeBase64Asset,
  parseAttachments,
  uploadImage,
  uploadAsset,
  geminiGenerateImage,
  openaiGenerateImage,
  generateImage,
};
