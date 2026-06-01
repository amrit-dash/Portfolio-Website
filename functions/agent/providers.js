/* Gemini provider adapter — canonical messages ↔ native generateContent. */

const { newId } = require('./messages');

function toolsToGeminiDeclarations(tools) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

function geminiFunctionDeclarations(tools) {
  return { functionDeclarations: toolsToGeminiDeclarations(tools) };
}

function canonicalToGeminiContents(history, userMessage) {
  const contents = [];

  for (const msg of history || []) {
    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.text || '' }] });
    } else if (msg.role === 'assistant') {
      const parts = [];
      if (msg.text) parts.push({ text: msg.text });
      for (const tc of msg.toolCalls || []) {
        parts.push({
          functionCall: {
            name: tc.name,
            args: tc.args || {},
          },
        });
      }
      if (parts.length) contents.push({ role: 'model', parts });
    } else if (msg.role === 'tool') {
      for (const tr of msg.toolResults || []) {
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: tr.name || 'tool',
              response: tr.result || {},
            },
          }],
        });
      }
    }
  }

  if (userMessage) {
    contents.push({ role: 'user', parts: [{ text: userMessage }] });
  }

  return contents;
}

function parseGeminiResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  let text = '';
  const toolCalls = [];

  for (const part of parts) {
    if (part.text) text += part.text;
    if (part.functionCall) {
      toolCalls.push({
        id: newId('tc'),
        name: part.functionCall.name,
        args: part.functionCall.args || {},
      });
    }
  }

  return { text: text.trim(), toolCalls };
}

async function geminiGenerate({ endpoint, model, key, systemPrompt, contents, tools, temperature, maxTokens }) {
  const url = endpoint.replace('{model}', model) + '?key=' + encodeURIComponent(key);
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: temperature ?? 0.4,
      maxOutputTokens: maxTokens ?? 2048,
    },
  };
  if (tools && tools.length) {
    body.tools = [geminiFunctionDeclarations(tools)];
    body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok || d.error) {
    const msg = (d && (d.error?.message || d.error)) || ('HTTP ' + r.status);
    throw Object.assign(new Error(String(msg)), { status: r.status, provider: 'gemini' });
  }
  return parseGeminiResponse(d);
}

module.exports = {
  toolsToGeminiDeclarations,
  canonicalToGeminiContents,
  parseGeminiResponse,
  geminiGenerate,
};
