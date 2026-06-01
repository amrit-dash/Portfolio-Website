---
date: 2026-06-01
topic: admin-agentic-ai
supersedes: admin-ai-authoring (2026-05-31 inline-assistant framing)
status: requirements — ready for planning
---

# Admin Agentic AI — amrit.os console

## Summary

An **owner-only agentic layer** for the amrit.os admin console. A single
tool-calling agent — reachable both as a dedicated **Agent page** and a
**floating dock on every screen** — drives every admin control through natural
language: hero, about, expertise, work history, projects (incl. images),
education/awards, contacts, CV/media, appearance, and bot configuration. It
writes **only to `content/draft`**, never publishes on its own, snapshots before
every turn so changes are undoable, and links to the relevant page/preview for
review. A second, lightweight **inline refiner** lives in large text fields for
in-place "tighten this" rewrites.

The public **AmritBot and its multi-provider proxy are untouched.** The agent
reuses that same server-side key infrastructure but runs its own tool-calling
loop on its own configurable provider/model.

---

## Problem Frame

Editing the portfolio today means hand-typing every field across the admin
editors — hero pitch, About copy, project objects (~8 fields each), work bullets,
tags, links, Q&A pairs. Two costs compound: **blank-page friction** (writing
copy that matches the site's voice) and **structural busywork** (a new project
is a multi-field object assembled by hand — exactly the repetitive work Amrit
automates everywhere else). The admin is also a deliberate showcase of what Amrit
builds, so the bar is "impressive to demo," not just "works for me."

The agent collapses both: "add a project for X with these links and tags," "tighten
my hero," "validate the inbox and turn the good questions into Q&A pairs" — done in
one turn, applied to draft, reviewed, then published by hand.

---

## Goals

- G1. Drive **every** admin action via conversation — parity with the manual UI.
- G2. Multi-intent in one turn ("update hero **and** add 3 Q&A pairs").
- G3. Safe by construction: draft-only writes, per-turn undo, explicit human publish.
- G4. Provider-flexible and cheap: run on free/low-cost models the owner selects.
- G5. Multimodal: understand uploaded images and (when asked) generate/edit them.
- G6. Turn the bot inbox from a dumping ground into curated Q&A.
- G7. Low-friction inline rewriting without leaving the field you're editing.

## Non-Goals

- N1. The agent **cannot** change LLM providers or bot *behaviors* (it may add
  commands / Q&A and adjust limits, but not flip provider config or system
  behavior toggles).
- N2. **No auto-publish.** Publishing is a separate tool the owner explicitly invokes.
- N3. **No changes to the public AmritBot** or its proxy.
- N4. **No Genkit / heavy agent framework** — a thin provider-agnostic loop instead.
- N5. Not multi-user — owner-only, same Google auth gate as the rest of the console.

---

## Actors

- **A1. Owner (Amrit)** — the sole authenticated admin; the only actor who can
  see or invoke the agent or the inline refiner.
- **A2. Agent model** — the provider/model the owner selects for tool-calling
  (default Gemini 2.5 Flash), invoked server-side; key never reaches the browser.
- **A3. Refiner model** — a small/cheap model for inline text rewrites (may be the
  same provider, a lighter model, e.g. Gemini Flash Lite).
- **A4. Image model** — multimodal/generation model, used only when a request
  needs vision-understanding or image generation.

---

## Key Flows

1. **Multi-intent edit.** Owner: "Shorten my hero tagline and add two Q&A pairs
   about whether I freelance and my stack." → Agent snapshots draft → calls
   `updateHero`, `addQAPair`×2 → replies "Done · 3 changes · [Undo] [Review Hero ↗]
   [Review Bot ↗]". Owner reviews via preview, then clicks **Publish**.

2. **Image place (no model spend).** Owner drops an image: "use this as the
   GenkiFlow gallery image." → Agent recognizes a pure placement → uploads to
   Storage → `setProjectImage('genkiflow','gallery', url)`. No vision/gen call.

3. **Image understand / generate.** Owner: "look at this screenshot and write alt
   text + pick which expertise tags fit" (vision-in) — or "generate a minimal
   lime-on-dark folder icon for this project" (generation). → routes to the
   multimodal/image model → applies result to draft → review link.

4. **Inbox curation.** Owner: "validate the inbox and turn the good ones into Q&A."
   → Agent reads `bot_questions`, discards junk/greetings, for each kept question
   generates several Q&A phrasings → stages them in Bot → review → publish.

5. **Inline refine.** In About → timeline → description, owner clicks ✨ →
   refiner rewrites that field using its label as context → owner accepts/rejects.
   No tool calls, no agent session.

6. **Undo.** A turn produced a bad result → owner clicks "Undo last agent change"
   → draft restored to the pre-turn snapshot.

---

## Functional Requirements

### FR1 — Agent surfaces (one agent, dual surface)
- One agent, one chat session, full tool catalog, **page-aware** (told the current
  route) but not page-limited.
- **Dedicated `/agent` page**: full-width chat + tool/audit trail; sidebar collapsible
  for width.
- **Floating dock**: collapsible overlay reachable on every admin screen; same
  session and history as the page.

### FR2 — Tool catalog (parity with the UI)
Medium granularity: **one tool per logical admin action**, each with its own input
validation. Coverage by section:
- **Hero/intro**: update fields.
- **About**: bio/heading/intro; meta strip rows (add/update/remove/reorder);
  impact-timeline sub-entries (add/update/remove/reorder); photo + stamp.
- **Expertise**: add/update/remove/reorder modules; set icon.
- **Work history**: add/update/remove/reorder entries; **sub-roles** within an
  entry (add/update/remove/reorder); bullets; stack chips; clients.
- **Projects**: add/update/remove/reorder; tags; links; skills/expertise filters;
  **images** — thumbnail, gallery, label image (place / understand / generate).
- **Education & awards**: add/update/remove cards; list items; score chips.
- **Contacts**: email/phone; social links (add/update/remove/reorder).
- **CV & media**: replace CV(s); media assets.
- **Appearance**: theme/cosmetic settings the UI exposes.
- **Bot config (allowed subset)**: context; Q&A pairs (add/update/remove);
  commands (add/update/remove); limits (rate limits etc.); inbox triage. **Not**
  provider/key/behavior config.
- **System**: `publish` (explicit), `undoLastChange`.

### FR3 — Write / undo / audit model
- **Direct-apply to `content/draft`** (matches "make changes → review → publish").
- **Snapshot before every agent turn** → "Undo last agent change" restores it.
- **Audit trail**: every turn records which tools ran with what arguments and the
  before/after for changed paths; visible in the Agent page.
- Multi-tool per turn supported; tools may run in parallel where safe.

### FR4 — Review & publish
- After a turn, the agent posts **review links** to each affected admin page and a
  **live preview** link (reusing the existing cross-origin `?adminpreview`
  PreviewDrawer; admin is `amritos-admin.web.app`, site is `amritdash.web.app`).
- **Publish is a separate explicit tool/button.** The agent only publishes when the
  owner invokes it.

### FR5 — Multimodal hybrid (cost-aware routing)
- **Place-only** requests (set an uploaded/known image) → no model spend.
- **Understand** (describe, alt text, suggest tags from pixels) → multimodal model.
- **Generate/edit** (icons, banners) → image model. The agent picks the path from
  intent; generation always lands in draft for review.

### FR6 — Inbox intelligence
- Validate captured `bot_questions`: drop greetings/junk/bloated entries; keep real
  questions.
- For kept questions, generate **multiple Q&A variations** the owner can accept into
  the Q&A set.

### FR7 — Inline refiner
- A ✨ affordance in large textareas (e.g. About timeline description). Rewrites the
  field using its **label/context**, returns a proposal the owner accepts/rejects.
- Reuses the agent's text endpoint **minus tools**; small/cheap model.

### FR8 — Backend (thin multi-provider tool loop)
- A server-side **OpenAI-compatible tool-calling loop** (Cloud Functions Gen2,
  Node 20, asia-south1) — ~one endpoint, not a framework.
- Reuses the existing server-side **key infrastructure**; keys never reach the browser.
- **Agent settings page** (mirrors the bot's key UI): pick provider + model, list
  **filtered to tool-calling-capable models** with **"free" labels**; reuse the
  existing "fetch models" affordance where a provider exposes a model list.
- **Default model: Gemini 2.5 Flash** (free, parallel tool calls, multimodal,
  generous limits). **OpenRouter** supported as a single multi-model gateway.
- **Defensive argument parsing** regardless of provider (`strict` is OpenAI-only).
- **Curated known-good tool-capable model list** (some tagged models silently
  ignore tools); per-provider `tool_choice` shim (`required` vs `any`).

### FR9 — Persistence
- Chat history + per-turn audit persisted in **Firestore**, owner-only.
- **Persists across sessions** until explicitly deleted via a **separate delete
  function** (single message delete and/or clear-conversation).

---

## Guardrails & Safety

- Owner-only auth on every agent/refiner endpoint (same gate as the console;
  enforced server-side, not just UI).
- Draft-only writes + per-turn snapshot + explicit publish = three independent
  safety layers before anything reaches the live site.
- Per-tool input validation; reject malformed/over-large arguments.
- The agent cannot touch provider/key/behavior config (N1) or publish without an
  explicit call (N2).
- Rate-limit the agent endpoints (reuse the existing per-IP limiter; owner bypass
  as the bot test path already does).
- Image generation lands in draft only; the owner always reviews before publish
  (mitigates brand/quality risk on a real portfolio).

---

## Data Model (high-level — schema details deferred to planning)

- `agent_chats/{chatId}` + messages (role, content, attachments, toolCalls,
  timestamps) — owner-only read/write per `firestore.rules`.
- Per-turn **snapshot** of `content/draft` for undo (ring buffer / latest-N).
- **Audit** entries: turn id, tools invoked, args, changed paths, before/after.
- `config/agent` (or an `agent` section under the existing `config/llm`): selected
  provider/model; key referenced from the existing umbrella key store, never
  duplicated into public content.

---

## Success Criteria

- SC1. Every manual admin action has a working tool equivalent (parity check).
- SC2. A multi-intent request applies all changes in one turn and lists review links.
- SC3. "Undo last agent change" restores the exact pre-turn draft.
- SC4. Owner can switch the agent's provider/model from the settings page; only
  tool-capable models are selectable; "free" models are labelled.
- SC5. Place-only image requests incur no model spend; understand/generate work.
- SC6. Inbox validation removes junk and produces accept-able Q&A variations.
- SC7. Inline refiner rewrites a field using its label without opening the agent.
- SC8. No key ever appears in browser/network payloads or published content.
- SC9. Public AmritBot behavior unchanged.

---

## Dependencies / Assumptions / Risks

- **Assumption:** free-tier limits (Gemini Flash 15 RPM / 1,500 RPD / 1M TPM) are
  ample for a single user. (Verified via 2026 research.)
- **Risk:** some tool-tagged free models ignore tools or hallucinate tool names →
  curated known-good list + defensive parsing.
- **Risk:** OpenRouter free model IDs are volatile → keep model IDs configurable;
  don't hardcode in a way that breaks silently.
- **Risk:** multi-tool *workflow* reliability drops on weaker models → strong
  default (Gemini Flash) + undo net.
- **Dependency:** existing server-side key store, `content/draft`/`published`
  model, PreviewDrawer (`?adminpreview`, `PORTFOLIO_URL`), per-IP rate limiter,
  `assetUrl()` for cross-origin asset display.
- **Cost:** Blaze cap already set; image generation is the only meaningful new spend
  — gate behind explicit requests.

---

## Out of Scope (this iteration)

- Multi-user / role-based access.
- Agent editing provider/key/behavior config or auto-publishing.
- Any change to the public bot or its proxy.
- A heavyweight agent framework (Genkit, LangChain).

---

## Appendix A — CI/CD: split deploy workflows (related workstream)

Separate from the agent, but captured here per request. Today
`.github/workflows/firebase-hosting-merge.yml` deploys **both** sites on any push
to `master`. Goal: **two path-filtered workflows** so admin and site deploy
independently.

- **WF-1 "deploy admin"** — triggers on push to `master` when **admin paths**
  change (`public/admin/**`, `public/admin.html`, admin entries in
  `firebase.json` / build script) → builds and deploys **`hosting:amritos-admin`** only.
- **WF-2 "deploy site"** — triggers on push to `master` when **site paths** change
  (`public/**` excluding `admin/**`, `public/index.html`, `public/app.jsx`,
  `public/styles.css`, `public/data.jsx`) → builds and deploys
  **`hosting:amritdash`** only.
- Shared concerns: both run `npm run build` (two-bundle `scripts/build-dist.mjs`);
  use `paths:` / `paths-ignore:` filters; never target `amrit-dash-portfolio`
  (vanilla v1 stays preserved).
- **Constraint:** auto-deploy stays **off / dormant** until the owner merges to
  `master` (current work is on `amrit-os`). Workflows are added but only fire on a
  master merge — matching the existing dormant setup.
- **Open question for planning:** functions deploy ownership — does either workflow
  deploy `functions/`, or is that a third manual/auto path? (The agent adds new
  function endpoints, so functions deploy cadence matters.)

---

## Open Questions for Planning

- OQ1. Exact tool list + JSON schemas per tool (parity audit against the editors).
- OQ2. Snapshot retention (latest-N vs ring buffer) and undo depth (last turn vs stack).
- OQ3. Streaming responses + tool-progress UI in the chat (nice-to-have vs v1).
- OQ4. Model-capability source: curated map vs live `supported_parameters=tools`
  fetch (OpenRouter) — likely both, curated as the floor.
- OQ5. Refiner UX: inline diff/accept vs replace-in-place with undo.
- OQ6. Functions deploy ownership in the split-workflow design (see Appendix A).
