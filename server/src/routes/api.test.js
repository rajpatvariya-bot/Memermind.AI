import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

test('API validates local caption input and returns generated captions', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const invalid = await fetch(`${base}/api/tools/captions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic: 'x' }),
    });
    assert.equal(invalid.status, 400);

    const valid = await fetch(`${base}/api/tools/captions`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5173' }, body: JSON.stringify({ topic: 'Monday meetings', mood: 'tired' }),
    });
    const payload = await valid.json();
    assert.equal(valid.status, 200);
    assert.equal(payload.captions.length, 4);
    assert.equal(valid.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('malformed JSON receives a safe client error instead of an internal server error', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/tools/captions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"topic":',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'The request body must contain valid JSON.' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('Gemini endpoint is safely disabled without a server key', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/tools/gemini/captions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic: 'Monday meetings' }),
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /GEMINI_API_KEY/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousKey !== undefined) process.env.GEMINI_API_KEY = previousKey;
  }
});

test('real AI image route rejects unsupported image data before provider access', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/ai/image-context`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: 'data:image/png;base64,ZmFrZQ==', topic: 'Monday meetings', mood: 'chaotic' }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Image data is invalid/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('AI text route rejects invalid input before provider access', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/ai/captions`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: 'x', mood: 'not-a-supported-mood' }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /topic of 2–180 characters/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('AI endpoint applies its configurable per-IP rate limit before provider calls', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, provider: process.env.AI_PROVIDER, limit: process.env.AI_MAX_REQUESTS_PER_WINDOW };
  delete process.env.GEMINI_API_KEY;
  process.env.AI_PROVIDER = 'gemini';
  process.env.AI_MAX_REQUESTS_PER_WINDOW = '1';
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/ai/captions`;
  const options = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic: 'Monday meetings', mood: 'relatable' }) };
  try {
    const first = await fetch(base, options);
    assert.equal(first.status, 503); // Disabled without a key, and no provider call is made.
    const second = await fetch(base, options);
    assert.equal(second.status, 429);
    assert.match((await second.json()).error, /AI usage limit reached/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous.provider;
    if (previous.limit === undefined) delete process.env.AI_MAX_REQUESTS_PER_WINDOW; else process.env.AI_MAX_REQUESTS_PER_WINDOW = previous.limit;
  }
});

test('configured AI image route sends a validated image and returns model context through the API', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, provider: process.env.AI_PROVIDER, model: process.env.GEMINI_MODEL, fetch: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
  process.env.AI_PROVIDER = 'gemini';
  process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
  const modelResult = {
    captions: ['When the cat owns the meeting', 'My productivity has paws', 'This is now a cat calendar', 'The boss has whiskers'],
    description: 'A cat sits beside an open laptop.',
    category: 'Pets',
    tags: ['cat', 'work-from-home', 'pets'],
    stickers: ['🐈 cat face', '💻 laptop', '😼 smirk'],
  };
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ output_text: JSON.stringify(modelResult), usage: { total_input_tokens: 20, total_output_tokens: 50 } }) });
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await previous.fetch(`http://127.0.0.1:${server.address().port}/api/ai/image-context`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pV0AAAAASUVORK5CYII=', topic: 'working from home', mood: 'relatable' }),
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.provider, 'gemini');
    assert.equal(payload.description, modelResult.description);
    assert.deepEqual(payload.tags, modelResult.tags);
    assert.equal(payload.captions.length, 4);
    assert.equal(JSON.stringify(payload).includes('test-only-not-a-real-key'), false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    globalThis.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previous.provider;
    if (previous.model === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = previous.model;
  }
});

test('meme publishing validates image input and makes posts searchable', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const invalid = await fetch(`${base}/api/memes`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'test', caption: 'a test', templateId: 'x', imageData: 'javascript:alert(1)', tags: [] }),
    });
    assert.equal(invalid.status, 400);

    const published = await fetch(`${base}/api/memes`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Monday work', caption: 'deadline energy', templateId: 'brain-buffering', imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pV0AAAAASUVORK5CYII=', tags: ['work'] }),
    });
    const post = await published.json();
    assert.equal(published.status, 201);
    assert.equal(post.storage, 'memory');

    const searched = await fetch(`${base}/api/memes/search?q=deadline`);
    assert.equal((await searched.json()).memes[0].title, 'Monday work');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('configured MongoDB never silently falls back to memory when disconnected', async () => {
  const previousUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/mememind-test';
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/memes`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'test', caption: 'a test', templateId: 'x', imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pV0AAAAASUVORK5CYII=', tags: [] }),
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Nothing was saved/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousUri;
  }
});

test('admin API denies anonymous requests and public registration cannot select a role', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const admin = await fetch(`${base}/api/admin/overview`);
    assert.equal(admin.status, 401);

    const dashboard = await fetch(`${base}/api/users/me/overview`);
    assert.equal(dashboard.status, 401);
    const drafts = await fetch(`${base}/api/memes/drafts`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}),
    });
    assert.equal(drafts.status, 401);

    const register = await fetch(`${base}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Visitor', email: 'visitor@example.test', password: 'long-passphrase-1', role: 'admin' }),
    });
    assert.equal(register.status, 400);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

