# AGENTS.md

## Cursor Cloud specific instructions

Revamped static portfolio (HTML/CSS/JS modules) served from `public/`. No build step, no test framework, no linter.

### Running the dev server

```bash
npx serve public -l 3000
```

### Project structure

- `public/index.html` — Journey-style portfolio (theme toggle, scroll animations, Three.js hero)
- `public/admin/` — Hidden CMS at `/admin` (also `/dashboard` redirect)
- `public/js/app/` — Data, renderer, Firebase client, theme, animations
- `public/js/firebase-config.js` — Firebase web config (see `firebase-config.example.js`)
- `public/assets/` — CV PDFs (light + dark variants for theme-aware download)
- `firebase.json` — Hosting rewrites + Realtime Database + Storage rules
- `FIREBASE-SETUP.md` — Enable Database, Storage, Auth, and deploy rules

### Admin access

- **Dev (no Firebase):** `/admin` → username `admin`, password `admin`
- **Production:** Firebase Email/Password user after `firebase-config.js` is configured

### Notes

- Default content lives in `public/js/app/portfolio-data.js`; Firebase RTDB path `portfolio/content` overrides when configured.
- CV download switches between `assets/amrit-dash-cv-light-2025.pdf` and `assets/amrit-dash-cv-dark-2025.pdf` by theme.
- Deploy: GitHub Actions on `master` (Firebase WIF). Local: `firebase deploy`.
