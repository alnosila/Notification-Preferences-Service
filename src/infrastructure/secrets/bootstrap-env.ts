/**
 * @author alnosila — https://github.com/alnosila
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnvFile } from './parse-env-file.js';

export function defaultEnvFilePath(): string {
  return process.env.SECRETS_FILE ?? '.env';
}

/** Загружает переменные строго из .env в process.env. */
export function bootstrapEnv(filePath?: string): Record<string, string> {
  const path = resolve(process.cwd(), filePath ?? defaultEnvFilePath());

  try {
    const raw = readFileSync(path, 'utf-8');
    const vars = parseEnvFile(raw);
    for (const [key, value] of Object.entries(vars)) {
      process.env[key] = value;
    }
    return vars;
  } catch {
    // Docker Compose env_file: переменные уже в process.env, файла .env в образе нет
    if (process.env.DATABASE_URL) {
      const keys = [
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'POSTGRES_DB',
        'DATABASE_URL',
        'PORT',
        'HOST',
        'LOG_LEVEL',
      ] as const;
      const vars: Record<string, string> = {};
      for (const key of keys) {
        const value = process.env[key];
        if (value) {
          vars[key] = value;
        }
      }
      return vars;
    }
    throw new Error(`Нет ${path}. Сначала: make decrypt`);
  }
}
