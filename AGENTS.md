# AGENTS.md

## Cursor Cloud specific instructions

This is a static portfolio website (HTML/CSS/JS) served from the `public/` directory. There is no build step, no backend, no test framework, and no linter configured.

### Running the dev server

```bash
npx serve public -l 3000
```

This serves the `public/` directory on port 3000. The `serve` package will be auto-installed by npx on first run.

### Project structure

- `public/` — All static assets served directly (HTML, CSS, JS, images)
- `public/index.html` — Single-page entry point
- `public/js/` — Vanilla JS modules (preloader, lightbox, swiper, scroll-spy, etc.)
- `public/css/` — Modular CSS + vendor styles
- `firebase.json` — Firebase Hosting configuration (rewrites all routes to `index.html`)

### Notes

- There are no automated tests, no linter, and no build step in this project.
- The only npm dependency (`firebase-tools`) is used exclusively for deployment to Firebase Hosting.
- To verify changes, serve the site locally and test in the browser.
- The GitHub Actions workflow (`.github/workflows/firebase-hosting-merge.yml`) auto-deploys on push to `master` — it requires Firebase credentials configured in the repository secrets.
