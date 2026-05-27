# AGENTS.md

## Cursor Cloud specific instructions

This is a static portfolio website (HTML/CSS/JS) served from the `public/` directory. Content can be loaded from `public/data/default-content.json` (fallback) or Firestore (`portfolio/content`). An admin dashboard lives at `/admin` (not linked from the public site). See `FIREBASE_SETUP.md` for Firebase Auth, Firestore, and Storage setup. There is no build step and no test framework.

### Running the dev server

```bash
npx serve public -l 3000
```

This serves the `public/` directory on port 3000. The `serve` package will be auto-installed by npx on first run.

### Project structure

- `public/` — All static assets served directly (HTML, CSS, JS, images)
- `public/index.html` — Single-page portfolio (retro desktop UI)
- `public/admin/` — Authenticated content dashboard
- `public/js/portfolio-app.js` — Main app entry; `public/js/core/`, `public/js/ui/`
- `public/css/retro-system.css` — Theme + layout
- `public/data/default-content.json` — Default portfolio data
- `firestore.rules`, `storage.rules` — Security rules (admin email only writes)
- `firebase.json` — Firebase Hosting configuration (rewrites all routes to `index.html`)

### Notes

- There are no automated tests, no linter, and no build step in this project.
- The only npm dependency (`firebase-tools`) is used exclusively for deployment to Firebase Hosting.
- To verify changes, serve the site locally and test in the browser.
- The GitHub Actions workflow (`.github/workflows/firebase-hosting-merge.yml`) auto-deploys on push to `master` — it requires Firebase credentials configured in the repository secrets.
