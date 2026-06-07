/* Infer quick-reply chips for the admin agent chat UI.

   Hybrid: tool failures (e.g. project-not-found) and assistant text patterns
   (project lists, slot disambiguation, numbered/bulleted choices) become
   { label, value, kind? } rows the client renders as one-click replies. */

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMdInline(s) {
  return String(s || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

function projectsFromOutline(outline) {
  const entries = outline && outline.projects && outline.projects.entries;
  if (!Array.isArray(entries) || !entries.length) return [];
  return entries.map((e) => ({
    label: String(e.title || e.id || `Project ${e.index}`),
    value: String(e.id != null ? e.id : e.index),
    kind: 'project',
  }));
}

function slotQuickReplies() {
  return [
    { label: 'Thumbnail', value: 'thumb', kind: 'slot' },
    { label: 'Gallery', value: 'gallery', kind: 'slot' },
  ];
}

function fromToolLog(toolLog, outline) {
  for (const t of toolLog || []) {
    const r = t && t.result;
    if (!r) continue;
    if (r.error === 'project-not-found') return projectsFromOutline(outline);
    if (t.name === 'generateImage' && r.ok === false && !r.attached) {
      const projects = projectsFromOutline(outline);
      if (projects.length) return projects;
    }
  }
  return [];
}

function wantsSlotChoice(text) {
  const t = String(text || '').toLowerCase();
  if (!/\b(thumb(?:nail)?|gallery)\b/.test(t)) return false;
  return /\b(which|choose|pick|select|prefer|want|use|for the|as the)\b/.test(t)
    || /\?\s*$/.test(String(text || '').trim())
    || /\bor\b/.test(t);
}

function listItemLabel(line) {
  const m = String(line || '').match(/^\s*(?:[-*•]|\d+[.)])\s+(.+?)\s*$/);
  if (!m) return null;
  const raw = stripMdInline(m[1]);
  if (!raw || raw.length > 80) return null;
  return raw;
}

function matchProjectsInText(text, outline) {
  const entries = outline && outline.projects && outline.projects.entries;
  if (!Array.isArray(entries) || !entries.length) return [];

  const lines = String(text || '').split('\n');
  const listLabels = lines.map(listItemLabel).filter(Boolean);
  if (listLabels.length < 2) return [];

  const byId = new Map();
  const byTitle = new Map();
  for (const e of entries) {
    if (e.id != null) byId.set(String(e.id).toLowerCase(), e);
    if (e.title) byTitle.set(String(e.title).toLowerCase(), e);
  }

  const matched = [];
  const seen = new Set();
  for (const label of listLabels) {
    const key = label.toLowerCase();
    const hit = byId.get(key) || byTitle.get(key)
      || entries.find((e) => e.id && key.includes(String(e.id).toLowerCase()))
      || entries.find((e) => e.title && key.includes(String(e.title).toLowerCase()));
    if (!hit) continue;
    const value = String(hit.id != null ? hit.id : hit.index);
    if (seen.has(value)) continue;
    seen.add(value);
    matched.push({
      label: String(hit.title || hit.id),
      value,
      kind: 'project',
    });
  }
  return matched.length >= 2 ? matched : [];
}

function introSuggestsChoice(text) {
  return /\b(choose|pick|select|which|your projects|these (are )?(your )?projects|available projects|options?|one of)\b/i.test(String(text || ''));
}

function parseGenericChoices(text) {
  const lines = String(text || '').split('\n');
  const choices = [];
  for (const line of lines) {
    const label = listItemLabel(line);
    if (label) choices.push({ label, value: label, kind: 'choice' });
  }
  if (choices.length < 2 || choices.length > 12) return [];
  if (!introSuggestsChoice(text)) return [];
  return choices;
}

function inferQuickReplies({ reply, toolLog, outline }) {
  const fromTools = fromToolLog(toolLog, outline);
  if (fromTools.length) return fromTools;

  const text = String(reply || '').trim();
  if (!text) return [];

  if (wantsSlotChoice(text)) return slotQuickReplies();

  const projects = matchProjectsInText(text, outline);
  if (projects.length) return projects;

  return parseGenericChoices(text);
}

module.exports = {
  inferQuickReplies,
  projectsFromOutline,
};
