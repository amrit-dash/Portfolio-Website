/* Generic agent tools — readContent / setContentPath core (U2). */

const { pathString } = require('./guards');

const GENERIC_TOOLS = [
  {
    name: 'readContent',
    description: 'Read a slice of the portfolio draft by dot-path (e.g. hero, about.meta, projects.0). Use to inspect before editing.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Dot-path into content/draft' },
      },
      required: ['path'],
    },
    mutates: false,
  },
  {
    name: 'setContentPath',
    description: 'Set a value at a dot-path in the portfolio draft. Blocked paths include bot.providers*, bot.behavior*, config/llm.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Dot-path to set' },
        value: { description: 'JSON value to write at the path' },
      },
      required: ['path', 'value'],
    },
    mutates: true,
  },
];

function parseToolArgs(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return { _parseError: true, raw: raw.slice(0, 500) }; }
  }
  return { _parseError: true };
}

function executeTool(name, args, session) {
  const a = parseToolArgs(args);
  if (a._parseError) return { ok: false, error: 'malformed-args' };

  if (name === 'readContent') {
    const path = a.path;
    if (!path || typeof path !== 'string') return { ok: false, error: 'missing-path' };
    const slice = session.readPath(path);
    return { ok: true, path: pathString(path), data: slice };
  }

  if (name === 'setContentPath') {
    const path = a.path;
    if (!path || typeof path !== 'string') return { ok: false, error: 'missing-path' };
    if (!('value' in a)) return { ok: false, error: 'missing-value' };
    const result = session.setPath(path, a.value);
    return result.ok ? { ok: true, path: result.path } : result;
  }

  return { ok: false, error: 'unknown-tool', name };
}

module.exports = {
  GENERIC_TOOLS,
  parseToolArgs,
  executeTool,
};
