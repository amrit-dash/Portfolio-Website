/* global React */
/* =====================================================
   amrit.os ADMIN — read-only function-log feed
   -----------------------------------------------------
   A reusable view over /logs (Cloud Logging, owner-only). Hydrates from a
   small localStorage cache for instant display, fetches the most recent page
   from the server (no arbitrary time window), polls for newer entries live,
   and lazy-loads older entries on scroll. Used by Agent logs, AmritBot logs,
   and Analytics "Function logs" — driven by `source` ('agent' | 'bot' | 'all').
   ===================================================== */
const { useState: useLState, useEffect: useLEffect, useRef: useLRef, useCallback: useLCallback } = React;

const LOG_POLL_MS = 8000;

function fmtLogTime(ms) {
  try {
    const d = new Date(ms);
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const today = new Date(); const sameDay = d.toDateString() === today.toDateString();
    return sameDay ? t : (d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + t);
  } catch (e) { return ''; }
}
function logSevClass(sev) {
  const s = String(sev || '').toUpperCase();
  if (s === 'ERROR' || s === 'CRITICAL' || s === 'ALERT' || s === 'EMERGENCY') return 'log--err';
  if (s === 'WARNING') return 'log--warn';
  if (s === 'INFO' || s === 'NOTICE') return 'log--info';
  return 'log--debug';
}
// Friendly label for where the line came from (function + LLM surface).
function logTag(e) {
  if (e.kind) return e.kind;                 // bot:llm / agent:llm / agent:refine / bot:inbox
  if (e.service) return e.service;
  return e.surface || 'system';
}

const LOG_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'errors', label: 'Errors' },
];

function LogsView({ source = 'all', height = 460, showSource = false }) {
  const { AdminIcon, Segmented } = window.ADMIN_UI;
  const Store = window.ADMIN_STORE.Store;

  const [entries, setEntries] = useLState([]);
  const [loading, setLoading] = useLState(false);
  const [olderLoading, setOlderLoading] = useLState(false);
  const [olderDone, setOlderDone] = useLState(false);
  const [filter, setFilter] = useLState('all');
  const [live, setLive] = useLState(true);
  const [err, setErr] = useLState('');

  const newestRef = useLRef(0);
  const oldestRef = useLRef(0);
  const seenRef = useLRef(new Set());
  const liveRef = useLRef(true);
  const busyRef = useLRef(false);            // guards overlapping fetches

  const keyOf = (e) => e.ts + '|' + (e.service || '') + '|' + (e.message || '').slice(0, 80);
  const errorsOnly = filter === 'errors';
  const cacheKey = 'amritos.logcache.' + source;

  // Hydrate from cache on mount / source change so the feed is instant. Always
  // reset when `source` changes so one tab's entries never bleed into another.
  useLEffect(() => {
    let rows = [];
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      if (Array.isArray(cached) && cached.length) rows = cached.slice().sort((a, b) => b.ts - a.ts);
    } catch (e) { /* ignore */ }
    const seen = new Set(); rows.forEach((r) => seen.add(keyOf(r))); seenRef.current = seen;
    newestRef.current = rows.length ? rows[0].ts : 0;
    oldestRef.current = rows.length ? rows[rows.length - 1].ts : 0;
    setOlderDone(false);
    setEntries(rows);
  }, [source]);

  // Persist the current "all" feed (not a filtered subset) for next time.
  useLEffect(() => {
    if (errorsOnly || !entries.length) return;
    try { localStorage.setItem(cacheKey, JSON.stringify(entries.slice(0, 120))); } catch (e) { /* quota */ }
  }, [entries, errorsOnly, cacheKey]);

  // Refresh from server. "All" merges into cache so a quiet last hour never
  // wipes older cached lines; "Errors" replaces because it is a different query.
  const loadInitial = useLCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true; setLoading(true); setErr('');
    const res = await Store.fetchLogs({ source, errorsOnly });
    busyRef.current = false; setLoading(false);
    if (res && res.error) { setErr(res.message || res.error); return; }
    const rows = (res.entries || []).slice().sort((a, b) => b.ts - a.ts);

    if (errorsOnly) {
      const seen = new Set(); rows.forEach((r) => seen.add(keyOf(r)));
      seenRef.current = seen;
      newestRef.current = rows.length ? rows[0].ts : (res.now || Date.now());
      oldestRef.current = rows.length ? rows[rows.length - 1].ts : (res.now || Date.now());
      setOlderDone(rows.length < 60);
      setEntries(rows);
      return;
    }

    setEntries((prev) => {
      const map = new Map();
      prev.forEach((r) => map.set(keyOf(r), r));
      rows.forEach((r) => map.set(keyOf(r), r));
      const all = Array.from(map.values()).sort((a, b) => b.ts - a.ts);
      const seen = new Set(); all.forEach((r) => seen.add(keyOf(r)));
      seenRef.current = seen;
      newestRef.current = all.length ? all[0].ts : (res.now || Date.now());
      oldestRef.current = all.length ? all[all.length - 1].ts : (res.now || Date.now());
      return all;
    });
    setOlderDone(rows.length < 60);
  }, [source, errorsOnly]);

  // Live poll: only newer-than-newest, prepended.
  const pollNewer = useLCallback(async () => {
    if (busyRef.current || !liveRef.current || !newestRef.current) return;
    busyRef.current = true;
    const res = await Store.fetchLogs({ source, errorsOnly, sinceMs: newestRef.current });
    busyRef.current = false;
    if (!res || res.error || !res.entries || !res.entries.length) return;
    const fresh = res.entries.filter((e) => !seenRef.current.has(keyOf(e)));
    if (!fresh.length) return;
    fresh.forEach((e) => seenRef.current.add(keyOf(e)));
    setEntries((prev) => {
      const all = fresh.concat(prev).sort((a, b) => b.ts - a.ts);
      newestRef.current = all[0].ts;
      return all;
    });
  }, [source, errorsOnly]);

  // Lazy older page on scroll.
  const loadOlder = useLCallback(async () => {
    if (busyRef.current || olderDone || !oldestRef.current) return;
    busyRef.current = true; setOlderLoading(true);
    const res = await Store.fetchLogs({ source, errorsOnly, beforeMs: oldestRef.current });
    busyRef.current = false; setOlderLoading(false);
    if (!res || res.error) return;
    const rows = (res.entries || []);
    const fresh = rows.filter((e) => !seenRef.current.has(keyOf(e)));
    fresh.forEach((e) => seenRef.current.add(keyOf(e)));
    if (rows.length < 60) setOlderDone(true);
    if (!fresh.length) return;
    setEntries((prev) => {
      const all = prev.concat(fresh).sort((a, b) => b.ts - a.ts);
      oldestRef.current = all[all.length - 1].ts;
      return all;
    });
  }, [source, errorsOnly, olderDone]);

  useLEffect(() => { liveRef.current = live; }, [live]);

  // (Re)load when source/filter change, then poll on an interval while live.
  useLEffect(() => {
    loadInitial();
    const id = setInterval(() => { pollNewer(); }, LOG_POLL_MS);
    return () => clearInterval(id);
  }, [loadInitial, pollNewer]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) loadOlder();
  };

  return (
    <div className="logs">
      <div className="logs__bar">
        <span className={'logs__live' + (live ? ' on' : '')} title={live ? 'Live — polling for new entries' : 'Paused'}>
          <span className="logs__livedot" />{live ? 'live' : 'paused'}
        </span>
        <span className="helptext" style={{ marginLeft: 2 }}>newest first · {entries.length} shown</span>
        <span className="spacer" style={{ flex: 1 }} />
        <Segmented value={filter} options={LOG_FILTERS} onChange={setFilter} />
        <button type="button" className="composer__tool" title={live ? 'Pause live updates' : 'Resume live updates'} onClick={() => setLive((v) => !v)}>
          <AdminIcon name={live ? 'eye-off' : 'eye'} size={15} />
        </button>
        <button type="button" className="composer__tool" title="Reload" onClick={loadInitial}>
          <AdminIcon name="reset" size={15} />
        </button>
      </div>

      {err && <div className="helptext" style={{ color: '#e0a341', padding: '6px 2px' }}>⚠ {err}</div>}

      <div className="logs__scroll" style={{ maxHeight: height }} onScroll={onScroll}>
        {entries.length === 0 ? (
          <div className="logs__empty">{loading ? 'Loading logs…' : 'No log entries yet. Trigger the agent, the bot, or a test to see activity here.'}</div>
        ) : (
          <ul className="logs__list">
            {entries.map((e, i) => (
              <li key={i} className={'logline ' + logSevClass(e.severity)}>
                <span className="logline__time">{fmtLogTime(e.ts)}</span>
                <span className={'logline__sev ' + logSevClass(e.severity)}>{String(e.severity || '').slice(0, 4) || '·'}</span>
                <span className="logline__tag">{logTag(e)}</span>
                <span className="logline__msg">{e.message}</span>
              </li>
            ))}
          </ul>
        )}
        {!olderDone && entries.length > 0 && (
          <div className="activity__foot helptext">
            {olderLoading ? 'Loading older…' : <button className="linkbtn" onClick={loadOlder}>Load older</button>}
          </div>
        )}
      </div>
    </div>
  );
}

window.ADMIN_LOGS = { LogsView };
