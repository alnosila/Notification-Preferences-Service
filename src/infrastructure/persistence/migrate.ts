/**
 * @author alnosila — https://github.com/alnosila
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapEnv } from '../secrets/bootstrap-env.js';
import { getPool, closePool } from './db.js';

bootstrapEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  const pool = getPool();
  const sql = readFileSync(join(__dirname, 'migrations', '001_initial.sql'), 'utf-8');
  await pool.query(sql);
  console.log('Migration completed successfully');
  await closePool();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
