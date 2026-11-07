import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Meme } from '../models/Meme.js';
import { searchSimilarMemes } from '../services/localTools.js';
import { isValidImageDataUrl } from '../services/imageData.js';
import { hasMongoUri } from '../services/database.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const demoMemes = [];
const memeSchema = z.object({
  title: z.string().trim().min(2).max(100),
  caption: z.string().trim().min(2).max(280),
  templateId: z.string().trim().min(1).max(60),
  imageData: z.string().max(1_600_000).refine((value) => isValidImageDataUrl(value, 1_200_000), 'Use a valid PNG, JPEG, or WebP image under 1.2 MB with safe dimensions.'),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
}).strict();

function usingMongo() {
  return mongoose.connection.readyState === 1;
}

function databaseUnavailable(response) {
  if (hasMongoUri() && !usingMongo()) {
    response.status(503).json({ error: 'MongoDB is temporarily unavailable. Nothing was saved; please retry after the database reconnects.' });
    return true;
  }
  return false;
}

router.get('/', async (_request, response, next) => {
  if (databaseUnavailable(response)) return;
  try {
    const memes = usingMongo()
      ? await Meme.find({ visibility: { $ne: 'private' } }).sort({ createdAt: -1 }).limit(24).lean()
      : demoMemes.filter((meme) => meme.visibility !== 'private').slice(0, 24);
    response.json({ memes, storage: usingMongo() ? 'mongodb' : 'memory' });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (request, response, next) => {
  const query = z.string().trim().min(2).max(100).safeParse(request.query.q);
  if (!query.success) return response.status(400).json({ error: 'Enter at least 2 characters to search.' });
  if (databaseUnavailable(response)) return;
  try {
    const memes = usingMongo()
      ? await Meme.find({ visibility: { $ne: 'private' } }).sort({ createdAt: -1 }).limit(100).lean()
      : demoMemes.filter((meme) => meme.visibility !== 'private');
    response.json({ memes: searchSimilarMemes(memes, query.data) });
  } catch (error) {
    next(error);
  }
});

router.get('/mine', requireAuth, async (request, response, next) => {
  if (databaseUnavailable(response)) return;
  try {
    const memes = await Meme.find({ ownerId: request.user._id }).sort({ updatedAt: -1 }).limit(100).lean();
    response.json({ memes, storage: 'mongodb' });
  } catch (error) { next(error); }
});

router.post('/drafts', requireAuth, async (request, response, next) => {
  const parsed = memeSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Check the title, caption, tags, and image. Use a valid PNG, JPEG, or WebP under 1.2 MB.' });
  if (databaseUnavailable(response)) return;
  try {
    const meme = await Meme.create({ ...parsed.data, ownerId: request.user._id, authorName: request.user.displayName, visibility: 'private' });
    return response.status(201).json({ meme: meme.toObject(), storage: 'mongodb' });
  } catch (error) { next(error); }
});

router.delete('/mine/:id', requireAuth, async (request, response, next) => {
  const id = z.string().regex(/^[a-f\d]{24}$/i).safeParse(request.params.id);
  if (!id.success) return response.status(400).json({ error: 'That meme ID is invalid.' });
  if (databaseUnavailable(response)) return;
  try {
    const deleted = await Meme.findOneAndDelete({ _id: id.data, ownerId: request.user._id });
    if (!deleted) return response.status(404).json({ error: 'That saved meme was not found.' });
    return response.json({ deleted: true });
  } catch (error) { next(error); }
});

router.post('/', optionalAuth, async (request, response, next) => {
  const parsed = memeSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Check the title, caption, tags, and image. Use a valid PNG, JPEG, or WebP under 1.2 MB.' });
  if (databaseUnavailable(response)) return;
  try {
    if (usingMongo()) {
      const meme = await Meme.create({
        ...parsed.data,
        ownerId: request.user?._id ?? null,
        authorName: request.user?.displayName || 'Studio creator',
        visibility: 'public',
      });
      return response.status(201).json({ meme: meme.toObject(), storage: 'mongodb' });
    }
    const meme = { ...parsed.data, _id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    demoMemes.unshift(meme);
    demoMemes.splice(24);
    response.status(201).json({ meme, storage: 'memory' });
  } catch (error) {
    next(error);
  }
});

export default router;

