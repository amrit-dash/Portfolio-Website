#!/usr/bin/env node
/* Local smoke for capability probe helpers — no API keys required. */

const assert = require('assert');
const { probeReplyOk, probesAllOk } = require('../functions/agent/capability-probes');
const { pickMarker, htmlToText, normalizeProbeUrl } = require('../functions/agent/url-fetch');

function testProbeReplyOk() {
  assert.strictEqual(probeReplyOk('OK'), true);
  assert.strictEqual(probeReplyOk('ok.'), true);
  assert.strictEqual(probeReplyOk('Yes, OK'), true);
  assert.strictEqual(probeReplyOk('yes'), true);
  assert.strictEqual(probeReplyOk(''), false);
  assert.strictEqual(probeReplyOk('I cannot see anything'), false);
}

function testProbesAllOk() {
  assert.strictEqual(probesAllOk({ vision: { ok: true }, url: { ok: true } }), true);
  assert.strictEqual(probesAllOk({ vision: { ok: false }, url: { ok: true } }), false);
  assert.strictEqual(probesAllOk({ vision: { ok: true }, search: { skipped: true } }), true);
}

function testPickMarker() {
  const text = 'GitHub is where the world builds software. Amrit Dash portfolio.';
  const marker = pickMarker(text);
  assert.ok(marker.length >= 5);
  assert.ok(text.includes(marker));
}

function testHtmlToText() {
  const text = htmlToText('<html><body><h1>Hello</h1><script>bad()</script></body></html>');
  assert.ok(text.includes('Hello'));
  assert.ok(!text.includes('bad'));
}

function testNormalizeProbeUrl() {
  assert.throws(() => normalizeProbeUrl('http://127.0.0.1/'), /blocked-host/);
  assert.strictEqual(normalizeProbeUrl('https://github.com/amrit-dash'), 'https://github.com/amrit-dash');
}

testProbeReplyOk();
testProbesAllOk();
testPickMarker();
testHtmlToText();
testNormalizeProbeUrl();
console.log('capability-probes-test: ok');
