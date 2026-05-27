# Firebase setup for portfolio + admin dashboard

## 1. Enable services (Firebase Console)

Project: **amrit-dash-portfolio**

1. **Authentication** → Sign-in method → enable **Email/Password**
2. Create an admin user (Authentication → Users → Add user)
3. **Firestore Database** → Create database (production mode; rules deploy from repo)
4. **Storage** → Get started (rules deploy from repo)

## 2. Web app config

1. Project settings → Your apps → Web app → copy config
2. Paste into `public/js/firebase-config.js` (replace placeholder `apiKey`, `messagingSenderId`, `appId`)

## 3. Admin access

Create a document in Firestore:

- Collection: `admins`
- Document ID: your Firebase Auth **UID** (from Authentication → Users)

Only UIDs listed in `admins` can write content, settings, Storage, and use the dashboard.

## 4. Deploy rules & hosting

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore:rules,storage,hosting
```

## 5. Seed content (optional)

With a service account JSON:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
node scripts/seed-portfolio.js
```

Or use the dashboard at `/admin` after logging in and click **Save changes** (loads defaults from the form).

## 6. Dashboard URL

- `https://amritdash.web.app/admin` or `/dashboard` (not linked on the public site)
- Sign in with the admin email/password

## 7. CV downloads

- Local fallbacks: `public/assets/cv/cv-light.pdf` and `cv-dark.pdf`
- After upload via dashboard, Storage URLs are stored in Firestore and used by the theme-aware download button

## 8. Image crop specs

| Asset     | Size        |
|-----------|-------------|
| Thumbnail | 600 × 450   |
| Detail    | 1200 × 800  |
