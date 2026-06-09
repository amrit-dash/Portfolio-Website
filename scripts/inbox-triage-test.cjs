#!/usr/bin/env node
/* Unit tests for inbox triage normalization — no Firebase or LLM required. */
const assert = require('assert');
const {
  extractJson,
  extractJsonArray,
  normalizeVerdict,
  normalizeSuggestion,
  parseTriageResponse,
  finalizeSuggestion,
  completeSuggestionsForAll,
  ruleBasedSuggestion,
} = require('../functions/agent/inbox-triage');

const QA = [
  { qs: ['what do you do?', 'tell me about your work'] },
  { qs: ['how can i contact you?'] },
];
const VALID = new Set(['abc123', 'def456']);
const BATCH = [
  { id: 'abc123', q: 'what do you do?' },
  { id: 'def456', q: 'random spam hello' },
];

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok', name);
  } catch (e) {
    console.error(' FAIL', name);
    console.error('  ', e.message);
    process.exitCode = 1;
  }
}

console.log('inbox-triage normalization tests\n');

test('extractJsonArray unwraps suggestions key', () => {
  const raw = 'Here:\n{"suggestions":[{"id":"abc123","verdict":"existing_phrase","matchIndex":0,"matchQuestion":"what do you do?"}]}';
  const arr = extractJsonArray(raw);
  assert.strictEqual(arr.length, 1);
  assert.strictEqual(arr[0].id, 'abc123');
});

test('extractJsonArray handles bare array', () => {
  const arr = extractJsonArray('[{"id":"abc123","verdict":"irrelevant","reason":"greeting"}]');
  assert.strictEqual(arr.length, 1);
});

test('normalizeVerdict maps aliases', () => {
  assert.strictEqual(normalizeVerdict('duplicate'), 'existing_phrase');
  assert.strictEqual(normalizeVerdict('NEW'), 'new_question');
  assert.strictEqual(normalizeVerdict('junk'), 'irrelevant');
});

test('normalizeSuggestion infers new_question from phrasings alias', () => {
  const s = normalizeSuggestion({
    id: 'abc123',
    verdict: 'new',
    phrasings: ['what kind of design work?'],
    answers: ['mostly product and brand work.'],
  }, VALID, QA.length, BATCH[0], QA);
  assert.strictEqual(s.verdict, 'new_question');
  assert.ok(s.suggestedQuestions.length);
  assert.ok(s.suggestedAnswers.length);
  assert.ok(!s.incomplete);
});

test('normalizeSuggestion resolves bracketed id', () => {
  const s = normalizeSuggestion({
    id: '[abc123]',
    verdict: 'existing_phrase',
    matchIndex: 0,
    matchQuestion: 'what do you do?',
  }, VALID, QA.length, BATCH[0], QA);
  assert.strictEqual(s.id, 'abc123');
  assert.strictEqual(s.verdict, 'existing_phrase');
  assert.ok(!s.incomplete);
});

test('parseTriageResponse assigns ids by position when missing', () => {
  const parsed = parseTriageResponse(
    '[{"verdict":"irrelevant","reason":"just saying hi"}]',
    BATCH,
    VALID,
    QA,
  );
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].id, 'abc123');
  assert.strictEqual(parsed[0].verdict, 'irrelevant');
  assert.ok(!parsed[0].incomplete);
});

test('completeSuggestionsForAll never returns incomplete', () => {
  const complete = completeSuggestionsForAll(BATCH, [], QA);
  assert.strictEqual(complete.length, 2);
  complete.forEach((s) => {
    assert.ok(INBOX_VERDICT(s.verdict), s.verdict);
    assert.strictEqual(s.incomplete, undefined);
  });
});

test('ruleBasedSuggestion exact match → existing_phrase', () => {
  const s = ruleBasedSuggestion({ id: 'abc123', q: 'what do you do?' }, QA);
  assert.strictEqual(s.verdict, 'existing_phrase');
  assert.ok(s.matchQuestion);
});

test('ruleBasedSuggestion parse failure fallback → new_question with fields', () => {
  const s = ruleBasedSuggestion({ id: 'def456', q: 'do you accept cryptocurrency payments for freelance?' }, QA);
  assert.strictEqual(s.verdict, 'new_question');
  assert.ok(s.suggestedQuestions.length);
  assert.ok(s.suggestedAnswers.length);
  assert.ok(s.reason);
});

test('finalizeSuggestion upgrades partial new_question', () => {
  const s = finalizeSuggestion({
    id: 'abc123',
    verdict: 'new_question',
    suggestedQuestions: ['how do you approach ux?'],
    suggestedAnswers: [],
    reason: '',
  }, { id: 'abc123', q: 'how do you approach ux?' }, QA);
  assert.ok(s.suggestedAnswers.length);
  assert.ok(s.reason);
});

function INBOX_VERDICT(v) {
  return v === 'existing_phrase' || v === 'new_question' || v === 'irrelevant';
}

console.log(`\n${passed} passed`);
if (process.exitCode) process.exit(process.exitCode);
