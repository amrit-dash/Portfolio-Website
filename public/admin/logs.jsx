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

function fmtLogTimeParts(ms) {
  try {
    const d = new Date(ms);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) {
      return {
        label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    }
    const day = d.getDate();
    const month = d.toLocaleDateString([], { month: 'short' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { label: day + ' ' + month + ', ' + time };
  } catch (e) { return { label: '' }; }
}

function readClearedAt(key) {
  try { return Number(localStorage.getItem(key)) || 0; } catch (e) { return 0; }
}

function readLogCache(cacheKey, clearedAtKey) {
  const clearedAt = readClearedAt(clearedAtKey);
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    if (!Array.isArray(cached) || !cached.length) return [];
    return cached
      .filter((r) => !clearedAt || (Number(r.ts) || 0) >= clearedAt)
      .slice()
      .sort((a, b) => b.ts - a.ts);
  } catch (e) { return []; }
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
  const fetchBusyRef = useLRef(false);         // initial + older pages
  const pollBusyRef = useLRef(false);
  const loadGenRef = useLRef(0);               // ignore stale responses after filter/source change

  const keyOf = (e) => e.ts + '|' + (e.service || '') + '|' + (e.message || '').slice(0, 80);
  const errorsOnly = filter === 'errors';
  const cacheKey = 'amritos.logcache.' + source;
  const clearedAtKey = cacheKey + '.clearedAt';

  const syncRefs = useLCallback((rows) => {
    const seen = new Set();
    rows.forEach((r) => seen.add(keyOf(r)));
    seenRef.current = seen;
    newestRef.current = rows.length ? rows[0].ts : 0;
    oldestRef.current = rows.length ? rows[rows.length - 1].ts : 0;
  }, []);

  const afterClearedAt = useLCallback((rows) => {
    const clearedAt = readClearedAt(clearedAtKey);
    if (!clearedAt) return rows;
    return rows.filter((r) => (Number(r.ts) || 0) >= clearedAt);
  }, [clearedAtKey]);

  // Hydrate from cache when source changes or when switching back to "All".
  // Errors is a separate server query — don't show the cached "all" feed there.
  useLEffect(() => {
    if (errorsOnly) {
      seenRef.current = new Set();
      newestRef.current = 0;
      oldestRef.current = 0;
      setEntries([]);
      setOlderDone(false);
      return;
    }
    const rows = readLogCache(cacheKey, clearedAtKey);
    syncRefs(rows);
    setOlderDone(false);
    setEntries(rows);
  }, [source, errorsOnly, cacheKey, clearedAtKey, syncRefs]);

  // Persist the current "all" feed (not a filtered subset) for next time.
  useLEffect(() => {
    if (errorsOnly || !entries.length) return;
    try { localStorage.setItem(cacheKey, JSON.stringify(entries.slice(0, 120))); } catch (e) { /* quota */ }
  }, [entries, errorsOnly, cacheKey]);

  // Refresh from server. "All" merges into cache so a quiet last hour never
  // wipes older cached lines; "Errors" replaces because it is a different query.
  const loadInitial = useLCallback(async () => {
    if (fetchBusyRef.current) return;
    const gen = ++loadGenRef.current;
    fetchBusyRef.current = true;
    setLoading(true);
    setErr('');
    const clearedAt = readClearedAt(clearedAtKey);
    const res = await Store.fetchLogs({
      source,
      errorsOnly,
      sinceMs: clearedAt || 0,
    });
    fetchBusyRef.current = false;
    if (gen !== loadGenRef.current) return;
    setLoading(false);
    if (res && res.error) { setErr(res.message || res.error); return; }
    let rows = afterClearedAt((res.entries || []).slice().sort((a, b) => b.ts - a.ts));

    if (errorsOnly) {
      syncRefs(rows);
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
      syncRefs(all);
      newestRef.current = all.length ? all[0].ts : (res.now || Date.now());
      oldestRef.current = all.length ? all[all.length - 1].ts : (res.now || Date.now());
      return all;
    });
    setOlderDone(rows.length < 60);
  }, [source, errorsOnly, clearedAtKey, afterClearedAt, syncRefs]);

  const clearLogs = useLCallback(() => {
    const now = Date.now();
    try {
      localStorage.removeItem(cacheKey);
      localStorage.setItem(clearedAtKey, String(now));
    } catch (e) { /* quota */ }
    fetchBusyRef.current = false;
    seenRef.current = new Set();
    newestRef.current = now;
    oldestRef.current = now;
    setEntries([]);
    setOlderDone(true);
    setErr('');
    loadInitial();
  }, [cacheKey, clearedAtKey, loadInitial]);

  // Live poll: only newer-than-newest, prepended.
  const pollNewer = useLCallback(async () => {
    if (fetchBusyRef.current || pollBusyRef.current || !liveRef.current) return;
    const sinceMs = Math.max(newestRef.current || 0, readClearedAt(clearedAtKey));
    if (!sinceMs && !errorsOnly) return;
    pollBusyRef.current = true;
    const res = await Store.fetchLogs({ source, errorsOnly, sinceMs: sinceMs || undefined });
    pollBusyRef.current = false;
    if (!res || res.error || !res.entries || !res.entries.length) return;
    const fresh = afterClearedAt(res.entries.filter((e) => !seenRef.current.has(keyOf(e))));
    if (!fresh.length) return;
    fresh.forEach((e) => seenRef.current.add(keyOf(e)));
    setEntries((prev) => {
      const all = fresh.concat(prev).sort((a, b) => b.ts - a.ts);
      newestRef.current = all[0].ts;
      return all;
    });
  }, [source, errorsOnly, clearedAtKey, afterClearedAt]);

  // Lazy older page on scroll.
  const loadOlder = useLCallback(async () => {
    if (fetchBusyRef.current || olderDone || !oldestRef.current || readClearedAt(clearedAtKey)) return;
    fetchBusyRef.current = true;
    setOlderLoading(true);
    const res = await Store.fetchLogs({ source, errorsOnly, beforeMs: oldestRef.current });
    fetchBusyRef.current = false;
    setOlderLoading(false);
    if (!res || res.error) return;
    const rows = afterClearedAt(res.entries || []);
    const fresh = rows.filter((e) => !seenRef.current.has(keyOf(e)));
    fresh.forEach((e) => seenRef.current.add(keyOf(e)));
    if (rows.length < 60) setOlderDone(true);
    if (!fresh.length) return;
    setEntries((prev) => {
      const all = prev.concat(fresh).sort((a, b) => b.ts - a.ts);
      oldestRef.current = all[all.length - 1].ts;
      return all;
    });
  }, [source, errorsOnly, olderDone, afterClearedAt]);

  useLEffect(() => { liveRef.current = live; }, [live]);

  // (Re)load when source/filter change, then poll on an interval while live.
  useLEffect(() => {
    loadInitial();
    const id = setInterval(() => { pollNewer(); }, LOG_POLL_MS);
    return () => {
      loadGenRef.current += 1;
      fetchBusyRef.current = false;
      clearInterval(id);
    };
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
        <button type="button" className="composer__tool" title="Clear logs — hide everything before now and only show new entries" onClick={clearLogs}>
          <AdminIcon name="trash" size={15} />
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
            {entries.map((e, i) => {
              const when = fmtLogTimeParts(e.ts);
              return (
              <li key={i} className={'logline ' + logSevClass(e.severity)}>
                <span className="logline__time">{when.label}</span>
                <span className={'logline__sev ' + logSevClass(e.severity)}>{String(e.severity || '').slice(0, 4) || '·'}</span>
                <span className="logline__tag">{logTag(e)}</span>
                <span className="logline__msg">{e.message}</span>
              </li>
            );})}
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
