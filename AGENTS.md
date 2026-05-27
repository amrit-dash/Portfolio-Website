# AGENTS.md

## Cursor Cloud specific instructions

This is a static portfolio website served from `public/`, with **Firebase** (Firestore, Storage, Auth) for dynamic content and an admin dashboard.

### Running the dev server

```bash
npx serve public -l 3000
```

- Main site: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin (requires Firebase Auth + config)

### Project structure

- `public/` — Static assets + SPA entry (`index.html`)
- `public/admin/` — Hidden admin dashboard (login required)
- `public/js/` — Portfolio app modules (theme, boot sequence, 3D hero, Firestore loader)
- `public/data/default-content.json` — Fallback content when Firestore is empty or unconfigured
- `public/assets/cv/` — Local CV PDFs (light/dark)
- `firebase.json` — Hosting, Firestore rules, Storage rules
- `FIREBASE_SETUP.md` — Enable Auth, Firestore, Storage, admin UID, deploy steps

### Firebase

- Configure `public/js/firebase-config.js` with your Web app credentials before production use.
- Deploy: `npx -y firebase-tools@latest deploy`
- GitHub Actions (`.github/workflows/firebase-hosting-merge.yml`) auto-deploys on push to `master` when secrets are set.

### Notes

- No automated tests or linter in this project.
- `npm` dependency `firebase-tools` is for CLI deploy.
- Verify UI changes via local serve + browser; admin features need valid Firebase config and an `admins/{uid}` document.
