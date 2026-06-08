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

const inboxRunner = {
  running: false,
  suggestions: {},   // questionId -> suggestion
  processed: {},     // questionId -> true (classified, even if no actionable suggestion)
  total: 0,
  done: 0,
  error: null,
  listeners: new Set(),
  _loaded: false,

  emit() { this.listeners.forEach((l) => { try { l(); } catch (e) {} }); },

  // Restore a prior run once per session (so a reload shows ready suggestions).
  async loadPersisted() {
    if (this._loaded) return;
    this._loaded = true;
    await this.reloadPersisted();
  },

  // Re-read config/inboxRun (e.g. after server purge or weekly auto-triage).
  async reloadPersisted() {
    try {
      const d = await window.ADMIN_STORE.Store.fsLoadInboxRun();
      if (d) {
        this.suggestions = d.suggestions || {};
        this.processed = d.processed || {};
        this.emit();
      }
    } catch (e) { /* ignore */ }
  },

  _persist() {
    window.ADMIN_STORE.Store.fsSaveInboxRun({ suggestions: this.suggestions, processed: this.processed });
  },

  // Classify the given question ids in the background. Skips ids that already
  // have a stored suggestion; allows re-triage when processed but no suggestion.
  async start(ids) {
    if (this.running) return;
    const todo = (ids || []).filter((id) => id && !this.suggestions[id]);
    if (!todo.length) return;
    this.running = true; this.error = null; this.total = todo.length; this.done = 0; this.emit();
    try {
      for (let i = 0; i < todo.length; i += INBOX_CHUNK) {
        const chunk = todo.slice(i, i + INBOX_CHUNK);
        const res = await window.ADMIN_STORE.Store.inboxProcess(chunk);
        if (res && Array.isArray(res.suggestions)) {
          res.suggestions.forEach((s) => {
            if (s && s.id) {
              this.suggestions[s.id] = s;
              this.processed[s.id] = true;
            }
          });
        }
        this.done = Math.min(this.total, i + chunk.length);
        // A hard error with NO partial suggestions (e.g. daily cap, no config) —
        // stop the run and surface it.
        if (res && res.error && !(res.suggestions && res.suggestions.length)) {
          this.error = res.message || res.error;
          this._persist();
          if (res.error === 'daily-cap' || res.error === 'no-config' || res.error === 'unreachable' || res.error === 'forbidden') break;
        }
        this.emit();
        this._persist();
      }
    } catch (e) {
      this.error = (e && e.message) || 'inbox processing failed';
    } finally {
      this.running = false; this.emit();
    }
  },

  // A question was added to Q&A or dismissed — drop its run state.
  resolve(id) {
    if (!(id in this.suggestions) && !(id in this.processed)) return;
    delete this.suggestions[id]; delete this.processed[id];
    this.emit(); this._persist();
  },

  clearError() { if (this.error) { this.error = null; this.emit(); } },

  clear() {
    this.suggestions = {}; this.processed = {}; this.total = 0; this.done = 0; this.error = null;
    this.emit(); this._persist();
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

// Global pill shown on EVERY page while a background run is active, so you know
// triage is still going after you've navigated away from the AmritBot page.
function InboxRunnerIndicator({ go }) {
  const r = useInboxRunner();
  if (!r.running) return null;
  return (
    <button className="inboxrun" onClick={() => go && go('bot')} title="Open AmritBot → Review">
      <span className="inboxrun__spin" />
      <span className="inboxrun__t">Triaging inbox… {r.done}/{r.total}</span>
    </button>
  );
}

window.ADMIN_INBOX = { inboxRunner, useInboxRunner, InboxRunnerIndicator };
