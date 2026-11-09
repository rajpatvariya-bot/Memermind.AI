import 'dotenv/config';
import { createApp } from '../server/src/app.js';
import { connectDatabase, hasMongoUri } from '../server/src/services/database.js';
import mongoose from 'mongoose';

const app = createApp();

export default async function handler(req, res) {
  // Normalize double /api prefix if rewritten by Vercel
  if (req.url && req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api', '/api');
  }

  // Ensure MongoDB connection is active in serverless context
  if (hasMongoUri() && mongoose.connection.readyState === 0) {
    try {
      await connectDatabase();
    } catch (error) {
      console.error('[database] Serverless connection error:', error.message);
    }
  }

  return app(req, res);
}
