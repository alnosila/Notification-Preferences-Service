/**
 * @author alnosila — https://github.com/alnosila
 */

import { bootstrapEnv } from '../secrets/bootstrap-env.js';
import { getPool, closePool } from './db.js';

bootstrapEnv();

// Начальная матрица для новых пользователей (сценарий «transactional on, marketing off»).
const DEFAULT_PREFERENCES = [
  { notification_type: 'transactional_email', channel: 'email', enabled: true },
  { notification_type: 'marketing_email', channel: 'email', enabled: false },
  { notification_type: 'marketing_sms', channel: 'sms', enabled: false },
  { notification_type: 'marketing_push', channel: 'push', enabled: false },
  { notification_type: 'transactional_push', channel: 'push', enabled: true },
] as const;

// Регуляторные/продуктовые запреты по региону (пример из ТЗ: marketing_sms в EU).
const GLOBAL_POLICIES = [
  {
    notification_type: 'marketing_sms',
    channel: 'sms',
    region: 'EU',
    action: 'deny',
  },
] as const;

async function seed(): Promise<void> {
  const pool = getPool();

  for (const row of DEFAULT_PREFERENCES) {
    await pool.query(
      `INSERT INTO default_preferences (notification_type, channel, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (notification_type, channel) DO UPDATE SET enabled = EXCLUDED.enabled`,
      [row.notification_type, row.channel, row.enabled],
    );
  }

  for (const policy of GLOBAL_POLICIES) {
    await pool.query(
      `INSERT INTO global_policies (notification_type, channel, region, action)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (notification_type, channel, region) DO UPDATE SET action = EXCLUDED.action`,
      [policy.notification_type, policy.channel, policy.region, policy.action],
    );
  }

  console.log('Seed completed successfully');
  await closePool();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
