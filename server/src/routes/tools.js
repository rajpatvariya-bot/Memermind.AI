import { Router } from 'express';
import { z } from 'zod';
import { runAiTask } from '../services/ai.js';
import { generateCaptions, makeTags, rewriteCaption, suggestMemes } from '../services/localTools.js';

const router = Router();
const moods = ['chaotic', 'relatable', 'confident', 'tired'];
const tones = ['Funny', 'Sarcastic', 'Dark humour', 'Gen-Z slang', 'Relatable', 'Savage'];
const topicSchema = z.object({
  topic: z.string().trim().min(2).max(180),
  mood: z.enum(moods).optional(),
}).strict();
const rewriteSchema = z.object({
  caption: z.string().trim().min(2).max(180),
  tone: z.enum(tones),
}).strict();

router.post('/captions', (request, response, next) => {
  const parsed = topicSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter a topic of 2–180 characters and choose a supported mood.' });
  response.json({ captions: generateCaptions(parsed.data) });
});

router.post('/rewrite', (request, response, next) => {
  const parsed = rewriteSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter a caption of 2–180 characters and choose a supported tone.' });
  response.json({ caption: rewriteCaption(parsed.data) });
});

router.post('/suggestions', (request, response) => {
  const parsed = topicSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter a topic of 2–180 characters and choose a supported mood.' });
  response.json(suggestMemes(parsed.data));
});

router.post('/tags', (request, response) => {
  const parsed = z.object({ text: z.string().trim().min(2).max(280) }).strict().safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter text between 2 and 280 characters.' });
  response.json({ tags: makeTags(parsed.data.text) });
});

router.post('/gemini/captions', async (request, response, next) => {
  const parsed = topicSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter a topic of 2–180 characters and choose a supported mood.' });
  try {
    const result = await runAiTask({ task: 'captions', ...parsed.data });
    response.json({ captions: result.captions, category: result.category, tags: result.tags, stickers: result.stickers, provider: process.env.AI_PROVIDER || 'gemini', model: result.model });
  } catch (error) {
    next(error);
  }
});

export default router;

