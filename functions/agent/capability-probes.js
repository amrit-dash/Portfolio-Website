/* Agent provider capability probes — vision, URL context, search (optional). */

const { fetchUrlText } = require('./url-fetch');

const VISION_PROBE_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const DEFAULT_CAPABILITY_PROBE_URL = 'https://github.com/amrit-dash';

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
      maxTokens: 16,
    });
    const reply = (gen.text || '').trim();
    const ok = /\bok\b/i.test(reply);
    return { ok, reply, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'failed', ms: Date.now() - t0 };
  }
}

async function probeUrl({ agentProviders, providerId, endpoint, model, key, testUrl }) {
  const t0 = Date.now();
  try {
    const fetched = await fetchUrlText(testUrl || DEFAULT_CAPABILITY_PROBE_URL);
    const prompt = [
      'You are a URL-context connectivity test.',
      `Source URL: ${fetched.url}`,
      'Excerpt from the fetched page:',
      '---',
      fetched.excerpt,
      '---',
      `Reply with exactly OK if you read the excerpt and it contains the phrase "${fetched.marker}".`,
    ].join('\n');
    const gen = await agentProviders.generate(providerId, {
      endpoint, model, key,
      systemPrompt: 'Reply with exactly OK when you understand the provided page excerpt.',
      messages: [{ role: 'user', text: prompt, toolCalls: [], toolResults: [] }],
      tools: [],
      temperature: 0,
      maxTokens: 24,
    });
    const reply = (gen.text || '').trim();
    const ok = /\bok\b/i.test(reply);
    return {
      ok,
      reply,
      ms: Date.now() - t0,
      url: fetched.url,
      marker: fetched.marker,
      excerptChars: fetched.chars,
    };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'failed', ms: Date.now() - t0 };
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

module.exports = {
  VISION_PROBE_PNG_B64,
  DEFAULT_CAPABILITY_PROBE_URL,
  probeVision,
  probeUrl,
  probeSearch,
  runCapabilityProbes,
};
