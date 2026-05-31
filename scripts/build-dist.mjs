/* Zero-dependency bundler: splits public/ into two deploy folders.
   dist/site  → public portfolio (NO admin code on the public site)
   dist/admin → admin console (admin.html becomes index.html)
   Shared runtime files (data.jsx, firebase-config.js, firebase-init.js) are
   copied into both. Run via `npm run build` before deploying. */
import { cpSync, rmSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

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
const shared = ['data.jsx', 'firebase-config.js', 'firebase-init.js'];
['index.html', 'app.jsx', 'tweaks-panel.jsx', 'styles.css', 'assets', ...shared].forEach((f) => cp(f, site));

// ---- Admin console (dist/admin) ----
cp('admin.html', admin, 'index.html');   // admin entry → index.html
cp('admin', admin, 'admin');             // admin/*.jsx + admin.css
shared.forEach((f) => cp(f, admin));

console.log('✓ built dist/site (portfolio) and dist/admin (console)');
