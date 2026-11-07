import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

export const SESSION_COOKIE = 'mememind_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ISSUER = 'mememind-api';
const AUDIENCE = 'mememind-client';

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  return typeof secret === 'string' && Buffer.byteLength(secret) >= 32 ? secret : null;
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
    maxAge: SESSION_TTL_MS,
  };
}

export function issueSession(response, user) {
  const secret = jwtSecret();
  if (!secret) throw new Error('Authentication is not configured. Set a strong JWT_SECRET in server/.env.');
  const token = jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: '8h',
  });
  response.cookie(SESSION_COOKIE, token, authCookieOptions());
}

export function clearSession(response) {
  response.clearCookie(SESSION_COOKIE, authCookieOptions());
}

function cookieValue(request, name) {
  const item = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : '';
}

export async function optionalAuth(request, response, next) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return next();
  if (mongoose.connection.readyState !== 1) return response.status(503).json({ error: 'MongoDB is temporarily unavailable; your session could not be checked.' });
  const secret = jwtSecret();
  if (!secret) return response.status(503).json({ error: 'Authentication is not configured.' });
  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
  } catch {
    return response.status(401).json({ error: 'Your session is invalid or expired. Sign in again.' });
  }
  try {
    const user = await User.findById(payload.sub).select('displayName email role status');
    if (!user || user.status !== 'active') return response.status(401).json({ error: 'Your session is no longer active. Sign in again.' });
    request.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function requireAuth(request, response, next) {
  let authError;
  await optionalAuth(request, response, (error) => { authError = error; });
  if (authError) return next(authError);
  if (response.headersSent) return;
  if (!request.user) return response.status(401).json({ error: 'Sign in to access this page.' });
  return next();
}

export async function requireAdmin(request, response, next) {
  let authError;
  await requireAuth(request, response, (error) => { authError = error; });
  if (authError) return next(authError);
  if (response.headersSent) return;
  if (request.user.role !== 'admin') return response.status(403).json({ error: 'Administrator access is required.' });
  return next();
}

export function isAuthConfigured() {
  return jwtSecret() !== null;
}

export function safeUser(user) {
  return { id: String(user._id ?? user.id), displayName: user.displayName, email: user.email, role: user.role };
}
