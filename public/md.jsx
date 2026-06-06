/* global React */
/* Safe markdown subset → React nodes for bot + agent chat bubbles.
   Builds React elements only — never injects HTML from model output.
   Supported: **bold**, *italic*, _italic_, `code`, -/*/+ bullets, 1. ordered
   lists, paragraphs, line breaks. */

function mdInlineParts(text, keyPrefix) {
  const line = String(text == null ? '' : text);
  const out = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const key = (keyPrefix || 'i') + '-' + (k++);
    if (m[2] != null) out.push(React.createElement('strong', { key }, m[2]));
    else if (m[3] != null) out.push(React.createElement('code', { key }, m[3]));
    else out.push(React.createElement('em', { key }, m[4] != null ? m[4] : m[5]));
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function isUlLine(line) { return /^\s*[-*+]\s+/.test(line); }
function isOlLine(line) { return /^\s*\d+\.\s+/.test(line); }
function isListLine(line) { return isUlLine(line) || isOlLine(line); }

function parseBlocks(text) {
  const lines = String(text == null ? '' : text).split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    if (isOlLine(lines[i])) {
      const items = [];
      while (i < lines.length && isOlLine(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    if (isUlLine(lines[i])) {
      const items = [];
      while (i < lines.length && isUlLine(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    const paraLines = [];
    while (i < lines.length && lines[i].trim() && !isListLine(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', lines: paraLines });
  }
  return blocks;
}

function mdInline(text) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return [''];
  const out = [];
  blocks.forEach((block, bi) => {
    const key = 'b' + bi;
    if (block.type === 'ul') {
      out.push(React.createElement('ul', { key, className: 'md-list' },
        block.items.map((item, ii) =>
          React.createElement('li', { key: ii }, ...mdInlineParts(item, key + 'li' + ii))
        )
      ));
      return;
    }
    if (block.type === 'ol') {
      out.push(React.createElement('ol', { key, className: 'md-list md-list--ol' },
        block.items.map((item, ii) =>
          React.createElement('li', { key: ii }, ...mdInlineParts(item, key + 'li' + ii))
        )
      ));
      return;
    }
    const parts = [];
    block.lines.forEach((line, li) => {
      if (li > 0) parts.push(React.createElement('br', { key: key + 'br' + li }));
      parts.push(...mdInlineParts(line, key + 'l' + li));
    });
    if (blocks.length === 1 && block.lines.length === 1) {
      out.push(...parts);
    } else {
      out.push(React.createElement('p', { key, className: 'md-p' }, ...parts));
    }
  });
  return out;
}

window.mdInline = mdInline;
