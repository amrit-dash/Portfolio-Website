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

### Automated tests (Playwright)

A Playwright suite covers the public site, the admin dashboard, and the admin → public data-overlay round-trip.

```bash
# One-time, on a fresh VM:
npm install
npx playwright install --with-deps chromium

# Run the whole suite (Playwright auto-starts `serve public` on :3000):
npm test

# Run with the browser visible:
npm run test:headed

# After a run, open the HTML report (screenshots/traces on failure):
npm run test:report
```

Specs live in `tests/`:

- `tests/public-site.spec.js` — rendering, theme toggle + persistence, accent picker, CV link swap, project modal, smooth-scroll nav, scroll-reveal, `/admin` rewrite, error-free scroll-through.
- `tests/admin.spec.js` — login (wrong + right), sidebar section navigation, dirty-state tracking, save → overlay, revert, cosmetic toggles, accent swatch, reset, sign out.
- `tests/integration.spec.js` — overlay written into `localStorage` is rendered by the public site; admin save round-trips; project overlay drives the bento + modal; theme prefs initialise the public site.
- `tests/visual.spec.js` — mobile/tablet/desktop × dark/light layout sanity + mobile menu open.

Helpers live in `tests/helpers.js`. The Playwright config is `playwright.config.js`.

### Notes

- The only runtime npm dependency (`firebase-tools`) is used exclusively for deployment to Firebase Hosting. `@playwright/test` and `serve` are dev-only.
- The GitHub Actions workflow (`.github/workflows/firebase-hosting-merge.yml`) auto-deploys on push to `master` — it requires Firebase credentials configured in the repository secrets.
