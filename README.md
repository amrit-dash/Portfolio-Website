# Amrit Dash • Portfolio Website (`amrit.os`)

A retro-OS reimagining of my portfolio, with a private admin console and an owner-only AI agent for editing content without redeploying.

[![Live Site](https://img.shields.io/website?down_color=lightgrey&down_message=offline&label=Website%20Status&logo=google-chrome&logoColor=white&up_color=brightgreen&up_message=online&url=https%3A%2F%2Famritdash.web.app)](https://amritdash.web.app)
[![Firebase Hosting](https://img.shields.io/badge/Hosted%20On-Firebase-FFCA28?logo=firebase&logoColor=000000)](https://firebase.google.com/products/hosting)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

## Highlights

- **`amrit.os` aesthetic** — CRT scanlines, retro terminal type, single-page React shell that boots like an OS.
- **Admin console** — private dashboard at `amritos-admin.web.app` (local: `/admin.html`) for hero, about, expertise, work history, projects, media, appearance, and AmritBot. Draft → preview → publish with live iframe preview.
- **AI agent** — chat-driven editing on the Agent page + floating dock. Writes only to `content/draft`, snapshots each turn for undo, supports multimodal attachments and inbox triage. Separate provider keys in `config/agent`.
- **Firebase backend** — Firestore for draft/published content, Cloud Functions for the visitor bot (`/chat`), analytics (`/track`), and the agent loop (`/agent`, `/refine`). Storage for images and CVs. Owner-only Google Auth.
- **Zero dev build step** — React 18 + Babel-standalone from a CDN in `public/`; edit `.jsx` and refresh. Production uses `npm run build` (esbuild) into `dist/`.
- **Continuous delivery** — push to `master` auto-deploys hosting; backend deploy is manual (`npm run deploy:backend`).

## Run locally

```bash
npx serve public -l 3000
```

- Portfolio: <http://localhost:3000/>
- Admin: <http://localhost:3000/admin.html>

Production-shaped preview:

```bash
npm run build && npm run preview   # dist/site on :3001
```

For Firebase emulators + agent smoke tests, see [AGENTS.md](AGENTS.md).

## Agent & admin

The owner signs in with Google, edits content in section routes (`#hero`, `#projects`, …), and can drive the same changes via natural language on **Agent**. The agent uses a hybrid tool catalog (`readContent`, `setContentPath`, structured array/media/publish tools, inbox ops, and expanding read/insight tools — full list in [AGENTS.md](AGENTS.md)).

Draft lives in Firestore `content/draft`; the public site streams `content/published`. `localStorage` is a cache only. Tool results can include admin deep links to jump to changed sections.

## Deploy

| Command | Target |
|---|---|
| `npm run deploy:site` | Portfolio → `amritdash.web.app` |
| `npm run deploy:admin` | Admin → `amritos-admin.web.app` |
| `npm run deploy:hosting` | Both sites |
| `npm run deploy:backend` | Cloud Functions + Firestore/Storage rules |

## Tech

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)&nbsp;
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)&nbsp;
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)&nbsp;
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)&nbsp;
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)

See [AGENTS.md](AGENTS.md) for architecture, Firestore model, tool inventory, and file layout. See [PLAN.md](PLAN.md) for the production migration roadmap.

## License

Distributed under the MIT License. See `LICENSE` for more information.
