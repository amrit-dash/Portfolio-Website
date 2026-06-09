/* global React */
/* =====================================================
   amrit.os ADMIN — Background AI-inbox runner
   -----------------------------------------------------
   Triage normally blocked you on the AmritBot → Review page: the state lived in
   the page component, so navigating away unmounted it and the in-flight result
   was lost. This is a MODULE-LEVEL singleton instead — the admin is a SPA (hash
   routing, no full reload between pages), so this keeps running across page
   changes. It classifies visitor questions in small chunks via /inboxProcess,
   accumulates suggestions, and syncs each step to Firestore (config/inboxRun) so
   a reload doesn't lose progress. A weekly Cloud Scheduler job also triages new
   questions server-side and writes suggestions there.

   Manual runs are browser-local: closing the tab stops an in-flight manual run.
   ===================================================== */
const { useState: useIxState, useEffect: useIxEffect } = React;

// Questions per backend call. Small chunks keep each request short (dodging the
// long-request timeout that surfaced as "Failed to fetch") and give incremental,
// persisted progress. Daily cap counts per call, but the cap is generous (200).
const INBOX_CHUNK = 5;

const strArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []);
const INBOX_FALLBACK_REASON = 'Classifier did not return a verdict';

function inboxSuggestionHasContent(n) {
  if (!n || typeof n !== 'object') return false;
  return !!(
    (n.suggestedQuestions && n.suggestedQuestions.length)
    || (n.suggestedAnswers && n.suggestedAnswers.length)
    || (n.matchQuestion && String(n.matchQuestion).trim())
    || Number.isInteger(n.matchIndex)
    || (n.phrasing && String(n.phrasing).trim())
    || (n.reason && String(n.reason).trim() && !String(n.reason).includes(INBOX_FALLBACK_REASON))
  );
}

function inboxSuggestionScore(s) {
  const n = normalizeInboxSuggestion(s);
  if (!n) return -1;
  if (n.incomplete && !inboxSuggestionHasContent(n)) return 0;
  let score = 1;
  if (!n.incomplete) score += 4;
  if (n.suggestedQuestions && n.suggestedQuestions.length) score += 3;
  if (n.suggestedAnswers && n.suggestedAnswers.length) score += 3;
  if (n.matchQuestion || Number.isInteger(n.matchIndex)) score += 2;
  if (n.phrasing) score += 1;
  if (n.reason) score += 1;
  if (n.verdict === 'new_question' || n.verdict === 'existing_phrase' || n.verdict === 'irrelevant') score += 1;
  return score;
}

function pickBetterInboxSuggestion(a, b) {
  const sa = inboxSuggestionScore(a);
  const sb = inboxSuggestionScore(b);
  if (sb > sa) return normalizeInboxSuggestion(b);
  if (sa > sb) return normalizeInboxSuggestion(a);
  return normalizeInboxSuggestion(b) || normalizeInboxSuggestion(a);
}

// Normalize suggestion shape from API / Firestore — legacy field names, auto-upgrade incomplete.
function normalizeInboxSuggestion(s) {
  if (!s || typeof s !== 'object') return null;
  const out = { ...s };
  if (!out.id && s.id) out.id = s.id;
  out.suggestedQuestions = strArr(out.suggestedQuestions || s.phrasings || s.questions);
  out.suggestedAnswers = strArr(out.suggestedAnswers || s.answers);
  if (typeof out.phrasing !== 'string' && typeof s.phrasing === 'string') out.phrasing = s.phrasing;
  if (typeof out.matchQuestion !== 'string' && typeof s.matchQuestion === 'string') out.matchQuestion = s.matchQuestion;
  if (typeof out.reason !== 'string') out.reason = out.reason ? String(out.reason) : '';

  if (out.suggestedQuestions.length && out.suggestedAnswers.length) {
    out.verdict = 'new_question';
    delete out.incomplete;
  } else if (out.verdict === 'existing_phrase' && (out.matchQuestion || Number.isInteger(out.matchIndex) || out.phrasing)) {
    delete out.incomplete;
  } else if (out.suggestedQuestions.length && !out.suggestedAnswers.length && out.verdict !== 'existing_phrase') {
    out.verdict = 'new_question';
    delete out.incomplete;
  } else if (out.verdict === 'irrelevant' && out.reason && !out.reason.includes(INBOX_FALLBACK_REASON)) {
    delete out.incomplete;
  } else if (inboxSuggestionHasContent(out)) {
    delete out.incomplete;
  }
  return out;
}

function normalizeInboxRunState(suggestions, processed) {
  const sug = {};
  const proc = { ...(processed || {}) };
  Object.entries(suggestions || {}).forEach(([id, raw]) => {
    const n = normalizeInboxSuggestion(raw);
    if (n) sug[id] = n;
  });
  // Drop orphan processed marks (processed without a stored suggestion).
  Object.keys(proc).forEach((id) => { if (!sug[id]) delete proc[id]; });
  return { suggestions: sug, processed: proc };
}

function needsInboxTriage(id, suggestions, processed, opts) {
  const allowIncomplete = !opts || opts.allowIncomplete !== false;
  const s = suggestions[id] ? normalizeInboxSuggestion(suggestions[id]) : null;
  if (s && !s.incomplete) return false;
  if (s && s.incomplete) return allowIncomplete;
  if (processed[id] && !s) return true;
  return !processed[id];
}

const inboxRunner = {
  running: false,
  suggestions: {},   // questionId -> suggestion
  processed: {},     // questionId -> true (classified, even if no actionable suggestion)
  questionIds: [],   // latest known inbox ids (for sidebar pending badge)
  total: 0,
  done: 0,
  error: null,
  hydrated: false,
  listeners: new Set(),
  _loaded: false,

  emit() { this.listeners.forEach((l) => { try { l(); } catch (e) {} }); },

  pendingCount() {
    return (this.questionIds || []).filter((id) => needsInboxTriage(id, this.suggestions, this.processed)).length;
  },

  syncQuestionIds(ids) {
    this.questionIds = (ids || []).filter(Boolean);
    this.emit();
  },

  // Restore a prior run once per session (so a reload shows ready suggestions).
  async loadPersisted() {
    if (this._loaded) return;
    this._loaded = true;
    await this.reloadPersisted();
    this.refreshInboxIds();
  },

  async refreshInboxIds() {
    try {
      const qs = await window.ADMIN_STORE.Store.fsBotQuestions(100);
      this.syncQuestionIds((qs || []).map((q) => q.id));
    } catch (e) { /* ignore */ }
  },

  // Re-read config/inboxRun (e.g. after server purge or weekly auto-triage).
  async reloadPersisted() {
    try {
      const d = await window.ADMIN_STORE.Store.fsLoadInboxRun();
      if (d) {
        const norm = normalizeInboxRunState(d.suggestions, d.processed);
        const mergedSug = { ...this.suggestions };
        Object.entries(norm.suggestions).forEach(([id, remote]) => {
          mergedSug[id] = pickBetterInboxSuggestion(mergedSug[id], remote);
        });
        Object.keys(mergedSug).forEach((id) => {
          const n = normalizeInboxSuggestion(mergedSug[id]);
          if (n) mergedSug[id] = n; else delete mergedSug[id];
        });
        const mergedProc = { ...this.processed, ...norm.processed };
        Object.keys(mergedProc).forEach((id) => { if (!mergedSug[id]) delete mergedProc[id]; });
        this.suggestions = mergedSug;
        this.processed = mergedProc;
        this.emit();
      }
    } catch (e) { /* ignore */ }
    finally { this.hydrated = true; this.emit(); }
  },

  async _persist(removeIds) {
    await window.ADMIN_STORE.Store.fsSaveInboxRun({
      suggestions: this.suggestions,
      processed: this.processed,
      removeIds: removeIds || [],
    });
  },

  _mergeSuggestions(list) {
    (list || []).forEach((raw) => {
      if (!raw || !raw.id) return;
      const s = normalizeInboxSuggestion(raw);
      if (!s) return;
      this.suggestions[s.id] = s;
      this.processed[s.id] = true;
    });
  },

  // Classify the given question ids in the background. Skips complete suggestions;
  // re-triages incomplete or ghost-processed rows.
  async start(ids) {
    if (this.running) return;
    const todo = (ids || []).filter((id) => id && needsInboxTriage(id, this.suggestions, this.processed));
    if (!todo.length) return;
    this.running = true; this.error = null; this.total = todo.length; this.done = 0; this.emit();
    try {
      for (let i = 0; i < todo.length; i += INBOX_CHUNK) {
        const chunk = todo.slice(i, i + INBOX_CHUNK);
        const res = await window.ADMIN_STORE.Store.inboxProcess(chunk);
        if (res && Array.isArray(res.suggestions)) this._mergeSuggestions(res.suggestions);
        this.done = Math.min(this.total, i + chunk.length);
        // A hard error with NO partial suggestions (e.g. daily cap, no config) —
        // stop the run and surface it.
        if (res && res.error && !(res.suggestions && res.suggestions.length)) {
          this.error = res.message || res.error;
          await this._persistChunk(chunk);
          if (res.error === 'daily-cap' || res.error === 'no-config' || res.error === 'unreachable' || res.error === 'forbidden') break;
        }
        this.emit();
        await this._persistChunk(chunk);
        // Reconcile with server merge so a concurrent weekly job isn't clobbered.
        await this.reloadPersisted();
      }
    } catch (e) {
      this.error = (e && e.message) || 'inbox processing failed';
    } finally {
      this.running = false; this.emit();
    }
  },

  // Field-level Firestore patch for just-written ids (avoids replacing the whole map).
  async _persistChunk(ids) {
    const sugPatch = {};
    const procPatch = {};
    (ids || []).forEach((id) => {
      if (this.suggestions[id]) sugPatch[id] = this.suggestions[id];
      if (this.processed[id]) procPatch[id] = this.processed[id];
    });
    if (Object.keys(sugPatch).length || Object.keys(procPatch).length) {
      await window.ADMIN_STORE.Store.fsSaveInboxRun({ suggestions: sugPatch, processed: procPatch });
    }
  },

  // A question was added to Q&A or dismissed — drop its run state.
  resolve(id) {
    if (!(id in this.suggestions) && !(id in this.processed)) return;
    delete this.suggestions[id]; delete this.processed[id];
    this.emit(); this._persist([id]);
  },

  clearError() { if (this.error) { this.error = null; this.emit(); } },

  clear() {
    const removeIds = [...new Set([...Object.keys(this.suggestions), ...Object.keys(this.processed)])];
    this.suggestions = {}; this.processed = {}; this.total = 0; this.done = 0; this.error = null;
    this.emit(); this._persist(removeIds);
  },
};

// Subscribe a component to the runner (re-renders on every emit).
function useInboxRunner() {
  const [, force] = useIxState(0);
  useIxEffect(() => {
    const l = () => force((n) => n + 1);
    inboxRunner.listeners.add(l);
    inboxRunner.loadPersisted();
    return () => inboxRunner.listeners.delete(l);
  }, []);
  return inboxRunner;
}

// Shown while a background run is active so triage progress survives navigation.
// Rendered in the sidebar (desktop) and topbar (mobile) — see admin.css.
function InboxRunnerIndicator({ go, placement = 'sidebar' }) {
  const r = useInboxRunner();
  if (!r.running) return null;
  return (
    <button className={'inboxrun inboxrun--' + placement} onClick={() => go && go('bot')} title="Open AmritBot → Review">
      <span className="inboxrun__spin" />
      <span className="inboxrun__t">Triaging inbox… {r.done}/{r.total}</span>
    </button>
  );
}

window.ADMIN_INBOX = {
  inboxRunner, useInboxRunner, InboxRunnerIndicator,
  normalizeInboxSuggestion, needsInboxTriage, inboxSuggestionHasContent,
};
