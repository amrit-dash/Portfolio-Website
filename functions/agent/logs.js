/* Thin Cloud Logging fetch — mirrors /logs endpoint for agent tools. */

const LOG_SOURCES = {
  agent: ['agent', 'refine'],
  bot: ['chat', 'inboxProcess', 'inboxPurge', 'inboxWeekly'],
  all: ['agent', 'refine', 'chat', 'inboxProcess', 'inboxPurge', 'inboxWeekly', 'models', 'track', 'clearStats'],
};

function logSurface(svc) {
  if (svc === 'agent' || svc === 'refine') return 'agent';
  if (svc === 'chat' || svc === 'inboxProcess' || svc === 'inboxPurge' || svc === 'inboxWeekly') return 'bot';
  return 'system';
}

let _logging = null;
function loggingClient() {
  if (!_logging) {
    const { Logging } = require('@google-cloud/logging');
    _logging = new Logging();
  }
  return _logging;
}

async function fetchAgentLogs({ source, errorsOnly, limit, sinceMs, beforeMs } = {}) {
  const src = LOG_SOURCES[source] ? source : 'agent';
  const services = LOG_SOURCES[src];
  const lim = Math.min(Math.max(Number(limit) || 60, 1), 300);
  const since = Number(sinceMs) || 0;
  const before = Number(beforeMs) || 0;
  let timeClause = '';
  if (since) timeClause = ` AND timestamp>"${new Date(since).toISOString()}"`;
  else if (before) timeClause = ` AND timestamp<"${new Date(before).toISOString()}"`;

  const svcFilter = services.map((s) => `resource.labels.service_name="${s}"`).join(' OR ');
  let filter = `resource.type="cloud_run_revision" AND (${svcFilter})${timeClause}`;
  if (errorsOnly) filter += ' AND severity>=WARNING';

  const [entries] = await loggingClient().getEntries({ filter, orderBy: 'timestamp desc', pageSize: lim });
  const out = [];
  for (const e of entries) {
    const md = e.metadata || {};
    const svc = (md.resource && md.resource.labels && md.resource.labels.service_name) || '';
    const ts = md.timestamp ? new Date(md.timestamp).getTime() : Date.now();
    const sev = md.severity || 'DEFAULT';
    let msg = '';
    let amritos = null;
    const data = e.data;
    if (typeof data === 'string') msg = data;
    else if (data && typeof data === 'object') {
      amritos = data.amritos || null;
      msg = data.message || '';
    }
    msg = String(msg || '').trim();
    if (!msg) continue;
    out.push({
      ts,
      severity: sev,
      service: svc,
      surface: logSurface(svc),
      message: msg.slice(0, 800),
      ...(amritos ? { kind: amritos.kind, provider: amritos.provider, model: amritos.model, ok: amritos.ok } : {}),
    });
  }
  return { entries: out, now: Date.now(), source: src };
}

module.exports = { LOG_SOURCES, fetchAgentLogs };
