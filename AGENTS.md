# AGENTS.md

## Cursor Cloud specific instructions

This is a portfolio website (HTML/CSS/vanilla-JS modules) served from the `public/` directory. No build step, no test framework, no linter. The site works fully as a static portfolio but can optionally light up a Firebase backend for CMS / admin features.

### Running the dev server

```bash
npx serve public -l 3000
```

This serves the `public/` directory on port 3000. The `serve` package will be auto-installed by npx on first run.

### Project structure

- `public/index.html` — Main site (single-page).
- `public/admin.html` — Hidden admin dashboard. Accessible via `/admin`, `/admin.html`, or `/dashboard` (rewrites configured in `firebase.json`). It is intentionally not linked from `index.html`.
- `public/css/` — `theme.css` (light/dark tokens), `main.css` (site), `admin.css` (dashboard).
- `public/js/main.js` — Site bootstrapper. Loads modules in `public/js/modules/`:
  - `theme.js`, `boot.js`, `three-bg.js`, `scroll-animate.js`, `nav.js`, `tabs.js`, `modals.js`, `cv.js`, `firebase-app.js`, `content-loader.js`, `cosmetics.js`.
- `public/js/admin.js` — Admin dashboard controller (auth + Firestore + Storage + Cropper.js).
- `public/firebase-config.js` — Owner-supplied web SDK config; **git-ignored**. See `public/firebase-config.example.js` and `FIREBASE_SETUP.md`.
- `public/assets/` — CV PDFs (`(Light)` and `(Dark)` variants).
- `firestore.rules`, `storage.rules` — Backend security rules.
- `firebase.json` — Hosting + Firestore + Storage configuration with rewrites for `/admin` and `/dashboard`.

### Notes

- The site never breaks when Firebase isn't configured — it falls back to the hard-coded static defaults baked into `index.html`.
- Three.js is loaded lazily from a CDN inside `three-bg.js`; if the CDN is unreachable the page silently skips the 3D backdrop.
- There are no automated tests, no linter, and no build step.
- To verify changes, serve the site locally and test in the browser.
- The GitHub Actions workflow (`.github/workflows/firebase-hosting-merge.yml`) auto-deploys on push to `master` — it requires Firebase credentials configured in the repository secrets.
