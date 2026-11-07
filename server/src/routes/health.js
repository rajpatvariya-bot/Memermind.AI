import { Router } from 'express';
import mongoose from 'mongoose';
import { aiStatus } from '../services/ai.js';
import { hasMongoUri } from '../services/database.js';

const router = Router();

router.get('/', (_request, response) => {
  response.json({
    status: 'ok',
    storage: mongoose.connection.readyState === 1 ? 'mongodb' : 'memory',
    database: mongoose.connection.readyState === 1 ? 'connected' : hasMongoUri() ? 'disconnected' : 'not_configured',
    ai: aiStatus(),
  });
});

export default router;

