import { Router } from 'express';
import { z } from 'zod';
import { runAiTask } from '../services/ai.js';
import { parseImageDataUrl } from '../services/imageData.js';

const router = Router();
const moods = ['chaotic', 'relatable', 'confident', 'tired'];
const tones = ['Funny', 'Sarcastic', 'Dark humour', 'Gen-Z slang', 'Relatable', 'Savage'];
const captionRequest = z.object({
  topic: z.string().trim().min(2).max(180),
  mood: z.enum(moods).default('relatable'),
}).strict();
const rewriteRequest = z.object({
  caption: z.string().trim().min(2).max(180),
  tone: z.enum(tones),
}).strict();
const imageRequest = z.object({
  image: z.string().max(1_750_000),
  topic: z.string().trim().max(180).optional().default(''),
  mood: z.enum(moods).default('relatable'),
  caption: z.string().trim().max(180).optional().default(''),
}).strict();

function badRequest(response, message) {
  return response.status(400).json({ error: message });
}

function providerResult(response, result) {
  return response.json({ provider: process.env.AI_PROVIDER || 'gemini', model: result.model, ...result });
}

router.post('/captions', async (request, response, next) => {
  const parsed = captionRequest.safeParse(request.body);
  if (!parsed.success) return badRequest(response, 'Enter a topic of 2–180 characters and choose a supported mood.');
  try {
    const result = await runAiTask({ task: 'captions', ...parsed.data });
    return providerResult(response, result);
  } catch (error) { return next(error); }
});

router.post('/rewrite', async (request, response, next) => {
  const parsed = rewriteRequest.safeParse(request.body);
  if (!parsed.success) return badRequest(response, 'Enter a caption of 2–180 characters and choose one of the supported tones.');
  try {
    const result = await runAiTask({ task: 'rewrite', ...parsed.data });
    return response.json({ provider: process.env.AI_PROVIDER || 'gemini', model: result.model, caption: result.rewrittenCaption });
  } catch (error) { return next(error); }
});

router.post('/image-context', async (request, response, next) => {
  const parsed = imageRequest.safeParse(request.body);
  if (!parsed.success) return badRequest(response, 'Send an image under 1.25 MB with optional topic and supported mood.');
  const image = parseImageDataUrl(parsed.data.image, 1_250_000);
  if (!image) return badRequest(response, 'Image data is invalid. Use a PNG, JPEG, or WebP image under 1.25 MB.');
  try {
    const result = await runAiTask({
      task: 'image', topic: parsed.data.topic, mood: parsed.data.mood,
      caption: parsed.data.caption, image,
    });
    return providerResult(response, result);
  } catch (error) { return next(error); }
});

export default router;
