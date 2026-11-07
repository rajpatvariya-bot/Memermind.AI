import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { hasMongoUri } from '../services/database.js';

class BootstrapError extends Error {}

async function bootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!hasMongoUri()) throw new BootstrapError('Set MONGODB_URI in server/.env before bootstrapping an administrator.');
  if (!email || !password || Buffer.byteLength(password, 'utf8') < 16 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new BootstrapError('Set a valid BOOTSTRAP_ADMIN_EMAIL and a unique 16–72 byte BOOTSTRAP_ADMIN_PASSWORD temporarily in server/.env.');
  }

  try { await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8_000 }); }
  catch (error) { throw new BootstrapError(`MongoDB connection failed (${error.name || 'DatabaseError'}). Check MONGODB_URI in server/.env.`); }
  const locks = mongoose.connection.collection('mememind_system_settings');
  const lockId = 'initial-admin-bootstrap';
  let lockAcquired = false;
  try {
    const result = await locks.updateOne(
      { _id: lockId, complete: { $ne: true }, running: { $ne: true } },
      { $set: { running: true, startedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    lockAcquired = result.matchedCount === 1 || result.upsertedCount === 1;
    if (!lockAcquired) throw new BootstrapError('Admin bootstrap is already complete or currently running.');

    if (await User.exists({ role: 'admin' })) {
      await locks.updateOne({ _id: lockId }, { $set: { complete: true }, $unset: { running: '' } });
      lockAcquired = false;
      throw new BootstrapError('An administrator already exists; public or repeat admin bootstrap is disabled.');
    }
    const emailInUse = await User.exists({ email });
    if (emailInUse) throw new BootstrapError('That email already belongs to an account. Choose a different admin email.');

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      displayName: process.env.BOOTSTRAP_ADMIN_NAME?.trim().slice(0, 30) || 'MemeMind Admin',
      email,
      passwordHash,
      role: 'admin',
    });
    await locks.updateOne({ _id: lockId }, { $set: { complete: true }, $unset: { running: '' } });
    lockAcquired = false;
    console.info('Initial administrator created. Remove BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD from server/.env now.');
  } finally {
    if (lockAcquired) await locks.updateOne({ _id: lockId, complete: { $ne: true } }, { $unset: { running: '' } });
  }
}

bootstrapAdmin()
  .catch((error) => {
    const message = error instanceof BootstrapError ? error.message : `Database/bootstrap operation failed (${error.name || 'BootstrapError'}).`;
    console.error(`[admin bootstrap] ${message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
