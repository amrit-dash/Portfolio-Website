/* Agent provider capability probes — vision, URL context, search (optional). */

const { fetchUrlText } = require('./url-fetch');

const VISION_PROBE_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const DEFAULT_CAPABILITY_PROBE_URL = 'https://github.com/amrit-dash';
const PROBE_MAX_TOKENS = 256;

function probeReplyOk(reply) {
  const t = String(reply || '').trim();
  if (!t) return false;
  if (/\bok\b/i.test(t)) return true;
  if (/^yes\b/i.test(t)) return true;
  if (/^(sure|yep|yeah|correct|confirmed|affirmative)[.!]?$/i.test(t)) return true;
  return false;
}

function probeFail(base, failReason, extra) {
  return { ok: false, failReason, ...base, ...(extra || {}) };
}

function emptyReplyReason(gen) {
  if (gen && gen.finishReason === 'MAX_TOKENS') return 'empty-reply-max-tokens';
  return 'empty-reply';
}

async function probeVision({ agentProviders, providerId, endpoint, model, key }) {
  const t0 = Date.now();
  const probeAttachments = [{ mime: 'image/png', data: VISION_PROBE_PNG_B64 }];
  try {
    const gen = await agentProviders.generate(providerId, {
      endpoint, model, key,
      systemPrompt: 'You are a vision connectivity test. If you can see the attached image, reply with exactly OK.',
      messages: [{
        role: 'user',
        text: 'Can you see the tiny test image? Reply with exactly OK if yes.',
        attachments: probeAttachments,
        toolCalls: [],
        toolResults: [],
      }],
      tools: [],
      temperature: 0,
      maxTokens: PROBE_MAX_TOKENS,
      probeMode: true,
    });
    const ms = Date.now() - t0;
    const reply = (gen.text || '').trim();
    const finishReason = gen.finishReason || null;
    if (!reply) {
      return probeFail({ reply: '', ms, finishReason }, emptyReplyReason(gen), {
        error: finishReason === 'MAX_TOKENS'
          ? 'Model used the token budget (often thinking tokens) and returned no visible text.'
          : 'Model returned no text.',
      });
    }
    if (!probeReplyOk(reply)) {
      return probeFail({ reply, ms, finishReason }, 'unexpected-reply', {
        error: `Expected a short OK-style reply; got: ${reply.slice(0, 120)}`,
      });
    }
    return { ok: true, reply, ms, finishReason };
  } catch (e) {
    return probeFail({ ms: Date.now() - t0 }, 'provider-error', {
      error: (e && e.message) || 'failed',
    });
  }
}

async function probeUrl({ agentProviders, providerId, endpoint, model, key, testUrl }) {
  const t0 = Date.now();
  try {
    const fetched = await fetchUrlText(testUrl || DEFAULT_CAPABILITY_PROBE_URL);
    if (!fetched.marker) {
      return probeFail({ ms: Date.now() - t0, url: fetched.url }, 'fetch-no-marker', {
        error: 'Fetched page text but could not pick a verification phrase.',
      });
    }
    const prompt = [
      'You are a URL-context connectivity test.',
      `Source URL: ${fetched.url}`,
      'Excerpt from the fetched page:',
      '---',
      fetched.excerpt,
      '---',
      `The excerpt should contain this phrase: "${fetched.marker}"`,
      'If you read the excerpt and see that phrase, reply with exactly OK.',
    ].join('\n');
    const gen = await agentProviders.generate(providerId, {
      endpoint, model, key,
      systemPrompt: 'Reply with exactly OK when you understand the provided page excerpt.',
      messages: [{ role: 'user', text: prompt, toolCalls: [], toolResults: [] }],
      tools: [],
      temperature: 0,
      maxTokens: PROBE_MAX_TOKENS,
      probeMode: true,
    });
    const ms = Date.now() - t0;
    const reply = (gen.text || '').trim();
    const finishReason = gen.finishReason || null;
    if (!reply) {
      return probeFail({
        ms, reply: '', finishReason, url: fetched.url, marker: fetched.marker, excerptChars: fetched.chars,
      }, emptyReplyReason(gen), {
        error: finishReason === 'MAX_TOKENS'
          ? 'Model used the token budget (often thinking tokens) and returned no visible text.'
          : 'Model returned no text.',
      });
    }
    if (!probeReplyOk(reply)) {
      return probeFail({
        reply, ms, finishReason, url: fetched.url, marker: fetched.marker, excerptChars: fetched.chars,
      }, 'unexpected-reply', {
        error: `Expected a short OK-style reply; got: ${reply.slice(0, 120)}`,
      });
    }
    return {
      ok: true,
      reply,
      ms,
      finishReason,
      url: fetched.url,
      marker: fetched.marker,
      excerptChars: fetched.chars,
    };
  } catch (e) {
    const msg = (e && e.message) || 'failed';
    const failReason = /^fetch-/.test(msg) || msg === 'invalid-url' || msg === 'blocked-host'
      ? 'fetch-error'
      : 'provider-error';
    return probeFail({ ms: Date.now() - t0 }, failReason, { error: msg });
  }
}

async function probeSearch() {
  return { ok: false, skipped: true, message: 'Search probe not configured for this provider' };
}

async function runCapabilityProbes(opts) {
  const { probes } = opts;
  const want = Array.isArray(probes) && probes.length
    ? probes
    : ['vision', 'url'];
  const out = {};
  if (want.includes('vision')) out.vision = await probeVision(opts);
  if (want.includes('url')) out.url = await probeUrl(opts);
  if (want.includes('search')) out.search = await probeSearch(opts);
  return out;
}

function probesAllOk(results) {
  return Object.values(results || {}).every((r) => !r || r.skipped || r.ok);
}

module.exports = {
  VISION_PROBE_PNG_B64,
  DEFAULT_CAPABILITY_PROBE_URL,
  PROBE_MAX_TOKENS,
  probeReplyOk,
  probeVision,
  probeUrl,
  probeSearch,
  runCapabilityProbes,
  probesAllOk,
};
