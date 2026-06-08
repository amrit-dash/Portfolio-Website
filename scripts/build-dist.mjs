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
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';
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
['index.html', 'app.jsx', 'md.jsx', 'tweaks-panel.jsx', 'styles.css', 'assets', ...shared].forEach((f) => cp(f, site));

// ---- Admin console (dist/admin) ----
cp('admin.html', admin, 'index.html');   // admin entry → index.html
cp('admin', admin, 'admin');             // admin/*.jsx + admin.css
cp('md.jsx', admin);                     // shared markdown renderer (plain script, not text/babel)
cp('shared-schema.js', admin);           // plain-JS global used by the agent UI
shared.forEach((f) => cp(f, admin));

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

  // text/babel JSX scripts → plain scripts pointing at the compiled .js.
  html = html.replace(
    /<script\s+type="text\/babel"\s+data-presets="[^"]*"\s+src="([^"]+)\.jsx"><\/script>/g,
    '<script src="$1.js"></script>'
  );

  // Plain md.jsx script (shared markdown helper — compiled by walk(), not text/babel).
  html = html.replace(/<script\s+src="md\.jsx"><\/script>/g, '<script src="md.js"></script>');

  writeFileSync(file, html);
}
productionizeHtml(join(site, 'index.html'));
productionizeHtml(join(admin, 'index.html'));

console.log('✓ built dist/site (portfolio) and dist/admin (console) — JSX precompiled, Babel removed, production React');
