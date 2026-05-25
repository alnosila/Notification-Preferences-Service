/**
 * @author alnosila — https://github.com/alnosila
 */

import { describe, expect, it } from 'vitest';
import { decryptEnv, encryptEnv } from '../../scripts/env-crypto.js';

describe('env-crypto', () => {
  it('encrypts to JSON with iv and data', () => {
    const payload = encryptEnv('DATABASE_URL=postgresql://x\nPORT=3000\n', 'test-key');
    expect(payload.iv).toBeTruthy();
    expect(payload.data).toBeTruthy();
    expect(() => JSON.stringify(payload)).not.toThrow();
  });

  it('round-trips plaintext', () => {
    const plain = 'DATABASE_URL=postgresql://prefs:prefs@localhost/db\nLOG_LEVEL=info\n';
    const payload = encryptEnv(plain, 'notification-prefs-dev-key');
    expect(decryptEnv(payload, 'notification-prefs-dev-key')).toBe(plain);
  });
});
