import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import healthRoutes from './routes/health.js';
import toolRoutes from './routes/tools.js';
import memeRoutes from './routes/memes.js';
import aiRoutes from './routes/ai.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import { errorHandler, notFound } from './middleware/errors.js';

function configuredOrigin(name, value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid HTTP(S) origin.`); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.origin === 'null') {
    throw new Error(`${name} must be a valid HTTP(S) origin.`);
  }
  return parsed.origin;
}

export function createApp() {
  const app = express();
  const production = process.env.NODE_ENV === 'production';
  const clientOrigin = configuredOrigin('CLIENT_ORIGIN', process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173');
  const apiOrigin = configuredOrigin('API_ORIGIN', process.env.API_ORIGIN || 'http://127.0.0.1:4000');
  const allowedOrigins = new Set([clientOrigin]);
  const connectSources = ["'self'", apiOrigin];
  if (!production) {
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) allowedOrigins.add(origin);
    connectSources.push('http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:4000', 'http://localhost:4000');
  }

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'blob:'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': [...new Set(connectSources)],
      },
    },
  }));
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      if (!production) {
        try {
          const parsed = new URL(origin);
          if (['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.port) return callback(null, true);
        } catch { /* An invalid origin falls through to the blocked-origin response. */ }
      }
      return callback(new Error('This browser origin is not allowed by the local API.'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  }));
  app.use(express.json({ limit: '2mb' }));

  const toolsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'That is a lot of requests. Please try again in a few minutes.' },
  });
  const memesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Please wait a little before sending more meme requests.' },
  });
  // A separate conservative window limits provider spend per client IP.
  const configuredAiLimit = Number(process.env.AI_MAX_REQUESTS_PER_WINDOW) || 8;
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Math.min(30, Math.max(1, configuredAiLimit)),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'AI usage limit reached for this window. Wait before trying again.' },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Wait a few minutes and try again.' },
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/tools', toolsLimiter, toolRoutes);
  app.use('/api/ai', aiLimiter, aiRoutes);
  app.use('/api/memes', memesLimiter, memeRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

