import mongoose from 'mongoose';

/** Return true only when a real MongoDB connection string is configured. */
export function hasMongoUri(value = process.env.MONGODB_URI) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Connect before serving requests so configured persistence cannot silently degrade to memory. */
export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!hasMongoUri(uri)) return false;
  if (mongoose.connection.readyState >= 1) return true;

  try {
    await mongoose.connect(uri.trim(), { serverSelectionTimeoutMS: 8_000 });
    return true;
  } catch (error) {
    // Never include the connection string or raw driver error in logs/responses.
    throw new Error(`MongoDB connection failed (${error.name || 'DatabaseError'}). Check MONGODB_URI in server/.env.`);
  }
}
