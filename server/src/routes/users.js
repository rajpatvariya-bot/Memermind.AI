import { Router } from 'express';
import { Meme } from '../models/Meme.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/me/overview', async (request, response, next) => {
  try {
    const creations = await Meme.countDocuments({ ownerId: request.user._id });
    response.json({ user: { id: String(request.user._id), displayName: request.user.displayName, email: request.user.email }, creations });
  } catch (error) { next(error); }
});

export default router;
