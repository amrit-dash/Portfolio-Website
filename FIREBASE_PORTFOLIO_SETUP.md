# Firebase setup for portfolio + admin dashboard

1. Fill `public/js/firebase-config.js` with your Firebase Web app config.
2. Enable **Authentication > Email/Password** in Firebase Console.
3. Create at least one admin user email/password in Firebase Auth.
4. Deploy rules and hosting:
   - `npx -y firebase-tools@latest deploy --only hosting,database,storage`
5. Open `/admin` (or `/dashboard`), sign in, and update content.

## Data paths used

- Realtime Database: `portfolio/content`
- Storage (CV files): `portfolio/cv/*`
- Storage (project images): `portfolio/projects/*`

## Security model in this repo

- Public can read portfolio content and uploaded CV/project assets.
- Only authenticated users can write dashboard-managed data/files.
