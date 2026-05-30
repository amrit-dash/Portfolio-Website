# AGENTS.md

## Cursor Cloud specific instructions

This is the `amrit.os` portfolio — a static site served from `public/`, hosted on Firebase. The UI is React 18 loaded from a CDN, with JSX transpiled in the browser by `@babel/standalone`. There is **no build step**, no backend, no test framework, and no linter configured.

### Running the dev server

```bash
npx serve public -l 3000
```

Serves `public/` at <http://localhost:3000>. `serve` is auto-installed by `npx` on first run. Hit `/` for the portfolio and `/admin.html` for the admin console.

### Project structure

- `public/index.html` — portfolio entry; loads React/ReactDOM/Babel from CDN, then `data.jsx → tweaks-panel.jsx → app.jsx`
- `public/admin.html` — admin console entry; loads `data.jsx` then `admin/store.jsx → ui.jsx → crop.jsx → editors.jsx → editors-wp.jsx → bot.jsx → app.jsx`
- `public/styles.css` — portfolio styles
- `public/data.jsx` — portfolio content (experience, expertise, projects, socials) + admin override layer that reads from `localStorage` (`amritos.preview` / `amritos.published`)
- `public/tweaks-panel.jsx` — shared host-editable Tweaks shell (dormant in production)
- `public/app.jsx` — portfolio React app
- `public/admin/` — admin console modules + `admin.css`
- `public/assets/` — all images, icons, gallery shots and CVs (only files referenced by the JSX live here)
- `firebase.json` — Firebase Hosting config; routes that don't match a file fall back to `/index.html`

### Notes

- No tests, no linter, no bundler — JSX is transpiled in the browser at load time, so changes show on refresh.
- The admin dashboard persists content to `localStorage` under the `amritos.*` keys. The live portfolio reads `amritos.preview` (live preview) or `amritos.published` (shipped content), falling back to the seeds in `data.jsx`.
- Admin live-preview embeds the portfolio via `<iframe src="index.html?adminpreview=...">`, so the two pages must remain siblings in `public/`.
- The only npm dependency (`firebase-tools`) is used exclusively for deployment to Firebase Hosting.
- The GitHub Actions workflow (`.github/workflows/firebase-hosting-merge.yml`) auto-deploys on push to `master` — it requires Firebase credentials configured in the repository secrets.
