import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Meme } from '../models/Meme.js';
import { requireAdmin } from '../middleware/auth.js';
import { aiStatus } from '../services/ai.js';

const router = Router();
router.use(requireAdmin);

router.get('/overview', async (_request, response, next) => {
  try {
    const [users, memes] = await Promise.all([User.countDocuments(), Meme.countDocuments()]);
    response.json({ users, memes, ai: aiStatus() });
  } catch (error) { next(error); }
});

router.get('/users', async (request, response, next) => {
  const page = z.coerce.number().int().min(1).max(10_000).safeParse(request.query.page ?? '1');
  const limit = z.coerce.number().int().min(1).max(50).safeParse(request.query.limit ?? '20');
  if (!page.success || !limit.success) return response.status(400).json({ error: 'Page and limit values are invalid.' });
  try {
    const [users, total] = await Promise.all([
      User.find().select('displayName email role status createdAt').sort({ createdAt: -1 }).skip((page.data - 1) * limit.data).limit(limit.data).lean(),
      User.countDocuments(),
    ]);
    response.json({ users: users.map((user) => ({ ...user, id: String(user._id), _id: undefined })), page: page.data, limit: limit.data, total });
  } catch (error) { next(error); }
});

router.patch('/users/:id/status', async (request, response, next) => {
  const parsedId = z.string().regex(/^[a-f\d]{24}$/i).safeParse(request.params.id);
  const parsedBody = z.object({ status: z.enum(['active', 'suspended']) }).strict().safeParse(request.body);
  if (!parsedId.success || !parsedBody.success) return response.status(400).json({ error: 'The user ID or status is invalid.' });
  if (String(request.user._id) === parsedId.data) return response.status(400).json({ error: 'You cannot change your own account status.' });
  try {
    const user = await User.findOneAndUpdate({ _id: parsedId.data, role: 'user' }, { status: parsedBody.data.status }, { new: true, runValidators: true }).select('displayName email role status');
    if (!user) return response.status(404).json({ error: 'That user account was not found.' });
    response.json({ user: { ...user.toObject(), id: String(user._id), _id: undefined } });
  } catch (error) { next(error); }
});

export default router;
