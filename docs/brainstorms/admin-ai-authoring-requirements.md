---
date: 2026-05-31
topic: admin-ai-authoring
---

# Admin AI Authoring Tooling

## Summary

An admin-only AI authoring layer for the amrit.os dashboard: an inline writing assistant on text fields, agentic "add/edit a section" operations, and a global command bar. It drafts content in Amrit's established voice and writes only into the **draft** content — the existing Publish step remains the human gate to the live site. It runs on its own authoring model, separate from the public bot, and reuses the owner-authenticated server-side proxy so keys never reach the browser.

---

## Problem Frame

Editing the portfolio today means typing every field by hand in the admin editors — hero pitch, About copy, project descriptions, work bullets, tags, links. For a site that's updated a few times a year, that's not painful in volume, but it's where the quality bar slips: copy comes out inconsistent in tone, and adding a whole new project means manually filling ~8 fields (title, category, type, description, tags, skills, links) in the right shape.

Two costs compound. First, blank-page friction — staring at an empty "description" box and writing something that matches the voice of the rest of the site. Second, structural busywork — a new project is a multi-field object, and assembling it by hand is exactly the kind of repetitive task Amrit automates everywhere else. The admin is also a deliberate showcase of what Amrit builds, so the bar is "this is impressive to demo," not just "it works for me."

---

## Actors

- A1. Owner (Amrit): the sole authenticated admin user. The only actor who can see or invoke any AI authoring tool.
- A2. Authoring LLM: the provider/model configured specifically for authoring (separate from the public bot's provider), invoked server-side through the proxy.

---

## Key Flows

- F1. Inline field assist (low blast radius → auto-apply)
  - **Trigger:** Owner clicks the AI affordance on a text field/textarea and picks an action (e.g. refine, shorten, punch-up, apply emphasis).
  - **Actors:** A1, A2
  - **Steps:** Owner invokes assist on a field → request goes to the proxy with the field's current text, the field's allowed formatting, and voice grounding → model returns revised text → text is applied to the field immediately, with an undo affordance.
  - **Outcome:** The field's draft value is updated in Amrit's voice; owner can undo to restore the prior text.
  - **Covered by:** R1, R2, R3, R7, R9

- F2. Agentic section add/edit (higher blast radius → preview-then-confirm)
  - **Trigger:** Owner asks to add or substantially edit a section, e.g. "add a project about X" or "rewrite my About to mention Y."
  - **Actors:** A1, A2
  - **Steps:** Owner states intent → if required fields are missing, the AI asks for them (or proceeds with sensible drafts) → model returns a structured object matching the target content shape → object is validated against that shape → owner sees a preview/diff → owner accepts (inserts into draft), edits, or rejects.
  - **Outcome:** On accept, a well-formed entry is inserted/updated in the draft; on reject, nothing changes.
  - **Covered by:** R4, R5, R6, R8, R9, R10

- F3. Global command bar
  - **Trigger:** Owner opens the admin command bar and issues a natural-language instruction targeting any section.
  - **Actors:** A1, A2
  - **Steps:** Owner types a command → AI interprets which section/action is meant → routes to inline-style auto-apply or section-style preview-confirm based on blast radius → result lands per that path's rules.
  - **Outcome:** The instruction is carried out against the draft using the same autonomy rules as F1/F2.
  - **Covered by:** R6, R8, R9, R10

---

## Requirements

**Inline writing assistant**
- R1. Each substantial text field/textarea in the admin editors exposes an AI assist affordance (About copy, hero pitch, project & work descriptions, bullets, card bodies, contact copy).
- R2. Assist offers at least: refine/rewrite, shorten, lengthen/expand, and apply the field's allowed emphasis (e.g. `<b>`/`<em>`) — the action set is aware of what formatting that field accepts.
- R3. Inline assist results auto-apply to the field (low blast radius) and provide a one-step undo to restore the previous value.

**Agentic section operations**
- R4. The owner can ask the AI to add a new entry to a collection section (project, work history) by stating intent; the AI assembles a full entry matching that section's content shape.
- R5. When required fields for a new entry are missing, the AI either prompts the owner for them or fills sensible drafts the owner can edit — it never inserts a half-formed entry silently.
- R6. The owner can ask the AI to edit/extend an existing section (e.g. About) and receive a revised version.
- R8. Section-level adds/edits are presented as a preview (or diff) and require explicit owner confirmation before they write to the draft.

**Command bar**
- R10. A global admin command bar accepts natural-language instructions targeting any section and routes each to the correct autonomy path (auto-apply for field-level, preview-confirm for section-level) based on blast radius.

**Cross-cutting**
- R7. All authoring output is grounded in Amrit's voice — the request carries the owner's existing personal context (the bot's system-prompt knowledge) and relevant current content so drafts read like Amrit, not generic AI.
- R9. Authoring uses a dedicated authoring provider/model + key, configured in the admin separately from the public bot's provider; the key is stored server-side and never exposed to the browser.
- R11. Structured AI output (new/edited section objects) is validated against the target content shape before insertion; malformed output is rejected with a retry path, not committed.
- R12. All authoring writes target the draft only — the AI never publishes; the existing Publish action remains the sole path to the live site.
- R13. All authoring tooling is gated behind admin auth (owner-only); it is never reachable by public visitors.

---

## Acceptance Examples

- AE1. **Covers R3.** Given a project description field with text, when the owner runs "punch-up" inline assist, the field updates in place with the revised copy and an undo control appears that restores the original text.
- AE2. **Covers R4, R5, R8, R11.** Given the owner says "add a project about the Coffee Mapper app" with no other details, when the AI responds, it asks for (or drafts) the missing fields, returns a complete project object validated against the project shape, and shows a preview the owner must confirm before it enters the draft.
- AE3. **Covers R5, R11.** Given the AI returns a malformed project object (e.g. missing title), when validation runs, the entry is not inserted and the owner is offered a retry rather than a broken draft.
- AE4. **Covers R12.** Given the owner accepts any AI-generated change, when it is applied, the live public site does not change until the owner separately clicks Publish.
- AE5. **Covers R2, R7.** Given an About paragraph, when the owner asks the AI to "make this sound more like me and bold the key tools," the result applies `<em>`/`<b>` consistent with what the About field accepts and reflects Amrit's established voice/context.

---

## Success Criteria

- Adding a new project via the AI takes one stated intent + one confirm, versus manually filling ~8 fields — and the inserted entry is shape-valid and on-voice.
- Inline assist meaningfully improves field copy in Amrit's voice often enough that it's used during real edits, not just demoed once.
- A downstream implementer can build each layer (inline → agentic add → command bar) independently, because requirements, autonomy rules, and the validation/confirm boundaries are specified per layer.
- Nothing the AI does can reach the live site without an explicit human Publish, and no authoring surface is exposed to visitors.

---

## Scope Boundaries

- **Owner-only.** Authoring tools are never exposed to public visitors — only the authenticated owner. Visitors still get the public chat bot, nothing more.
- **No model training/fine-tuning.** Authoring uses an off-the-shelf LLM via the proxy. The bot's curation loop — a dedicated "Review / Inbox" section in the AmritBot admin area that collects captured visitor questions + other inputs for the owner to review and one-click "add to Q&A" (tracked in `PLAN.md` Phase 6) — is the only "learning," and it is not part of this feature.
- **Layered delivery, not big-bang.** Full suite is the target; it ships in layers (inline assist → agentic section ops → command bar), each independently shippable and testable.
- **No image generation.** Authoring covers text/structured content, not generating project imagery or the cropped media assets.
- **Not a public-facing content generator.** This is private authoring of the owner's own portfolio, not a tool that lets anyone generate site content.

---

## Key Decisions

- Mix-by-action-size autonomy: field-level tweaks auto-apply with undo; section-level adds/edits require preview-then-confirm. Rationale: scale friction and safety to blast radius — small edits stay fast, structural changes get a human gate.
- Separate authoring model from the public bot: a dedicated provider/key for authoring lets a stronger writing model serve editing while visitors run a cheaper model. Rationale: editing quality matters more than per-call cost for the owner; visitor traffic is the cost-sensitive path. Cost: one extra key to manage.
- Voice grounding is mandatory, not optional: every authoring call carries the owner's existing context + relevant current content. Rationale: ungrounded output reads as generic AI slop and undercuts the showcase.
- Draft-only writes: the AI never publishes. Rationale: the existing draft→publish gate is already the safety net; authoring plugs in upstream of it for free.
- Reuse the existing owner-authenticated proxy rather than a new client path: keeps keys server-side and inherits the owner rate-limit bypass.

---

## Dependencies / Assumptions

- Depends on the production migration (Firestore content model, Auth owner-gating, Functions proxy) being in place — this feature is built on top of that backend, not before it.
- Assumes the content shapes for each section (project, work entry, etc.) are well-defined enough to validate AI output against — they are, per the existing `data.jsx` / store model.
- Assumes the owner's voice context (the bot's system prompt) is rich enough to ground authoring — verified: it already contains education, comedy, work, and project detail.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R9][Technical] Whether authoring reuses the bot's `/chat` proxy endpoint with an "authoring" mode flag, or gets a dedicated `/assist` endpoint — settle during planning.
- [Affects R1, R10][Technical] Exact UI affordance for inline assist (per-field icon vs. focus-triggered popover) and how the command bar interprets/targets sections — design during planning.
- [Affects R4, R11][Technical] How strictly to validate structured output and what the retry UX is (auto-retry vs. surface raw for manual fix) — settle during planning.
- [Affects R10][Needs research] Whether the command bar needs intent-routing logic beyond simple section keyword matching for v1.
