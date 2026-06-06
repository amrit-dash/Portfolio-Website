/* Anthropic NATIVE adapter — Messages API tool-calling (NOT via OpenRouter).

   Wire format: top-level `system` string; messages[] with content BLOCKS. Tool
   calls are assistant {type:'tool_use', id, name, input}; results are user
   {type:'tool_result', tool_use_id, content}. Tools declare {name,description,
   input_schema}. max_tokens is required. */

const { newId } = require('../messages');

function toTools(tools) {
  return (tools || []).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters || { type: 'object', properties: {} },
  }));
}

function userBlocks(msg) {
  const blocks = [];
  for (const att of msg.attachments || []) {
    if (att && att.data && att.mime) {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: att.mime, data: att.data },
      });
    }
  }
  blocks.push({ type: 'text', text: msg.text || '' });
  return blocks;
}

function canonicalToMessages(messages) {
  const out = [];
  for (const msg of messages || []) {
    if (msg.role === 'user') {
      out.push({ role: 'user', content: userBlocks(msg) });
    } else if (msg.role === 'assistant') {
      const blocks = [];
      if (msg.text) blocks.push({ type: 'text', text: msg.text });
      for (const tc of msg.toolCalls || []) {
        blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args || {} });
      }
      if (blocks.length) out.push({ role: 'assistant', content: blocks });
    } else if (msg.role === 'tool') {
      const blocks = (msg.toolResults || []).map((tr) => ({
        type: 'tool_result',
        tool_use_id: tr.id,
        content: JSON.stringify(tr.result || {}),
      }));
      if (blocks.length) out.push({ role: 'user', content: blocks });
    }
  }
  return out;
}

function parseResponse(data) {
  const content = data?.content || [];
  let text = '';
  const toolCalls = [];
  for (const block of content) {
    if (block.type === 'text') text += block.text || '';
    if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id || newId('tc'), name: block.name, args: block.input || {} });
    }
  }
  return { text: text.trim(), toolCalls };
}

async function generate({ endpoint, model, key, systemPrompt, messages, tools, temperature, maxTokens }) {
  const body = {
    model,
    max_tokens: maxTokens ?? 2048,
    temperature: temperature ?? 0.4,
    system: systemPrompt,
    messages: canonicalToMessages(messages),
  };
  if (tools && tools.length) {
    body.tools = toTools(tools);
  }
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  let d = {};
  try { d = raw ? JSON.parse(raw) : {}; } catch (e) { d = { _nonJson: raw }; }
  if (!r.ok || d.type === 'error' || d.error) {
    const detail = (d && (d.error?.message || (d.type === 'error' && d.error && d.error.message)))
      || (d._nonJson ? String(d._nonJson).slice(0, 300) : null) || ('HTTP ' + r.status);
    throw Object.assign(new Error(`anthropic [${r.status}]: ${detail}`), { status: r.status, provider: 'anthropic' });
  }
  return parseResponse(d);
}

module.exports = { generate, canonicalToMessages, parseResponse, toTools };
