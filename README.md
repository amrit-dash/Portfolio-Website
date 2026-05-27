# Amrit Dash • Portfolio Website

A sleek, single-page portfolio that highlights my recent projects, experience and contact information.

[![Live Site](https://img.shields.io/website?down_color=lightgrey&down_message=offline&label=Website%20Status&logo=google-chrome&logoColor=white&up_color=brightgreen&up_message=online&url=https%3A%2F%2Famritdash.web.app)](https://amritdash.web.app)
[![Firebase Hosting](https://img.shields.io/badge/Hosted%20On-Firebase-FFCA28?logo=firebase&logoColor=000000)](https://firebase.google.com/products/hosting)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

## ✨ Highlights

- **Modern retro aesthetic** – CRT-style boot preloader, three.js-driven backdrop, dock nav, animated scroll reveals.
- **Light & dark theme toggle** – persisted per visitor; the *Download CV* button automatically serves the matching CV PDF.
- **Modular sections** – staggered scroll animations per section (fade / slide / scale / rotate) wired through IntersectionObserver.
- **Timeline experience view** – tabbed Journey section split between Experience and Education / Awards.
- **Firebase-backed CMS** – Firestore stores content, Storage stores CV and image uploads, Auth gates the dashboard.
- **Hidden admin dashboard** – `/admin` and `/dashboard` (un-linked from the main site) open a login-protected editor for content, CV files, project images (with crop preview) and cosmetics (default theme, accent, font).
- **Zero-backend fallback** – the site keeps working as a static portfolio even when Firebase isn't configured.



## 🚀 Local dev

```bash
npx serve public -l 3000
```

Open `http://localhost:3000`. The admin lives at `/admin.html` (and `/admin` / `/dashboard` when served via Firebase Hosting).

For Firebase setup (auth, Firestore, Storage), see [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md).

## 🛠 Tech

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)&nbsp;
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)&nbsp;
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)&nbsp;
![Three.js](https://img.shields.io/badge/Three.js-000000?logo=three.js&logoColor=white)&nbsp;
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)&nbsp;
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information. 