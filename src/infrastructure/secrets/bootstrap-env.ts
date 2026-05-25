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

  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch {
    throw new Error(`Нет ${path}. Сначала: make decrypt`);
  }

  const vars = parseEnvFile(raw);
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }

  return vars;
}
