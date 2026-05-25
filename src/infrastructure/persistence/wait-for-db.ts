/**
 * @author alnosila — https://github.com/alnosila
 */

import { bootstrapEnv } from '../secrets/bootstrap-env.js';
import { closePool, getPool } from './db.js';

const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 30);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS ?? 1000);

export async function waitForDatabase(): Promise<void> {
  const pool = getPool();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('PostgreSQL is ready');
      await closePool();
      return;
    } catch {
      console.log(`Waiting for PostgreSQL (${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  await closePool();
  throw new Error('PostgreSQL did not become ready in time');
}

const isMain = process.argv[1]?.includes('wait-for-db');
if (isMain) {
  bootstrapEnv();
  waitForDatabase().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
