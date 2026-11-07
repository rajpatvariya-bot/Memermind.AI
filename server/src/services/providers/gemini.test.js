import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWithGemini } from './gemini.js';

const validModelJson = JSON.stringify({
  captions: ['When the meeting could have been an email', 'My calendar has entered the chat', 'I am buffering in real life', 'This could have been a Slack message'],
  description: 'A tired worker faces a long meeting schedule.',
  category: 'Work life',
  tags: ['work', 'meetings', 'office-humor'],
  stickers: ['🥱 sleepy face', '📅 calendar', '💀 skull'],
});

function mockResponse(outputText, usage = { input_tokens: 42, output_tokens: 25 }) {
  return { ok: true, status: 200, json: async () => ({ output_text: outputText, usage }) };
}

test('Gemini adapter sends structured requests server-side and validates a real provider-shaped result', async () => {
  const previous = {
    key: process.env.GEMINI_API_KEY,
    provider: process.env.AI_PROVIDER,
    model: process.env.GEMINI_MODEL,
    fetch: globalThis.fetch,
  };
  let outgoing;
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
  process.env.AI_PROVIDER = 'gemini';
  process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
  globalThis.fetch = async (url, options) => {
    outgoing = { url, options, body: JSON.parse(options.body) };
    return mockResponse(validModelJson);
  };
  try {
    const result = await generateWithGemini({ task: 'captions', topic: 'Monday meetings', mood: 'tired' });
    assert.equal(outgoing.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(outgoing.options.headers['x-goog-api-key'], 'test-only-not-a-real-key');
    assert.equal(outgoing.body.model, 'gemini-3.5-flash-lite');
    assert.equal(outgoing.body.store, false);
    assert.equal(outgoing.body.response_format.mime_type, 'application/json');
    assert.equal(result.captions.length, 4);
    assert.deepEqual(result.tags, ['work', 'meetings', 'office-humor']);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous.provider;
    if (previous.model === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = previous.model;
  }
});

test('Gemini adapter includes image bytes as a multimodal input content block', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, provider: process.env.AI_PROVIDER, fetch: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
  process.env.AI_PROVIDER = 'gemini';
  let outgoing;
  globalThis.fetch = async (_url, options) => { outgoing = JSON.parse(options.body); return mockResponse(validModelJson); };
  try {
    await generateWithGemini({ task: 'image', topic: 'late for class', mood: 'chaotic', image: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' } });
    assert.ok(Array.isArray(outgoing.input));
    assert.equal(outgoing.input[1].type, 'image');
    assert.equal(outgoing.input[1].mime_type, 'image/jpeg');
    assert.equal(outgoing.input[1].data, 'ZmFrZQ==');
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous.provider;
  }
});

test('Gemini adapter requests and returns a validated tone rewrite', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, provider: process.env.AI_PROVIDER, fetch: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
  process.env.AI_PROVIDER = 'gemini';
  let outgoing;
  const rewritePayload = { rewrittenCaption: 'POV: that deadline is fighting for its life' };
  globalThis.fetch = async (_url, options) => { outgoing = JSON.parse(options.body); return mockResponse(JSON.stringify(rewritePayload)); };
  try {
    const result = await generateWithGemini({ task: 'rewrite', caption: 'I have a deadline', tone: 'Savage' });
    assert.match(outgoing.input, /Savage/);
    assert.equal(result.rewrittenCaption, rewritePayload.rewrittenCaption);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous.provider;
  }
});

test('Gemini adapter rejects malformed structured model output', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, provider: process.env.AI_PROVIDER, fetch: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
  process.env.AI_PROVIDER = 'gemini';
  globalThis.fetch = async () => mockResponse('{"captions": ["only one"]}');
  try {
    await assert.rejects(generateWithGemini({ task: 'captions', topic: 'a funny situation' }), { statusCode: 502, code: 'AI_INVALID_OUTPUT' });
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous.provider;
  }
});

test('Gemini adapter maps a provider timeout to a safe retryable error', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, provider: process.env.AI_PROVIDER, fetch: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
  process.env.AI_PROVIDER = 'gemini';
  globalThis.fetch = async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    const timeout = new Error('private network detail');
    timeout.name = 'TimeoutError';
    throw timeout;
  };
  try {
    await assert.rejects(
      generateWithGemini({ task: 'captions', topic: 'a test topic' }),
      (error) => error.statusCode === 502 && error.code === 'AI_TIMEOUT' && /timed out/.test(error.message) && !/private network/.test(error.message),
    );
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous.provider;
  }
});

test('Gemini adapter distinguishes temporary 503 capacity errors from quota errors', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, provider: process.env.AI_PROVIDER, fetch: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
  process.env.AI_PROVIDER = 'gemini';
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try {
    await assert.rejects(
      generateWithGemini({ task: 'rewrite', caption: 'a sample caption', tone: 'Funny' }),
      (error) => error.statusCode === 503 && error.code === 'AI_PROVIDER_OVERLOADED' && /temporarily unavailable/.test(error.message),
    );
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous.provider;
  }
});
