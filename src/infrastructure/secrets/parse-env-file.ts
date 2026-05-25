/**
 * @author alnosila — https://github.com/alnosila
 */

/** Парсит простой .env (KEY=VALUE), без зависимости dotenv. */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export function appSecretsFromEnvRecord(vars: Record<string, string>) {
  const databaseUrl = vars.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in secrets env file');
  }

  return {
    databaseUrl,
    port: Number(vars.PORT ?? 3000),
    host: vars.HOST ?? '0.0.0.0',
    logLevel: vars.LOG_LEVEL ?? 'info',
  };
}
