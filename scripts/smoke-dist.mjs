/* Headless smoke test for the compiled dist/site bundle.
   Serves dist/site, loads it in Chromium, and asserts the React app mounts
   (boot splash renders, #root populated) with no console/page errors. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const dir = join(process.cwd(), 'dist', 'site');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let file = join(dir, p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html'); // SPA rewrite
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const url = `http://localhost:${port}/`;

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const t0 = Date.now();
// domcontentloaded resolves right after the blocking app scripts execute and
// React mounts the boot splash — before slow fonts/Firebase/warmup network,
// and before the ~4s boot sequence auto-advances and unmounts.
await page.goto(url, { waitUntil: 'domcontentloaded' });

// The boot splash is React-rendered — its presence proves the app mounted fast.
let bootOk = false;
try {
  await page.waitForSelector('.boot', { timeout: 8000 });
  bootOk = true;
} catch {}
const bootMs = Date.now() - t0;

// Let the boot sequence finish, then confirm the real site content rendered.
await page.waitForTimeout(5000);
const sectionsRendered = await page.evaluate(() =>
  ['intro', 'about', 'work', 'contact'].filter((id) => document.getElementById(id)).length);
const rootChildren = await page.evaluate(() => document.getElementById('root')?.childElementCount || 0);
const hasReact = await page.evaluate(() => typeof window.React !== 'undefined' && typeof window.ReactDOM !== 'undefined');
const hasBabel = await page.evaluate(() => typeof window.Babel !== 'undefined');
const reactDevMode = await page.evaluate(() => !!(window.React && window.React.version) && /\.\d+$/.test(window.React.version) ? window.React.version : 'unknown');

// Ignore benign network errors to backend/CDN that don't affect mounting.
const fatal = errors.filter((e) =>
  !/FUNCTIONS_BASE|\/warmup|\/track|favicon|net::ERR|Failed to load resource|firestore|Firebase|googleapis|gstatic/i.test(e)
);

console.log('--- dist/site smoke ---');
console.log('boot splash rendered :', bootOk, `(${bootMs} ms to .boot)`);
console.log('site sections after  :', sectionsRendered, '/ 4 (intro/about/work/contact)');
console.log('#root child elements :', rootChildren);
console.log('React+ReactDOM loaded:', hasReact, '(version ' + reactDevMode + ')');
console.log('Babel present        :', hasBabel, '(should be false)');
console.log('all console/page errs:', errors.length);
errors.forEach((e) => console.log('   •', e));
console.log('fatal (app) errors   :', fatal.length);

await browser.close();
server.close();

const pass = bootOk && sectionsRendered === 4 && rootChildren > 0 && hasReact && !hasBabel && fatal.length === 0;
console.log(pass ? '\n✓ PASS' : '\n✗ FAIL');
process.exit(pass ? 0 : 1);
