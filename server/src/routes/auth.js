import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { clearSession, isAuthConfigured, issueSession, requireAuth, safeUser } from '../middleware/auth.js';
import { hasMongoUri } from '../services/database.js';

const router = Router();
const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(30),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(72),
}).strict();
const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(72),
}).strict();

function dependenciesReady(response) {
  if (!isAuthConfigured()) {
    response.status(503).json({ error: 'Authentication is unavailable. Configure a strong JWT_SECRET in server/.env.' });
    return false;
  }
  if (!hasMongoUri()) {
    response.status(503).json({ error: 'Authentication requires MongoDB. Configure MONGODB_URI in server/.env.' });
    return false;
  }
  if (mongoose.connection.readyState !== 1) {
    response.status(503).json({ error: 'MongoDB is temporarily unavailable. Try again in a moment.' });
    return false;
  }
  return true;
}

router.post('/register', async (request, response, next) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success || Buffer.byteLength(parsed.data?.password ?? '', 'utf8') > 72) {
    return response.status(400).json({ error: 'Use a display name, valid email, and password between 12 and 72 UTF-8 bytes.' });
  }
  if (!dependenciesReady(response)) return;
  try {
    const existing = await User.exists({ email: parsed.data.email });
    if (existing) return response.status(409).json({ error: 'An account already exists for that email.' });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ displayName: parsed.data.displayName, email: parsed.data.email, passwordHash });
    issueSession(response, user);
    return response.status(201).json({ user: safeUser(user) });
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'An account already exists for that email.' });
    return next(error);
  }
});

router.post('/login', async (request, response, next) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter a valid email and password.' });
  if (!dependenciesReady(response)) return;
  try {
    const user = await User.findOne({ email: parsed.data.email }).select('+passwordHash');
    const passwordMatches = user && await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordMatches) return response.status(401).json({ error: 'Email or password is incorrect.' });
    if (user.status !== 'active') return response.status(403).json({ error: 'This account is currently suspended.' });
    issueSession(response, user);
    return response.json({ user: safeUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (_request, response) => {
  clearSession(response);
  response.json({ message: 'You are signed out.' });
});

router.get('/me', requireAuth, (request, response) => {
  response.json({ user: safeUser(request.user) });
});

export default router;
