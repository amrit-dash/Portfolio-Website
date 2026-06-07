/* Read-only insight helpers — draft summaries, diffs, health, search, analytics. */

const { stripKeys } = require('./publish');
const { deepClone, getAtPath } = require('./content-ops');

function stableStringify(value) {
  return JSON.stringify(value, function (_k, v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const out = {};
      for (const key of Object.keys(v).sort()) out[key] = v[key];
      return out;
    }
    return v;
  });
}

function stabilizeArrays(node) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) {
    if (node.length && node.every((item) => item && typeof item.id === 'string')) {
      return [...node].sort((a, b) => a.id.localeCompare(b.id)).map((item) => stabilizeArrays(item));
    }
    return node.map((item) => stabilizeArrays(item));
  }
  const out = {};
  for (const k of Object.keys(node)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] = stabilizeArrays(node[k]);
  }
  return out;
}

function contentFingerprint(content) {
  const snap = stripKeys(deepClone(content || {}));
  return stableStringify(stabilizeArrays(snap));
}

function draftMatchesPublished(draft, published) {
  if (!published) return false;
  return contentFingerprint(draft) === contentFingerprint(published);
}

function isEmpty(val) {
  if (val == null) return true;
  if (typeof val === 'string') return !val.trim();
  if (Array.isArray(val)) return val.length === 0;
  return false;
}

function summarizeContent(content) {
  const c = content || {};
  const sections = {};
  const emptyFields = [];
  const missing = { images: [], cvs: [] };

  const checkStr = (path, val) => {
    if (isEmpty(val)) emptyFields.push(path);
  };

  if (c.hero) {
    sections.hero = { keys: Object.keys(c.hero).length };
    checkStr('hero.pitch', c.hero.pitch);
    checkStr('hero.sub', c.hero.sub);
  }
  if (c.about) {
    sections.about = {
      impact: Array.isArray(c.about.impact) ? c.about.impact.length : 0,
      meta: Array.isArray(c.about.meta) ? c.about.meta.length : 0,
    };
    checkStr('about.intro', c.about.intro);
  }
  if (Array.isArray(c.projects)) {
    sections.projects = { count: c.projects.length };
    c.projects.forEach((p, i) => {
      if (!p || !p.image) missing.images.push(`projects.${i} (${p && p.id})`);
      checkStr(`projects.${i}.title`, p && p.title);
      checkStr(`projects.${i}.desc`, p && p.desc);
    });
  }
  if (Array.isArray(c.expertise)) {
    sections.expertise = { count: c.expertise.length };
    if (!c.expertise.length) emptyFields.push('expertise');
  }
  if (Array.isArray(c.experience)) {
    sections.experience = { count: c.experience.length };
  }
  if (Array.isArray(c.cards)) {
    sections.cards = { count: c.cards.length };
  }
  if (c.media) {
    if (!c.media.cvLight) missing.cvs.push('media.cvLight');
    if (!c.media.cvDark) missing.cvs.push('media.cvDark');
  }
  if (c.bot) {
    sections.bot = {
      qa: Array.isArray(c.bot.qa) ? c.bot.qa.length : 0,
      commands: Array.isArray(c.bot.commands) ? c.bot.commands.length : 0,
    };
  }

  return { sections, emptyFields: emptyFields.slice(0, 40), missing };
}

function diffPaths(draft, published, prefix, out, depth) {
  if (depth > 12) return;
  const d = draft;
  const p = published;
  if (d === p) return;
  if (d == null && p == null) return;
  if (typeof d !== typeof p || Array.isArray(d) !== Array.isArray(p)) {
    out.push({ path: prefix || '(root)', before: summarizeValue(p), after: summarizeValue(d) });
    return;
  }
  if (typeof d !== 'object' || d == null) {
    if (d !== p) out.push({ path: prefix, before: summarizeValue(p), after: summarizeValue(d) });
    return;
  }
  if (Array.isArray(d)) {
    if (JSON.stringify(d) !== JSON.stringify(p)) {
      out.push({ path: prefix, before: `array(${Array.isArray(p) ? p.length : 0})`, after: `array(${d.length})` });
    }
    return;
  }
  const keys = new Set([...Object.keys(d || {}), ...Object.keys(p || {})]);
  for (const k of keys) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    const child = prefix ? `${prefix}.${k}` : k;
    if (/^bot\.providers/.test(child)) continue;
    diffPaths(d[k], p && p[k], child, out, depth + 1);
  }
}

function summarizeValue(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v.length > 120 ? v.slice(0, 120) + '…' : v;
  if (Array.isArray(v)) return `array(${v.length})`;
  if (typeof v === 'object') return `object(${Object.keys(v).length} keys)`;
  return v;
}

function compareDraftToPublished(draft, published) {
  const changes = [];
  diffPaths(draft, published, '', changes, 0);
  return {
    changedCount: changes.length,
    changes: changes.slice(0, 60),
    truncated: changes.length > 60,
  };
}

function getSiteHealth(content) {
  const issues = [];
  const c = content || {};

  const assetPath = (s) => {
    if (!s || typeof s !== 'string') return false;
    if (/^https?:\/\//i.test(s) || /^assets\//.test(s)) return true;
    return false;
  };

  if (Array.isArray(c.projects)) {
    c.projects.forEach((p, i) => {
      if (!p) return;
      if (!p.image) issues.push({ severity: 'warn', path: `projects.${i}.image`, message: `Project "${p.id || i}" missing thumbnail` });
      else if (!assetPath(p.image)) issues.push({ severity: 'error', path: `projects.${i}.image`, message: `Invalid thumb path: ${p.image}` });
      if (Array.isArray(p.gallery)) {
        p.gallery.forEach((g, gi) => {
          if (g && !assetPath(g)) issues.push({ severity: 'error', path: `projects.${i}.gallery.${gi}`, message: `Invalid gallery path: ${g}` });
        });
      }
    });
  }

  if (!Array.isArray(c.expertise) || !c.expertise.length) {
    issues.push({ severity: 'warn', path: 'expertise', message: 'Expertise section is empty' });
  }

  if (c.media) {
    if (c.media.cvLight && !assetPath(c.media.cvLight)) issues.push({ severity: 'error', path: 'media.cvLight', message: 'Invalid CV light path' });
    if (c.media.cvDark && !assetPath(c.media.cvDark)) issues.push({ severity: 'error', path: 'media.cvDark', message: 'Invalid CV dark path' });
  }

  if (!c.hero || isEmpty(c.hero.pitch)) {
    issues.push({ severity: 'warn', path: 'hero.pitch', message: 'Hero pitch is empty' });
  }

  return { issueCount: issues.length, issues: issues.slice(0, 50) };
}

function flattenSearch(node, path, hits, query, limit) {
  if (hits.length >= limit) return;
  const q = query.toLowerCase();
  if (node == null) return;
  if (typeof node === 'string') {
    if (node.toLowerCase().includes(q)) hits.push({ path, snippet: node.slice(0, 200) });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => flattenSearch(item, `${path}.${i}`, hits, query, limit));
    return;
  }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const child = path ? `${path}.${k}` : k;
      if (/^bot\.providers/.test(child)) continue;
      flattenSearch(node[k], child, hits, query, limit);
    }
  }
}

function searchContent(content, query, pathPrefix, limit) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return { ok: false, error: 'query-too-short' };
  const hits = [];
  const root = pathPrefix ? getAtPath(content, pathPrefix) : content;
  if (pathPrefix && root === undefined) return { ok: false, error: 'path-not-found', path: pathPrefix };
  flattenSearch(root, pathPrefix || '', hits, q, Math.min(limit || 30, 50));
  return { ok: true, query: q, count: hits.length, hits };
}

function sumMap(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  return Object.values(obj).reduce((s, v) => s + (Number(v) || 0), 0);
}

function topEntries(map, n) {
  if (!map || typeof map !== 'object') return [];
  return Object.entries(map)
    .map(([k, v]) => ({ key: k, count: Number(v) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

async function readAnalytics(db, { eventLimit } = {}) {
  const lim = Math.min(Number(eventLimit) || 30, 100);
  let global = {};
  let events = [];
  let daily = [];
  try {
    const g = await db.doc('stats/global').get();
    global = g.exists ? g.data() : {};
  } catch (e) { /* empty */ }
  try {
    const ev = await db.collection('events').orderBy('at', 'desc').limit(lim).get();
    events = ev.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        type: data.type,
        source: data.source,
        country: data.country,
        at: data.at,
        meta: data.meta || null,
      };
    });
  } catch (e) { /* empty */ }
  try {
    const d = await db.collection('stats_daily').orderBy('date', 'desc').limit(14).get();
    daily = d.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (e) { /* empty */ }
  return { global, events, daily };
}

async function getAnalyticsInsights(db) {
  const { global, daily } = await readAnalytics(db, { eventLimit: 0 });
  const days = daily.slice(0, 14);
  const thisWeek = days.slice(0, 7);
  const lastWeek = days.slice(7, 14);

  const sumField = (arr, field) => arr.reduce((s, d) => s + (Number(d[field]) || 0), 0);
  const wow = {
    views: { thisWeek: sumField(thisWeek, 'views'), lastWeek: sumField(lastWeek, 'views') },
    botChats: { thisWeek: sumField(thisWeek, 'botChats'), lastWeek: sumField(lastWeek, 'botChats') },
    projectOpens: { thisWeek: sumField(thisWeek, 'projectOpens'), lastWeek: sumField(lastWeek, 'projectOpens') },
  };

  const bySource = {};
  const byProject = {};
  for (const d of thisWeek) {
    if (d.bySource) {
      for (const [k, v] of Object.entries(d.bySource)) bySource[k] = (bySource[k] || 0) + (Number(v) || 0);
    }
    if (d.byProject) {
      for (const [k, v] of Object.entries(d.byProject)) byProject[k] = (byProject[k] || 0) + (Number(v) || 0);
    }
  }

  return {
    globalCounters: {
      views: global.views || 0,
      botChats: global.botChats || 0,
      projectOpens: global.projectOpens || 0,
      cvDownloads: global.cvDownloads || 0,
    },
    weekOverWeek: wow,
    topReferrers: topEntries(bySource, 8),
    topProjects: topEntries(byProject, 8),
    recentDaily: days.slice(0, 7).map((d) => ({
      date: d.date || d.id,
      views: d.views || 0,
      botChats: d.botChats || 0,
    })),
  };
}

function tsToMs(ts) {
  if (!ts) return null;
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return null;
}

module.exports = {
  stableStringify,
  contentFingerprint,
  draftMatchesPublished,
  summarizeContent,
  compareDraftToPublished,
  getSiteHealth,
  searchContent,
  readAnalytics,
  getAnalyticsInsights,
  tsToMs,
  sumMap,
  topEntries,
};
