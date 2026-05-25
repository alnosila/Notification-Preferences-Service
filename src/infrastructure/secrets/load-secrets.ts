/**
 * @author alnosila — https://github.com/alnosila
 */

import { bootstrapEnv } from './bootstrap-env.js';
import { appSecretsFromEnvRecord } from './parse-env-file.js';
import type { AppSecrets } from './types.js';

/** Читает и применяет .env, возвращает типизированные настройки приложения. */
export function loadSecretsFromFile(filePath?: string): AppSecrets {
  return appSecretsFromEnvRecord(bootstrapEnv(filePath));
}

export async function loadSecrets(): Promise<AppSecrets> {
  return loadSecretsFromFile();
}

export function applySecretsToProcessEnv(secrets: AppSecrets): void {
  process.env.DATABASE_URL = secrets.databaseUrl;
  process.env.PORT = String(secrets.port);
  process.env.HOST = secrets.host;
  process.env.LOG_LEVEL = secrets.logLevel;
}
