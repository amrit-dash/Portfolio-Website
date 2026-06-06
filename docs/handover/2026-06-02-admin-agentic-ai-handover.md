---
date: 2026-06-02
feature: admin-agentic-ai
branch: feature/admin-agentic-ai-v2
status: built — pending live verification with real keys
origin: docs/plans/2026-06-01-001-feat-admin-agentic-ai-plan.md
---

# Admin Agentic AI — handover

Owner-only agentic layer for the amrit.os admin console. Drive every admin
control by chatting; the agent writes **only to `content/draft`**, snapshots
before each turn (undo), and never publishes on its own. Built fresh on
`feature/admin-agentic-ai-v2` (off `amrit-os`), re-deriving the architecture from
the earlier `feature/admin-agentic-ai-impl` spike with two owner-mandated changes:

1. **The agent has its OWN keys.** `config/agent` is a separate key store
   (`{ active, byProvider: { gemini:{apiKey,model}, … }, refinerModel }`), fully
   isolated from the bot's `config/llm`. Use it for billable keys / better models.
2. **Native per-provider adapters** — Gemini, Anthropic (native Messages API, not
   via OpenRouter), and an OpenAI-compatible adapter shared by OpenAI / OpenRouter
   / Mistral / Grok (each its own provider + key + catalog).

## What's where

**Backend** (`functions/`)
- `index.js` — `/agent` (tool loop) + `/refine` (inline rewriter), owner-auth,
  `config/agent` key resolution (keys stripped before reaching the loop/audit).
- `agent/loop.js` — provider-agnostic tool loop (canonical messages, sequential
  mutating tools, per-turn + daily caps, fresh-thread-on-provider-switch).
- `agent/providers/{gemini,anthropic,openai,index}.js` — native adapters + dispatch.
- `agent/content-ops.js` — array-aware path-set, blocklist, ring(10) snapshots,
  `updateTime`-precondition commit, undo + per-path revert.
- `agent/tools.js` — hybrid catalog (generic `readContent`/`setContentPath` +
  structured array/image/bot/inbox/system tools).
- `agent/guards.js` — path blocklist (incl. `config.agent`), inbox injection guard.
- `agent/audit.js` — key-redacted, size-capped turn audit.
- `agent/multimodal.js` — Gemini image-gen + path-pinned/MIME-sniffed Storage upload.
- `agent/publish.js`, `agent/messages.js` — publish + canonical message format.

**Frontend** (`public/`)
- `shared-schema.js` — enums + agent config schema (IIFE; loads in Node + browser).
- `admin/agent.jsx` — Agent page + floating dock (one shared session), composer
  with inline Send + settings-modal gear + inbox toggle, per-path/turn undo,
  review links.
- `admin/agent-settings.jsx` — per-provider key UI (own keys) + tool-capable model
  picker; rendered inside the settings modal.
- `admin/refiner.jsx` — ✨ field refiner (wired into hero pitch, About intro,
  timeline entries).
- `admin/store.jsx` — `config/agent` load/save, `/agent`+`/refine` calls, U14 draft
  live-sync (adopts agent writes; pauses autosave during a turn; defers while a
  field is focused).
- `admin/app.jsx` — Agent route + dock mount; settings page route removed (now modal).

**Ops**
- `scripts/deploy-backend.sh` + `npm run deploy:backend` — local deploy.
- `.github/workflows/deploy-backend.yml` — manual `workflow_dispatch` only (no push).
- `scripts/agent-smoke.cjs` — local emulator smoke test (see below).

## How to test

The riskiest, only-verifiable-with-a-key parts are the **live provider calls**.
Java is required for the Firestore emulator (`brew install temurin` or similar),
then:

```bash
firebase emulators:start --only firestore
AGENT_PROVIDER=gemini AGENT_MODEL=gemini-2.5-flash AGENT_KEY=AIza... node scripts/agent-smoke.cjs
# repeat for native adapters:
AGENT_PROVIDER=anthropic AGENT_MODEL=claude-3-5-haiku-latest AGENT_KEY=sk-ant-... node scripts/agent-smoke.cjs
AGENT_PROVIDER=openai    AGENT_MODEL=gpt-4o-mini             AGENT_KEY=sk-...     node scripts/agent-smoke.cjs
```

Browser: point the admin's `FUNCTIONS_BASE` at the emulator (or deploy functions),
sign in, open **Agent**, set keys in the settings modal, and try: *"what's my hero
tagline?"*, *"set my hero handle to @x"* (watch the Hero editor update live), and a
blocklisted attempt.

Offline checks already passing: JSX parse-check (all admin files), full functions
graph load, and unit suites (array safety, blocklist incl. `config.agent`,
prototype-pollution guard, provider dispatch, canonical↔native tool-call-id
correlation for all 3 wire formats, image MIME-sniff/path-pin/size-cap).

## Security model (three independent layers)

1. Draft-only writes + per-turn snapshot + explicit `publish`.
2. Server path **blocklist** (`bot.providers*`, `bot.behavior*`, `config.*`) enforced
   in `content-ops`, regardless of tool. Inbox turns drop `publish`/`undo`/`generateImage`
   and wrap visitor text as data.
3. Keys: `config/agent` is owner-only; resolved server-side; stripped before the
   loop; redacted in audit; `publish` strips bot keys from the published copy.

## Tool expansion (in progress)

The v1 registry in `functions/agent/tools.js` ships 17 core tools (+ 2 deprecated inbox helpers).
A broader catalog (ops, analytics, insights, bot behavior, inbox triage v2) is landing in parallel —
see the full intended inventory in [AGENTS.md](../../AGENTS.md).

## Deferred / follow-ups

- **Live provider verification** with real keys (provider response quirks; the
  Gemini image-gen model id `gemini-2.5-flash-image-preview` may need adjusting).
- **Vision-in (image *understanding*)** — needs attachment plumbing through the
  loop + each adapter + a drop UI. `generateImage` (create) + place-only are done.
- **Two-surface live-sync interleave** — verify dock↔page + focused-field
  preservation via Playwright in a browser.
- Token/tool-progress **streaming** (SSE) — v1 returns the full turn at once.

## Commits (on `feature/admin-agentic-ai-v2`)

- backend tool-loop + separate keys + native multi-provider
- agent page + dock + settings key UI + draft live-sync
- smoke harness
- shared-schema IIFE fix + agent UI polish (modal settings, inline send, chip icon)
- inline refiner + multimodal image-gen
- backend deploy workflow + this handover
