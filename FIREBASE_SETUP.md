# Firebase setup for portfolio revamp

This site uses **Firebase Hosting**, **Firestore**, **Storage**, and **Authentication** (Google sign-in for admin only).

## 1. Enable services (Firebase Console)

Project: `amrit-dash-portfolio`

1. **Authentication** → Sign-in method → Enable **Google**. Add `amrit.dash60@gmail.com` as the admin account you will use.
2. **Firestore Database** → Create database → Start in **production** mode.
3. **Storage** → Get started with default bucket.

## 2. Deploy security rules

```bash
npx firebase-tools@latest login
npx firebase-tools@latest use amrit-dash-portfolio
npx firebase-tools@latest deploy --only firestore:rules,storage
```

Rules restrict writes to `amrit.dash60@gmail.com`.

## 3. Web app config

```bash
npx firebase-tools@latest apps:sdkconfig web
```

Copy values into `public/js/firebase-config.js` (`apiKey`, `appId`, `messagingSenderId`, etc.).

## 4. Seed content

Create document **`portfolio/content`** in Firestore with the JSON from:

`public/data/default-content.json`

Or use the Firebase Console import.

## 5. Authorized domains

Authentication → Settings → Authorized domains: add your hosting domains (`amritdash.web.app`, `localhost`, etc.).

## 6. Admin dashboard

Visit **`/admin`** (not linked on the public site). Sign in with Google using the admin email.

Features:

- Edit profile, skills, timelines, projects
- Theme defaults and accent colors
- Upload CVs (light/dark) to Storage
- Crop project thumbnails (600×650) and gallery images (1200×1300)

## 7. Deploy hosting

```bash
npx firebase-tools@latest deploy --only hosting
```

## Local preview

```bash
npx serve public -l 3000
```

Open http://localhost:3000 and http://localhost:3000/admin
