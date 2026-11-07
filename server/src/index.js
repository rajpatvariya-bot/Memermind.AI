import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDatabase, hasMongoUri } from './services/database.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

let activeServer;

export async function startServer({ port = Number(process.env.PORT) || 4000, host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1') } = {}) {
  if (hasMongoUri()) {
    await connectDatabase();
    console.info('[database] MongoDB connected; persistent storage is ready');
  } else {
    console.warn('[database] MONGODB_URI is empty; community posts use temporary memory storage. Add it to server/.env for persistence.');
  }

  activeServer = createApp().listen(port, host, () => {
    console.info(`[api] MemeMind API listening on ${host}:${port}`);
  });
  return activeServer;
}

// Importing this module in tests does not start a listener.
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  startServer().catch((error) => {
    console.error(`[startup] ${error.message}`);
    process.exitCode = 1;
  });
}

async function shutdown(signal) {
  console.info(`[api] ${signal} received; closing server and database connection`);
  if (activeServer?.listening) {
    await new Promise((resolve) => activeServer.close(resolve));
  }
  await mongoose.disconnect();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

