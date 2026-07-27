/* Production bundler: splits public/ into two deploy folders AND compiles
   the JSX ahead of time so the browser never ships Babel-standalone.

     dist/site  → public portfolio (NO admin code on the public site)
     dist/admin → admin console (admin.html becomes index.html)

   What changed vs. the old copy-only build:
     • Every *.jsx is compiled to minified *.js with esbuild at build time
       (classic React.createElement runtime — React stays a global).
     • The deployed index.html drops the ~3 MB @babel/standalone script and
       switches React/ReactDOM from the development to the production builds.
   The result: the boot splash paints as soon as the (now tiny) scripts load,
   instead of waiting for Babel to download and compile ~200 KB of JSX in the
   browser on every visit.

   public/ is left untouched — it stays the authoring source and still runs via
   in-browser Babel during `npm run dev`, so the edit loop needs no rebuild.

   Run via `npm run build` before deploying. */
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync, unlinkSync, renameSync } from 'node:fs';
import { join, extname, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { transformSync } from 'esbuild';

const root = process.cwd();
const pub = join(root, 'public');
const dist = join(root, 'dist');
const site = join(dist, 'site');
const admin = join(dist, 'admin');

rmSync(dist, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
mkdirSync(admin, { recursive: true });

const cp = (rel, destDir, destName) => {
  const src = join(pub, rel);
  if (!existsSync(src)) { console.warn('skip (missing):', rel); return; }
  cpSync(src, join(destDir, destName || rel), { recursive: true });
};

// ---- Public portfolio (dist/site) ----
// data.jsx + firebase-* are shared between both targets.
const shared = ['data.jsx', 'firebase-config.js', 'firebase-init.js'];
[
  'index.html', 'app.jsx', 'md.jsx', 'tweaks-panel.jsx', 'styles.css', 'shared-schema.js', 'assets',
  'google328d5e92062bd713.html',
  // Crawler / agent surface. These MUST be real files: Firebase Hosting matches
  // static files before rewrites, so shipping them is what stops the SPA
  // catch-all from answering /robots.txt with the HTML shell at HTTP 200.
  'robots.txt', 'sitemap.xml', 'llms.txt',
  // Served with a real 404 status for unmatched paths once the `**` rewrite is
  // gone from the amritdash hosting target (see firebase.json).
  '404.html',
  ...shared,
].forEach((f) => cp(f, site));

// ---- Admin console (dist/admin) ----
cp('admin.html', admin, 'index.html');   // admin entry → index.html
cp('admin', admin, 'admin');             // admin/*.jsx + admin.css
cp('md.jsx', admin);                     // shared markdown renderer (plain script, not text/babel)
cp('shared-schema.js', admin);           // plain-JS global used by the agent UI
cp('google328d5e92062bd713.html', admin); // Google Search Console ownership verification
shared.forEach((f) => cp(f, admin));

// The admin console is private. It already sends X-Robots-Tag: noindex, nofollow
// (firebase.json), but without a real robots.txt the SPA rewrite answers that
// path with HTML, which crawlers log as a malformed robots file.
writeFileSync(join(admin, 'robots.txt'), [
  '# Private admin console — not for indexing.',
  'User-agent: *',
  'Disallow: /',
  '',
].join('\n'));

// ---- Keep the backend's shared-schema copy in lockstep with the source ----
// public/shared-schema.js is authoritative (client + agent validators). The
// functions/ folder ships its OWN copy so the deployed Cloud Functions don't
// reach outside their root, but it must never drift from the source — mirror it
// on every build so server enums/validators always match the client.
const fnSchema = join(root, 'functions', 'shared-schema.js');
if (existsSync(join(pub, 'shared-schema.js'))) {
  cpSync(join(pub, 'shared-schema.js'), fnSchema);
  console.log('✓ synced functions/shared-schema.js ← public/shared-schema.js');
}

// ---------------------------------------------------------------------------
// 1. Compile every *.jsx in dist → minified *.js (classic React global runtime)
//    and remove the original .jsx so only compiled output ships.
// ---------------------------------------------------------------------------
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (extname(full) !== '.jsx') continue;
    const code = readFileSync(full, 'utf8');
    const out = transformSync(code, {
      loader: 'jsx',
      jsx: 'transform',                 // classic runtime → React.createElement
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      // IIFE-wrap each file so top-level `const`/`let` (e.g. `const { useState }
      // = React`, declared in several files) stay function-scoped. Plain classic
      // scripts share ONE global lexical scope, so without this the second file
      // to declare `useState` throws "already declared". Babel-standalone
      // isolated each script the same way. Cross-file sharing still works — it
      // goes through explicit `window.*` assignments, not lexical bindings.
      format: 'iife',
      minify: true,
      target: 'es2018',
      charset: 'utf8',                  // keep box-drawing / emoji literal, not \uXXXX
      sourcefile: entry,
    });
    writeFileSync(full.replace(/\.jsx$/, '.js'), out.code);
    unlinkSync(full);
  }
}
walk(dist);

// ---------------------------------------------------------------------------
// 2. Rewrite the deployed HTML: drop Babel, use production React, point the
//    former text/babel scripts at their compiled .js siblings.
//    Both entry points share the exact same React+Babel block and script-tag
//    shape, so one transform handles both.
// ---------------------------------------------------------------------------
function productionizeHtml(file) {
  if (!existsSync(file)) return;
  let html = readFileSync(file, 'utf8');

  // React/ReactDOM dev → prod builds. The dev SRI hashes don't match the prod
  // files, so strip integrity from those two tags (crossorigin is kept).
  html = html
    .replace('react.development.js', 'react.production.min.js')
    .replace('react-dom.development.js', 'react-dom.production.min.js')
    .replace(/(\bsrc="https:\/\/unpkg\.com\/react(?:-dom)?@[^"]+")\s+integrity="[^"]*"/g, '$1');

  // Remove the @babel/standalone script entirely — no longer needed.
  html = html.replace(/\n?[^\n]*@babel\/standalone[^\n]*\n?/g, '\n');

  // text/babel JSX scripts → plain deferred scripts pointing at the compiled .js.
  // defer matters here: as plain classic scripts these would be parser-blocking,
  // and they sit at the bottom of a chain that already includes React and the
  // Firebase compat bundles. defer preserves relative execution order, which is
  // what data → md → tweaks → app depends on.
  html = html.replace(
    /<script\s+type="text\/babel"\s+data-presets="[^"]*"\s+src="([^"]+)\.jsx"><\/script>/g,
    '<script defer src="$1.js"></script>'
  );

  // Plain md.jsx script (shared markdown helper — compiled by walk(), not text/babel).
  html = html.replace(/<script\s+src="md\.jsx"><\/script>/g, '<script defer src="md.js"></script>');

  // Strip HTML comments. The source files carry a lot of explanatory prose
  // (why the static shell exists, why the font link is split, and so on) and
  // none of it should ship: it inflates every response, and naive text
  // extractors — the very agents the static shell is there to serve — happily
  // read build notes as page content. Guarded: bail if any <script>/<style>
  // body contains a comment marker, since a blind strip would corrupt it.
  const embedded = html.match(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g) || [];
  if (!embedded.some((b) => b.includes('<!--'))) {
    html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*\n\s*\n+/g, '\n\n');
  } else {
    console.warn('  comment strip skipped: a <script>/<style> block contains "<!--"');
  }

  writeFileSync(file, html);
}
productionizeHtml(join(site, 'index.html'));
productionizeHtml(join(admin, 'index.html'));

// ---------------------------------------------------------------------------
// 3. Minify the hand-written plain-JS files. walk() only touched *.jsx, so
//    these shipped as authored — shared-schema.js alone was ~111 KB of source
//    and it is a render-blocking <script> in <head> (the first-paint cosmetics
//    block below it needs SHARED_SCHEMA synchronously).
//
//    Transform mode, not bundle mode: esbuild treats top-level scope as global
//    here, so `window.SHARED_SCHEMA = ...` and the other cross-file globals keep
//    their names. Only function-local identifiers get mangled.
// ---------------------------------------------------------------------------
const PLAIN_JS = ['shared-schema.js', 'firebase-config.js', 'firebase-init.js'];
for (const dir of [site, admin]) {
  for (const name of PLAIN_JS) {
    const f = join(dir, name);
    if (!existsSync(f)) continue;
    const src = readFileSync(f, 'utf8');
    const out = transformSync(src, { loader: 'js', minify: true, target: 'es2018', charset: 'utf8', sourcefile: name });
    writeFileSync(f, out.code);
  }
}

// Same for the stylesheets. styles.css is the last render-blocking resource on
// the site (~300 ms on throttled mobile) and shipped as authored.
for (const [dir, name] of [[site, 'styles.css'], [admin, join('admin', 'admin.css')]]) {
  const f = join(dir, name);
  if (!existsSync(f)) continue;
  const src = readFileSync(f, 'utf8');
  const out = transformSync(src, { loader: 'css', minify: true, charset: 'utf8', sourcefile: name });
  writeFileSync(f, out.code);
}

// ---------------------------------------------------------------------------
// 4. Content-hash every local .js/.css the HTML references, then rewrite the
//    references. This is what makes the immutable Cache-Control in
//    firebase.json safe: the URL changes whenever the bytes change, so a
//    year-long TTL can never serve a visitor stale code.
//
//    Safe to do purely from the HTML: nothing fetches these by name at runtime
//    (no dynamic import, no fetch of own assets) — every reference lives in
//    index.html.
// ---------------------------------------------------------------------------
function hashAssets(dir) {
  const htmlFile = join(dir, 'index.html');
  if (!existsSync(htmlFile)) return;
  let html = readFileSync(htmlFile, 'utf8');

  // Relative refs only — leave gstatic/unpkg/fonts.googleapis alone.
  const refs = [...html.matchAll(/(?:src|href)="((?!https?:|\/\/|data:|\/)[^"]+\.(?:js|css))"/g)]
    .map((m) => m[1]);

  for (const ref of [...new Set(refs)]) {
    const abs = join(dir, ref);
    if (!existsSync(abs)) { console.warn('  hash skip (missing):', ref); continue; }
    const hash = createHash('sha256').update(readFileSync(abs)).digest('hex').slice(0, 8);
    const ext = extname(ref);
    const hashed = join(dirname(ref), `${basename(ref, ext)}.${hash}${ext}`);
    renameSync(abs, join(dir, hashed));
    html = html.split(`"${ref}"`).join(`"${hashed}"`);
  }

  writeFileSync(htmlFile, html);

  // Fail loudly rather than deploy an unhashed asset under an immutable TTL.
  const leftover = [...html.matchAll(/(?:src|href)="((?!https?:|\/\/|data:|\/)[^"]+\.(?:js|css))"/g)]
    .map((m) => m[1])
    .filter((r) => !/\.[0-9a-f]{8}\.(?:js|css)$/.test(r));
  if (leftover.length) {
    throw new Error(`unhashed local assets still referenced in ${htmlFile}: ${leftover.join(', ')}`);
  }
  console.log(`✓ content-hashed ${new Set(refs).size} asset(s) in ${dir.replace(root + '/', '')}`);
}
hashAssets(site);
hashAssets(admin);

console.log('✓ built dist/site (portfolio) and dist/admin (console) — JSX precompiled, Babel removed, production React');
