/* Provider dispatch — pick the native adapter by provider kind.

   Each provider id maps to ONE of three wire-format adapters (see
   shared-schema.PROVIDER_KIND): gemini, anthropic, or the OpenAI-compatible
   adapter shared by openai/openrouter/mistral/grok. The loop calls generate()
   without caring which; the adapter owns canonical↔native serialization. */

const path = require('path');
const schema = require(path.join(__dirname, '../../shared-schema'));

const gemini = require('./gemini');
const anthropic = require('./anthropic');
const openai = require('./openai');

const ADAPTERS = { gemini, anthropic, openai };

function adapterFor(providerId) {
  const kind = schema.providerKind(providerId);
  return kind ? ADAPTERS[kind] : null;
}

/* Generate one assistant turn. Returns { text, toolCalls:[{id,name,args}] }.
   `messages` is canonical history (already sanitized for this provider). */
async function generate(providerId, opts) {
  const adapter = adapterFor(providerId);
  if (!adapter) {
    throw Object.assign(new Error('unknown-provider: ' + providerId), { status: 400 });
  }
  return adapter.generate({ ...opts, provider: providerId });
}

module.exports = { generate, adapterFor, ADAPTERS };
