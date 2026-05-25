/**
 * @author alnosila — https://github.com/alnosila
 */

import { describe, expect, it } from 'vitest';
import {
  appSecretsFromEnvRecord,
  parseEnvFile,
} from '../../src/infrastructure/secrets/parse-env-file.js';

describe('parseEnvFile', () => {
  it('parses KEY=VALUE and ignores comments', () => {
    const vars = parseEnvFile(`
# comment
DATABASE_URL=postgresql://a:b@localhost/db
PORT=3001
LOG_LEVEL=debug
`);
    expect(vars.DATABASE_URL).toContain('postgresql');
    expect(vars.PORT).toBe('3001');
  });

  it('builds AppSecrets from env record', () => {
    const secrets = appSecretsFromEnvRecord({
      DATABASE_URL: 'postgresql://x:y@host/db',
      PORT: '4000',
    });
    expect(secrets.port).toBe(4000);
    expect(secrets.databaseUrl).toBe('postgresql://x:y@host/db');
  });
});
