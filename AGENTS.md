# AGENTS.md

## Cursor Cloud specific instructions

This is a data-driven portfolio platform (HTML/CSS/JS) served from the `public/` directory. There is no build step and no test framework. Content defaults live in `public/data/site-default.json`; optional Firebase Realtime Database + Storage power live updates from the admin dashboard.

### Running the dev server

```bash
npx serve public -l 3000
```

This serves the `public/` directory on port 3000. The `serve` package will be auto-installed by npx on first run.

### Project structure

- `public/` — Static assets (HTML, CSS, JS, images)
- `public/index.html` — Public portfolio (journey-style UI, light/dark theme, 3D hero)
- `public/admin/` — Hidden dashboard at `/admin` (default login `admin` / `admin`)
- `public/data/site-default.json` — Default site content
- `public/js/core/` — Theme, data loader, renderer, animations, Firebase helpers
- `public/css/platform/` — New design system styles
- `firebase.json` — Hosting, Realtime Database rules, Storage rules

### Notes

- There are no automated tests, no linter, and no build step in this project.
- npm dependency `firebase-tools` is for CLI deploy; the site loads Firebase SDK from CDN when `public/js/firebase-config.js` is configured.
- Admin panel: `http://localhost:3000/admin` (not linked from the public site).
- To verify changes, serve `public/` locally and test in the browser.
- The GitHub Actions workflow (`.github/workflows/firebase-hosting-merge.yml`) auto-deploys on push to `master` — it requires Firebase credentials configured in the repository secrets.
