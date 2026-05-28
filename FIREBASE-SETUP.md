# Firebase setup for portfolio CMS

The public site works offline with bundled defaults. To enable live CMS updates, Storage uploads, and Firebase Auth for `/admin`:

## 1. Enable services

In [Firebase Console](https://console.firebase.google.com/) for `amrit-dash-portfolio`:

- **Realtime Database** — create database (start in locked mode; deploy `database.rules.json`)
- **Storage** — deploy `storage.rules`
- **Authentication** — Email/Password provider; create an admin user (not `admin`/`admin` — that is dev-only in the browser)

## 2. Web app config

1. Copy `public/js/firebase-config.example.js` → `public/js/firebase-config.js`
2. Paste your Web app config from Project settings

## 3. Deploy rules

```bash
firebase deploy --only database,storage
```

## 4. Seed content (optional)

After first admin login with Firebase Auth, open `/admin`, edit fields, and **Save Portfolio Data**. Data is stored at `portfolio/content`.

## Routes

| URL | Purpose |
|-----|---------|
| `/` | Public portfolio |
| `/admin` or `/dashboard` | CMS (hidden; not linked from site) |

## Dev login

Until Firebase Auth is configured: **admin** / **admin** (email field can be `admin`). Dev mode saves a **local draft** in `localStorage`; Storage uploads require Firebase Auth.
