/* Image audit + optimizer for the live portfolio.

   Why this exists: the images are the single heaviest thing on the site.
   A Lighthouse run against production found 2,412 KiB of images, led by a
   988 KiB about-photo.jpg and a 670 KiB PNG hotlinked from raw.githubusercontent
   — all served at full resolution into boxes a fraction of their size.

   What it does:
     1. Loads the live site in headless Chromium, waits for the Firestore-backed
        content to render, and collects every <img> with its natural size, its
        rendered CSS size and its transfer size.
     2. Re-encodes each one to WebP at a sensible cap for the box it actually
        renders into (3x the CSS size, so retina still looks right). The encode
        runs inside the Playwright Chromium that is already open, via canvas
        toDataURL('image/webp') — so there is no extra npm dependency and no
        ImageMagick/cwebp to install. (macOS `sips` advertises WebP but the
        support is read-only: writing one fails with "Can't write format".)
     3. Writes the results to tmp/optimized-images/ and prints a before/after
        table.

   What it deliberately does NOT do: touch Firebase Storage or Firestore.
   Nothing here overwrites a production asset or rewrites a content document.
   Upload the optimized files through the admin console's existing image
   picker (public/admin/crop.jsx) so Firestore stays the source of truth.

   Usage:
     node scripts/optimize-images.mjs                    # audit + optimize live site
     node scripts/optimize-images.mjs --url <site-url>
     node scripts/optimize-images.mjs --audit-only
*/
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const SITE = flag('--url', 'https://amritdash.web.app/');
const AUDIT_ONLY = args.includes('--audit-only');
const OUT = join(process.cwd(), 'tmp', 'optimized-images');

// Retina headroom: a 68x54 thumbnail still wants ~204px of source on a 3x
// screen, but it never wants 1024px.
const DPR_CAP = 3;
// Nothing on this site renders wider than the project modal.
const ABSOLUTE_MAX = 1600;
const WEBP_QUALITY = 82;

function kib(n) { return Math.round(n / 1024) + ' KiB'; }

const browser = await chromium.launch();

async function collect() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const transfer = new Map();
  page.on('response', async (res) => {
    if (!/image/.test(res.headers()['content-type'] || '')) return;
    const len = Number(res.headers()['content-length'] || 0);
    if (len) transfer.set(res.url(), len);
  });

  await page.goto(SITE, { waitUntil: 'domcontentloaded' });
  // The boot splash runs ~3.8 s before the desktop is revealed, and content
  // arrives from Firestore behind it. Wait it out, then scroll so lazy images
  // (which is now most of them) actually resolve.
  await page.waitForTimeout(9000);
  await page.evaluate(async () => {
    const root = document.querySelector('.os-root') || document.scrollingElement;
    for (let i = 0; i < 24; i++) {
      root.scrollTop = root.scrollHeight * (i / 24);
      await new Promise((r) => setTimeout(r, 180));
    }
  });
  await page.waitForTimeout(2500);

  const measure = () => page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((el) => el.currentSrc && /^https?:/.test(el.currentSrc))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          url: el.currentSrc,
          naturalWidth: el.naturalWidth,
          naturalHeight: el.naturalHeight,
          cssWidth: Math.round(r.width) || el.width || 0,
          cssHeight: Math.round(r.height) || el.height || 0,
          alt: el.alt || '',
        };
      })
  );

  const imgs = await measure();

  // A project thumbnail renders at 68x54 in the folder grid but the same file
  // is usually what the project modal blows up to several hundred px wide
  // (app.jsx uses `project.gallery || project.image`). Sizing off the folder
  // grid alone would cap those files far too low and ship a blurry modal, so
  // open each project in turn and re-measure.
  const cards = await page.locator('.folder-icon').count();
  for (let i = 0; i < cards; i++) {
    try {
      await page.locator('.folder-icon').nth(i).click({ timeout: 3000 });
      // The modal mounts before its image has decoded; measuring too early
      // reports 0x0 and the cap silently falls back to the folder-grid size.
      await page.waitForFunction(() => {
        const el = document.querySelector('.project-modal__art img');
        return el && el.currentSrc && el.getBoundingClientRect().width > 0;
      }, undefined, { timeout: 8000 });
      imgs.push(...(await measure()));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    } catch {
      // External-link projects navigate instead of opening a modal; skip them.
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  await page.close();

  // De-dupe by URL, keeping the largest rendered box (the modal view of a
  // project image needs more pixels than its folder thumbnail).
  const byUrl = new Map();
  for (const i of imgs) {
    const prev = byUrl.get(i.url);
    if (!prev || i.cssWidth > prev.cssWidth) byUrl.set(i.url, i);
  }
  return [...byUrl.values()].map((i) => ({ ...i, transferSize: transfer.get(i.url) || 0 }));
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

/* Decode + downscale + WebP-encode inside Chromium. The page is served from
   about:blank and the bytes are handed over as a data: URL, so this never
   re-fetches from the network and never depends on the image host's CORS
   headers. */
async function toWebp(bytes, mime, maxWidth, quality) {
  const page = await browser.newPage();
  try {
    const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;
    const out = await page.evaluate(async ({ dataUrl, maxWidth, quality }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/webp', quality);
      if (!url.startsWith('data:image/webp')) throw new Error('chromium refused to encode webp');
      return { b64: url.slice(url.indexOf(',') + 1), w: canvas.width, h: canvas.height };
    }, { dataUrl, maxWidth, quality });
    return { buf: Buffer.from(out.b64, 'base64'), width: out.w, height: out.h };
  } finally {
    await page.close();
  }
}

const images = await collect();
if (!images.length) {
  console.error('No images found — did the page render? Try --url with a running local build.');
  process.exit(1);
}

images.sort((a, b) => b.transferSize - a.transferSize);

console.log(`\nFound ${images.length} image(s) on ${SITE}\n`);
console.log('  transfer   natural      rendered   url');
for (const i of images) {
  console.log(
    `  ${String(kib(i.transferSize)).padStart(9)}  ${String(i.naturalWidth + 'x' + i.naturalHeight).padStart(10)}` +
    `  ${String(i.cssWidth + 'x' + i.cssHeight).padStart(10)}   ${decodeURIComponent(i.url).replace(/\?.*/, '').slice(-64)}`
  );
}

if (AUDIT_ONLY) { await browser.close(); process.exit(0); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let before = 0;
let after = 0;
const rows = [];

for (const [n, img] of images.entries()) {
  const clean = decodeURIComponent(img.url).replace(/\?.*/, '');
  const base = (clean.split('/').pop() || `image-${n}`).replace(/\.[^.]+$/, '');
  const srcExt = (clean.match(/\.([a-z0-9]+)$/i) || [, 'jpg'])[1].toLowerCase();
  // SVGs are already vector — rasterising them to WebP would be a downgrade.
  if (srcExt === 'svg') continue;

  const mime = srcExt === 'png' ? 'image/png' : srcExt === 'gif' ? 'image/gif' : 'image/jpeg';
  const cap = Math.min(ABSOLUTE_MAX, Math.max(img.cssWidth * DPR_CAP, 320) || ABSOLUTE_MAX);

  let src;
  let out;
  try {
    src = await download(img.url);
    out = await toWebp(src, mime, cap, WEBP_QUALITY / 100);
  } catch (e) {
    console.warn(`  ! skipped ${base}: ${e.message}`);
    continue;
  }

  // Width-suffixed: the same source file legitimately appears twice (a project
  // image is both a 68px folder thumbnail and a full-width modal gallery
  // shot), and a bare basename would have one silently overwrite the other.
  const name = `${base}-${out.width}w.webp`;
  writeFileSync(join(OUT, name), out.buf);
  before += src.length;
  after += out.buf.length;
  rows.push({ file: name, a: src.length, b: out.buf.length, dims: `${out.width}x${out.height}`, url: clean });
}

await browser.close();

console.log(`\nRe-encoded ${rows.length} image(s) -> ${OUT}\n`);
console.log('  before      after     saved   new size     name');
for (const r of rows) {
  console.log(
    `  ${String(kib(r.a)).padStart(9)}  ${String(kib(r.b)).padStart(9)}  ${String(Math.round((1 - r.b / r.a) * 100) + '%').padStart(6)}` +
    `  ${String(r.dims).padStart(10)}     ${r.file}`
  );
}
if (before) {
  console.log(`\n  TOTAL  ${kib(before)} -> ${kib(after)}  (${Math.round((1 - after / before) * 100)}% smaller)`);
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify(rows, null, 2) + '\n');
console.log('\nNothing was uploaded. Replace the originals through the admin console\'s');
console.log('image picker so Firestore keeps pointing at the right objects.');
console.log(`Source URL for each file is in ${join(OUT, 'report.json')}.\n`);
