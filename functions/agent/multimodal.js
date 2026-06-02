/* Multimodal — image generation + safe Admin-SDK Storage upload.

   The Admin SDK bypasses storage.rules, so this module re-enforces those
   constraints IN CODE (the only thing standing between a tool call and the
   bucket): a HARD-CODED path prefix (no traversal/absolute paths), magic-byte
   MIME sniffing (never trust a provider's claimed type), and a size cap.

   Image hybrid (FR5):
   - place-only  → no model spend (handled by setProjectImage in tools.js).
   - generate    → geminiGenerateImage (Gemini image model) → uploadImage.
   - understand  → (vision-in) deferred; needs attachment plumbing + drop UI. */

const crypto = require('crypto');

const GEN_PREFIX = 'public/agent-gen/';        // hard-coded; never derived from input
const MAX_BYTES = 15 * 1024 * 1024;            // 15 MB
const DEFAULT_BUCKET = 'amrit-dash-portfolio.firebasestorage.app';
const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image-preview';

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
  const m = model || DEFAULT_IMAGE_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: String(prompt || '').slice(0, 2000) }] }],
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

module.exports = {
  GEN_PREFIX,
  MAX_BYTES,
  DEFAULT_BUCKET,
  DEFAULT_IMAGE_MODEL,
  sniffImage,
  uploadImage,
  geminiGenerateImage,
};
