---
date: 2026-06-01
deepened: 2026-06-01
type: feat
status: active
origin: docs/brainstorms/admin-ai-authoring-requirements.md
title: "feat: Admin Agentic AI — amrit.os console"
---

# feat: Admin Agentic AI — amrit.os console

Implementation plan for the owner-only agentic layer (see origin:
`docs/brainstorms/admin-ai-authoring-requirements.md`). The brainstorm resolved
product decisions; this plan turns them into a phased build. **No code is written here.**

> **Verification posture:** this repo has **no unit-test framework** — React loads
> via `@babel/standalone` CDN, zero build. Verification = parse-checks
> (`/tmp/pc.cjs`), the Firebase emulator + `curl`, headless Playwright, and
> Network-tab key-absence checks. "Test scenarios" below are concrete verification
> scenarios (input → action → expected outcome), not a unit-test suite.

> **Deepening revisions (2026-06-01).** An adversarial pass (feasibility +
> security + premise) cross-checked the plan against source and changed it
> materially:
> - **Hybrid tool model** (generic `readContent`/`setContentPath` core + a small
>   set of structured tools) replaces the ~50-explicit-tool catalog — fits the
>   weak/free default models and bounds context tokens.
> - **Draft concurrency is a real correctness problem**: the client has *no*
>   `onSnapshot` on `content/draft` today (one-shot `.get()` + whole-doc `.set()`),
>   so the agent's server write would be invisible *and* clobbered. New U14 adds a
>   live listener + concurrency guard.
> - **Server-side path blocklist** (not registry omission) enforces the
>   provider/behavior block; **inbox turns run a restricted tool set** to defeat
>   prompt injection from visitor text.
> - **Array-aware path-set** (the client `setAt` corrupts array-index paths into
>   objects — must NOT be ported literally).
> - **Canonical provider-neutral message format** + tool-call-id correlation so
>   history survives a model switch; **U2 split** into Gemini-first / OpenAI-compat
>   (U15) / Anthropic (U16, deferred-via-OpenRouter).
> - **Shared enums/defaults module** to stop server↔client schema drift.
> - **Daily cost cap** + Storage **path-pinning/MIME/size** + **audit/snapshot key-strip & size cap**.

---

## Problem Frame

Editing the portfolio means hand-typing every field and hand-assembling
multi-field objects. The agent collapses this into conversation: drive any admin
control by asking, apply to `content/draft`, review, then publish by hand. The
public AmritBot and its proxy stay untouched; the agent reuses the same
server-side key infrastructure but runs its own provider-agnostic tool loop.

---

## Scope Boundaries

### In scope (full brainstorm scope, phased)
Dual-surface agent (Agent page + floating dock, page-aware); hybrid tool catalog;
direct-apply to `content/draft` + snapshot undo + per-path revert + audit; explicit
`publish`; thin OpenAI-compatible/Gemini tool loop (no framework); agent settings
page (tool-capable model picker, "free" labels, default Gemini Flash, OpenRouter
gateway); multimodal hybrid incl. image generation; inline refiner; inbox
validation + Q&A variations; Firestore-persisted chats + audit (owner-only,
persist-until-deleted); backend deploy via local script + manual `workflow_dispatch`.

### Deferred to Follow-Up Work
- Token/tool-progress **streaming** (SSE) — v1 returns the full turn at once.
- **Anthropic-native** tool-calling (U16) — v1 reaches Claude via OpenRouter's OpenAI-compatible surface.
- Auto-trigger CI for functions/rules (kept manual).
- Capturing institutional learnings (`/ce-compound`) for the circular-JSON fix, SecretInput/autofill, no-build conventions.

### Out of scope (non-goals)
Agent changing **LLM providers/behaviors**; **auto-publish**; any change to the
**public bot**; a **heavyweight framework**; a **third "project label image"**
(projects keep `image` thumbnail + `gallery` modal only); multi-user / RBAC.

---

## Key Technical Decisions

1. **Server-side tool execution, single read-modify-write per turn**, with an
   **array-aware path-set** (NOT a literal port of client `setAt`, which converts
   array-index paths into objects — `store.jsx:361-384`/`copyIn` skips arrays).
   The loop reads `content/draft` once, applies mutations to an in-memory copy,
   writes the doc back once with an **`updatedAt`/`updateTime` precondition** so a
   stale client write cannot silently overwrite it.
2. **Draft live-sync is required, not assumed.** The client today has no
   `content/draft` listener (one-shot `.get()` + debounced whole-doc `.set()`).
   U14 adds an `onSnapshot` that adopts the agent's write without stomping the
   field the owner is actively editing, plus autosave-pause while a turn is in flight.
3. **Hybrid tool model** (resolves OQ1). A generic core — `readContent({path})`
   and `setContentPath({path, value})` — does the bulk of edits; the server
   validates every path against the schema + enum allowlist and a **blocklist**.
   A small set of **structured tools** handles things a generic setter does poorly:
   array add/remove/reorder, `setProjectImage`, image generation, `publish`,
   `undoLastChange`, and the inbox tools. ~15 tools instead of ~50 — better
   tool-selection on free models, and `readContent` bounds context tokens.
4. **Context strategy.** The model is NOT shipped the whole draft every turn.
   It gets `currentRoute` + a compact content outline (top-level keys, array
   lengths/ids) and uses `readContent({path})` to fetch the slices it needs. This
   keeps per-turn tokens bounded (re-validates the free-tier TPM assumption).
5. **Server-enforced guards, not prompt-only.** `content-ops.js` rejects any write
   whose resolved path matches the blocklist (`bot.providers*`, `config/llm`,
   `bot.behavior.*`) regardless of which tool issued it. **Inbox-processing turns
   run a restricted tool set** (no `publish`/`undoLastChange`) and wrap visitor
   text in delimiters the system prompt treats as data, never instructions.
6. **Owner-only + cost caps.** `/agent` and `/refine` require `verifyOwner` (403
   otherwise). Guards: per-turn tool-call cap (default 25) **and** a daily turn
   cap (Firestore counter, default ~200/day) covering both endpoints.
7. **Provider-neutral canonical message format.** History is persisted once as
   `{role, text, toolCalls:[{id,name,args}], toolResults:[{id,result}]}`; each
   provider adapter serializes canonical→native at turn start. A **provider switch
   starts a fresh thread** (or summarizes prior tool turns to text) so foreign
   tool structures never replay into the wrong API.
8. **Separate agent config.** New `config/agent` (provider/model + optional
   `refinerModel`); key referenced from the existing umbrella store, read
   server-side only, never in browser/content/audit/snapshots.
9. **Refiner reuses the single-shot generate path** (same shape as `/chat`), no
   tools; reads `config/agent` (or its `refinerModel`); returns a proposal the
   owner Accepts (writes via normal `setAt`, covered by autosave) or Discards.
10. **Shared schema module.** Extract the content enums + `PORTFOLIO_DEFAULTS`
    shape into a plain `.js` module loadable by both Node (`require`) and the
    browser (`<script>` global) so server validators and client editors can't drift.
11. **Backend deploy stays manual** (local script + `workflow_dispatch`).

---

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

```
client (Agent page / dock)
  └─ POST /agent { chatId, message, attachments?, currentRoute } + owner idToken
functions /agent:
  1. cors + OPTIONS; verifyOwner → 403; check daily-turn cap
  2. load config/agent (key server-side only)
  3. load content/draft (working copy) + snapshot → ring(10); capture updateTime
  4. load chat history (canonical form) → serialize to provider-native
  5. tool-loop (≤25 iters, content-mutating tools run SEQUENTIALLY):
       generate(system + outline + history + message + TOOL_SCHEMAS, media?)
        ├─ readContent(path)         → return slice (no mutation)
        ├─ setContentPath(path,val)  → blocklist+enum check → array-aware set
        ├─ structured tool           → validated executor
        ├─ side-effect tool          → publish / image-gen / inbox / undo
        └─ no tool calls             → final text → break
  6. if changed: write content/draft once WITH updateTime precondition
  7. persist canonical messages + audit (keys stripped, before/after size-capped)
  8. respond { reply, toolCalls[], changedPaths[], reviewLinks[], perPathUndo[] }
```

---

## Data Model (Firestore)

| Path | Purpose | Rules (client SDK) |
|---|---|---|
| `config/agent` | provider/model (+ optional refinerModel); key ref | owner r/w |
| `agent_chats/{chatId}` | thread metadata | owner r/w |
| `agent_chats/{chatId}/messages/{id}` | **canonical** msgs: `role, text, toolCalls[{id,name,args}], toolResults[{id,result}], attachments, ts` | owner r/w |
| `agent_snapshots/{chatId}/turns/{turnId}` | pre-turn `content/draft` copy (ring 10) | owner read only |
| `agent_audit/{id}` | turn audit: tools, args, changedPaths, before/after (**keys stripped, values size-capped or hashed**) | owner read only |

> **Rules note:** Admin SDK (server) bypasses rules — `agent_snapshots`/`agent_audit`
> need only the **owner-read** grant; do NOT add server-write allowances (they're
> redundant and risk over-permissioning). Default-deny catch-all already exists.

Reuses: `content/draft`+`content/published`+`stripKeys`, `config/llm` (bot,
untouched), `config/settings` (limits), `bot_questions` (inbox), Storage `public/**`.

---

## Tool Catalog (hybrid)

> **Superseded inventory:** The canonical, up-to-date tool list (including P0–P3 expansion and deprecated tools) lives in [AGENTS.md](../../AGENTS.md). Below is the original v1 catalog.

**Generic core** (server-validated):
- `readContent({path})` — return a slice of `content/draft` (no mutation). Bounds context.
- `setContentPath({path, value})` — set a leaf/object. Server **validates** the path against the schema + enum allowlist and the **blocklist**; **array-aware** (index paths preserve arrays).

**Structured tools** (where a generic setter is weak/unsafe):
- Arrays: `addItem({collection, item})`, `removeItem({collection, index|id})`, `reorder({collection, order})` — covers meta/impact/expertise/cards-items/socials/experience(+roles)/projects/qa/commands; enforces enums (EXPERTISE_ICONS, SOCIAL_ICONS), slug + expertise auto-renumber, project `skills ∈ expertise icons`.
- Images: `setProjectImage({id, slot:'thumb'|'gallery', source})`, `setCv({slot, source})` (PDF), `generateImage({prompt, target})` (multimodal/U11).
- Appearance: `applyVibePreset({id})` (writes the cosmetic bundle; enum-guarded).
- Bot (allowed subset): `addItem/removeItem` on `bot.qa`/`bot.commands`; `setLimits({...})` → `config/settings`.
- Inbox: `listInboxQuestions`, `validateInboxQuestion`, `generateQAVariations`, `acceptInboxToQA`, `dismissInboxQuestion`.
- System: `publish()` (explicit; stripKeys→published, keys→config/llm), `undoLastChange()`.

**Blocklisted paths (server-enforced, any tool):** `bot.providers*`, `config/llm`
provider+key, `bot.behavior.*`. **Restricted on inbox turns:** `publish`, `undoLastChange` omitted from the schema.

---

## Output Structure (new files)

```
functions/agent/
  loop.js          # tool-loop + canonical↔native serialization
  providers.js     # Gemini + OpenAI-compatible adapters (U2/U15); Anthropic via OpenRouter (U16)
  tools.js         # registry: generic core + structured tools, schemas, validators
  content-ops.js   # array-aware path-set, blocklist, snapshot/undo, per-path revert
  multimodal.js    # place/understand/generate + Admin-SDK Storage upload (path-pinned)
public/
  shared-schema.js # enums + PORTFOLIO_DEFAULTS shape (loaded by Node + browser)  [U4/KD10]
  admin/agent.jsx          # Agent page + floating dock + chat + review/undo UX
  admin/agent-settings.jsx # model picker (tool-capable filter, free labels)
  admin/refiner.jsx        # inline ✨ affordance + accept/discard
scripts/deploy-backend.mjs
.github/workflows/deploy-backend.yml   # workflow_dispatch only
```
*Scope declaration, not a constraint.*

---

## Implementation Units

### Phase 1 — Backend core

### U1. Agent config doc + settings persistence + rules
**Goal:** `config/agent` model + owner helpers + rules for all new collections.
**Requirements:** FR8, KD8. **Dependencies:** none.
**Files:** `public/admin/store.jsx` (`fsLoadAgentConfig`/`fsSaveAgentConfig`), `firestore.rules` (owner-read/write per Data Model; owner-read-only for snapshots/audit; **no server-write rules**), `functions/index.js` (Admin-SDK read helper).
**Patterns:** `store.jsx:280-296` (`fsSaveLLMConfig`), `firestore.rules:27-29`.
**Test scenarios:** save/reload round-trips `config/agent`; non-owner read denied; key absent from any `content/*`/browser payload; Admin-SDK read works with no client write rule.
**Verification:** emulator + rules tests.

### U2. `/agent` endpoint + Gemini tool-loop (canonical messages, generic core, caps, context)
**Goal:** endpoint + the loop proven end-to-end on the **default provider (Gemini)** with the generic `readContent`/`setContentPath` core (structured tools land in U4).
**Requirements:** FR1, FR8, KD3,4,6,7. **Dependencies:** U1, U3.
**Files:** `functions/index.js` (`exports.agent`), `functions/agent/loop.js`, `functions/agent/providers.js` (Gemini adapter: `functionDeclarations`/`functionResponse`, canonical↔native).
**Approach:** CORS+OPTIONS; `verifyOwner`→403; daily-cap check; build outline + inject `readContent`; max-25-iter loop; **content-mutating tools execute sequentially**; defensive arg parse; `tool_choice` shim. Return `{reply, toolCalls[], changedPaths[]}`.
**Patterns:** `functions/index.js:166,74-83,230-235,56-63`.
**Test scenarios:**
- No owner token → 403; over daily cap → 429.
- "say hi" → text, no tool calls.
- "what's my hero tagline?" → model calls `readContent('hero')`, answers from the slice.
- "set hero handle to X" → `setContentPath('hero.handle','X')` applied; draft reflects it.
- blocklisted path (`setContentPath('bot.providers.byProvider.gemini.apiKey',…)`) → rejected server-side, no write.
- malformed model tool args → defensive parse, turn returns error not 500.
- loop hits 25 iters → bounded-turn notice.
**Verification:** emulator curl matrix; no key in payloads.

### U3. Content-ops: array-aware path-set, blocklist, snapshot/undo, per-path revert
**Goal:** the mutation core. **Requirements:** FR3, KD1,2,3,5. **Dependencies:** none (consumed by U2/U4).
**Files:** `functions/agent/content-ops.js`, `functions/index.js`.
**Approach:** array-aware path set (index paths keep arrays — do **not** mirror `setAt`'s object-coercion); path **blocklist**; collect `changedPaths` + per-path before/after; write `content/draft` once **with `updateTime` precondition** (reject + signal retry on mismatch); snapshot to ring(10); `undoLastChange` restores latest; **per-path revert** built from the audit before-values.
**Patterns:** `store.jsx:361-384` (semantics reference only — note the array bug), `:263-267` (doc shape), `index.js:394` (collection delete for ring eviction).
**Test scenarios:**
- index-path set on `about.meta.1.value` → array stays an array (regression guard for the `setAt` bug).
- two sets in one turn → one write; precondition mismatch (simulated stale) → write rejected, retried/aborted cleanly.
- snapshot before mutation; `undoLastChange` restores exact prior draft; ring evicts oldest beyond 10.
- per-path revert restores one changed path while leaving siblings.
- blocklisted path → rejected.
**Verification:** emulator scripted turns + diff + forced-precondition test.

### Phase 2 — Tool catalog

### U4. Structured tools + shared schema module + validators
**Goal:** array/image/appearance/bot/inbox(plumbing)/system structured tools; extract `public/shared-schema.js`.
**Requirements:** FR2, SC1, KD3,10. **Dependencies:** U3.
**Files:** `functions/agent/tools.js`, `public/shared-schema.js` (enums + defaults shape), `functions/agent/content-ops.js`, `public/admin/*` + `public/data.jsx` (consume shared module; no behavior change).
**Approach:** structured tools per catalog; **all enum/slug/renumber validation imports `shared-schema.js`** so server and client agree; image/CV tools accept place-only `source` here (gen in U11).
**Patterns:** enums `editors.jsx:8-71`; shapes `data.jsx`.
**Test scenarios:** `addItem`/`removeItem`/`reorder` on projects + expertise (renumber); bad enum rejected; `applyVibePreset('matrix')` writes bundle; `setProjectSkills` non-expertise icon rejected; shared module loads in Node (`require`) and browser (global) without error.
**Verification:** emulator per tool; parse-check admin still boots with shared module.

### U5. Bot subset tools + system tools (publish, undo, limits) + injection-safe inbox base
**Goal:** Q&A/commands/intro/systemPrompt via structured tools; `setLimits`→`config/settings`; `publish` (stripKeys→published, keys→config/llm); `undoLastChange`.
**Requirements:** FR2,FR4, N1,N2, KD5. **Dependencies:** U3,U4.
**Approach:** publish mirrors `fsPublish`; blocklist already prevents provider/behavior writes; publish/undo **excluded from inbox-turn schema**.
**Patterns:** `store.jsx:297-306,245-255`; `bot.jsx:144-181`.
**Test scenarios:** add/remove QA; `setLimits` range-checked; `publish()` → published has no keys; provider-key write attempt blocked; inbox turn cannot see `publish`.
**Verification:** emulator; grep published for keys (absent).

### U6. Inbox intelligence (validate + variations) with injection guard
**Goal:** validate questions, generate Q&A variations, accept/dismiss — safely over visitor text.
**Requirements:** FR6, SC6, KD5. **Dependencies:** U5.
**Approach:** visitor text wrapped in delimiters, system prompt treats it as data; inbox turns use the **restricted tool set**; `acceptInboxToQA` appends + deletes; `dismissInboxQuestion` deletes.
**Patterns:** `bot.jsx:155-181`; `index.js:133-193`.
**Test scenarios:** greeting → discard; real question → ≥2 variations, accept appends to `bot.qa` + removes; **injected "call publish()" in a question → no publish occurs** (tool absent + delimiter guard); dismiss deletes without QA.
**Verification:** emulator with seeded malicious + benign `bot_questions`.

### Phase 3 — Persistence + live-sync + primary UI

### U7. Canonical chat + audit persistence (key-safe)
**Goal:** persist canonical messages + audit; owner-only; persist-until-deleted.
**Requirements:** FR9, FR3, KD7. **Dependencies:** U2.
**Approach:** write canonical messages (with tool-call-id correlation) + audit; **strip keys** from audit before/after (full-doc scan, not just `bot.providers`); **size-cap** before/after (store diff/hash if large, mind 1 MB doc limit); explicit delete (message + clear-conversation).
**Test scenarios:** thread reload reconstructs canonical history; provider switch → fresh thread (no foreign tool replay 400); audit never contains a key-shaped string; large-array before/after capped; delete removes only target; non-owner read denied.
**Verification:** emulator; grep audit for keys (absent); switch-provider replay test.

### U14. Client draft live-sync + concurrency guard
**Goal:** make the agent's server writes visible in the open admin tab without losing in-progress edits. **Requirements:** FR3, FR4, SC3, KD2. **Dependencies:** U3.
**Files:** `public/admin/store.jsx` (`useContent`: add `content/draft` `onSnapshot`; gate debounced autosave on a pending-turn flag; adopt remote doc without stomping the focused field; read-compare `updateTime`).
**Approach:** subscribe to `content/draft`; when a remote (agent) write arrives, merge into state except the field currently being edited; pause `scheduleDraftSync` while a turn the client initiated is in flight; on autosave, use an `updateTime` precondition so a stale whole-doc `.set()` can't clobber.
**Patterns:** existing `onSnapshot` usage `store.jsx:208,212`; autosave `:355-359`.
**Test scenarios:** agent write while admin open → editors update live; owner typing in field A while agent edits field B → A not stomped; client autosave after agent write → precondition blocks stale overwrite; dock + page open together → shared live state.
**Verification:** Playwright two-surface interleave; emulator precondition test.

### U8. Agent page UI — chat, tool/audit display, review + per-path undo, page-aware
**Goal:** the `/agent` route. **Requirements:** FR1,FR3,FR4,SC2,SC3. **Dependencies:** U2,U3,U7,U14.
**Files:** `public/admin/agent.jsx`, `public/admin/app.jsx` (route+nav under ASSISTANT), `public/admin.html` (**include after `bot.jsx`, before `app.jsx`**; expose `window.*`), `public/admin/admin.css`.
**Approach:** post to `/agent` with owner token + `currentRoute`; render reply + tool-call chips; each changed path gets a **per-path "revert"** (from audit) plus a turn-level "Undo last change"; "Review ↗" opens the affected page + live preview (`?adminpreview`,`PORTFOLIO_URL`); `assetUrl()` for image refs.
**Patterns:** `bot.jsx` LiveTest (`proxyChat`); PreviewDrawer in `app.jsx`; Sidebar nav.
**Test scenarios:** multi-intent reply lists changes + review links (SC2); per-path revert undoes one edit, keeps others; turn undo restores all (SC3); `currentRoute` passed; Network tab → no key (SC8).
**Verification:** Playwright (owner-session stub) + Network-tab.

### U9. Agent settings page — model picker
**Goal:** pick provider/model, filtered to tool-capable, "free" labels; write `config/agent`.
**Requirements:** FR8, SC4. **Dependencies:** U1.
**Approach:** reuse bot key UI + `/models`; **curated tool-capable list is the floor** (Gemini's `/models` `generateContent` flag does NOT imply tool support — curated-only for Gemini); optional OpenRouter `supported_parameters=tools` filter; tag free models; **reconcile default id** (`gemini-2.5-flash`) against `data.jsx` catalog/`shared-schema.js`; SecretInput; key server-side only.
**Patterns:** `bot.jsx:275-323`; `ui.jsx` SecretInput.
**Test scenarios:** only tool-capable selectable (SC4); free label shows; save round-trips + next turn uses it; key not saved until explicit Save; default id resolves in the picker.
**Verification:** Playwright; key never in content.

### Phase 4 — Surfaces + media + refiner

### U10. Floating dock
**Goal:** agent overlay on every screen, shared session. **Requirements:** FR1. **Dependencies:** U8,U14.
**Approach:** collapsible bubble↔panel; shared chat state with the page (single store/context); mobile-aware (respects shipped drawer).
**Test scenarios:** dock shows same conversation as page; change via dock reflects on the page (via U14 live-sync); mobile dock doesn't obscure hamburger/topbar.
**Verification:** Playwright desktop+mobile.

### U11. Multimodal — place / understand / generate + path-pinned Storage upload
**Goal:** image handling + safe Admin-SDK upload. **Requirements:** FR5,G5,SC5. **Dependencies:** U4,U2.
**Files:** `functions/agent/multimodal.js`, `functions/agent/tools.js`, `public/admin/agent.jsx` (image drop).
**Approach:** classify intent → place (no model), understand (vision), generate (image model). **Admin-SDK upload bypasses storage.rules**, so the function MUST: pin path to a hardcoded `public/agent-gen/` prefix (reject `..`/absolute), **sniff MIME** (magic-bytes, not the provider's claim), enforce ≤15 MB, resolve the bucket explicitly (`amrit-dash-portfolio.firebasestorage.app`). Note Storage(us-central1)↔functions(asia-south1) cross-region latency on gen turns.
**Patterns:** `ui.jsx:349-359` (client upload — *contrast*, the server path differs); `storage.rules:13-19` (constraints to re-enforce in code).
**Test scenarios:** place-by-url → **no model request** (SC5); "describe/tag this image" → vision result; "generate icon" → file at `public/agent-gen/…`, set on draft for review; path with `..` → rejected; non-image magic bytes → rejected; >15 MB → rejected.
**Verification:** emulator + Storage emulator; assert place path makes no model call; path-traversal rejected.

### U12. Inline textarea refiner
**Goal:** ✨ rewrite-this-field with accept/discard. **Requirements:** FR7,SC7,KD9. **Dependencies:** U1 (config), U2 (generate helper).
**Files:** `functions/index.js` (`exports.refine` — single-shot, no tools, owner-auth, CORS, daily-cap), `public/admin/refiner.jsx`, `public/admin/ui.jsx` (TextArea hook), `editors*.jsx` (opt-in fields).
**Approach:** `/refine {text,label,context}` reuses the `/chat`-shape generate; reads `config/agent.refinerModel || config/agent.model`; returns a proposal; Accept writes via `setAt` (autosave-covered), Discard no-ops.
**Patterns:** `/chat` `index.js:228-253`; `ui.jsx` Field/TextArea.
**Test scenarios:** refine About timeline desc uses label as context, Accept replaces (undoable) (SC7); Discard unchanged; no owner token → 403; over daily cap → 429; empty field → no-op.
**Verification:** Playwright textarea; emulator auth/cap.

### Phase 5 — Providers + ops

### U15. OpenAI-compatible provider adapter
**Goal:** OpenAI/OpenRouter/Mistral/Grok tool-calling via the canonical↔native serializer. **Requirements:** FR8, KD7. **Dependencies:** U2.
**Approach:** `tools`/`tool_calls`/`role:"tool"` thread shape; `tool_choice` `required` shim; defensive parse; canonical history → OpenAI form.
**Test scenarios:** OpenRouter free tool-capable model runs a `setContentPath` turn; orphaned tool_call_id never sent; switch Gemini→OpenRouter starts fresh thread (no 400).
**Verification:** emulator against OpenRouter (curated model).

### U16. Anthropic (deferred — via OpenRouter in v1)
**Goal:** document that Claude is reached via OpenRouter's OpenAI-compatible surface in v1; native `input_schema`/`tool_use` adapter deferred. **Requirements:** FR8. **Dependencies:** U15.
**Approach:** no native Anthropic tool path in v1; if the owner selects Claude, route through OpenRouter. **Test expectation: none — documentation/deferral marker.** Verify: settings picker offers Claude only via OpenRouter; native path tracked as follow-up.

### U13. Backend deploy — local script + manual workflow
**Goal:** local + `workflow_dispatch` deploy for functions+rules (off auto). **Requirements:** origin Appendix A, OQ6, KD11. **Dependencies:** none.
**Files:** `scripts/deploy-backend.mjs`, `.github/workflows/deploy-backend.yml` (`on: workflow_dispatch`), `package.json` (`deploy:backend`).
**Approach:** local `firebase deploy --only functions,firestore:rules,storage`; workflow manual-only, reuse WIF auth; never on push.
**Patterns:** `.github/workflows/deploy-admin.yml`.
**Test scenarios:** *none — ops scripting.* Verify: script targets correct `--only`; YAML parses; has `workflow_dispatch`, no `push`.

---

## Phased Delivery

1. **Phase 1 (U1, U3, U2)** — config, content-ops core, Gemini tool-loop with generic core. *Shippable spine.*
2. **Phase 2 (U4, U5, U6)** — structured tools + shared schema + injection-safe inbox.
3. **Phase 3 (U7, U14, U8, U9)** — persistence, **draft live-sync/concurrency**, Agent page, settings.
4. **Phase 4 (U10, U11, U12)** — dock, multimodal/image-gen, refiner.
5. **Phase 5 (U15, U16, U13)** — OpenAI-compatible providers, Anthropic-via-OpenRouter note, deploy.

---

## Risk Analysis & Mitigation

- **Draft clobber / invisible writes** → U14 live-sync + `updateTime` precondition + autosave-pause (KD1,2).
- **Wrong-tool / wrong-edit on weak model** → hybrid tools (fewer, clearer) + `readContent` context + per-path revert; structured array tools avoid generic-setter footguns.
- **Provider-key tamper via path** → server path blocklist (KD5), not registry-only.
- **Prompt injection from `bot_questions`** → restricted inbox tool set + delimited visitor text (KD5).
- **History breaks on provider switch** → canonical format + fresh-thread-on-switch (KD7).
- **Array corruption** → array-aware path-set, not literal `setAt` (KD1).
- **Server↔client schema drift** → shared `shared-schema.js` (KD10).
- **Key leakage** → server-only `config/agent`; full-doc stripKeys on publish + audit; SC8 Network-tab assertion.
- **Storage abuse** → path-pinning + MIME sniff + size (U11).
- **Runaway cost** → per-turn + daily caps (KD6); image-gen explicit-only.
- **1 MB doc limit** → per-turn snapshot docs (each its own doc) + ring eviction; audit before/after size-capped.
- **Cross-region latency** (Storage us-central1 ↔ functions asia-south1) → noted; acceptable for image-gen turns.

---

## Open Questions — Resolutions

- **OQ1 (tool list)** → **hybrid** (generic `readContent`/`setContentPath` core + structured tools).
- **OQ2 (undo)** → ring(10) turn snapshots **plus per-path revert** from audit before-values.
- **OQ3 (streaming)** → deferred.
- **OQ4 (model capability)** → curated tool-capable floor (Gemini curated-only) + optional OpenRouter `supported_parameters=tools`.
- **OQ5 (refiner UX)** → proposal + Accept/Discard; shares generate path; `config/agent.refinerModel`.
- **OQ6 (functions deploy)** → manual: local script + `workflow_dispatch`.

---

## System-Wide Impact

- **Functions**: new `/agent`, `/refine` + `functions/agent/*` → functions deploy (U13).
- **Firestore**: `config/agent`, `agent_chats`, `agent_snapshots`, `agent_audit` + rules → rules deploy (U13).
- **Client**: U14 changes `useContent` (adds a live listener + concurrency) — touches the existing editing path; verify no regression to manual editing/autosave.
- **Admin bundle**: new JSX + `shared-schema.js` + `admin.html` includes (load order!) → deploys via `deploy-admin.yml`.
- **Public site**: unchanged except published draft; public bot untouched (SC9). `data.jsx` now consumes `shared-schema.js` (shared with site) — verify the site still boots.
- **Cost**: image-gen only meaningful new spend; daily cap bounds worst case.

---

## Verification Strategy (whole feature)

- Per-unit emulator + `curl`; Playwright for UI + two-surface live-sync; parse-check all JSX.
- E2E: multi-intent request → changes in draft (visible live via U14) → review/per-path-undo work → publish pushes only intended changes, no keys in `content/published` or `agent_audit`.
- Security gate: Network tab shows no key on any agent/refine call; non-owner 403 everywhere; injected inbox text cannot publish; blocklisted path writes rejected.
