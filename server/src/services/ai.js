import { generateWithGemini } from './providers/gemini.js';

// Provider adapters return the same validated shape; another adapter can be
// added here later without changing routes or React components.
const providers = { gemini: generateWithGemini };

export function aiStatus() {
  const provider = process.env.AI_PROVIDER || 'gemini';
  return {
    enabled: Boolean(process.env.GEMINI_API_KEY && providers[provider]),
    provider: providers[provider] ? provider : null,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  };
}

export async function runAiTask(input) {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const adapter = providers[provider];
  if (!adapter) {
    const error = new Error(`AI_PROVIDER "${provider}" is not supported. Configure gemini or add a provider adapter.`);
    error.statusCode = 503;
    error.safeToExpose = true;
    error.code = 'AI_PROVIDER_UNSUPPORTED';
    throw error;
  }
  return adapter(input);
}
