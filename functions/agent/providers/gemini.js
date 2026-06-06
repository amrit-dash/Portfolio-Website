/* Gemini NATIVE adapter — canonical messages ↔ generateContent.

   Wire format: contents[] with role 'user'|'model', tool calls as
   { functionCall: { name, args } } and results as
   { functionResponse: { name, response } }. Tools are functionDeclarations. */

const { newId } = require('../messages');

/* Gemini's function schema is a strict OpenAPI subset: it rejects an object
   param with an empty `properties` map, and chokes on extras like
   additionalProperties. Drop parameters entirely when there are no properties. */
function cleanParams(parameters) {
  if (!parameters || typeof parameters !== 'object') return undefined;
  const props = parameters.properties;
  if (!props || Object.keys(props).length === 0) return undefined;
  return parameters;
}

function toDeclarations(tools) {
  return (tools || []).map((t) => {
    const decl = { name: t.name, description: t.description };
    const params = cleanParams(t.parameters);
    if (params) decl.parameters = params;
    return decl;
  });
}

function userParts(msg) {
  const parts = [];
  for (const att of msg.attachments || []) {
    if (att && att.data && att.mime) {
      parts.push({ inlineData: { mimeType: att.mime, data: att.data } });
    }
  }
  parts.push({ text: msg.text || '' });
  return parts;
}

function canonicalToContents(messages) {
  const contents = [];
  for (const msg of messages || []) {
    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: userParts(msg) });
    } else if (msg.role === 'assistant') {
      const parts = [];
      if (msg.text) parts.push({ text: msg.text });
      for (const tc of msg.toolCalls || []) {
        parts.push({ functionCall: { name: tc.name, args: tc.args || {} } });
      }
      if (parts.length) contents.push({ role: 'model', parts });
    } else if (msg.role === 'tool') {
      for (const tr of msg.toolResults || []) {
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: tr.name || 'tool', response: tr.result || {} } }],
        });
      }
    }
  }
  return contents;
}

function parseResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  let text = '';
  const toolCalls = [];
  for (const part of parts) {
    if (part.text) text += part.text;
    if (part.functionCall) {
      toolCalls.push({ id: newId('tc'), name: part.functionCall.name, args: part.functionCall.args || {} });
    }
  }
  return { text: text.trim(), toolCalls };
}

async function generate({ endpoint, model, key, systemPrompt, messages, tools, temperature, maxTokens }) {
  const url = endpoint.replace('{model}', model) + '?key=' + encodeURIComponent(key);
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: canonicalToContents(messages),
    generationConfig: {
      temperature: temperature ?? 0.4,
      maxOutputTokens: maxTokens ?? 2048,
    },
  };
  if (tools && tools.length) {
    body.tools = [{ functionDeclarations: toDeclarations(tools) }];
    body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  let d = {};
  try { d = raw ? JSON.parse(raw) : {}; } catch (e) { d = { _nonJson: raw }; }
  if (!r.ok || d.error) {
    const detail = (d && (d.error?.message || (typeof d.error === 'string' ? d.error : null)))
      || (d._nonJson ? String(d._nonJson).slice(0, 300) : null) || ('HTTP ' + r.status);
    throw Object.assign(new Error(`gemini [${r.status}]: ${detail}`), { status: r.status, provider: 'gemini' });
  }
  return parseResponse(d);
}

module.exports = { generate, canonicalToContents, parseResponse, toDeclarations };
