import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

let initialized = false;

/**
 * Initialize Z.AI SDK config from environment variables.
 * The SDK requires a `.z-ai-config` JSON file at runtime, but on Vercel
 * we can't commit secrets. So we create the file dynamically from
 * Z_AI_API_KEY env var.
 *
 * The file is created once per process (cached via `initialized` flag).
 */
export function ensureZaiConfig() {
  if (initialized) return;
  if (!process.env.Z_AI_API_KEY) {
    throw new Error('Z_AI_API_KEY environment variable is not set');
  }

  const config = {
    baseUrl: 'https://api.z.ai/api/paas/v4',
    apiKey: process.env.Z_AI_API_KEY,
  };

  // Try multiple paths (cwd first, then home dir)
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/tmp/.z-ai-config',
  ];

  for (const configPath of configPaths) {
    try {
      // Ensure parent dir exists
      const parent = path.dirname(configPath);
      if (!existsSync(parent)) {
        mkdirSync(parent, { recursive: true });
      }
      writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
      initialized = true;
      return;
    } catch (e) {
      // Try next path
      continue;
    }
  }

  throw new Error('Could not write .z-ai-config to any known location');
}
