# Amrit Dash • Portfolio Website (`amrit.os`)

A retro-OS reimagining of my portfolio, with a private admin console for editing content without redeploying.

[![Live Site](https://img.shields.io/website?down_color=lightgrey&down_message=offline&label=Website%20Status&logo=google-chrome&logoColor=white&up_color=brightgreen&up_message=online&url=https%3A%2F%2Famritdash.web.app)](https://amritdash.web.app)
[![Firebase Hosting](https://img.shields.io/badge/Hosted%20On-Firebase-FFCA28?logo=firebase&logoColor=000000)](https://firebase.google.com/products/hosting)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

## ✨ Highlights

- **`amrit.os` aesthetic** — CRT scanlines, retro terminal type and a single-page React shell that boots like an OS.
- **Admin console** — a private dashboard at `/admin.html` for editing hero, about, expertise, work history, projects and the AmritBot assistant. Drafts → preview → publish, with live iframe preview of the site.
- **Zero build step** — React 18 + Babel-standalone from a CDN, JSX transpiled in the browser. Edit a `.jsx` file and refresh.
- **localStorage content layer** — admin writes to `amritos.draft / preview / published`; the portfolio reads `preview` (live) or `published`, falling back to seeded defaults in `data.jsx`. Designed to swap to Firestore + Firebase Auth without restructuring the UI.
- **Continuous delivery** — every push to `master` triggers a Firebase deploy via GitHub Actions.

## 🚀 Run locally

```bash
npx serve public -l 3000
```

- Portfolio: <http://localhost:3000/>
- Admin: <http://localhost:3000/admin.html>

## 🛠 Tech

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)&nbsp;
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)&nbsp;
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)&nbsp;
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)&nbsp;
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)

See [AGENTS.md](AGENTS.md) for the full project layout and notes.

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
