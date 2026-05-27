# Firebase setup

The portfolio works as a fully static site out of the box. Wiring it up to
Firebase unlocks the admin dashboard at `/admin` (and `/dashboard`), where
the owner can edit content, swap CV PDFs, upload project images with a crop
preview, and tweak cosmetics like default theme, accent colour and body
font.

## 1. Create a Firebase project

If you don't already have one, head to
[console.firebase.google.com](https://console.firebase.google.com) and
create a new project. This repo's `.firebaserc` is pinned to
`amrit-dash-portfolio`; update that if you fork.

## 2. Enable services

Inside the Firebase console, enable:

- **Authentication** → "Sign-in providers" → enable **Email/Password**, then
  go to "Users" and add yourself as the only user. (The dashboard rejects
  anonymous visitors.)
- **Cloud Firestore** in production mode. Rules will be deployed from
  `firestore.rules`.
- **Cloud Storage**. Rules will be deployed from `storage.rules`.
- **Hosting** with two targets (`amrit-dash-portfolio` and `amritdash`)
  matching the entries in `firebase.json`.

## 3. Drop in your Web SDK config

From the Firebase console (Project settings → "Your apps" → web app):

```bash
cp public/firebase-config.example.js public/firebase-config.js
# then fill in the apiKey / authDomain / projectId / storageBucket / appId
```

`public/firebase-config.js` is git-ignored so secrets stay out of source
control.

## 4. Deploy

```bash
# Login once
npx firebase login

# Deploy everything
npx firebase deploy --only hosting,firestore:rules,storage:rules
```

If you only want to push rules:

```bash
npx firebase deploy --only firestore:rules,storage:rules
```

## 5. Use the dashboard

Visit `https://your-site/admin` (or `/dashboard`). Sign in with the email
and password you registered in step 2. You can:

- **Content** — edit hero name, hero sub-headline and the three About
  paragraphs.
- **Experience** — add/remove/reorder timeline entries. Toggle which entry
  carries the "Current" badge.
- **CV files** — upload separate PDFs for light and dark mode. The site
  picks the right one automatically depending on the visitor's theme.
- **Images** — upload the About photo (4×5) and project covers (16×10).
  Each upload opens a crop dialog locked to the correct aspect ratio.
- **Cosmetics** — change the default theme, accent colour and body font.
  Changes go live on the main site immediately (and persist in Firestore).

## Firestore data layout

All CMS content lives under the `site` collection:

| Doc                | Shape                                                              |
| ------------------ | ------------------------------------------------------------------ |
| `site/hero`        | `{ name, sub }`                                                    |
| `site/about`       | `{ p1, p2, p3 }`                                                   |
| `site/experience`  | `{ items: [{ role, org, period, desc, tags[], current }] }`        |
| `site/cv`          | `{ light: url, dark: url }`                                        |
| `site/cosmetics`   | `{ defaultTheme, accent, font }`                                   |
| `site/images`      | `{ "about.photo": url, "projects.<id>": url, … }`                  |

The site reads these documents on load and gracefully falls back to the
hard-coded HTML when a doc is missing — so the static fallback is always
intact.
