/**
 * @author alnosila — https://github.com/alnosila
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapEnv } from '../../src/infrastructure/secrets/bootstrap-env.js';
import { applySecretsToProcessEnv, loadSecretsFromFile } from '../../src/infrastructure/secrets/load-secrets.js';

describe('Vault file secrets', () => {
  let tempDir: string;
  let secretsPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prefs-secrets-'));
    secretsPath = join(tempDir, '.env');
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.PORT;
    delete process.env.SECRETS_FILE;
  });

  it('loads DATABASE_URL from decrypted .env file', () => {
    writeFileSync(
      secretsPath,
      `DATABASE_URL=postgresql://vault:secret@db:5432/notification_preferences
PORT=3001
LOG_LEVEL=debug
`,
    );

    const secrets = loadSecretsFromFile(secretsPath);
    expect(secrets.databaseUrl).toContain('vault:secret');
    expect(secrets.port).toBe(3001);
    expect(secrets.logLevel).toBe('debug');
  });

  it('bootstrapEnv loads all keys into process.env', () => {
    writeFileSync(
      secretsPath,
      `DATABASE_URL=postgresql://u:p@host/db
POSTGRES_USER=u
CUSTOM_FLAG=yes
`,
    );

    bootstrapEnv(secretsPath);
    expect(process.env.DATABASE_URL).toContain('host/db');
    expect(process.env.POSTGRES_USER).toBe('u');
    expect(process.env.CUSTOM_FLAG).toBe('yes');
  });

  it('applySecretsToProcessEnv sets process.env for db layer', () => {
    applySecretsToProcessEnv({
      databaseUrl: 'postgresql://test:test@localhost:5432/db',
      port: 4000,
      host: '127.0.0.1',
      logLevel: 'warn',
    });

    expect(process.env.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/db');
    expect(process.env.PORT).toBe('4000');
  });
});
