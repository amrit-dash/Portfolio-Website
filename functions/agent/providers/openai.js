/* OpenAI-compatible adapter — chat-completions tool-calling wire format.

   Shared by FOUR distinct providers that happen to speak the same HTTP shape:
   openai, openrouter, mistral, grok. Each is still its own provider with its own
   endpoint + key + model catalog — this module is only the wire serializer.

   Wire format: messages[] with roles system|user|assistant|tool; tool calls on
   assistant.tool_calls[{id,function:{name,arguments(JSON string)}}]; results as
   {role:'tool', tool_call_id, content}. Tools as
   [{type:'function', function:{name,description,parameters}}]. */

const { newId } = require('../messages');

function toTools(tools) {
  return (tools || []).map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters || { type: 'object', properties: {} },
    },
  }));
}

function canonicalToMessages(systemPrompt, messages) {
  const out = [{ role: 'system', content: systemPrompt }];
  for (const msg of messages || []) {
    if (msg.role === 'user') {
      out.push({ role: 'user', content: msg.text || '' });
    } else if (msg.role === 'assistant') {
      const m = { role: 'assistant', content: msg.text || '' };
      if ((msg.toolCalls || []).length) {
        m.tool_calls = msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.args || {}) },
        }));
        // OpenAI requires content to be a string (may be empty) alongside tool_calls.
        if (!m.content) m.content = '';
      }
      out.push(m);
    } else if (msg.role === 'tool') {
      for (const tr of msg.toolResults || []) {
        out.push({
          role: 'tool',
          tool_call_id: tr.id,
          content: JSON.stringify(tr.result || {}),
        });
      }
    }
  }
  return out;
}

function parseResponse(data) {
  const msg = data?.choices?.[0]?.message || {};
  const text = msg.content || '';
  const toolCalls = (msg.tool_calls || []).map((tc) => {
    let args = {};
    try { args = tc.function && tc.function.arguments ? JSON.parse(tc.function.arguments) : {}; }
    catch (e) { args = { _parseError: true, raw: String(tc.function && tc.function.arguments).slice(0, 500) }; }
    return { id: tc.id || newId('tc'), name: tc.function && tc.function.name, args };
  });
  return { text: String(text || '').trim(), toolCalls };
}

async function generate({ endpoint, model, key, systemPrompt, messages, tools, temperature, maxTokens, provider }) {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key };
  // OpenRouter asks for attribution headers; harmless elsewhere but only set here.
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://amritos-admin.web.app';
    headers['X-Title'] = 'amrit.os admin agent';
  }
  const body = {
    model,
    messages: canonicalToMessages(systemPrompt, messages),
    temperature: temperature ?? 0.4,
    max_tokens: maxTokens ?? 2048,
  };
  if (tools && tools.length) {
    body.tools = toTools(tools);
    body.tool_choice = 'auto';
  }
  const r = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  let d = {};
  try { d = raw ? JSON.parse(raw) : {}; } catch (e) { d = { _nonJson: raw }; }
  if (!r.ok || d.error) {
    const detail = (d && (d.error?.message || (typeof d.error === 'string' ? d.error : null) || d.message))
      || (d._nonJson ? String(d._nonJson).slice(0, 300) : null) || ('HTTP ' + r.status);
    throw Object.assign(new Error(`${provider || 'openai'} [${r.status}]: ${detail}`), { status: r.status, provider: provider || 'openai' });
  }
  return parseResponse(d);
}

module.exports = { generate, canonicalToMessages, parseResponse, toTools };
