# amrit.os — Production Migration Plan

Status: **proposed** · Branch: `amrit-os` · Target: existing `*.web.app` on Firebase (Blaze)

This plan takes the current static, localStorage-backed build to a unified Firebase
production system: a live-editable CMS, a secure multi-provider AI bot, and a real
analytics suite — all on one Firebase project, all within free-tier quotas with a
billing cap as backstop.

---

## 1. Goals (locked with owner)

- Public portfolio on `amritdash.web.app`; **content edits publish instantly** (no refresh) via Firestore snapshot listeners.
- Admin console on a **separate site `amritdash-admin.web.app`**, Google sign-in **restricted to the owner's email**, not linked from the portfolio.
- **Durable content** — lives in Firestore, not a single browser. Edit from anywhere.
- **Assets** (CV PDFs, images) in Firebase Storage.
- **AI bot** works for public visitors via a server-side **multi-provider proxy** (Gemini / Grok / Mistral / OpenRouter) — keys never reach the browser. Admin selects provider, enters key, tests it.
- **Per-IP rate limiting** on the bot; admin test panel unlimited.
- **Full analytics**: views, project opens, CV downloads, bot chats, social/link/CTA clicks, traffic sources, location, with back-dated month views and a manual "clear" + auto-prune.
- **Cost guard**: Blaze with a $1–5 budget alert; rate limits; capped/pruned analytics.

### Non-goals for v1 (documented future work)
- **Genkit / RAG** — revisit when we want doc-grounded answers.
- **AI-assist copy drafting** in the admin editors — tasteful future add.
- Multi-user admin / roles — single owner only.

---

## 2. Target architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  amritdash.web.app (public)  │        │ amritdash-admin.web.app (you)│
│  portfolio (React+Babel CDN) │        │  admin console + Google auth │
└──────────────┬──────────────┘        └───────────────┬──────────────┘
               │ onSnapshot(content/published)          │ read/write draft+published,
               │ POST /track (events)                   │ config/llm, analytics
               │ POST /chat (bot)                       │
               ▼                                        ▼
        ┌───────────────────────── Firebase project ─────────────────────────┐
        │ Firestore   content/{draft,published}  config/llm  stats/*  events/* │
        │ Auth        Google, owner email only                                 │
        │ Storage     cv/*, images/* (Blaze)                                   │
        │ Functions   /chat (bot proxy)  /track (analytics)  /warmup  /clearStats│
        │ Hosting     2 sites (public, admin)                                  │
        └─────────────────────────────────────────────────────────────────────┘
```

### Firestore data model
```
content/draft            { hero, about, cards, expertise, experience, projects, contact, media, cosmetics, bot, updatedAt }
content/published        same shape — the snapshot the public site reads live
config/llm               { active, byProvider: { id: { apiKey, model } } }   ← owner-write, server-read ONLY
stats/global             { views, projectOpens, cvDownloads, botChats, socialClicks, linkClicks, ctaClicks, updatedAt }
stats_daily/{YYYY-MM-DD} { date, <same counters>, byProject{}, bySource{}, bySocial{}, byCountry{} }
events/{autoId}          { at, type, meta, source, country }   ← capped feed (~200), pruned on write
ratelimits/{ipHash}      { windowStart, count }                ← bot + track throttle
```

### Security rules (essence)
- `content/published`: **public read**, owner-only write.
- `content/draft`: owner read/write only.
- `config/llm`: **no public read**, owner write; Functions read via Admin SDK (bypasses rules).
- `stats/*`, `events/*`: public **cannot** read or write directly — all writes go through `/track`; admin reads via authed listener (or make `stats/*` public-read if we want a public "X visitors" badge — TBD, default private).
- `ratelimits/*`: server-only.

---

## 3. Event taxonomy (analytics)

Single client helper `track(type, meta)` → `POST /track`. Allowlisted types:

| Event | Meta | Fired from |
|---|---|---|
| `view` | — (session-deduped) | portfolio load |
| `project:open` | `{id, title}` | project folder click |
| `cv:download` | `{variant}` | About CV button |
| `bot:chat` | `{provider}` | bot message sent |
| `social:click` | `{label}` | contact social links |
| `link:click` | `{project, label, href}` | project modal links |
| `cta:click` | `{label}` | hero CTA buttons |

Server enriches each with `source` (from referrer the client sends) and `country` (geo-IP, sub-phase). Raw IP is **never stored** — hashed for rate-limit keying, discarded otherwise.

---

## 4. Build phases (each independently testable)

### Phase 0 — Project + tooling
- Create/confirm Firebase project; enable Firestore, Auth, Storage, Functions.
- `firebase init` (firestore, functions, hosting, storage). Add `functions/` (Node 20).
- Set billing budget alert ($1 warn, $5 hard-notify).
- **Test**: `firebase emulators:start` boots all services locally.

### Phase 1 — Hosting: two sites
- `firebase hosting:sites:create amritdash-admin`.
- `firebase target:apply hosting public amritdash` / `... admin amritdash-admin`.
- Split deploy outputs: `public/` (portfolio) and `admin/` (console) — currently both live under `public/`; restructure so admin builds to its own site root. `noindex` the admin site.
- **Test**: both sites serve their `index.html`; deep links rewrite correctly.

### Phase 2 — Auth (admin gate)
- Enable Google provider; restrict writes to owner UID in rules.
- Replace the `'amrit'` `DEMO_PASS` gate with Firebase Auth (Google sign-in); non-owner sign-ins are rejected with a clear message.
- **Test**: owner signs in → admin loads; any other account → denied.

### Phase 3 — Content in Firestore + live publish
- Admin store: `loadDraft/saveDraft/publish` write to `content/draft` / `content/published` (keep localStorage as offline cache/fallback).
- Public site: wrap app in a content provider that subscribes to `content/published` via `onSnapshot` → **instant live updates**, no refresh. Fallback to baked defaults if offline/empty.
- Migrate `data.jsx` defaults → seed Firestore on first run.
- **Test**: edit + publish in admin → second browser updates live within ~1s.

### Phase 4 — Storage (assets)
- CV + image uploads (already cropped client-side) upload to Storage; store the download URL on the content field.
- Rules: public read, owner write.
- **Test**: replace CV in admin → public download link updates after publish.

### Phase 5 — Bot proxy (Functions)
- `/chat`: reads `config/llm` (Admin SDK), routes to active provider (reuse `callBot` logic server-side), returns text. Key never sent to client.
- Per-IP rate limit (default 15/hr, configurable via `content.bot.behavior`); owner-authed calls bypass.
- `/warmup`: no-op to defeat cold starts; portfolio boot splash pings it.
- Admin Providers tab: key saved to `config/llm`; "Test" calls `/chat` with owner token (unlimited).
- **Test**: public chat works without any key in browser (verify Network tab shows no key); rate limit trips after N; admin test unlimited; cold path < 3s, warm < 1s.

### Phase 6 — Analytics core
- `track(type, meta)` client helper → `/track` Function: validate type, derive source, increment `stats/global` + `stats_daily/{today}`, append capped `events`.
- Admin **Overview**: real-time headline counters via `onSnapshot` on `stats/global`.
- Admin **Analytics page** (new route): date-range picker (this month / last month / custom), time-series chart, by-project / by-source / by-social breakdowns, real-time activity feed.
- **Clear analytics** (owner-only `/clearStats` Function) + optional scheduled prune (events > 30d, daily buckets > 12mo).
- **Test**: actions on public site increment admin counters in real time; date range shows correct back-dated buckets; clear empties them.

### Phase 6b — Location (sub-phase, deferrable)
- Geo-IP lookup in `/track` (free provider, cached by hashed IP), store `country`/`region` only.
- Analytics page: by-country breakdown / simple map.
- **Test**: events tagged with country; no raw IP persisted anywhere.

### Phase 7 — Deploy pipeline
- Update `firebase.json` (2 hosting targets, functions, firestore rules, storage rules).
- GitHub Actions: deploy both sites + functions on push to `master` (extend existing WIF workflow).
- **Test**: push → both sites + functions deploy green; live URLs serve the new build.

### Phase 8 — Hardening + docs
- Verify all rules with the emulator's rules tests (public can't read `config/llm`, can't write `stats`, etc.).
- Final security pass; update `README.md` / `AGENTS.md` for the Firebase architecture.
- Confirm budget alerts firing to owner email.

---

## 5. Cost guards
- Blaze budget alert ($1 warn / $5 notify); bot + track rate-limited per IP.
- Analytics: counters are fixed-size; events capped + pruned; daily buckets auto-expire — bounded growth.
- Functions free allowance (2M calls/mo) >> portfolio traffic. Realistic spend: **$0**.

---

## 6. Locked decisions
1. **Admin site id**: `amritos-admin` → `amritos-admin.web.app`.
2. **Location**: build now (not deferred). Store **raw IP + country + region + city** via a free geo-IP lookup in `/track`. ⚠️ Raw IP is PII — kept **admin-only/private**, pruned at 30 days; owner to add a privacy notice if EU/UK traffic is expected.
3. **Bot rate limit**: 30 msgs/IP/hour (admin test unlimited). **Retention**: events pruned > 30 days; daily buckets > 12 months.
4. **Stats visibility**: **private to admin** (no public badge in v1; trivial to expose later).
5. **Tunable in admin → AmritBot section**: bot rate limit, event-retention/prune window, and other knobs editable from the panel (not hardcoded).
6. **Bot training loop**: every visitor bot question is logged; admin gets a "questions asked" view with one-click **"add to Q&A"** to turn real questions into canned answers. (LLM fine-tuning = future.)

---

## 7. Future work (parked)
- Genkit + RAG over owner docs for richer off-script answers.
- "AI-assist" copy drafting in admin editors (via the same proxy).
- Secret Manager for LLM keys (vs locked Firestore doc) as a hardening upgrade.
