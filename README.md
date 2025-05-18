# My Portfolio Website

Welcome to **Amrit Dash's** personal portfolio website. This repository contains the source code, assets, and deployment workflow that power the site available at `https://amritdash.web.app`.

## Project Overview

This portfolio showcases my professional experience, projects, and contact information. It is a static website built from the **[Luther](https://themes.getbootstrap.com/product/luther-personal-portfolio-template/)** HTML template and customised with additional sections and styling.

Key features include:

* A responsive design optimised for desktop and mobile
* Project modals with dynamic buttons and GitHub/Play Store links
* Automatic deployment to **two** Firebase Hosting sites (default & `amritdash.web.app`) via GitHub Actions

---

## Tech Stack

* HTML5, Sass/CSS3, Vanilla JS
* [Firebase Hosting](https://firebase.google.com/docs/hosting) for fast global delivery
* [GitHub Actions](https://docs.github.com/en/actions) for continuous deployment

> **Note:** No runtime frameworks are required; the site is served as static assets.

---

## Local Setup

```bash
# Clone the repo
$ git clone https://github.com/<your-github-username>/my-portfolio-website.git
$ cd my-portfolio-website

# Serve locally (with live reload)
$ npm i -g serve
$ serve -s luther-1.0.0
```

The root folder `luther-1.0.0` contains all HTML/CSS/JS assets.

---

## Firebase Hosting

This repository is configured for **multi-site** hosting:

| Target | Site URL |
|-------|-----------|
| `default` | https://<default-project>.web.app |
| `amritdash` | https://amritdash.web.app |

### Prerequisites

1. Install the Firebase CLI

   ```bash
   npm i -g firebase-tools
   ```

2. Login and initialise (once):

   ```bash
   firebase login
   firebase init hosting
   ```

> The repo already contains **`firebase.json`** and **`.firebaserc`** — adjust the `project` and `site` IDs to match your Firebase console.

---

## GitHub Actions CI/CD

A workflow at `.github/workflows/firebase-hosting.yml` automatically:

1. Installs the Firebase CLI
2. Deploys to both targets on every push to `main`

### Secrets Required

Add the following secrets in your GitHub repository settings:

| Secret | Purpose |
|--------|---------|
| `FIREBASE_TOKEN` | CI token from `firebase login:ci` |
| `PROJECT_ID` | Your Firebase project ID |

---

## Folder Structure

```
my-portfolio-website/
├─ luther-1.0.0/        # Static HTML template & assets
├─ .github/
│  └─ workflows/
│      └─ firebase-hosting.yml
├─ .firebase/
├─ .firebaserc
├─ firebase.json
├─ README.md
└─ .gitignore
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## License

This project is licensed under the **MIT** License. See the [LICENSE](LICENSE) file for details. 