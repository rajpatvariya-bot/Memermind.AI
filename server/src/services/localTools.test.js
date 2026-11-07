import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCaptions, makeTags, rewriteCaption, searchSimilarMemes, suggestMemes } from './localTools.js';

test('caption generation returns four useful strings for a topic', () => {
  const captions = generateCaptions({ topic: 'Monday meetings', mood: 'tired' });
  assert.equal(captions.length, 4);
  assert.ok(captions.every((caption) => caption.includes('Monday meetings')));
});

test('tone rewriter applies the selected style', () => {
  assert.match(rewriteCaption({ caption: 'my code has a bug', tone: 'Gen-Z slang' }), /POV:/);
});

test('tag generator removes common words and duplicate tags', () => {
  assert.deepEqual(makeTags('work work from home today'), ['work', 'home', 'today']);
});

test('suggestions infer a topic category', () => {
  assert.equal(suggestMemes({ topic: 'another work deadline' }).category, 'Work');
});

test('similar search ranks matching captions and ignores unrelated posts', () => {
  const results = searchSimilarMemes([
    { title: 'Monday', caption: 'work deadline chaos', tags: ['office'] },
    { title: 'Weekend', caption: 'pizza party', tags: ['food'] },
  ], 'work deadline');
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Monday');
});

