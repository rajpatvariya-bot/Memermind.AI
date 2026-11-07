import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function frontendCspPlugin(apiOrigin, development) {
  const connectSources = ["'self'", apiOrigin];
  if (development) {
    for (let port = 5173; port <= 5180; port += 1) {
      connectSources.push(`ws://127.0.0.1:${port}`, `ws://localhost:${port}`);
    }
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src ${[...new Set(connectSources)].join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return {
    name: 'mememind-frontend-csp',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head' }];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE || 'http://127.0.0.1:4000/api';
  let apiOrigin;
  try {
    const parsed = new URL(apiBase);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
    apiOrigin = parsed.origin;
  } catch {
    throw new Error('VITE_API_BASE must be a valid HTTP(S) API URL.');
  }

  return {
    plugins: [react(), tailwindcss(), frontendCspPlugin(apiOrigin, mode === 'development')],
    server: { host: '127.0.0.1', port: 5173 },
  };
});

